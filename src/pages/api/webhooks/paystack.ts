import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Database, Json } from "../../../types/supabase";

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

interface PaystackWebhookEvent {
  event: string;
  data: PaystackChargeData;
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

/* Processes Paystack webhook events for Invoice and Academy payments. */
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

    /* Acknowledge Paystack events we do not currently process. */
    if (webhookEvent.event !== "charge.success") {
      return jsonResponse({
        received: true,
        processed: false,
        event: webhookEvent.event,
        message: "Event acknowledged.",
      });
    }

    const transaction = webhookEvent.data;

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
       * Underpayments should remain unsettled.
       * Matched and overpaid payments have fully covered the program fee.
       */
      const financeStatus =
        reconciliationStatus === "underpaid" ? "processing" : "paid";

      const financeReconciliationStatus =
        reconciliationStatus === "matched" ? "reconciled" : "disputed";

      /*
       * Overpayments recognize only the actual program fee as Revenue.
       * external_amount preserves the full amount received.
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
         * Another webhook may have inserted the same unique
         * internal reference at almost the same time.
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
     * If the callback already marked this payment paid,
     * still make sure the Finance ledger contains the transaction.
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

    /* Calculate amount difference. */
    const paymentDifference = Number((amountPaid - amountExpected).toFixed(2));

    /* Classify reconciliation. */
    const reconciliationStatus =
      paymentDifference === 0
        ? "matched"
        : paymentDifference < 0
          ? "underpaid"
          : "overpaid";

    /*
     * Underpayments remain pending.
     * Matched and overpaid registrations may be confirmed.
     */
    const registrationStatus =
      reconciliationStatus === "underpaid" ? "pending" : "confirmed";

    const paidAt = transaction.paid_at ?? new Date().toISOString();

    /* Update the Academy registration with the trusted payment result. */
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
     * A callback verification may have updated the row first.
     * If so, load the latest state and still ensure Finance is populated.
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
          reconciliationStatus: latestReconciliationStatus,
          paymentDifference: Number(latestRegistration.payment_difference ?? 0),
          providerPayload: transaction,
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

    /* Record the Academy payment in the central Finance ledger. */
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

    /* Build the final webhook message. */
    const processingMessage =
      reconciliationStatus === "matched"
        ? "Academy payment confirmed, reconciled, and recorded in Finance."
        : reconciliationStatus === "overpaid"
          ? "Academy payment confirmed and recorded in Finance. An overpayment was detected."
          : "Academy payment received and recorded as unresolved Finance income because an underpayment was detected.";

    /* Return the final trusted result. */
    return jsonResponse({
      received: true,
      processed: true,
      registrationId: updatedRegistration.id,
      programId: updatedRegistration.program_id,
      reference: updatedRegistration.payment_reference,
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
