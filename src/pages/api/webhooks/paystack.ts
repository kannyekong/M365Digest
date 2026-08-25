import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Database, Json } from "../../../types/supabase";
import { sendAcademyWelcomeEmail } from "../../../lib/email/senders/send-academy-welcome";

export const prerender = false;

/* Confirms that the Paystack webhook route is deployed. */
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      success: true,
      message: "Paystack webhook endpoint is active.",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};

interface PaystackChargeData {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  channel: string | null;
  gateway_response: string | null;

  customer?: {
    email?: string;
  };

  metadata:
    | {
        registration_id?: string;
        program_id?: string;
        program_slug?: string;
        program_title?: string;
        student_name?: string;

        payment_type?: string;
        invoice_id?: string;
        invoice_number?: string;
        payment_attempt_id?: string;
      }
    | string
    | null;
}

interface PaystackRefundData {
  status: string;
  transaction_reference: string;
  refund_reference: string | null;
  amount: string | number;
  currency: string;
  processor?: string | null;
  domain?: string | null;

  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
}

interface PaystackWebhookEvent {
  event: string;
  data: PaystackChargeData | PaystackRefundData;
}

/* Returns a JSON response using the supplied HTTP status. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/* Normalizes Paystack metadata into an object. */
function parsePaystackMetadata(metadata: PaystackChargeData["metadata"]) {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === "object") {
    return metadata;
  }

  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/* Converts stored Supabase JSON metadata into a safe object. */
function normalizeMetadata(
  metadata: Json | null
): Record<string, Json | undefined> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata;
  }

  return {};
}

/* Securely verifies the Paystack webhook signature. */
function verifyPaystackSignature(
  rawBody: string,
  receivedSignature: string,
  secretKey: string
) {
  const expectedSignature = createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(receivedSignature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

/* Returns true when the Paystack event belongs to the refund lifecycle. */
function isPaystackRefundEvent(eventName: string) {
  return [
    "refund.pending",
    "refund.processing",
    "refund.needs-attention",
    "refund.failed",
    "refund.processed",
  ].includes(eventName);
}

/* Processes Paystack webhook events for Invoice, Academy and refund payments. */
export const POST: APIRoute = async ({ request }) => {
  try {
    /* Read required server-only environment variables. */
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    const paystackSecretKey = import.meta.env.PAYSTACK_SECRET_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey || !paystackSecretKey) {
      console.error("Paystack webhook environment variables are incomplete.");

      return jsonResponse(
        {
          received: false,
          message: "Webhook configuration is incomplete.",
        },
        500
      );
    }

    /* Read the raw request body because Paystack signs the exact payload. */
    const rawBody = await request.text();

    const receivedSignature = request.headers.get("x-paystack-signature");

    if (!receivedSignature) {
      console.warn("Paystack webhook received without a signature.");

      return jsonResponse(
        {
          received: false,
          message: "Missing webhook signature.",
        },
        401
      );
    }

    /* Confirm the webhook originated from Paystack. */
    const signatureIsValid = verifyPaystackSignature(
      rawBody,
      receivedSignature,
      paystackSecretKey
    );

    if (!signatureIsValid) {
      console.warn("Paystack webhook signature validation failed.");

      return jsonResponse(
        {
          received: false,
          message: "Invalid webhook signature.",
        },
        401
      );
    }

    let webhookEvent: PaystackWebhookEvent;

    /* Parse the payload after successful signature validation. */
    try {
      webhookEvent = JSON.parse(rawBody) as PaystackWebhookEvent;
    } catch (error) {
      console.error("Paystack webhook JSON parsing failed:", error);

      return jsonResponse(
        {
          received: false,
          message: "Invalid webhook payload.",
        },
        400
      );
    }

    /* Acknowledge events unrelated to successful charges and refunds. */
    if (
      webhookEvent.event !== "charge.success" &&
      !isPaystackRefundEvent(webhookEvent.event)
    ) {
      return jsonResponse({
        received: true,
        processed: false,
        event: webhookEvent.event,
        message: "Event acknowledged.",
      });
    }

    /* Create a trusted server-side Supabase client. */
    const supabase = createClient<Database>(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    /*
     * ==================================
     * PAYSTACK REFUND WORKFLOW
     * ==================================
     */
    if (isPaystackRefundEvent(webhookEvent.event)) {
      const refundData = webhookEvent.data as PaystackRefundData;

      const transactionReference = refundData.transaction_reference?.trim();

      if (!transactionReference) {
        console.error(
          "Paystack refund webhook has no original transaction reference.",
          {
            event: webhookEvent.event,
          }
        );

        return jsonResponse(
          {
            received: false,
            processed: false,
            message: "The refund event has no transaction reference.",
          },
          400
        );
      }

      /* Convert Paystack's refund amount from subunits into major currency units. */
      const refundedAmount = Number(refundData.amount) / 100;

      if (!Number.isFinite(refundedAmount) || refundedAmount <= 0) {
        console.error("Paystack refund webhook contains an invalid amount.", {
          event: webhookEvent.event,
          amount: refundData.amount,
        });

        return jsonResponse(
          {
            received: true,
            processed: false,
            message: "The refund amount is invalid.",
          },
          400
        );
      }

      /* Load the Finance transaction belonging to the original Paystack payment. */
      const { data: originalTransaction, error: originalTransactionError } =
        await supabase
          .from("financial_transactions")
          .select(
            `
          id,
          amount,
          refunded_amount,
          currency,
          status,
          provider_reference,
          source_table,
          source_id
          `
          )
          .eq("provider_reference", transactionReference)
          .maybeSingle();

      if (originalTransactionError) {
        console.error(
          "Paystack refund original transaction lookup failed:",
          originalTransactionError
        );

        return jsonResponse(
          {
            received: true,
            processed: false,
            message: "The original Finance transaction could not be loaded.",
          },
          500
        );
      }

      if (!originalTransaction) {
        console.warn(
          "No Finance transaction matched Paystack refund:",
          transactionReference
        );

        return jsonResponse({
          received: true,
          processed: false,
          event: webhookEvent.event,
          transactionReference,
          message: "No matching Finance transaction was found.",
        });
      }

      /* Load the currently active local refund for this Finance transaction. */
      const { data: refundRecord, error: refundRecordError } = await supabase
        .from("finance_refunds")
        .select("*")
        .eq("original_transaction_id", originalTransaction.id)
        .in("status", ["requested", "approved", "processing"])
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (refundRecordError) {
        console.error(
          "Paystack refund record lookup failed:",
          refundRecordError
        );

        return jsonResponse(
          {
            received: true,
            processed: false,
            transactionReference,
            message: "The local refund record could not be loaded.",
          },
          500
        );
      }

      /*
       * A duplicate refund.processed webhook may arrive after the local
       * refund has already moved from processing to successful.
       */
      let resolvedRefundRecord = refundRecord;

      if (!resolvedRefundRecord) {
        const { data: existingCompletedRefund, error: completedRefundError } =
          await supabase
            .from("finance_refunds")
            .select("*")
            .eq("original_transaction_id", originalTransaction.id)
            .eq("refunded_amount", refundedAmount)
            .order("created_at", {
              ascending: false,
            })
            .limit(1)
            .maybeSingle();

        if (completedRefundError) {
          throw completedRefundError;
        }

        resolvedRefundRecord = existingCompletedRefund;
      }

      if (!resolvedRefundRecord) {
        console.warn("No local Finance refund matched Paystack event:", {
          event: webhookEvent.event,
          transactionReference,
        });

        return jsonResponse({
          received: true,
          processed: false,
          transactionReference,
          message: "No matching local refund request was found.",
        });
      }

      /* Preserve Paystack's refund reference when one is supplied. */
      const providerRefundReference =
        refundData.refund_reference ||
        resolvedRefundRecord.provider_refund_reference;

      /*
       * Paystack pending, processing and needs-attention events all remain
       * locally in the processing state.
       */
      if (
        webhookEvent.event === "refund.pending" ||
        webhookEvent.event === "refund.processing" ||
        webhookEvent.event === "refund.needs-attention"
      ) {
        const { error: processingUpdateError } = await supabase
          .from("finance_refunds")
          .update({
            status: "processing",
            provider_refund_reference: providerRefundReference,
            provider_payload: refundData as unknown as Json,
            metadata: {
              ...normalizeMetadata(resolvedRefundRecord.metadata ?? null),
              paystack_refund_event: webhookEvent.event,
              paystack_refund_status: refundData.status,
              needs_attention: webhookEvent.event === "refund.needs-attention",
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", resolvedRefundRecord.id);

        if (processingUpdateError) {
          throw processingUpdateError;
        }

        return jsonResponse({
          received: true,
          processed: true,
          paymentType: "refund",
          refundId: resolvedRefundRecord.id,
          refundStatus: "processing",
          event: webhookEvent.event,
          transactionReference,
          message:
            webhookEvent.event === "refund.needs-attention"
              ? "The refund requires customer bank details before Paystack can continue."
              : "The refund is still being processed.",
        });
      }

      /* Record a failed refund without changing the original Revenue transaction. */
      if (webhookEvent.event === "refund.failed") {
        const { error: failedUpdateError } = await supabase
          .from("finance_refunds")
          .update({
            status: "failed",
            failed_at: new Date().toISOString(),
            provider_refund_reference: providerRefundReference,
            provider_payload: refundData as unknown as Json,
            metadata: {
              ...normalizeMetadata(resolvedRefundRecord.metadata ?? null),
              paystack_refund_event: webhookEvent.event,
              paystack_refund_status: refundData.status,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", resolvedRefundRecord.id);

        if (failedUpdateError) {
          throw failedUpdateError;
        }

        return jsonResponse({
          received: true,
          processed: true,
          paymentType: "refund",
          refundId: resolvedRefundRecord.id,
          refundStatus: "failed",
          transactionReference,
          message:
            "Paystack reported that the refund failed. Revenue was not changed.",
        });
      }

      /*
       * refund.processed is the authoritative confirmation that Paystack
       * successfully processed the refund.
       */
      if (webhookEvent.event === "refund.processed") {
        /*
         * If this exact refund was already finalized, acknowledge the duplicate
         * without applying any financial changes again.
         */
        if (resolvedRefundRecord.status === "successful") {
          return jsonResponse({
            received: true,
            processed: true,
            alreadyProcessed: true,
            paymentType: "refund",
            refundId: resolvedRefundRecord.id,
            refundStatus: "successful",
            transactionReference,
            message: "The refund was already processed.",
          });
        }

        const processedAt = new Date().toISOString();

        /* Mark the local refund as successfully processed. */
        const { error: successfulRefundError } = await supabase
          .from("finance_refunds")
          .update({
            status: "successful",
            refunded_amount: refundedAmount,
            approved_amount: refundedAmount,
            processed_at: processedAt,
            provider_refund_reference: providerRefundReference,
            provider_payload: refundData as unknown as Json,
            metadata: {
              ...normalizeMetadata(resolvedRefundRecord.metadata ?? null),
              paystack_refund_event: webhookEvent.event,
              paystack_refund_status: refundData.status,
            },
            updated_at: processedAt,
          })
          .eq("id", resolvedRefundRecord.id);

        if (successfulRefundError) {
          throw successfulRefundError;
        }

        /*
         * Recalculate the total from all successful refunds instead of
         * incrementing refunded_amount directly. This keeps duplicate webhook
         * deliveries from increasing the refunded total twice.
         */
        const { data: successfulRefunds, error: successfulRefundsError } =
          await supabase
            .from("finance_refunds")
            .select("refunded_amount")
            .eq("original_transaction_id", originalTransaction.id)
            .eq("status", "successful");

        if (successfulRefundsError) {
          throw successfulRefundsError;
        }

        const totalRefunded = Number(
          (successfulRefunds ?? [])
            .reduce(
              (total, refund) => total + Number(refund.refunded_amount ?? 0),
              0
            )
            .toFixed(2)
        );

        const originalAmount = Number(originalTransaction.amount);

        /*
         * Never allow the Finance transaction's refunded amount to exceed
         * the original recognized Revenue amount.
         */
        const normalizedRefundTotal = Math.min(totalRefunded, originalAmount);

        const transactionStatus =
          normalizedRefundTotal >= originalAmount
            ? "refunded"
            : "partially_refunded";

        /* Apply the confirmed refund to the original Finance transaction. */
        const { error: financeTransactionUpdateError } = await supabase
          .from("financial_transactions")
          .update({
            refunded_amount: normalizedRefundTotal,
            status: transactionStatus,
            updated_at: processedAt,
          })
          .eq("id", originalTransaction.id);

        if (financeTransactionUpdateError) {
          throw financeTransactionUpdateError;
        }

        return jsonResponse({
          received: true,
          processed: true,
          paymentType: "refund",
          refundId: resolvedRefundRecord.id,
          refundStatus: "successful",
          transactionId: originalTransaction.id,
          transactionStatus,
          transactionReference,
          refundedAmount,
          totalRefunded: normalizedRefundTotal,
          currency: refundData.currency,
          message:
            transactionStatus === "refunded"
              ? "The Paystack refund was completed and the Finance transaction is fully refunded."
              : "The Paystack refund was completed and the Finance transaction is partially refunded.",
        });
      }

      return jsonResponse({
        received: true,
        processed: false,
        paymentType: "refund",
        event: webhookEvent.event,
        message: "The refund event was acknowledged.",
      });
    }

    /*
     * From this point onward we are processing charge.success,
     * so the event data can safely be treated as charge data.
     */
    const transaction = webhookEvent.data as PaystackChargeData;

    if (!transaction.reference?.trim()) {
      console.error(
        "Paystack charge.success event has no transaction reference."
      );

      return jsonResponse(
        {
          received: false,
          message: "The successful charge has no reference.",
        },
        400
      );
    }

    /* Determines whether a Paystack transaction belongs to an Invoice. */
    async function isInvoicePayment(
      paymentTransaction: PaystackChargeData,
      metadata: Record<string, unknown>
    ) {
      if (metadata.payment_type === "invoice") {
        return true;
      }

      const { data: paymentAttempt, error: paymentAttemptError } =
        await supabase
          .from("invoice_payment_attempts")
          .select("id")
          .eq("reference", paymentTransaction.reference)
          .maybeSingle();

      if (paymentAttemptError) {
        throw paymentAttemptError;
      }

      return Boolean(paymentAttempt);
    }

    /* Processes one successful Invoice payment using the existing database RPC. */
    async function processInvoicePayment(
      paymentTransaction: PaystackChargeData
    ) {
      const amountPaid = Number(paymentTransaction.amount) / 100;

      if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
        throw new Error("The Invoice payment amount is invalid.");
      }

      const { data: updatedInvoice, error: invoicePaymentError } =
        await supabase.rpc("process_invoice_payment_success", {
          p_reference: paymentTransaction.reference,
          p_amount: amountPaid,
          p_currency: paymentTransaction.currency,
          p_paystack_transaction_id: paymentTransaction.id,
          p_paid_at: paymentTransaction.paid_at ?? new Date().toISOString(),
          p_channel: paymentTransaction.channel ?? "",
          p_gateway_response: paymentTransaction.gateway_response ?? "",
          p_raw_response: paymentTransaction as unknown as Json,
        });

      if (invoicePaymentError) {
        throw invoicePaymentError;
      }

      return updatedInvoice;
    }

    /* Creates or returns the Finance ledger entry for an Academy payment. */
    async function ensureAcademyFinanceTransaction({
      registrationId,
      paymentReference,
      programTitle,
      learnerName,
      learnerEmail,
      learnerPhone,
      amountExpected,
      amountPaid,
      currency,
      paymentChannel,
      paidAt,
      reconciliationStatus,
      paymentDifference,
      providerPayload,
    }: {
      registrationId: string;
      paymentReference: string;
      programTitle: string;
      learnerName: string;
      learnerEmail: string;
      learnerPhone: string | null;
      amountExpected: number;
      amountPaid: number;
      currency: string;
      paymentChannel: string | null;
      paidAt: string;
      reconciliationStatus: "matched" | "underpaid" | "overpaid";
      paymentDifference: number;
      providerPayload: PaystackChargeData;
    }) {
      const internalReference = `ACADEMY-${paymentReference}`;

      /* Return the existing transaction if this payment was already recorded. */
      const { data: existingTransaction, error: existingTransactionError } =
        await supabase
          .from("financial_transactions")
          .select("id")
          .eq("internal_reference", internalReference)
          .maybeSingle();

      if (existingTransactionError) {
        throw existingTransactionError;
      }

      if (existingTransaction) {
        return existingTransaction;
      }

      /*
       * Underpayments remain unsettled while matched and overpaid payments
       * have covered the Academy program fee.
       */
      const financeStatus =
        reconciliationStatus === "underpaid" ? "processing" : "paid";

      const financeReconciliationStatus =
        reconciliationStatus === "matched" ? "reconciled" : "disputed";

      /*
       * For an overpayment, recognize only the expected Academy fee.
       * external_amount preserves the full amount received from Paystack.
       */
      const recognizedRevenue =
        reconciliationStatus === "overpaid" ? amountExpected : amountPaid;

      const transactionDate = paidAt.slice(0, 10);

      const reconciledAt = reconciliationStatus === "matched" ? paidAt : null;

      const { data: financeTransaction, error: financeTransactionError } =
        await supabase
          .from("financial_transactions")
          .insert({
            transaction_type: "income",
            transaction_category: "academy",
            provider: "paystack",
            payment_method: paymentChannel,
            source_table: "academy_registrations",
            source_id: registrationId,
            customer_name: learnerName,
            customer_email: learnerEmail,
            customer_phone: learnerPhone,
            description: `${programTitle} Academy registration payment`,
            internal_reference: internalReference,
            provider_reference: paymentReference,
            amount: recognizedRevenue,
            fee_amount: 0,
            tax_amount: 0,
            refunded_amount: 0,
            currency,
            base_currency: currency,
            exchange_rate: 1,
            base_amount: recognizedRevenue,
            status: financeStatus,
            reconciliation_status: financeReconciliationStatus,
            transaction_date: transactionDate,
            paid_at: paidAt,
            reconciled_at: reconciledAt,
            external_amount: amountPaid,
            reconciliation_reference: paymentReference,
            reconciliation_notes:
              reconciliationStatus === "matched"
                ? "Academy payment matched the expected program fee."
                : reconciliationStatus === "overpaid"
                  ? `Academy payment exceeded the expected fee by ${paymentDifference.toFixed(
                      2
                    )} ${currency}.`
                  : `Academy payment is below the expected fee by ${Math.abs(
                      paymentDifference
                    ).toFixed(2)} ${currency}.`,
            provider_payload: providerPayload as unknown as Json,
            metadata: {
              payment_type: "academy",
              registration_id: registrationId,
              reconciliation_status: reconciliationStatus,
              payment_difference: paymentDifference,
              amount_expected: amountExpected,
              amount_received: amountPaid,
            },
          })
          .select("id")
          .single();

      if (financeTransactionError) {
        /*
         * Another webhook may have inserted the same unique internal
         * reference before this request completed.
         */
        if (financeTransactionError.code === "23505") {
          const { data: existingAfterConflict, error: conflictLookupError } =
            await supabase
              .from("financial_transactions")
              .select("id")
              .eq("internal_reference", internalReference)
              .single();

          if (conflictLookupError) {
            throw conflictLookupError;
          }

          return existingAfterConflict;
        }

        throw financeTransactionError;
      }

      return financeTransaction;
    }

    /* Sends the Academy welcome email once a registration has a completed payment. */
    async function ensureAcademyWelcomeEmail({
      registrationId,
      firstName,
      lastName,
      email,
      programTitle,
      amountPaid,
      currency,
      paymentReference,
      reconciliationStatus,
    }: {
      registrationId: string;
      firstName: string;
      lastName: string;
      email: string;
      programTitle: string;
      amountPaid: number;
      currency: string;
      paymentReference: string;
      reconciliationStatus: "matched" | "underpaid" | "overpaid";
    }) {
      /*
       * An underpaid registration remains pending, so the learner
       * must not receive an email saying their registration is active.
       */
      if (reconciliationStatus === "underpaid") {
        return {
          sent: false,
          skipped: true,
          reason: "underpaid",
        };
      }

      /*
       * Load the latest registration metadata before deciding whether
       * the welcome email has already been sent.
       */
      const { data: currentRegistration, error: registrationLookupError } =
        await supabase
          .from("academy_registrations")
          .select("metadata")
          .eq("id", registrationId)
          .single();

      if (registrationLookupError) {
        console.error(
          "Academy welcome email registration lookup failed:",
          registrationLookupError
        );

        return {
          sent: false,
          skipped: false,
          reason: "registration_lookup_failed",
        };
      }

      const currentMetadata = normalizeMetadata(currentRegistration.metadata);

      const welcomeEmailMetadata =
        currentMetadata.welcome_email &&
        typeof currentMetadata.welcome_email === "object" &&
        !Array.isArray(currentMetadata.welcome_email)
          ? currentMetadata.welcome_email
          : null;

      /*
       * Do not send another welcome email when a previous webhook
       * has already recorded successful delivery.
       */
      if (
        welcomeEmailMetadata &&
        "status" in welcomeEmailMetadata &&
        welcomeEmailMetadata.status === "sent"
      ) {
        return {
          sent: false,
          skipped: true,
          reason: "already_sent",
        };
      }

      try {
        /* Send the transactional Academy welcome email through Resend. */
        const welcomeEmailResult = await sendAcademyWelcomeEmail({
          registrationId,
          firstName,
          lastName,
          email,
          programTitle,
          amountPaid,
          currency,
          paymentReference,
        });

        /*
         * Reload metadata after sending so that we preserve any changes
         * another payment process may have written while Resend was running.
         */
        const { data: latestRegistration, error: latestRegistrationError } =
          await supabase
            .from("academy_registrations")
            .select("metadata")
            .eq("id", registrationId)
            .single();

        if (latestRegistrationError) {
          console.error(
            "Academy welcome email metadata reload failed:",
            latestRegistrationError
          );

          return {
            sent: true,
            skipped: false,
            reason: "metadata_reload_failed",
            emailId: welcomeEmailResult.emailId,
          };
        }

        const latestMetadata = normalizeMetadata(latestRegistration.metadata);

        /* Record successful Resend delivery in registration metadata. */
        const { error: metadataUpdateError } = await supabase
          .from("academy_registrations")
          .update({
            metadata: {
              ...latestMetadata,
              welcome_email: {
                status: "sent",
                resend_email_id: welcomeEmailResult.emailId,
                sent_at: new Date().toISOString(),
                payment_reference: paymentReference,
              },
            },
          })
          .eq("id", registrationId);

        if (metadataUpdateError) {
          console.error(
            "Academy welcome email metadata update failed:",
            metadataUpdateError
          );
        }

        return {
          sent: true,
          skipped: false,
          reason: null,
          emailId: welcomeEmailResult.emailId,
        };
      } catch (error) {
        console.error("Academy welcome email failed:", error);

        /*
         * Reload the latest metadata before recording the failure
         * so existing payment metadata is not overwritten.
         */
        const { data: latestRegistration, error: latestRegistrationError } =
          await supabase
            .from("academy_registrations")
            .select("metadata")
            .eq("id", registrationId)
            .single();

        if (latestRegistrationError) {
          console.error(
            "Academy welcome email failure metadata lookup failed:",
            latestRegistrationError
          );

          return {
            sent: false,
            skipped: false,
            reason: "email_failed",
          };
        }

        const latestMetadata = normalizeMetadata(latestRegistration.metadata);

        /*
         * Record the failed email attempt without changing the successful
         * Paystack payment or Finance transaction.
         */
        const { error: failureUpdateError } = await supabase
          .from("academy_registrations")
          .update({
            metadata: {
              ...latestMetadata,
              welcome_email: {
                status: "failed",
                failed_at: new Date().toISOString(),
                payment_reference: paymentReference,
                error:
                  error instanceof Error
                    ? error.message
                    : "Unknown Academy welcome email error",
              },
            },
          })
          .eq("id", registrationId);

        if (failureUpdateError) {
          console.error(
            "Academy welcome email failure metadata update failed:",
            failureUpdateError
          );
        }

        return {
          sent: false,
          skipped: false,
          reason: "email_failed",
        };
      }
    }

    /* Confirm the charge itself reports a successful Paystack state. */
    if (transaction.status !== "success") {
      console.warn("charge.success event contained a non-success status:", {
        reference: transaction.reference,
        status: transaction.status,
      });

      return jsonResponse(
        {
          received: true,
          processed: false,
          reference: transaction.reference,
          message: "The transaction status was not successful.",
        },
        409
      );
    }

    const paystackMetadata = parsePaystackMetadata(transaction.metadata);

    let belongsToInvoiceWorkflow = false;

    /* Determine whether this is an Invoice payment. */
    try {
      belongsToInvoiceWorkflow = await isInvoicePayment(
        transaction,
        paystackMetadata
      );
    } catch (error) {
      console.error(
        "Paystack webhook Invoice payment detection failed:",
        error
      );

      return jsonResponse(
        {
          received: true,
          processed: false,
          reference: transaction.reference,
          message: "The Invoice payment workflow could not be identified.",
        },
        500
      );
    }

    /*
     * ==================================
     * INVOICE PAYMENT WORKFLOW
     * ==================================
     */
    if (belongsToInvoiceWorkflow) {
      const metadataInvoiceId =
        typeof paystackMetadata.invoice_id === "string"
          ? paystackMetadata.invoice_id
          : null;

      const metadataPaymentAttemptId =
        typeof paystackMetadata.payment_attempt_id === "string"
          ? paystackMetadata.payment_attempt_id
          : null;

      const { data: paymentAttempt, error: paymentAttemptError } =
        await supabase
          .from("invoice_payment_attempts")
          .select(
            `
          id,
          invoice_id,
          reference,
          amount,
          currency,
          status
          `
          )
          .eq("reference", transaction.reference)
          .maybeSingle();

      if (paymentAttemptError) {
        console.error(
          "Paystack webhook Invoice payment-attempt lookup failed:",
          paymentAttemptError
        );

        return jsonResponse(
          {
            received: true,
            processed: false,
            reference: transaction.reference,
            message: "The Invoice payment attempt could not be loaded.",
          },
          500
        );
      }

      if (!paymentAttempt) {
        return jsonResponse(
          {
            received: true,
            processed: false,
            reference: transaction.reference,
            message: "No matching Invoice payment attempt was found.",
          },
          404
        );
      }

      if (
        metadataInvoiceId &&
        metadataInvoiceId !== paymentAttempt.invoice_id
      ) {
        console.error("Paystack webhook Invoice metadata mismatch:", {
          expected: paymentAttempt.invoice_id,
          received: metadataInvoiceId,
          reference: transaction.reference,
        });

        return jsonResponse(
          {
            received: true,
            processed: false,
            reference: transaction.reference,
            message: "The payment metadata does not match the Invoice.",
          },
          409
        );
      }

      if (
        metadataPaymentAttemptId &&
        metadataPaymentAttemptId !== paymentAttempt.id
      ) {
        console.error("Paystack webhook payment-attempt metadata mismatch:", {
          expected: paymentAttempt.id,
          received: metadataPaymentAttemptId,
          reference: transaction.reference,
        });

        return jsonResponse(
          {
            received: true,
            processed: false,
            reference: transaction.reference,
            message:
              "The payment metadata does not match the Invoice payment attempt.",
          },
          409
        );
      }

      try {
        const updatedInvoice = await processInvoicePayment(transaction);

        return jsonResponse({
          received: true,
          processed: true,
          paymentType: "invoice",
          invoiceId: updatedInvoice?.id ?? paymentAttempt.invoice_id,
          reference: transaction.reference,
          paymentStatus: updatedInvoice?.status ?? "processed",
          message: "Invoice payment confirmed successfully.",
        });
      } catch (error) {
        console.error(
          "Paystack webhook Invoice payment processing failed:",
          error
        );

        return jsonResponse(
          {
            received: true,
            processed: false,
            paymentType: "invoice",
            reference: transaction.reference,
            message:
              error instanceof Error
                ? error.message
                : "The Invoice payment could not be processed.",
          },
          500
        );
      }
    }

    /*
     * ==================================
     * ACADEMY PAYMENT WORKFLOW
     * ==================================
     */

    /* Load the Academy registration and related program. */
    const { data: registration, error: registrationError } = await supabase
      .from("academy_registrations")
      .select(
        `
        id,
        program_id,
        first_name,
        last_name,
        email,
        phone,
        registration_status,
        payment_status,
        payment_reference,
        payment_provider,
        amount_expected,
        amount_paid,
        payment_reconciliation_status,
        payment_difference,
        currency,
        paid_at,
        metadata,
        program:academy_programs (
          id,
          title,
          slug
        )
        `
      )
      .eq("payment_reference", transaction.reference)
      .maybeSingle();

    if (registrationError) {
      console.error(
        "Paystack webhook registration lookup failed:",
        registrationError
      );

      return jsonResponse(
        {
          received: true,
          processed: false,
          message: "The related registration could not be loaded.",
        },
        500
      );
    }

    if (!registration) {
      console.warn(
        "No Academy registration matched Paystack reference:",
        transaction.reference
      );

      return jsonResponse({
        received: true,
        processed: false,
        reference: transaction.reference,
        message: "No matching Academy registration was found.",
      });
    }

    /*
     * If callback verification processed the registration first,
     * still ensure that the central Finance ledger contains the payment.
     */
    if (registration.payment_status === "paid") {
      const storedAmountPaid = Number(registration.amount_paid ?? 0);

      const storedAmountExpected = Number(registration.amount_expected ?? 0);

      const storedDifference = Number(registration.payment_difference ?? 0);

      const storedReconciliationStatus =
        registration.payment_reconciliation_status;

      if (
        storedAmountPaid > 0 &&
        storedAmountExpected > 0 &&
        (storedReconciliationStatus === "matched" ||
          storedReconciliationStatus === "underpaid" ||
          storedReconciliationStatus === "overpaid")
      ) {
        await ensureAcademyFinanceTransaction({
          registrationId: registration.id,
          paymentReference: transaction.reference,
          programTitle: registration.program?.title ?? "Academy Program",
          learnerName: `${registration.first_name} ${registration.last_name}`,
          learnerEmail: registration.email,
          learnerPhone: registration.phone,
          amountExpected: storedAmountExpected,
          amountPaid: storedAmountPaid,
          currency: registration.currency,
          paymentChannel: transaction.channel,
          paidAt:
            registration.paid_at ??
            transaction.paid_at ??
            new Date().toISOString(),
          reconciliationStatus: storedReconciliationStatus,
          paymentDifference: storedDifference,
          providerPayload: transaction,
        });
        /* Ensure a callback-first payment also receives its welcome email. */
        await ensureAcademyWelcomeEmail({
          registrationId: registration.id,
          firstName: registration.first_name,
          lastName: registration.last_name,
          email: registration.email,
          programTitle:
            registration.program?.title ?? "CloudTweak Academy Program",
          amountPaid: storedAmountPaid,
          currency: registration.currency,
          paymentReference: transaction.reference,
          reconciliationStatus: storedReconciliationStatus,
        });
      }

      return jsonResponse({
        received: true,
        processed: true,
        alreadyProcessed: true,
        registrationId: registration.id,
        reference: transaction.reference,
        reconciliationStatus: registration.payment_reconciliation_status,
        paymentDifference: registration.payment_difference,
        message:
          "The Academy payment was already processed and the Finance ledger was verified.",
      });
    }

    /* Confirm that the transaction currency matches the Academy registration. */
    const expectedCurrency = (registration.currency || "NGN").toUpperCase();

    const receivedCurrency = (transaction.currency || "").toUpperCase();

    if (receivedCurrency !== expectedCurrency) {
      console.error("Paystack webhook currency mismatch:", {
        registrationId: registration.id,
        reference: transaction.reference,
        expectedCurrency,
        receivedCurrency,
      });

      return jsonResponse(
        {
          received: true,
          processed: false,
          reference: transaction.reference,
          message: "The transaction currency does not match the registration.",
        },
        409
      );
    }

    const metadataRegistrationId =
      typeof paystackMetadata.registration_id === "string"
        ? paystackMetadata.registration_id
        : null;

    const metadataProgramId =
      typeof paystackMetadata.program_id === "string"
        ? paystackMetadata.program_id
        : null;

    /* Confirm metadata references the correct registration. */
    if (metadataRegistrationId && metadataRegistrationId !== registration.id) {
      console.error("Paystack webhook registration metadata mismatch:", {
        expected: registration.id,
        received: metadataRegistrationId,
        reference: transaction.reference,
      });

      return jsonResponse(
        {
          received: true,
          processed: false,
          reference: transaction.reference,
          message: "The transaction metadata does not match the registration.",
        },
        409
      );
    }

    /* Confirm metadata references the correct program. */
    if (metadataProgramId && metadataProgramId !== registration.program_id) {
      console.error("Paystack webhook program metadata mismatch:", {
        expected: registration.program_id,
        received: metadataProgramId,
        reference: transaction.reference,
      });

      return jsonResponse(
        {
          received: true,
          processed: false,
          reference: transaction.reference,
          message:
            "The transaction metadata does not match the Academy program.",
        },
        409
      );
    }

    /* Confirm customer email when Paystack supplies one. */
    const paystackCustomerEmail = transaction.customer?.email
      ?.trim()
      .toLowerCase();

    const registrationEmail = registration.email.trim().toLowerCase();

    if (paystackCustomerEmail && paystackCustomerEmail !== registrationEmail) {
      console.error("Paystack webhook customer email mismatch:", {
        registrationId: registration.id,
        expected: registrationEmail,
        received: paystackCustomerEmail,
        reference: transaction.reference,
      });

      return jsonResponse(
        {
          received: true,
          processed: false,
          reference: transaction.reference,
          message: "The transaction customer does not match the registration.",
        },
        409
      );
    }

    /* Calculate expected and received amounts. */
    const amountExpected = Number(registration.amount_expected);

    const amountPaid = Number(transaction.amount) / 100;

    if (!Number.isFinite(amountExpected) || amountExpected <= 0) {
      console.error("Academy registration has an invalid expected amount:", {
        registrationId: registration.id,
        amountExpected: registration.amount_expected,
      });

      return jsonResponse(
        {
          received: true,
          processed: false,
          reference: transaction.reference,
          message: "The expected Academy payment amount is invalid.",
        },
        500
      );
    }

    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      console.error(
        "Paystack webhook returned an invalid Academy payment amount:",
        {
          registrationId: registration.id,
          transactionAmount: transaction.amount,
        }
      );

      return jsonResponse(
        {
          received: true,
          processed: false,
          reference: transaction.reference,
          message: "The received payment amount is invalid.",
        },
        409
      );
    }

    /* Calculate the exact difference between expected and received amounts. */
    const paymentDifference = Number((amountPaid - amountExpected).toFixed(2));

    /* Classify the Academy payment reconciliation result. */
    const reconciliationStatus =
      paymentDifference === 0
        ? "matched"
        : paymentDifference < 0
          ? "underpaid"
          : "overpaid";

    /*
     * Underpayments remain pending while matched and overpaid payments
     * may confirm the Academy registration.
     */
    const registrationStatus =
      reconciliationStatus === "underpaid" ? "pending" : "confirmed";

    const paidAt = transaction.paid_at ?? new Date().toISOString();

    /* Update the Academy registration using the trusted Paystack result. */
    const { data: updatedRegistration, error: updateError } = await supabase
      .from("academy_registrations")
      .update({
        payment_status: "paid",
        registration_status: registrationStatus,
        payment_reconciliation_status: reconciliationStatus,
        payment_difference: paymentDifference,
        amount_paid: amountPaid,
        paid_at: paidAt,
        payment_provider: "paystack",
        metadata: {
          ...normalizeMetadata(registration.metadata),
          paystack_transaction_id: transaction.id,
          paystack_channel: transaction.channel,
          paystack_gateway_response: transaction.gateway_response,
          paystack_status: transaction.status,
          reconciliation_status: reconciliationStatus,
          payment_difference: paymentDifference,
          webhook_event: webhookEvent.event,
          webhook_confirmed_at: new Date().toISOString(),
        },
      })
      .eq("id", registration.id)
      .neq("payment_status", "paid")
      .select(
        `
        id,
        program_id,
        first_name,
        last_name,
        email,
        phone,
        registration_status,
        payment_status,
        payment_reference,
        amount_expected,
        amount_paid,
        payment_reconciliation_status,
        payment_difference,
        currency,
        paid_at
        `
      )
      .maybeSingle();

    if (updateError) {
      console.error(
        "Paystack webhook registration update failed:",
        updateError
      );

      return jsonResponse(
        {
          received: true,
          processed: false,
          reference: transaction.reference,
          message: "The registration payment status could not be updated.",
        },
        500
      );
    }

    /*
     * Callback verification may have updated the registration first.
     * Load its current state and still ensure Finance is populated.
     */
    if (!updatedRegistration) {
      const { data: latestRegistration, error: latestRegistrationError } =
        await supabase
          .from("academy_registrations")
          .select(
            `
          id,
          payment_status,
          registration_status,
          amount_expected,
          amount_paid,
          payment_reconciliation_status,
          payment_difference,
          currency,
          paid_at
          `
          )
          .eq("id", registration.id)
          .single();

      if (latestRegistrationError || !latestRegistration) {
        console.error(
          "Latest Academy registration lookup failed:",
          latestRegistrationError
        );

        return jsonResponse(
          {
            received: true,
            processed: false,
            reference: transaction.reference,
            message: "The latest registration status could not be confirmed.",
          },
          500
        );
      }

      const latestReconciliationStatus =
        latestRegistration.payment_reconciliation_status;

      if (
        latestRegistration.payment_status === "paid" &&
        latestRegistration.amount_paid &&
        (latestReconciliationStatus === "matched" ||
          latestReconciliationStatus === "underpaid" ||
          latestReconciliationStatus === "overpaid")
      ) {
        /* Preserve the validated reconciliation value with its exact union type. */
        const validatedReconciliationStatus:
          "matched" | "underpaid" | "overpaid" = latestReconciliationStatus;

        await ensureAcademyFinanceTransaction({
          registrationId: latestRegistration.id,
          paymentReference: transaction.reference,
          programTitle: registration.program?.title ?? "Academy Program",
          learnerName: `${registration.first_name} ${registration.last_name}`,
          learnerEmail: registration.email,
          learnerPhone: registration.phone,
          amountExpected: Number(latestRegistration.amount_expected),
          amountPaid: Number(latestRegistration.amount_paid),
          currency: latestRegistration.currency,
          paymentChannel: transaction.channel,
          paidAt:
            latestRegistration.paid_at ??
            transaction.paid_at ??
            new Date().toISOString(),
          reconciliationStatus: validatedReconciliationStatus,
          paymentDifference: Number(latestRegistration.payment_difference ?? 0),
          providerPayload: transaction,
        });

        /* Ensure the callback-won-the-race path also receives the welcome email. */
        await ensureAcademyWelcomeEmail({
          registrationId: latestRegistration.id,
          firstName: registration.first_name,
          lastName: registration.last_name,
          email: registration.email,
          programTitle:
            registration.program?.title ?? "CloudTweak Academy Program",
          amountPaid: Number(latestRegistration.amount_paid),
          currency: latestRegistration.currency,
          paymentReference: transaction.reference,
          reconciliationStatus: validatedReconciliationStatus,
        });
      }

      return jsonResponse({
        received: true,
        processed: latestRegistration.payment_status === "paid",
        alreadyProcessed: latestRegistration.payment_status === "paid",
        registrationId: latestRegistration.id,
        reference: transaction.reference,
        reconciliationStatus: latestRegistration.payment_reconciliation_status,
        paymentDifference: latestRegistration.payment_difference,
        message:
          latestRegistration.payment_status === "paid"
            ? "The Academy payment was already processed and the Finance ledger was verified."
            : "The Academy payment is awaiting processing.",
      });
    }

    /* Record the successfully processed Academy payment in central Finance. */
    await ensureAcademyFinanceTransaction({
      registrationId: updatedRegistration.id,
      paymentReference: transaction.reference,
      programTitle: registration.program?.title ?? "Academy Program",
      learnerName: `${registration.first_name} ${registration.last_name}`,
      learnerEmail: registration.email,
      learnerPhone: registration.phone,
      amountExpected: Number(updatedRegistration.amount_expected),
      amountPaid: Number(updatedRegistration.amount_paid),
      currency: updatedRegistration.currency,
      paymentChannel: transaction.channel,
      paidAt: updatedRegistration.paid_at ?? paidAt,
      reconciliationStatus,
      paymentDifference,
      providerPayload: transaction,
    });

    /* Send the welcome email after payment and Finance processing succeed. */
    await ensureAcademyWelcomeEmail({
      registrationId: updatedRegistration.id,
      firstName: registration.first_name,
      lastName: registration.last_name,
      email: registration.email,
      programTitle: registration.program?.title ?? "CloudTweak Academy Program",
      amountPaid: Number(updatedRegistration.amount_paid),
      currency: updatedRegistration.currency,
      paymentReference: transaction.reference,
      reconciliationStatus,
    });

    /* Build the final Academy payment result message. */
    const processingMessage =
      reconciliationStatus === "matched"
        ? "Academy payment confirmed, reconciled, and recorded in Finance."
        : reconciliationStatus === "overpaid"
          ? "Academy payment confirmed and recorded in Finance. An overpayment was detected."
          : "Academy payment received and recorded as unresolved Finance income because an underpayment was detected.";

    /* Return the final trusted Academy payment result. */
    return jsonResponse({
      received: true,
      processed: true,
      registrationId: updatedRegistration.id,
      programId: updatedRegistration.program_id,
      reference: transaction.reference,
      paymentStatus: updatedRegistration.payment_status,
      registrationStatus: updatedRegistration.registration_status,
      reconciliationStatus: updatedRegistration.payment_reconciliation_status,
      paymentDifference: updatedRegistration.payment_difference,
      amountExpected: updatedRegistration.amount_expected,
      amountPaid: updatedRegistration.amount_paid,
      message: processingMessage,
    });
  } catch (error) {
    console.error("Unexpected Paystack webhook error:", error);

    return jsonResponse(
      {
        received: false,
        processed: false,
        message: "An unexpected webhook error occurred.",
      },
      500
    );
  }
};
