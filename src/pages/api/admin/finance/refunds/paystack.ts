import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "../../../../../types/supabase";

export const prerender = false;

interface CreatePaystackRefundRequest {
  transactionId?: string;
  amount?: number;
  reason?: string;
  internalNotes?: string;
}

interface PaystackRefundResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    amount: number;
    currency: string;
    status: string;
    expected_at?: string | null;
    refunded_at?: string | null;
    deducted_amount?: number;
    fully_deducted?: boolean;
    merchant_note?: string | null;
    customer_note?: string | null;
    transaction?:
      | {
          id?: number;
          reference?: string;
        }
      | number
      | null;
  };
}

/* Returns a JSON API response using the supplied HTTP status. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/* Generates a unique CloudTweak refund reference. */
function generateRefundReference() {
  return `REF-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
}

/* Initiates a Paystack refund for one Finance transaction. */
export const POST: APIRoute = async ({ request }) => {
  try {
    /* Require an authenticated CloudTweak user. */
    const authorizationHeader = request.headers.get("authorization");

    if (!authorizationHeader?.startsWith("Bearer ")) {
      return jsonResponse(
        {
          success: false,
          message: "Authentication is required.",
        },
        401
      );
    }

    /* Read the required server-only configuration. */
    const supabaseUrl = import.meta.env.SUPABASE_URL;

    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    const paystackSecretKey = import.meta.env.PAYSTACK_SECRET_KEY;

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey ||
      !paystackSecretKey
    ) {
      throw new Error("Refund environment variables are incomplete.");
    }

    /*
     * Use the requesting staff member's session to verify
     * that the caller is authenticated.
     */
    const userSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: authorizationHeader,
        },
      },
    });

    /* Use the service role only after authentication succeeds. */
    const adminSupabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    /* Confirm the requesting session belongs to a real authenticated user. */
    const { data: userData, error: userError } =
      await userSupabase.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse(
        {
          success: false,
          message: "Your session could not be verified.",
        },
        401
      );
    }

    /*
     * Confirm the authenticated user is an active Finance staff member.
     */
    const { data: isFinanceStaff, error: financeStaffError } =
      await userSupabase.rpc("is_finance_staff");

    if (financeStaffError || !isFinanceStaff) {
      return jsonResponse(
        {
          success: false,
          message: "You are not authorized to process refunds.",
        },
        403
      );
    }

    /* Parse and validate the requested refund. */
    const body = (await request.json()) as CreatePaystackRefundRequest;

    const transactionId = body.transactionId?.trim();

    const reason = body.reason?.trim();

    const requestedAmount = Number(body.amount);

    if (!transactionId) {
      return jsonResponse(
        {
          success: false,
          message: "Finance transaction ID is required.",
        },
        400
      );
    }

    if (!reason) {
      return jsonResponse(
        {
          success: false,
          message: "A refund reason is required.",
        },
        400
      );
    }

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return jsonResponse(
        {
          success: false,
          message: "Refund amount must be greater than zero.",
        },
        400
      );
    }

    /* Load the original Finance transaction. */
    const { data: transaction, error: transactionError } = await adminSupabase
      .from("financial_transactions")
      .select(
        `
        id,
        provider,
        provider_reference,
        payment_method,
        amount,
        refunded_amount,
        currency,
        status,
        customer_name,
        customer_email,
        source_table,
        source_id
        `
      )
      .eq("id", transactionId)
      .single();

    if (transactionError || !transaction) {
      return jsonResponse(
        {
          success: false,
          message: "The original Finance transaction could not be found.",
        },
        404
      );
    }

    if (transaction.provider !== "paystack") {
      return jsonResponse(
        {
          success: false,
          message:
            "Only Paystack transactions can be refunded through this action.",
        },
        409
      );
    }

    if (!transaction.provider_reference) {
      return jsonResponse(
        {
          success: false,
          message: "The transaction does not contain a Paystack reference.",
        },
        409
      );
    }

    if (
      transaction.status !== "paid" &&
      transaction.status !== "partially_refunded"
    ) {
      return jsonResponse(
        {
          success: false,
          message: "This transaction is not currently eligible for a refund.",
        },
        409
      );
    }

    /* Calculate the remaining amount that may still be refunded. */
    const originalAmount = Number(transaction.amount);

    const alreadyRefunded = Number(transaction.refunded_amount ?? 0);

    const refundableBalance = Number(
      (originalAmount - alreadyRefunded).toFixed(2)
    );

    if (requestedAmount > refundableBalance) {
      return jsonResponse(
        {
          success: false,
          message: `The maximum refundable balance is ${transaction.currency} ${refundableBalance.toFixed(
            2
          )}.`,
        },
        409
      );
    }

    /*
     * Prevent multiple active refund requests against the same
     * transaction from accidentally being submitted simultaneously.
     */
    const { data: pendingRefund, error: pendingRefundError } =
      await adminSupabase
        .from("finance_refunds")
        .select("id, status")
        .eq("original_transaction_id", transaction.id)
        .in("status", ["requested", "approved", "processing"])
        .maybeSingle();

    if (pendingRefundError) {
      throw pendingRefundError;
    }

    if (pendingRefund) {
      return jsonResponse(
        {
          success: false,
          message: "This transaction already has a refund being processed.",
        },
        409
      );
    }

    const refundReference = generateRefundReference();

    /*
     * Create the local refund record before contacting Paystack
     * so the operation has an internal audit trail.
     */
    const { data: refundRecord, error: refundRecordError } = await adminSupabase
      .from("finance_refunds")
      .insert({
        refund_reference: refundReference,
        original_transaction_id: transaction.id,
        provider: "paystack",
        payment_method: transaction.payment_method,
        requested_amount: requestedAmount,
        approved_amount: requestedAmount,
        refunded_amount: 0,
        currency: transaction.currency,
        reason,
        internal_notes: body.internalNotes?.trim() || null,
        status: "processing",
        requested_by: userData.user.id,
        approved_by: userData.user.id,
        approved_at: new Date().toISOString(),
        metadata: {
          source_table: transaction.source_table,
          source_id: transaction.source_id,
          customer_name: transaction.customer_name,
          customer_email: transaction.customer_email,
        },
      })
      .select()
      .single();

    if (refundRecordError || !refundRecord) {
      throw (
        refundRecordError ??
        new Error("The refund record could not be created.")
      );
    }

    /*
     * Paystack expects partial refund amounts in the
     * smallest currency unit.
     */
    const refundAmountInSubunit = Math.round(requestedAmount * 100);

    /* Send the refund request to Paystack. */
    const paystackResponse = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: transaction.provider_reference,
        amount: refundAmountInSubunit,
        currency: transaction.currency,
        customer_note: reason,
        merchant_note: `CloudTweak refund ${refundReference}: ${reason}`,
      }),
    });

    const paystackResult =
      (await paystackResponse.json()) as PaystackRefundResponse;

    /* Persist a failed Paystack initiation attempt for audit purposes. */
    if (
      !paystackResponse.ok ||
      !paystackResult.status ||
      !paystackResult.data
    ) {
      await adminSupabase
        .from("finance_refunds")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          provider_payload: paystackResult as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", refundRecord.id);

      return jsonResponse(
        {
          success: false,
          refundReference,
          message:
            paystackResult.message || "Paystack could not initiate the refund.",
        },
        502
      );
    }

    const paystackRefund = paystackResult.data;

    /*
     * Paystack queues refunds asynchronously, so do not mark
     * the refund successful immediately.
     */
    await adminSupabase
      .from("finance_refunds")
      .update({
        provider_refund_reference: String(paystackRefund.id),
        status: "processing",
        approved_amount: paystackRefund.amount / 100,
        provider_payload: paystackResult as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", refundRecord.id);

    return jsonResponse({
      success: true,
      refundId: refundRecord.id,
      refundReference,
      providerRefundReference: String(paystackRefund.id),
      status: paystackRefund.status,
      requestedAmount,
      currency: transaction.currency,
      refundableBalance,
      message:
        "The refund has been submitted to Paystack and is being processed.",
    });
  } catch (error) {
    console.error("Failed to initiate Paystack refund:", error);

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "The refund could not be initiated.",
      },
      500
    );
  }
};
