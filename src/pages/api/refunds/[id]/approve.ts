import type { APIRoute } from "astro";
import type { ApproveRefundInput } from "../../../../types/refund";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

/**
 * Convert one approved Refund amount into a valid positive number.
 */
function normalizeApprovedAmount(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Approved Refund amount must be greater than zero.");
  }

  return Number(amount.toFixed(2));
}

/**
 * Approve one pending Refund request.
 */
export const POST: APIRoute = async ({ request, params }) => {
  try {
    const refundId = params.id;

    if (!refundId) {
      return financeJsonResponse(
        {
          success: false,
          message: "Refund ID is required.",
        },
        400
      );
    }

    const { adminSupabase, userId } = await getFinanceApiClients(request);

    const body = (await request.json()) as ApproveRefundInput;

    const { data: refund, error: refundError } = await adminSupabase
      .from("finance_refunds")
      .select("*")
      .eq("id", refundId)
      .single();

    if (refundError || !refund) {
      throw refundError ?? new Error("Refund request not found.");
    }

    if (refund.status !== "requested") {
      throw new Error("Only requested Refunds can be approved.");
    }

    const approvedAmount =
      body.approved_amount === undefined
        ? Number(refund.requested_amount)
        : normalizeApprovedAmount(body.approved_amount);

    if (approvedAmount > Number(refund.requested_amount)) {
      throw new Error(
        "The approved amount cannot exceed the requested amount."
      );
    }

    const { data: transaction, error: transactionError } = await adminSupabase
      .from("financial_transactions")
      .select(
        `
        amount,
        refunded_amount
        `
      )
      .eq("id", refund.original_transaction_id)
      .single();

    if (transactionError || !transaction) {
      throw (
        transactionError ?? new Error("The original transaction was not found.")
      );
    }

    const refundableAmount = Math.max(
      Number(transaction.amount) - Number(transaction.refunded_amount ?? 0),
      0
    );

    if (approvedAmount > refundableAmount) {
      throw new Error(
        "The approved amount exceeds the current refundable balance."
      );
    }

    const now = new Date().toISOString();

    const { data: approvedRefund, error: approvalError } = await adminSupabase
      .from("finance_refunds")
      .update({
        approved_amount: approvedAmount,

        status: "approved",

        approved_at: now,

        approved_by: userId,

        internal_notes: body.internal_notes?.trim() || refund.internal_notes,

        updated_at: now,
      })
      .eq("id", refundId)
      .eq("status", "requested")
      .select("*")
      .single();

    if (approvalError || !approvedRefund) {
      throw approvalError ?? new Error("The Refund could not be approved.");
    }

    return financeJsonResponse({
      success: true,

      refund: approvedRefund,

      message: "Refund approved successfully.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
