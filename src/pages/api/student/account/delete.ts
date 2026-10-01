import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

/**
 * Permanently deletes the authenticated student's Supabase account.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({
        success: false,
        message: "Authentication is required.",
      }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const token = authorization.slice(7).trim();
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Account service is temporarily unavailable.",
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({
        success: false,
        message: "Your session is invalid.",
      }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Your Academy account has been closed.",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Student account deletion error:", error);

    return new Response(JSON.stringify({
      success: false,
      message: "Your account could not be closed.",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
