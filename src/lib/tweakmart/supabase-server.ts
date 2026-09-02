import { createClient } from "@supabase/supabase-js";

const tweakMartSupabaseUrl = import.meta.env.TWEAKMART_SUPABASE_URL;

const tweakMartServiceRoleKey = import.meta.env
  .TWEAKMART_SUPABASE_SERVICE_ROLE_KEY;

/* Prevents Marketplace administrative access when server credentials are missing. */
if (!tweakMartSupabaseUrl || !tweakMartServiceRoleKey) {
  throw new Error("Missing TweakMart Supabase server configuration.");
}

/* Creates the privileged TweakMart database client for server-side admin operations only. */
export const tweakMartAdminSupabase = createClient(
  tweakMartSupabaseUrl,
  tweakMartServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
