import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

type SupportStatus = "open" | "resolved";

/** Build a private JSON response for the admin support API. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      Vary: "Authorization",
    },
  });
}

/** Authenticate the bearer token and require an explicitly allowlisted admin email. */
async function getAdminClient(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { error: jsonResponse({ success: false, message: "Admin authentication is required." }, 401) };
  }

  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  const allowedEmails = String(import.meta.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!supabaseUrl || !serviceRoleKey || allowedEmails.length === 0) {
    console.error("Admin support API requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ADMIN_EMAILS.");
    return { error: jsonResponse({ success: false, message: "Admin support service is not configured." }, 500) };
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice("Bearer ".length).trim();
  const { data: { user }, error } = await client.auth.getUser(token);

  if (error || !user?.email) {
    return { error: jsonResponse({ success: false, message: "Your admin session is invalid. Please sign in again." }, 401) };
  }

  if (!allowedEmails.includes(user.email.toLowerCase())) {
    return { error: jsonResponse({ success: false, message: "You are not authorized to manage support requests." }, 403) };
  }

  return { client };
}

/** List support tickets for verified administrators only. */
export const GET: APIRoute = async ({ request }) => {
  try {
    const context = await getAdminClient(request);
    if ("error" in context) return context.error;

    const { data, error } = await context.client
      .from("student_support_requests")
      .select("id, student_id, subject, category, description, priority, status, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return jsonResponse({ success: true, requests: data ?? [] });
  } catch (error) {
    console.error("Admin support list error:", error);
    return jsonResponse({ success: false, message: "Support requests could not be loaded." }, 500);
  }
};

/** Update ticket status after verifying the caller is an allowlisted administrator. */
export const PATCH: APIRoute = async ({ request }) => {
  try {
    const context = await getAdminClient(request);
    if ("error" in context) return context.error;

    const body = await request.json();
    const id = String(body.id ?? "").trim();
    const status = body.status as SupportStatus;

    if (!id || (status !== "open" && status !== "resolved")) {
      return jsonResponse({ success: false, message: "A valid ticket ID and status are required." }, 400);
    }

    const { data, error } = await context.client
      .from("student_support_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, student_id, subject, category, description, priority, status, created_at, updated_at")
      .maybeSingle();

    if (error) throw error;
    if (!data) return jsonResponse({ success: false, message: "Support request not found." }, 404);

    return jsonResponse({ success: true, request: data });
  } catch (error) {
    console.error("Admin support update error:", error);
    return jsonResponse({ success: false, message: "Ticket status could not be updated." }, 500);
  }
};
