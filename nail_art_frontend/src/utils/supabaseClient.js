/**
 * Supabase client singleton.
 *
 * IMPORTANT: Requires @supabase/supabase-js to be installed:
 *   npm i @supabase/supabase-js
 *
 * This file is not imported anywhere yet to prevent build errors before the
 * dependency is installed and env variables are defined.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // We intentionally do not throw, so importing modules can guard against null.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabaseClient] Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY environment variables.'
  );
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export default supabase;
