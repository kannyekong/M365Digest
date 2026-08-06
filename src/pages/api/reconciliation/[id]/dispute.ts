import type { APIRoute } from "astro";
import type { DisputeTransactionInput } from "../../../../types/reconciliation";
import type { Json } from "../../../../types/supabase";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

/**
 * Normalize one optional external amount.
 */
function normalizeOptionalExternalAmount(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("External amount must be zero or greater.");
  }

  return Number(amount.toFixed(2));
}

/**
 * Mark one financial transaction as disputed.
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

    const body = (await request.json()) as DisputeTransactionInput;

    const disputeReason = body.dispute_reason?.trim();

    if (!disputeReason) {
      throw new Error("A dispute reason is required.");
    }

    const externalAmount = normalizeOptionalExternalAmount(
      body.external_amount
    );

    const { data: transaction, error } = await adminSupabase.rpc(
      "dispute_financial_transaction",
      {
        p_transaction_id: transactionId,

        p_dispute_reason: disputeReason,

        p_external_reference: body.external_reference?.trim() || undefined,

        p_external_amount: externalAmount,

        p_settlement_date: body.settlement_date || undefined,

        p_notes: body.notes?.trim() || undefined,

        p_evidence_url: body.evidence_url?.trim() || undefined,

        p_performed_by: userId,

        p_metadata: (body.metadata ?? {}) as Json,
      }
    );

    if (error || !transaction) {
      throw error ?? new Error("The transaction could not be disputed.");
    }

    return financeJsonResponse({
      success: true,

      transaction,

      message: "Transaction marked as disputed.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
