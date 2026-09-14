import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../../../lib/supabase/server";

export const prerender = false;

interface ReconcileProvidusRequest {
  providusTransactionId?: string;
  clientId?: string;
  invoiceId?: string;
}

interface ReconciliationResult {
  success: boolean;
  providus_transaction_id: string;
  providus_reference: string;
  financial_transaction_id: string;
  client_id: string;
  client_name: string;
  invoice_id: string;
  invoice_number: string;
  payment_amount: number;
  previous_amount_paid: number;
  new_amount_paid: number;
  previous_amount_due: number;
  new_amount_due: number;
  invoice_status: string;
  payment_match: "exact" | "partial";
}

/* Returns a JSON API response using a consistent structure. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/* Reconciles one Providus credit against a selected client invoice. */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const payload = (await request.json()) as ReconcileProvidusRequest;

    const providusTransactionId = payload.providusTransactionId?.trim();

    const clientId = payload.clientId?.trim();

    const invoiceId = payload.invoiceId?.trim();

    if (!providusTransactionId || !clientId || !invoiceId) {
      return jsonResponse(
        {
          success: false,
          message: "Providus transaction, client and invoice are required.",
        },
        400
      );
    }

    /*
     * Replace this user lookup with your existing admin authentication
     * helper if your project exposes the authenticated admin differently.
     *
     * If locals.user already exists in your admin routes, this will pass
     * the current authenticated user's UUID to the reconciliation RPC.
     */
    const authenticatedUserId =
      (
        locals as {
          user?: {
            id?: string;
          };
        }
      ).user?.id ?? null;

    const supabase = createSupabaseAdminClient();

    /*
     * The RPC owns the financial transaction boundary. It locks and
     * validates the Providus row and invoice before making any changes.
     */
    const { data, error } = await supabase.rpc(
      "reconcile_providus_invoice_payment",
      {
        p_providus_transaction_id: providusTransactionId,
        p_client_id: clientId,
        p_invoice_id: invoiceId,
        p_reconciled_by: authenticatedUserId,
      }
    );

    if (error) {
      console.error("Unable to reconcile Providus invoice payment:", error);

      return jsonResponse(
        {
          success: false,
          message: error.message || "Unable to reconcile Providus payment.",
        },
        400
      );
    }

    const result = data as ReconciliationResult | null;

    if (!result?.success) {
      return jsonResponse(
        {
          success: false,
          message: "Providus reconciliation did not complete.",
        },
        500
      );
    }

    /*
     * Existing admin notification integration will be inserted here.
     *
     * This should publish through CloudTweak's current notification system,
     * not through a new Providus-specific notification implementation.
     *
     * Suggested event payload:
     *
     * title:
     *   "Providus payment reconciled"
     *
     * message:
     *   "₦100.00 received via Providus was reconciled to
     *    INV-2026-000010 for Akaneno Ekong."
     *
     * href:
     *   "/admin/finance/providus"
     */

    return jsonResponse({
      success: true,
      message: "Providus payment reconciled successfully.",
      reconciliation: result,
    });
  } catch (error) {
    console.error("Unexpected Providus reconciliation error:", error);

    return jsonResponse(
      {
        success: false,
        message: "Unable to reconcile Providus payment.",
      },
      500
    );
  }
};
