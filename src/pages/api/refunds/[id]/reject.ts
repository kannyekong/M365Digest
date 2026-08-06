import type { APIRoute } from "astro";
import type { RejectRefundInput } from "../../../../types/refund";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

/**
 * Reject one pending Refund request.
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

    const body = (await request.json()) as RejectRefundInput;

    const rejectionReason = body.reason?.trim();

    if (!rejectionReason) {
      throw new Error("A rejection reason is required.");
    }

    const { data: refund, error: refundError } = await adminSupabase
      .from("finance_refunds")
      .select("*")
      .eq("id", refundId)
      .single();

    if (refundError || !refund) {
      throw refundError ?? new Error("Refund request not found.");
    }

    if (!["requested", "approved"].includes(refund.status)) {
      throw new Error("Only requested or approved Refunds can be rejected.");
    }

    const now = new Date().toISOString();

    const notes = [
      refund.internal_notes,
      body.internal_notes?.trim(),
      `Rejection reason: ${rejectionReason}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { data: rejectedRefund, error: rejectionError } = await adminSupabase
      .from("finance_refunds")
      .update({
        status: "rejected",

        rejected_at: now,

        rejected_by: userId,

        internal_notes: notes || null,

        updated_at: now,
      })
      .eq("id", refundId)
      .in("status", ["requested", "approved"])
      .select("*")
      .single();

    if (rejectionError || !rejectedRefund) {
      throw rejectionError ?? new Error("The Refund could not be rejected.");
    }

    return financeJsonResponse({
      success: true,

      refund: rejectedRefund,

      message: "Refund rejected successfully.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
