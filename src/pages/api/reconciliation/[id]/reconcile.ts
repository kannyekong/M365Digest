import type { APIRoute } from "astro";
import type { ReconcileTransactionInput } from "../../../../types/reconciliation";
import type { Json } from "../../../../types/supabase";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

/**
 * Convert one external amount into a valid non-negative number.
 */
function normalizeExternalAmount(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("External amount must be zero or greater.");
  }

  return Number(amount.toFixed(2));
}

/**
 * Reconcile one financial transaction against an external record.
 */
export const POST: APIRoute = async ({ request, params }) => {
  try {
    const transactionId = params.id;

    if (!transactionId) {
      return financeJsonResponse(
        {
          success: false,

          message: "Transaction ID is required.",
        },
        400
      );
    }

    const { adminSupabase, userId } = await getFinanceApiClients(request);

    const body = (await request.json()) as ReconcileTransactionInput;

    const externalReference = body.external_reference?.trim();

    if (!externalReference) {
      throw new Error("An external reconciliation reference is required.");
    }

    if (!body.settlement_date) {
      throw new Error("A settlement date is required.");
    }

    const externalAmount = normalizeExternalAmount(body.external_amount);

    const { data: transaction, error } = await adminSupabase.rpc(
      "reconcile_financial_transaction",
      {
        p_transaction_id: transactionId,

        p_external_reference: externalReference,

        p_external_amount: externalAmount,

        p_settlement_date: body.settlement_date,

        p_notes: body.notes?.trim() || undefined,

        p_evidence_url: body.evidence_url?.trim() || undefined,

        p_performed_by: userId,

        p_metadata: (body.metadata ?? {}) as Json,
      }
    );

    if (error || !transaction) {
      throw error ?? new Error("The transaction could not be reconciled.");
    }

    return financeJsonResponse({
      success: true,

      transaction,

      message: "Transaction reconciled successfully.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
