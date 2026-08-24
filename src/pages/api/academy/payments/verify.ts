import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

interface VerifyPaymentRequest {
  reference: string;
}

interface PaystackVerificationResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at: string | null;
    channel: string | null;
    gateway_response: string | null;
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
    customer?: {
      email?: string;
    };
  };
}

/* Returns a JSON response with the supplied HTTP status. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/* Normalizes Paystack metadata into an object. */
function parsePaystackMetadata(
  metadata: PaystackVerificationResponse["data"] extends
    { metadata: infer Metadata } | undefined
    ? Metadata
    : never
) {
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

/* Verifies a Paystack transaction and reconciles it against an Academy registration. */
export const POST: APIRoute = async ({ request }) => {
  try {
    /* Read required server-only environment variables. */
    const supabaseUrl = import.meta.env.SUPABASE_URL;

    const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    const paystackSecretKey = import.meta.env.PAYSTACK_SECRET_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey || !paystackSecretKey) {
      console.error(
        "Academy payment verification environment variables are incomplete."
      );

      return jsonResponse(
        {
          success: false,
          message: "Payment verification is temporarily unavailable.",
        },
        500
      );
    }

    /* Create the trusted server-side Supabase client. */
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    /* Read the payment reference submitted by the callback page. */
    const values = (await request.json()) as VerifyPaymentRequest;

    const reference = values.reference?.trim();

    if (!reference) {
      return jsonResponse(
        {
          success: false,
          message: "A payment reference is required.",
        },
        400
      );
    }

    /* Load the Academy registration associated with the payment reference. */
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
      .eq("payment_reference", reference)
      .maybeSingle();

    if (registrationError) {
      console.error(
        "Registration lookup during payment verification failed:",
        registrationError
      );

      return jsonResponse(
        {
          success: false,
          message:
            "The registration connected to this payment could not be checked.",
        },
        500
      );
    }

    if (!registration) {
      return jsonResponse(
        {
          success: false,
          message:
            "No Academy registration was found for this payment reference.",
        },
        404
      );
    }

    /* Return the stored result when another process has already processed the payment. */
    if (registration.payment_status === "paid") {
      return jsonResponse({
        success: true,
        alreadyVerified: true,
        registrationId: registration.id,
        reference,
        paymentStatus: registration.payment_status,
        registrationStatus: registration.registration_status,
        reconciliationStatus: registration.payment_reconciliation_status,
        paymentDifference: registration.payment_difference,
        amountPaid: registration.amount_paid,
        currency: registration.currency,
        paidAt: registration.paid_at,
        program: registration.program,
        learnerName: `${registration.first_name} ${registration.last_name}`,
        message: "Your payment has already been verified.",
      });
    }

    /* Ask Paystack for the authoritative transaction state. */
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paystackResult =
      (await paystackResponse.json()) as PaystackVerificationResponse;

    if (
      !paystackResponse.ok ||
      !paystackResult.status ||
      !paystackResult.data
    ) {
      console.error(
        "Paystack transaction verification failed:",
        paystackResult
      );

      return jsonResponse(
        {
          success: false,
          paymentPending: true,
          message:
            paystackResult.message || "The payment could not be verified yet.",
        },
        409
      );
    }

    const transaction = paystackResult.data;

    /* Confirm that Paystack returned the exact payment reference requested. */
    if (transaction.reference !== reference) {
      console.error("Paystack returned a mismatched transaction reference.", {
        expected: reference,
        received: transaction.reference,
      });

      return jsonResponse(
        {
          success: false,
          message:
            "The payment reference returned by Paystack does not match this registration.",
        },
        409
      );
    }

    /* Store the latest state when Paystack has not completed the payment successfully. */
    if (transaction.status !== "success") {
      await supabase
        .from("academy_registrations")
        .update({
          payment_status:
            transaction.status === "failed" ? "failed" : "processing",
          metadata: {
            ...(registration.metadata ?? {}),
            last_paystack_status: transaction.status,
            last_gateway_response: transaction.gateway_response,
            last_verified_at: new Date().toISOString(),
          },
        })
        .eq("id", registration.id);

      return jsonResponse(
        {
          success: false,
          paymentPending: transaction.status !== "failed",
          paymentStatus: transaction.status,
          reference,
          message:
            transaction.status === "failed"
              ? "The payment was not successful."
              : "The payment is still being processed.",
        },
        409
      );
    }

    /* Validate that the successful payment used the expected currency. */
    const expectedCurrency = (registration.currency || "NGN").toUpperCase();

    const receivedCurrency = (transaction.currency || "").toUpperCase();

    if (receivedCurrency !== expectedCurrency) {
      console.error("Academy payment currency mismatch:", {
        registrationId: registration.id,
        expected: expectedCurrency,
        received: receivedCurrency,
      });

      return jsonResponse(
        {
          success: false,
          message:
            "The payment currency does not match the program registration.",
        },
        409
      );
    }

    /* Validate that Paystack metadata references the same Academy registration. */
    const paystackMetadata = parsePaystackMetadata(transaction.metadata);

    const metadataRegistrationId =
      typeof paystackMetadata.registration_id === "string"
        ? paystackMetadata.registration_id
        : null;

    if (metadataRegistrationId && metadataRegistrationId !== registration.id) {
      console.error("Academy registration metadata mismatch:", {
        expected: registration.id,
        received: metadataRegistrationId,
      });

      return jsonResponse(
        {
          success: false,
          message: "The payment metadata does not match this registration.",
        },
        409
      );
    }

    /* Calculate the expected and actually received payment amounts. */
    const amountExpected = Number(registration.amount_expected);

    const amountPaid = Number(transaction.amount) / 100;

    if (!Number.isFinite(amountExpected) || amountExpected <= 0) {
      console.error("Academy registration has an invalid expected amount.", {
        registrationId: registration.id,
        amountExpected: registration.amount_expected,
      });

      return jsonResponse(
        {
          success: false,
          message:
            "The expected program fee is invalid. Please contact support.",
        },
        500
      );
    }

    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      console.error("Paystack returned an invalid Academy payment amount.", {
        registrationId: registration.id,
        transactionAmount: transaction.amount,
      });

      return jsonResponse(
        {
          success: false,
          message: "The payment amount returned by Paystack is invalid.",
        },
        409
      );
    }

    /* Calculate the difference between received payment and expected program fee. */
    const paymentDifference = Number((amountPaid - amountExpected).toFixed(2));

    /* Classify the payment reconciliation result. */
    const reconciliationStatus =
      paymentDifference === 0
        ? "matched"
        : paymentDifference < 0
          ? "underpaid"
          : "overpaid";

    /*
     * Underpayments remain pending because the program fee has not been
     * completely settled. Exact and overpaid transactions may be confirmed.
     */
    const registrationStatus =
      reconciliationStatus === "underpaid" ? "pending" : "confirmed";

    const paidAt = transaction.paid_at || new Date().toISOString();

    /* Mark the successful Paystack transaction as paid and save its reconciliation state. */
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
          ...(registration.metadata ?? {}),
          paystack_transaction_id: transaction.id,
          paystack_channel: transaction.channel,
          paystack_gateway_response: transaction.gateway_response,
          paystack_status: transaction.status,
          reconciliation_status: reconciliationStatus,
          payment_difference: paymentDifference,
          verified_at: new Date().toISOString(),
        },
      })
      .eq("id", registration.id)
      .neq("payment_status", "paid")
      .select(
        `
        id,
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
        paid_at,
        program:academy_programs (
          id,
          title,
          slug
        )
        `
      )
      .maybeSingle();

    if (updateError) {
      console.error("Academy registration payment update failed:", updateError);

      return jsonResponse(
        {
          success: false,
          message:
            "Payment was successful, but the registration could not be updated. Please contact support with your reference.",
          reference,
        },
        500
      );
    }

    /*
     * Another request such as the Paystack webhook may have updated the
     * registration before this callback verification completed.
     */
    if (!updatedRegistration) {
      const { data: latestRegistration, error: latestRegistrationError } =
        await supabase
          .from("academy_registrations")
          .select(
            `
          id,
          first_name,
          last_name,
          registration_status,
          payment_status,
          payment_reference,
          amount_paid,
          payment_reconciliation_status,
          payment_difference,
          currency,
          paid_at,
          program:academy_programs (
            id,
            title,
            slug
          )
          `
          )
          .eq("id", registration.id)
          .single();

      if (latestRegistrationError || !latestRegistration) {
        console.error(
          "Latest paid registration lookup failed:",
          latestRegistrationError
        );

        return jsonResponse(
          {
            success: false,
            message:
              "Payment was received, but the latest registration status could not be loaded.",
            reference,
          },
          500
        );
      }

      /* Build the response message from the stored reconciliation result. */
      const latestMessage =
        latestRegistration.payment_reconciliation_status === "matched"
          ? "Your payment has already been verified and your registration is confirmed."
          : latestRegistration.payment_reconciliation_status === "overpaid"
            ? "Your payment has already been received. An overpayment was detected and will be reviewed."
            : latestRegistration.payment_reconciliation_status === "underpaid"
              ? "Your payment has already been received, but the amount is below the expected program fee."
              : "The payment status is still being updated.";

      return jsonResponse({
        success: latestRegistration.payment_status === "paid",
        alreadyVerified: true,
        registrationId: latestRegistration.id,
        reference: latestRegistration.payment_reference,
        paymentStatus: latestRegistration.payment_status,
        registrationStatus: latestRegistration.registration_status,
        reconciliationStatus: latestRegistration.payment_reconciliation_status,
        paymentDifference: latestRegistration.payment_difference,
        amountPaid: latestRegistration.amount_paid,
        currency: latestRegistration.currency,
        paidAt: latestRegistration.paid_at,
        program: latestRegistration.program,
        learnerName: `${latestRegistration.first_name} ${latestRegistration.last_name}`,
        message: latestMessage,
      });
    }

    /* Build the customer-facing message from the payment reconciliation result. */
    const verificationMessage =
      reconciliationStatus === "matched"
        ? "Payment verified successfully. Your registration is confirmed."
        : reconciliationStatus === "overpaid"
          ? "Payment received successfully. An overpayment was detected and will be reviewed."
          : "Payment received successfully, but the amount is below the program fee. Please contact support.";

    /* Return the verified Paystack transaction and reconciliation result. */
    return jsonResponse({
      success: true,
      alreadyVerified: false,
      registrationId: updatedRegistration.id,
      reference: updatedRegistration.payment_reference,
      paymentStatus: updatedRegistration.payment_status,
      registrationStatus: updatedRegistration.registration_status,
      reconciliationStatus: updatedRegistration.payment_reconciliation_status,
      paymentDifference: updatedRegistration.payment_difference,
      amountPaid: updatedRegistration.amount_paid,
      currency: updatedRegistration.currency,
      paidAt: updatedRegistration.paid_at,
      program: updatedRegistration.program,
      learnerName: `${updatedRegistration.first_name} ${updatedRegistration.last_name}`,
      message: verificationMessage,
    });
  } catch (error) {
    console.error("Unexpected Academy payment verification error:", error);

    return jsonResponse(
      {
        success: false,
        message: "An unexpected error occurred while verifying the payment.",
      },
      500
    );
  }
};
