import { createClient } from "@supabase/supabase-js";

/* Reads and validates the server-side Supabase environment variables. */
function getSupabaseServerConfig() {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;

  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("PUBLIC_SUPABASE_URL is not configured.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return {
    supabaseUrl,
    serviceRoleKey,
  };
}

/*
 * Creates a privileged Supabase client for server-side CloudTweak operations.
 * This client must never be imported into browser-rendered React components.
 */
export function createSupabaseAdminClient() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseServerConfig();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
