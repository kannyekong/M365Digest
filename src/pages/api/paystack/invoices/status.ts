import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../types/supabase";

export const prerender = false;

/**
 * Return the latest trusted status for one Invoice payment reference.
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const reference = new URL(request.url).searchParams
      .get("reference")
      ?.trim();

    if (!reference) {
      return Response.json(
        {
          success: false,
          message: "Payment reference is required.",
        },
        {
          status: 400,
        }
      );
    }

    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const serviceRoleKey =
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Payment-status environment variables are incomplete."
      );
    }

    const supabase = createClient<Database>(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: attempt, error: attemptError } = await supabase
      .from("invoice_payment_attempts")
      .select(
        "id,invoice_id,reference,amount,currency,status,channel,gateway_response,paid_at,created_at"
      )
      .eq("reference", reference)
      .maybeSingle();

    if (attemptError) {
      throw attemptError;
    }

    if (!attempt) {
      return Response.json(
        {
          success: false,
          message: "No Invoice payment attempt matched this reference.",
        },
        {
          status: 404,
        }
      );
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(
        "id,invoice_number,customer_name,total_amount,amount_paid,amount_due,currency,status"
      )
      .eq("id", attempt.invoice_id)
      .single();

    if (invoiceError) {
      throw invoiceError;
    }

    return Response.json({
      success: true,
      attempt,
      invoice,
    });
  } catch (error) {
    console.error(
      "Failed to retrieve Invoice payment status:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Payment status could not be retrieved.",
      },
      {
        status: 500,
      }
    );
  }
};
