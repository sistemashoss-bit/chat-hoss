"use client"

import { Brand } from "@/components/ui/brand"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/ui/submit-button"
import {
  isEmailAllowedByWhitelist,
  parseWhitelistFromEnvStrings
} from "@/lib/auth/whitelist"
import { supabase } from "@/lib/supabase/browser-client"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

export function LoginForm({ initialMessage }: { initialMessage?: string }) {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState(initialMessage || "")
  const [loading, setLoading] = useState<"signin" | "signup" | "reset" | null>(
    null
  )

  const whitelistConfig = useMemo(() => {
    // Only NEXT_PUBLIC_* is available on the client.
    return parseWhitelistFromEnvStrings({
      emailDomainWhitelistPatternsString:
        process.env.NEXT_PUBLIC_EMAIL_DOMAIN_WHITELIST,
      emailWhitelistPatternsString: process.env.NEXT_PUBLIC_EMAIL_WHITELIST
    })
  }, [])

  const ensureAllowed = (inputEmail: string) => {
    if (!isEmailAllowedByWhitelist(inputEmail, whitelistConfig)) {
      setMessage(`Email ${inputEmail} is not allowed.`)
      return false
    }
    return true
  }

  const handleSignIn = async () => {
    setMessage("")
    if (!ensureAllowed(email)) return
    setLoading("signin")
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    setLoading(null)

    if (error) return setMessage(error.message)

    router.refresh()
    router.push("/setup")
  }

  const handleSignUp = async () => {
    setMessage("")
    if (!ensureAllowed(email)) return
    setLoading("signup")
    const { error } = await supabase.auth.signUp({
      email,
      password
    })
    setLoading(null)

    if (error) return setMessage(error.message)

    router.refresh()
    router.push("/setup")
  }

  const handleReset = async () => {
    setMessage("")
    if (!email) return setMessage("Please enter your email.")
    if (!ensureAllowed(email)) return
    setLoading("reset")
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/login/password`
    })
    setLoading(null)

    if (error) return setMessage(error.message)
    setMessage("Check email to reset password")
  }

  return (
    <div className="flex w-full flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
      <div className="animate-in text-foreground flex w-full flex-1 flex-col justify-center gap-2">
        <Brand />

        <Label className="text-md mt-4" htmlFor="email">
          Email
        </Label>
        <Input
          className="mb-3 rounded-md border bg-inherit px-4 py-2"
          name="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />

        <Label className="text-md" htmlFor="password">
          Password
        </Label>
        <Input
          className="mb-6 rounded-md border bg-inherit px-4 py-2"
          type="password"
          name="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <SubmitButton
          className="mb-2 rounded-md bg-blue-700 px-4 py-2 text-white"
          onClick={e => {
            e.preventDefault()
            handleSignIn()
          }}
          disabled={loading !== null}
        >
          {loading === "signin" ? "Signing in..." : "Login"}
        </SubmitButton>

        <SubmitButton
          className="border-foreground/20 mb-2 rounded-md border px-4 py-2"
          onClick={e => {
            e.preventDefault()
            handleSignUp()
          }}
          disabled={loading !== null}
        >
          {loading === "signup" ? "Signing up..." : "Sign Up"}
        </SubmitButton>

        <div className="text-muted-foreground mt-1 flex justify-center text-sm">
          <span className="mr-1">Forgot your password?</span>
          <button
            onClick={e => {
              e.preventDefault()
              handleReset()
            }}
            className="text-primary ml-1 underline hover:opacity-80"
            disabled={loading !== null}
          >
            {loading === "reset" ? "Sending..." : "Reset"}
          </button>
        </div>

        {message && (
          <p className="bg-foreground/10 text-foreground mt-4 p-4 text-center">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
