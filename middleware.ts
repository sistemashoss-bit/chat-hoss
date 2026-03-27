import { createClient } from "@/lib/supabase/middleware"
import {
  isEmailAllowedByWhitelist,
  parseWhitelistFromEnvStrings
} from "@/lib/auth/whitelist"
import { i18nRouter } from "next-i18n-router"
import { NextResponse, type NextRequest } from "next/server"
import i18nConfig from "./i18nConfig"

export async function middleware(request: NextRequest) {
  const i18nResult = i18nRouter(request, i18nConfig)
  if (i18nResult) return i18nResult

  try {
    const { supabase, response } = createClient(request)

    const session = await supabase.auth.getSession()
    const userEmail = session.data.session?.user.email

    const whitelistConfig = parseWhitelistFromEnvStrings({
      emailDomainWhitelistPatternsString:
        process.env.EMAIL_DOMAIN_WHITELIST ||
        process.env.NEXT_PUBLIC_EMAIL_DOMAIN_WHITELIST,
      emailWhitelistPatternsString:
        process.env.EMAIL_WHITELIST || process.env.NEXT_PUBLIC_EMAIL_WHITELIST
    })

    // If whitelists are configured, enforce them on every request (defense-in-depth).
    if (session.data.session && !isEmailAllowedByWhitelist(userEmail, whitelistConfig)) {
      await supabase.auth.signOut()
      return NextResponse.redirect(
        new URL(`/login?message=Email ${userEmail} is not allowed.`, request.url)
      )
    }

    const redirectToChat = session && request.nextUrl.pathname === "/"

    if (redirectToChat) {
      const { data: homeWorkspace, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", session.data.session?.user.id)
        .eq("is_home", true)
        .single()

      if (!homeWorkspace) {
        throw new Error(error?.message)
      }

      return NextResponse.redirect(
        new URL(`/${homeWorkspace.id}/chat`, request.url)
      )
    }

    return response
  } catch (e) {
    return NextResponse.next({
      request: {
        headers: request.headers
      }
    })
  }
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next|auth|manifest\\.json).*)"
}
