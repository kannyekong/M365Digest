import type { APIRoute } from "astro";
import type { CreateRefundInput, RefundProvider } from "../../../types/refund";
import type { Database, Json } from "../../../types/supabase";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../lib/server/finance-api";

export const prerender = false;

type RefundInsert = Database["public"]["Tables"]["finance_refunds"]["Insert"];

const ALLOWED_REFUND_PROVIDERS: RefundProvider[] = [
  "manual",
  "paystack",
  "bank_transfer",
  "cash",
  "other",
];

/**
 * Convert a Refund amount into a valid positive monetary value.
 */
function normalizeRefundAmount(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Refund amount must be greater than zero.");
  }

  return Number(amount.toFixed(2));
}

/**
 * Create one Refund request against a paid income transaction.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { adminSupabase, userId } = await getFinanceApiClients(request);

    const body = (await request.json()) as CreateRefundInput;

    if (!body.original_transaction_id) {
      throw new Error("The original transaction is required.");
    }

    const reason = body.reason?.trim();

    if (!reason) {
      throw new Error("A Refund reason is required.");
    }

    const requestedAmount = normalizeRefundAmount(body.requested_amount);

    const provider = body.provider ?? "manual";

    if (!ALLOWED_REFUND_PROVIDERS.includes(provider)) {
      throw new Error("A valid Refund provider is required.");
    }

    const { data: transaction, error: transactionError } = await adminSupabase
      .from("financial_transactions")
      .select("*")
      .eq("id", body.original_transaction_id)
      .eq("transaction_type", "income")
      .is("archived_at", null)
      .single();

    if (transactionError || !transaction) {
      throw (
        transactionError ??
        new Error("The original income transaction was not found.")
      );
    }

    if (!["paid", "refunded"].includes(transaction.status)) {
      throw new Error("Only paid income transactions can be refunded.");
    }

    const originalAmount = Number(transaction.amount);

    const alreadyRefunded = Number(transaction.refunded_amount ?? 0);

    const refundableAmount = Math.max(originalAmount - alreadyRefunded, 0);

    if (requestedAmount > refundableAmount) {
      throw new Error(
        `The requested Refund exceeds the available refundable balance of ${transaction.currency} ${refundableAmount.toFixed(
          2
        )}.`
      );
    }

    const { data: refundReference, error: referenceError } =
      await adminSupabase.rpc("generate_finance_refund_reference");

    if (referenceError || !refundReference) {
      throw (
        referenceError ??
        new Error("The Refund reference could not be generated.")
      );
    }

    const refundInsert: RefundInsert = {
      refund_reference: refundReference,

      original_transaction_id: transaction.id,

      invoice_id: body.invoice_id ?? null,

      receipt_id: body.receipt_id ?? null,

      provider,

      provider_refund_reference: null,

      payment_method:
        body.payment_method?.trim() || transaction.payment_method || null,

      requested_amount: requestedAmount,

      approved_amount: null,

      refunded_amount: 0,

      currency: transaction.currency,

      reason,

      internal_notes: body.internal_notes?.trim() || null,

      status: "requested",

      requested_at: new Date().toISOString(),

      requested_by: userId,

      approved_by: null,

      processed_by: null,

      rejected_by: null,

      provider_payload: {},

      metadata: (body.metadata ?? {}) as Json,

      archived_at: null,
    };

    const { data: refund, error: refundError } = await adminSupabase
      .from("finance_refunds")
      .insert(refundInsert)
      .select("*")
      .single();

    if (refundError || !refund) {
      throw (
        refundError ?? new Error("The Refund request could not be created.")
      );
    }

    return financeJsonResponse(
      {
        success: true,

        refund,

        message: "Refund request created successfully.",
      },
      201
    );
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
