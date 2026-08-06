import type { APIRoute } from "astro";
import type { UndoReconciliationInput } from "../../../../types/reconciliation";
import type { Json } from "../../../../types/supabase";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

/**
 * Undo the Reconciliation or dispute state of one financial transaction.
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

    const body = (await request.json()) as UndoReconciliationInput;

    const { data: transaction, error } = await adminSupabase.rpc(
      "undo_financial_reconciliation",
      {
        p_transaction_id: transactionId,

        p_notes: body.notes?.trim() || undefined,

        p_performed_by: userId,

        p_metadata: (body.metadata ?? {}) as Json,
      }
    );

    if (error || !transaction) {
      throw error ?? new Error("The Reconciliation could not be undone.");
    }

    return financeJsonResponse({
      success: true,

      transaction,

      message: "Transaction returned to unreconciled status.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
