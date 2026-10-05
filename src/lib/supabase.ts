import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

/** Why Supabase isn't usable, shown on screen instead of crashing the app. Empty when it's fine. */
export let supabaseError = ''

function connect(): SupabaseClient | null {
  if (!url || !anonKey) return null
  try {
    return createClient(url, anonKey)
  } catch (e) {
    // A malformed URL (e.g. missing https://) makes createClient throw, which would blank the whole page.
    supabaseError = `VITE_SUPABASE_URL isn't valid: ${(e as Error).message} Use the full URL, like https://abcd.supabase.co.`
    return null
  }
}

// Null until both env vars are set and valid, so the app still runs before Supabase is set up.
export const supabase = connect()
