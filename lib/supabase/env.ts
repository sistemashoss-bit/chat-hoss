export function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL")
  return url
}

// Supabase has renamed keys over time:
// - Legacy: NEXT_PUBLIC_SUPABASE_ANON_KEY
// - Current: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or your chosen publishable key env)
export function getSupabasePublicKey() {
  const publishable =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const legacyAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const key = publishable || legacyAnon
  if (!key)
    throw new Error(
      "Missing Supabase public key env (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    )
  return key
}

// For server/admin operations:
// - Legacy: SUPABASE_SERVICE_ROLE_KEY
// - Current: SUPABASE_SECRET_KEY
export function getSupabaseAdminKey() {
  const secret = process.env.SUPABASE_SECRET_KEY
  const legacyServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  const key = secret || legacyServiceRole
  if (!key)
    throw new Error(
      "Missing Supabase admin key env (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY)"
    )
  return key
}
