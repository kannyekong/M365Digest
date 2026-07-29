import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";

export const prerender = false;

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
      }
    | string
    | null;
}

interface PaystackWebhookEvent {
  event: string;
  data: PaystackChargeData;
}

/**
 * Return a JSON response using the supplied HTTP status.
 */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Normalize Paystack metadata into an object.
 */
function parsePaystackMetadata(metadata: PaystackChargeData["metadata"]) {
  // Return an empty object when no metadata exists.
  if (!metadata) {
    return {};
  }

  // Return metadata directly when Paystack sends an object.
  if (typeof metadata === "object") {
    return metadata;
  }

  // Attempt to parse metadata sent as a JSON string.
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Compare the received Paystack signature securely.
 */
function verifyPaystackSignature(
  rawBody: string,
  receivedSignature: string,
  secretKey: string
) {
  // Generate the expected HMAC SHA-512 signature.
  const expectedSignature = createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");

  // Convert both signatures into buffers for a timing-safe comparison.
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  const receivedBuffer = Buffer.from(receivedSignature, "utf8");

  // timingSafeEqual requires both buffers to have equal lengths.
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * Process Paystack webhook events for Academy payments.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Read the server-only environment variables.
    const supabaseUrl = import.meta.env.SUPABASE_URL;

    const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    const paystackSecretKey = import.meta.env.PAYSTACK_SECRET_KEY;

    // Stop when the webhook environment is incomplete.
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

    // Read the raw request body before parsing it.
    //
    // The exact raw body is required for validating Paystack's
    // x-paystack-signature header.
    const rawBody = await request.text();

    // Retrieve the signature supplied by Paystack.
    const receivedSignature = request.headers.get("x-paystack-signature");

    // Reject requests that do not carry a signature.
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

    // Verify that the request genuinely came from Paystack.
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

    // Parse the JSON only after the signature has been validated.
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

    // Acknowledge events that are unrelated to successful charges.
    //
    // Paystack expects a successful HTTP response when the event has
    // been received, even when the application does not use that event.
    if (webhookEvent.event !== "charge.success") {
      return jsonResponse({
        received: true,
        processed: false,
        event: webhookEvent.event,
        message: "Event acknowledged.",
      });
    }

    const transaction = webhookEvent.data;

    // Stop when the successful charge does not contain a reference.
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

    // Create a trusted server-side Supabase client.
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Find the Academy registration connected to the reference.
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

      // Return a server error so Paystack can retry the webhook.
      return jsonResponse(
        {
          received: true,
          processed: false,
          message: "The related registration could not be loaded.",
        },
        500
      );
    }

    // Acknowledge transactions that do not belong to the Academy.
    //
    // This allows the same Paystack account and webhook route to
    // receive payments from other modules without corrupting data.
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

    // Make webhook processing idempotent.
    //
    // Paystack may send the same event more than once, and the
    // callback verification route may have already updated the record.
    if (registration.payment_status === "paid") {
      return jsonResponse({
        received: true,
        processed: true,
        alreadyProcessed: true,
        registrationId: registration.id,
        reference: transaction.reference,
        message: "The Academy payment was already processed.",
      });
    }

    // Confirm that the event itself reports a successful charge.
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

    // Paystack reports amounts using the currency's smallest unit.
    const expectedAmountInSubunit = Math.round(
      Number(registration.amount_expected) * 100
    );

    // Prevent fulfillment when the amount paid is incorrect.
    if (
      !Number.isFinite(expectedAmountInSubunit) ||
      transaction.amount !== expectedAmountInSubunit
    ) {
      console.error("Paystack webhook amount mismatch:", {
        registrationId: registration.id,
        reference: transaction.reference,
        expectedAmountInSubunit,
        receivedAmountInSubunit: transaction.amount,
      });

      return jsonResponse(
        {
          received: true,
          processed: false,
          reference: transaction.reference,
          message:
            "The transaction amount does not match the expected program fee.",
        },
        409
      );
    }

    const expectedCurrency = (registration.currency || "NGN").toUpperCase();

    const receivedCurrency = (transaction.currency || "").toUpperCase();

    // Prevent fulfillment when the currency is incorrect.
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

    const paystackMetadata = parsePaystackMetadata(transaction.metadata);

    const metadataRegistrationId =
      typeof paystackMetadata.registration_id === "string"
        ? paystackMetadata.registration_id
        : null;

    const metadataProgramId =
      typeof paystackMetadata.program_id === "string"
        ? paystackMetadata.program_id
        : null;

    // Confirm that Paystack metadata identifies the same registration.
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

    // Confirm that Paystack metadata identifies the same program.
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

    // Confirm the customer's email when Paystack supplies one.
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

    const amountPaid = transaction.amount / 100;

    const paidAt = transaction.paid_at || new Date().toISOString();

    // Mark the registration as paid and confirmed.
    //
    // The payment_status condition prevents a duplicate webhook or
    // callback request from fulfilling the same registration twice.
    const { data: updatedRegistration, error: updateError } = await supabase
      .from("academy_registrations")
      .update({
        payment_status: "paid",
        registration_status: "confirmed",
        amount_paid: amountPaid,
        paid_at: paidAt,
        payment_provider: "paystack",
        metadata: {
          ...(registration.metadata ?? {}),
          paystack_transaction_id: transaction.id,
          paystack_channel: transaction.channel,
          paystack_gateway_response: transaction.gateway_response,
          paystack_status: transaction.status,
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

      // Return an error so Paystack retries delivery.
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

    // Another request may have completed the update first.
    if (!updatedRegistration) {
      const { data: latestRegistration, error: latestRegistrationError } =
        await supabase
          .from("academy_registrations")
          .select(
            `
          id,
          payment_status,
          registration_status
          `
          )
          .eq("id", registration.id)
          .single();

      if (latestRegistrationError) {
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
        message:
          latestRegistration.payment_status === "paid"
            ? "The Academy payment was already processed."
            : "The Academy payment is awaiting processing.",
      });
    }

    // Return quickly after successful processing.
    return jsonResponse({
      received: true,
      processed: true,
      registrationId: updatedRegistration.id,
      programId: updatedRegistration.program_id,
      reference: updatedRegistration.payment_reference,
      paymentStatus: updatedRegistration.payment_status,
      registrationStatus: updatedRegistration.registration_status,
      message: "Academy payment confirmed successfully.",
    });
  } catch (error) {
    console.error("Unexpected Paystack webhook error:", error);

    // Returning a server error allows Paystack to retry delivery.
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
