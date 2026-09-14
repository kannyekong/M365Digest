import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../../../lib/supabase/server";

export const prerender = false;

/* Returns active CloudTweak clients that can be selected during Providus reconciliation. */
export const GET: APIRoute = async ({ url }) => {
  try {
    const supabase = createSupabaseAdminClient();

    const clientId = url.searchParams.get("clientId");

    /*
     * When a client has been selected, return that client's invoices
     * instead of returning the complete client directory again.
     */
    if (clientId) {
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select(
          `
              id,
              invoice_number,
              customer_id,
              customer_name,
              customer_company,
              customer_email,
              currency,
              status,
              project_id,
              total_amount,
              amount_paid,
              amount_due,
              issue_date,
              due_date
            `
        )
        .eq("customer_id", clientId)
        .gt("amount_due", 0)
        .order("issue_date", {
          ascending: false,
        });

      if (invoicesError) {
        console.error(
          "Unable to load client invoices for Providus reconciliation:",
          invoicesError
        );

        return new Response(
          JSON.stringify({
            success: false,
            message: "Unable to load client invoices.",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          invoices: invoices ?? [],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select(
        `
            id,
            client_code,
            client_type,
            display_name,
            company_name,
            email,
            phone,
            status
          `
      )
      .is("archived_at", null)
      .order("display_name", {
        ascending: true,
      });

    if (clientsError) {
      console.error(
        "Unable to load clients for Providus reconciliation:",
        clientsError
      );

      return new Response(
        JSON.stringify({
          success: false,
          message: "Unable to load clients.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        clients: clients ?? [],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to load Providus reconciliation options:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Unable to load reconciliation options.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
