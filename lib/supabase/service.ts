import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. Bypasses RLS, so it must NEVER be exposed to
 * the browser or handed a user-supplied table/filter.
 *
 * Used for writes that the user must not be able to forge or erase — currently
 * only AI token accounting (`ai_usage_events`), which deliberately has no
 * insert/update/delete RLS policy for authenticated users.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return null

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
