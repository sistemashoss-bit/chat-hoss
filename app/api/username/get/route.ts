import { Database } from "@/supabase/types"
import { getSupabaseAdminKey, getSupabaseUrl } from "@/lib/supabase/env"
import { createClient } from "@supabase/supabase-js"

export const runtime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { userId } = json as {
    userId: string
  }

  try {
    const supabaseAdmin = createClient<Database>(
      getSupabaseUrl(),
      getSupabaseAdminKey()
    )

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .eq("user_id", userId)
      .single()

    if (!data) {
      throw new Error(error.message)
    }

    return new Response(JSON.stringify({ username: data.username }), {
      status: 200
    })
  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
