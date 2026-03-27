import { openapiToFunctions } from "@/lib/openapi-conversion"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { Tables } from "@/supabase/types"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

console.log("=== TOOLS ROUTE LOADED ===")

export async function POST(request: Request) {
  console.log("=== /api/chat/tools called ===")

  const json = await request.json()
  console.log("Received request with:", {
    chatSettings: json.chatSettings,
    messagesCount: json.messages?.length,
    selectedToolsCount: json.selectedTools?.length
  })

  const { chatSettings, messages, selectedTools } = json as {
    chatSettings: ChatSettings
    messages: any[]
    selectedTools: Tables<"tools">[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openai_api_key, "OpenAI")

    const openai = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id
    })

    let allTools: OpenAI.Chat.Completions.ChatCompletionTool[] = []
    let allRouteMaps = {}
    let schemaDetails = []

    for (const selectedTool of selectedTools) {
      try {
        console.log("Processing tool:", selectedTool.name)
        console.log("Tool schema:", selectedTool.schema)

        const convertedSchema = await openapiToFunctions(
          JSON.parse(selectedTool.schema as string)
        )
        console.log("Converted schema:", convertedSchema)

        const tools = convertedSchema.functions || []
        allTools = allTools.concat(tools)

        const routeMap = convertedSchema.routes.reduce(
          (map: Record<string, string>, route) => {
            map[route.path.replace(/{(\w+)}/g, ":$1")] = route.operationId
            return map
          },
          {}
        )

        allRouteMaps = { ...allRouteMaps, ...routeMap }

        schemaDetails.push({
          title: convertedSchema.info.title,
          description: convertedSchema.info.description,
          url: convertedSchema.info.server,
          headers: selectedTool.custom_headers,
          routeMap,
          requestInBody: convertedSchema.routes[0].requestInBody
        })
      } catch (error: any) {
        console.error("Error converting schema", error)
      }
    }

    const firstResponse = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages,
      tools: allTools.length > 0 ? allTools : undefined
    })

    const message = firstResponse.choices[0].message
    messages.push(message)
    const toolCalls = message.tool_calls || []

    if (toolCalls.length === 0) {
      return new Response(message.content, {
        headers: {
          "Content-Type": "application/json"
        }
      })
    }

    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const functionCall = toolCall.function
        const functionName = functionCall.name
        const argumentsString = toolCall.function.arguments.trim()
        const parsedArgs = JSON.parse(argumentsString)

        console.log("Function:", functionName)
        console.log("Arguments:", parsedArgs)

        // Find the schema detail that contains the function name
        const schemaDetail = schemaDetails.find(detail =>
          Object.values(detail.routeMap).includes(functionName)
        )

        if (!schemaDetail) {
          throw new Error(`Function ${functionName} not found in any schema`)
        }

        const pathTemplate = Object.keys(schemaDetail.routeMap).find(
          key => schemaDetail.routeMap[key] === functionName
        )

        if (!pathTemplate) {
          throw new Error(`Path for function ${functionName} not found`)
        }

        const path = pathTemplate
          .replace(/:(\w+)/g, (_, paramName) => {
            const requestBody = parsedArgs.requestBody || parsedArgs
            const value =
              requestBody.parameters?.[paramName] ?? requestBody[paramName]
            if (!value) {
              return ""
            }
            return encodeURIComponent(value)
          })
          .replace(/\/+/g, "/")

        if (!path) {
          throw new Error(`Path for function ${functionName} not found`)
        }

        // Determine if the request should be in the body or as a query
        const isRequestInBody = schemaDetail.requestInBody
        let data = {}

        if (isRequestInBody) {
          // If the type is set to body
          let headers: Record<string, string> = {
            "Content-Type": "application/json"
          }

          // Check if custom headers are set
          const customHeaders = schemaDetail.headers // Moved this line up to the loop
          // Check if custom headers are set and are of type string
          if (customHeaders && typeof customHeaders === "string") {
            let parsedCustomHeaders = JSON.parse(customHeaders) as Record<
              string,
              string
            >

            headers = {
              ...headers,
              ...parsedCustomHeaders
            }
          }

          // Inject user's Supabase token for MCP tools
          const authHeader = request.headers.get("Authorization")
          if (authHeader && schemaDetail.url.includes("/mcp/")) {
            headers["Authorization"] = authHeader
          }

          const fullUrl = schemaDetail.url + path

          const requestBody = parsedArgs.requestBody || parsedArgs
          const bodyContent = requestBody.parameters || requestBody

          console.log("Full URL:", fullUrl)
          console.log("Request body:", bodyContent)

          const requestInit = {
            method: "POST",
            headers,
            body: JSON.stringify(bodyContent) // Use the extracted requestBody or the entire parsedArgs
          }

          const response = await fetch(fullUrl, requestInit)

          if (!response.ok) {
            data = {
              error: response.statusText
            }
          } else {
            data = await response.json()
          }
        } else {
          // If the type is set to query
          const requestBody = parsedArgs.requestBody || parsedArgs
          const queryParamsObj = requestBody.parameters || requestBody
          const queryParams = new URLSearchParams(queryParamsObj).toString()
          const fullUrl =
            schemaDetail.url + path + (queryParams ? "?" + queryParams : "")

          let headers: Record<string, string> = {}

          // Check if custom headers are set
          const customHeaders = schemaDetail.headers
          if (customHeaders && typeof customHeaders === "string") {
            headers = JSON.parse(customHeaders) as Record<string, string>
          }

          // Inject user's Supabase token for MCP tools
          const authHeader = request.headers.get("Authorization")
          if (authHeader && schemaDetail.url.includes("/mcp/")) {
            headers["Authorization"] = authHeader
          }

          const response = await fetch(fullUrl, {
            method: "GET",
            headers: headers
          })

          if (!response.ok) {
            data = {
              error: response.statusText
            }
          } else {
            data = await response.json()
          }
        }

        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(data)
        })
      }
    }

    const secondResponse = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages,
      stream: true
    })

    const stream = OpenAIStream(secondResponse)

    return new StreamingTextResponse(stream)
  } catch (error: any) {
    console.error("=== TOOLS ROUTE ERROR ===")
    console.error(error)
    console.error("Error stack:", error.stack)
    const errorMessage =
      error.message || error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(
      JSON.stringify({ message: errorMessage, stack: error.stack }),
      {
        status: errorCode,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}
