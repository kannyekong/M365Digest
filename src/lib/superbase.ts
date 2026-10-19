import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Keeps the existing shared client for admin and public site authentication.
export const supabase = createClient(supabaseUrl, supabaseKey);

// Gives student accounts an isolated browser session without signing out admins.
export const studentSupabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey: "cloudtweak-academy-student-auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
