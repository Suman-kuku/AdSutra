import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@scriptcraft/shared';
import { env } from './env.js';

export type Db = SupabaseClient<Database>;

/**
 * Service-role client. Bypasses RLS entirely — use only where the backend has
 * already established who the caller is and what they may touch. Never send
 * this key, or anything derived from it, to the browser.
 */
export const supabaseAdmin: Db = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * A client acting *as the caller*, so Postgres RLS applies to every query.
 * Prefer this for ordinary reads and writes; it keeps the database as the
 * second line of defence behind the Express middleware.
 */
export function supabaseForToken(accessToken: string): Db {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
