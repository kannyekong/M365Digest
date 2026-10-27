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

export const GET: APIRoute = async ({ request }) => {
  try {
    // Require the student's authenticated access token.
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        { success: false, message: "Authentication is required." },
        401
      );
    }

    const token = authorization.slice(7).trim();
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    // Ensure the server has the credentials required to query payment records.
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { success: false, message: "Payment history is unavailable." },
        500
      );
    }

    // Create a server-side client for authenticated payment-history lookups.
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Validate the supplied token and identify the student.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user?.email) {
      return jsonResponse(
        { success: false, message: "Your session is invalid." },
        401
      );
    }

    // Retrieve the student's Academy payment transactions.
    const { data: transactions, error: transactionError } = await supabase
      .from("financial_transactions")
      .select(
        "id, description, amount, currency, status, reconciliation_status, provider, payment_method, provider_reference, receipt_number, paid_at, transaction_date, created_at, source_id"
      )
      .eq("transaction_category", "academy")
      .eq("source_table", "academy_registrations")
      .ilike("customer_email", user.email)
      .order("created_at", { ascending: false })
      .limit(50);

    if (transactionError) throw transactionError;

    // Collect the registration IDs associated with the returned transactions.
    const registrationIds = [
      ...new Set(
        (transactions ?? [])
          .map((transaction) => transaction.source_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    // Load each registration's program slug through the confirmed database relationship.
    const registrationSlugs = new Map<string, string | null>();

    if (registrationIds.length > 0) {
      const { data: registrations, error: registrationError } = await supabase
        .from("academy_registrations")
        .select("id, program_id")
        .in("id", registrationIds);

      if (registrationError) throw registrationError;

      const programIds = [
        ...new Set(
          (registrations ?? [])
            .map((registration) => registration.program_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      // Retrieve slugs for the programs linked to those registrations.
      const programSlugs = new Map<string, string>();

      if (programIds.length > 0) {
        const { data: programs, error: programError } = await supabase
          .from("academy_programs")
          .select("id, slug")
          .in("id", programIds);

        if (programError) throw programError;

        for (const program of programs ?? []) {
          programSlugs.set(program.id, program.slug);
        }
      }

      // Associate each registration with its program slug.
      for (const registration of registrations ?? []) {
        registrationSlugs.set(
          registration.id,
          registration.program_id
            ? (programSlugs.get(registration.program_id) ?? null)
            : null
        );
      }
    }

    // Return the original payment fields plus the associated course slug.
    const payments = (transactions ?? []).map(
      ({ source_id, ...transaction }) => ({
        ...transaction,
        program_slug: source_id
          ? (registrationSlugs.get(source_id) ?? null)
          : null,
      })
    );

    return jsonResponse({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("Student payment history error:", error);

    return jsonResponse(
      {
        success: false,
        message: "Payment history could not be loaded.",
      },
      500
    );
  }
};
