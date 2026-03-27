import { createBrowserClient } from "@supabase/ssr"
import { getSupabasePublicKey, getSupabaseUrl } from "./env"

export const createClient = () =>
  createBrowserClient(getSupabaseUrl(), getSupabasePublicKey())
