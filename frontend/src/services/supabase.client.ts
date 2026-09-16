import { createClient } from '@supabase/supabase-js';
import type { Database } from '@scriptcraft/shared';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to frontend/.env.',
  );
}

/**
 * Browser Supabase client. Anon key only — the service role key never leaves
 * the backend. Session is persisted so a refresh keeps the user signed in.
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
