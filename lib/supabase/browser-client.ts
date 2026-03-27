import { Database } from "@/supabase/types"
import { createBrowserClient } from "@supabase/ssr"
import { getSupabasePublicKey, getSupabaseUrl } from "./env"

export const supabase = createBrowserClient<Database>(
  getSupabaseUrl(),
  getSupabasePublicKey()
)
