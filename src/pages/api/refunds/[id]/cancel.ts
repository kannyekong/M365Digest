import type { APIRoute } from "astro";
import type { CancelRefundInput } from "../../../../types/refund";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

/**
 * Cancel one Refund before it has been completed.
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

    const body = (await request.json()) as CancelRefundInput;

    const { data: refund, error: refundError } = await adminSupabase
      .from("finance_refunds")
      .select("*")
      .eq("id", refundId)
      .single();

    if (refundError || !refund) {
      throw refundError ?? new Error("Refund request not found.");
    }

    if (!["requested", "approved", "failed"].includes(refund.status)) {
      throw new Error("This Refund can no longer be cancelled.");
    }

    const cancellationReason = body.reason?.trim();

    const notes = [
      refund.internal_notes,
      body.internal_notes?.trim(),
      cancellationReason ? `Cancellation reason: ${cancellationReason}` : null,
      `Cancelled by user: ${userId}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const now = new Date().toISOString();

    const { data: cancelledRefund, error: cancellationError } =
      await adminSupabase
        .from("finance_refunds")
        .update({
          status: "cancelled",

          cancelled_at: now,

          internal_notes: notes || null,

          updated_at: now,
        })
        .eq("id", refundId)
        .in("status", ["requested", "approved", "failed"])
        .select("*")
        .single();

    if (cancellationError || !cancelledRefund) {
      throw (
        cancellationError ?? new Error("The Refund could not be cancelled.")
      );
    }

    return financeJsonResponse({
      success: true,

      refund: cancelledRefund,

      message: "Refund cancelled successfully.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
