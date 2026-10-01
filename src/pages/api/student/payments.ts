import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

/**
 * Returns a JSON response using the supplied HTTP status.
 */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Loads only Academy payment records belonging to the authenticated student.
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ success: false, message: "Authentication is required." }, 401);
    }

    const token = authorization.slice(7).trim();
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, message: "Payment history is unavailable." }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user?.email) {
      return jsonResponse({ success: false, message: "Your session is invalid." }, 401);
    }

    const { data, error } = await supabase
      .from("financial_transactions")
      .select(
        "id, description, amount, currency, status, reconciliation_status, provider, payment_method, provider_reference, receipt_number, paid_at, transaction_date, created_at"
      )
      .eq("transaction_category", "academy")
      .eq("source_table", "academy_registrations")
      .ilike("customer_email", user.email)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return jsonResponse({
      success: true,
      payments: data ?? [],
    });
  } catch (error) {
    console.error("Student payment history error:", error);
    return jsonResponse({
      success: false,
      message: "Payment history could not be loaded.",
    }, 500);
  }
};
