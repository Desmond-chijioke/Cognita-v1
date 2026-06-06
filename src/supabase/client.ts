import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    'Missing Supabase env vars — check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession:     true,   // store session in localStorage (default, explicit)
    autoRefreshToken:   true,   // auto-refresh access token before expiry (default, explicit)
    detectSessionInUrl: false,  // not using OAuth / magic-link flows
  },
});
