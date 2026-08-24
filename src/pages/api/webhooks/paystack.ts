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

/* Converts stored Supabase JSON metadata into an object that can be safely extended. */
function normalizeMetadata(
  metadata: Json | null
): Record<string, Json | undefined> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata;
  }

  return {};
}

/* Securely compares the received Paystack webhook signature. */
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

/* Processes successful Paystack webhook events for Academy and Invoice payments. */
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

    /*
     * Read the raw body before parsing because Paystack signs
     * the exact request body that was delivered.
     */
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

    /* Confirm that the request genuinely originated from Paystack. */
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

    /* Parse webhook JSON only after validating its signature. */
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

    /*
     * Acknowledge Paystack events that CloudTweak does not currently process.
     */
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

    /* Determines whether a successful Paystack transaction belongs to an Invoice. */
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

    /* Processes one successful Invoice payment using the existing atomic database RPC. */
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

    /* Confirm that the webhook transaction itself reports success. */
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

    /* Determine whether this transaction belongs to the Invoice workflow. */
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
     * Process Invoice payments separately.
     *
     * This branch remains unchanged from the existing implementation.
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
     * ===============================
     * ACADEMY PAYMENT WORKFLOW
     * ===============================
     */

    /* Load the Academy registration associated with this payment reference. */
    const { data: registration, error: registrationError } = await supabase
      .from("academy_registrations")
      .select(
        `
        id,
        program_id,
        first_name,
        last_name,
        email,
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
        metadata
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

    /*
     * Acknowledge successful transactions that do not belong
     * to an Academy registration.
     */
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
     * Keep processing idempotent.
     *
     * Paystack can deliver the same webhook more than once and
     * callback verification may also have completed first.
     */
    if (registration.payment_status === "paid") {
      return jsonResponse({
        received: true,
        processed: true,
        alreadyProcessed: true,
        registrationId: registration.id,
        reference: transaction.reference,
        reconciliationStatus: registration.payment_reconciliation_status,
        paymentDifference: registration.payment_difference,
        message: "The Academy payment was already processed.",
      });
    }

    /* Confirm that the Paystack currency matches the Academy registration. */
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

    /* Confirm that Paystack metadata points to the same Academy registration. */
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

    /* Confirm that Paystack metadata points to the same Academy program. */
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

    /* Confirm the customer's email address when Paystack supplies one. */
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

    /*
     * Calculate the trusted Academy fee and the amount actually
     * received from Paystack.
     */
    const amountExpected = Number(registration.amount_expected);

    const amountPaid = Number(transaction.amount) / 100;

    if (!Number.isFinite(amountExpected) || amountExpected <= 0) {
      console.error(
        "Academy registration has an invalid expected payment amount:",
        {
          registrationId: registration.id,
          amountExpected: registration.amount_expected,
        }
      );

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

    /* Calculate the amount difference using major currency units. */
    const paymentDifference = Number((amountPaid - amountExpected).toFixed(2));

    /* Classify the successful payment as matched, underpaid or overpaid. */
    const reconciliationStatus =
      paymentDifference === 0
        ? "matched"
        : paymentDifference < 0
          ? "underpaid"
          : "overpaid";

    /*
     * Underpaid registrations stay pending.
     *
     * Exact payments and overpayments can be confirmed because the
     * expected program fee has been fully covered.
     */
    const registrationStatus =
      reconciliationStatus === "underpaid" ? "pending" : "confirmed";

    const paidAt = transaction.paid_at ?? new Date().toISOString();

    /*
     * Record the successful payment and its reconciliation result.
     *
     * payment_status represents whether Paystack successfully received
     * the money, while payment_reconciliation_status represents whether
     * the amount satisfies CloudTweak's expected Academy fee.
     */
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

      /*
       * Return a server error so Paystack can retry delivery
       * if the database update failed.
       */
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
     * Another process may have completed the registration update first.
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
          payment_reconciliation_status,
          payment_difference
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
            ? "The Academy payment was already processed."
            : "The Academy payment is awaiting processing.",
      });
    }

    /* Build an operational message describing the reconciliation result. */
    const processingMessage =
      reconciliationStatus === "matched"
        ? "Academy payment confirmed and reconciled successfully."
        : reconciliationStatus === "overpaid"
          ? "Academy payment confirmed. An overpayment was detected for review."
          : "Academy payment received. An underpayment was detected and the registration remains pending.";

    /* Return the final trusted webhook processing result. */
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

    /*
     * A 500 response allows Paystack to retry delivery
     * when an unexpected server failure occurs.
     */
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
