import type { APIRoute } from "astro";
import type { ProcessRefundInput } from "../../../../types/refund";
import type { Json } from "../../../../types/supabase";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

/**
 * Convert one processed Refund amount into a valid positive number.
 */
function normalizeProcessedAmount(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Processed Refund amount must be greater than zero.");
  }

  return Number(amount.toFixed(2));
}

/**
 * Process one approved manual Refund and update the original transaction.
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

    const body = (await request.json()) as ProcessRefundInput;

    const { data: refund, error: refundError } = await adminSupabase
      .from("finance_refunds")
      .select("*")
      .eq("id", refundId)
      .single();

    if (refundError || !refund) {
      throw refundError ?? new Error("Refund request not found.");
    }

    if (!["approved", "processing", "failed"].includes(refund.status)) {
      throw new Error(
        "Only approved, processing or failed Refunds can be processed."
      );
    }

    const refundedAmount =
      body.refunded_amount === undefined
        ? Number(refund.approved_amount ?? refund.requested_amount)
        : normalizeProcessedAmount(body.refunded_amount);

    const maximumApprovedAmount = Number(
      refund.approved_amount ?? refund.requested_amount
    );

    if (refundedAmount > maximumApprovedAmount) {
      throw new Error(
        "The processed amount cannot exceed the approved Refund amount."
      );
    }

    const providerReference = body.provider_refund_reference?.trim() || null;

    if (
      refund.provider !== "cash" &&
      refund.provider !== "manual" &&
      !providerReference
    ) {
      throw new Error("A provider Refund reference is required.");
    }

    const notes = [refund.internal_notes, body.internal_notes?.trim()]
      .filter(Boolean)
      .join("\n\n");

    const { data: processingRefund, error: processingError } =
      await adminSupabase
        .from("finance_refunds")
        .update({
          status: "processing",

          payment_method: body.payment_method?.trim() || refund.payment_method,

          provider_refund_reference:
            providerReference ?? refund.provider_refund_reference,

          internal_notes: notes || null,

          updated_at: new Date().toISOString(),
        })
        .eq("id", refundId)
        .select("*")
        .single();

    if (processingError || !processingRefund) {
      throw (
        processingError ?? new Error("The Refund could not enter processing.")
      );
    }

    const { data: successfulRefund, error: processError } =
      await adminSupabase.rpc("process_successful_finance_refund", {
        p_refund_id: refundId,

        p_refunded_amount: refundedAmount,

        p_provider_refund_reference: providerReference ?? undefined,

        p_provider_payload: (body.provider_payload ?? {}) as Json,

        p_processed_by: userId,
      });

    if (processError || !successfulRefund) {
      const failureTime = new Date().toISOString();

      await adminSupabase
        .from("finance_refunds")
        .update({
          status: "failed",

          failed_at: failureTime,

          updated_at: failureTime,
        })
        .eq("id", refundId);

      throw processError ?? new Error("The Refund could not be processed.");
    }

    return financeJsonResponse({
      success: true,

      refund: successfulRefund,

      message: "Refund processed successfully.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
