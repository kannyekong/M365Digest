import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../../../lib/supabase/server";

export const prerender = false;

/* Returns Providus transactions for the Finance reconciliation workspace. */
export const GET: APIRoute = async () => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("providus_transactions")
      .select(
        `
          id,
          reference,
          account_number,
          narration,
          transaction_datetime,
          amount,
          transaction_type,
          account_balance,
          processing_status,
          reconciliation_status,
          processing_notes,
          matched_client_id,
          matched_source_table,
          matched_source_id,
          matched_invoice_number,
          financial_transaction_id,
          received_at,
          processed_at,
          reconciled_at,
          created_at,
          updated_at
        `
      )
      .order("received_at", {
        ascending: false,
      });

    if (error) {
      console.error("Unable to load Providus transactions:", error);

      return new Response(
        JSON.stringify({
          success: false,
          message: "Unable to load Providus transactions.",
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
        transactions: data ?? [],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to load Providus reconciliation data:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Unable to load Providus transactions.",
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
