import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Null until .env.local is filled in, so the app still runs before Supabase is set up.
export const supabase = url && anonKey ? createClient(url, anonKey) : null
