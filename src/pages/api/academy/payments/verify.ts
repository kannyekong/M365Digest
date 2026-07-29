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

/**
 * Return a JSON response with a supplied HTTP status.
 */
function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
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
function parsePaystackMetadata(
  metadata: PaystackVerificationResponse["data"] extends
    | { metadata: infer Metadata }
    | undefined
    ? Metadata
    : never
) {
  // Return an empty object when metadata is unavailable.
  if (!metadata) {
    return {};
  }

  // Return metadata directly when Paystack supplies an object.
  if (typeof metadata === "object") {
    return metadata;
  }

  // Attempt to parse metadata when Paystack supplies a JSON string.
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Verify a Paystack transaction and update its Academy registration.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Read server-only environment variables.
    const supabaseUrl = import.meta.env.SUPABASE_URL;

    const supabaseServiceRoleKey =
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    const paystackSecretKey =
      import.meta.env.PAYSTACK_SECRET_KEY;

    // Stop when required server configuration is missing.
    if (
      !supabaseUrl ||
      !supabaseServiceRoleKey ||
      !paystackSecretKey
    ) {
      console.error(
        "Academy payment verification environment variables are incomplete."
      );

      return jsonResponse(
        {
          success: false,
          message:
            "Payment verification is temporarily unavailable.",
        },
        500
      );
    }

    // Create a server-side Supabase client.
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Parse the payment reference submitted by the callback page.
    const values =
      (await request.json()) as VerifyPaymentRequest;

    const reference = values.reference?.trim();

    // Reject requests without a transaction reference.
    if (!reference) {
      return jsonResponse(
        {
          success: false,
          message: "A payment reference is required.",
        },
        400
      );
    }

    // Find the registration connected to this payment reference.
    const {
      data: registration,
      error: registrationError,
    } = await supabase
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

    // Stop when the reference does not belong to an Academy registration.
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

    // Return immediately when this registration was already confirmed.
    if (registration.payment_status === "paid") {
      return jsonResponse({
        success: true,
        alreadyVerified: true,
        registrationId: registration.id,
        reference,
        paymentStatus: registration.payment_status,
        registrationStatus:
          registration.registration_status,
        amountPaid: registration.amount_paid,
        currency: registration.currency,
        paidAt: registration.paid_at,
        program: registration.program,
        learnerName:
          `${registration.first_name} ${registration.last_name}`,
        message:
          "Your payment has already been verified.",
      });
    }

    // Ask Paystack for the authoritative transaction status.
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

    // Handle invalid references or Paystack request errors.
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
            paystackResult.message ||
            "The payment could not be verified yet.",
        },
        409
      );
    }

    const transaction = paystackResult.data;

    // Confirm that Paystack returned the same transaction reference.
    if (transaction.reference !== reference) {
      console.error(
        "Paystack returned a mismatched transaction reference.",
        {
          expected: reference,
          received: transaction.reference,
        }
      );

      return jsonResponse(
        {
          success: false,
          message:
            "The payment reference returned by Paystack does not match this registration.",
        },
        409
      );
    }

    // Stop when Paystack has not marked the transaction successful.
    if (transaction.status !== "success") {
      // Save the latest non-successful payment state.
      await supabase
        .from("academy_registrations")
        .update({
          payment_status:
            transaction.status === "failed"
              ? "failed"
              : "processing",
          metadata: {
            ...(registration.metadata ?? {}),
            last_paystack_status: transaction.status,
            last_gateway_response:
              transaction.gateway_response,
            last_verified_at: new Date().toISOString(),
          },
        })
        .eq("id", registration.id);

      return jsonResponse(
        {
          success: false,
          paymentPending:
            transaction.status !== "failed",
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

    // Paystack returns amounts in the currency's smallest unit.
    const expectedAmountInSubunit = Math.round(
      Number(registration.amount_expected) * 100
    );

    // Confirm that the successful amount matches the expected amount.
    if (transaction.amount !== expectedAmountInSubunit) {
      console.error(
        "Academy payment amount mismatch:",
        {
          registrationId: registration.id,
          expected: expectedAmountInSubunit,
          received: transaction.amount,
        }
      );

      return jsonResponse(
        {
          success: false,
          message:
            "The amount paid does not match the expected program fee. Please contact support.",
        },
        409
      );
    }

    const expectedCurrency = (
      registration.currency || "NGN"
    ).toUpperCase();

    const receivedCurrency = (
      transaction.currency || ""
    ).toUpperCase();

    // Confirm that the payment currency matches the registration.
    if (receivedCurrency !== expectedCurrency) {
      console.error(
        "Academy payment currency mismatch:",
        {
          registrationId: registration.id,
          expected: expectedCurrency,
          received: receivedCurrency,
        }
      );

      return jsonResponse(
        {
          success: false,
          message:
            "The payment currency does not match the program registration.",
        },
        409
      );
    }

    // Check the registration ID carried in Paystack metadata.
    const paystackMetadata =
      parsePaystackMetadata(transaction.metadata);

    const metadataRegistrationId =
      typeof paystackMetadata.registration_id ===
      "string"
        ? paystackMetadata.registration_id
        : null;

    if (
      metadataRegistrationId &&
      metadataRegistrationId !== registration.id
    ) {
      console.error(
        "Academy registration metadata mismatch:",
        {
          expected: registration.id,
          received: metadataRegistrationId,
        }
      );

      return jsonResponse(
        {
          success: false,
          message:
            "The payment metadata does not match this registration.",
        },
        409
      );
    }

    const amountPaid = transaction.amount / 100;

    const paidAt =
      transaction.paid_at || new Date().toISOString();

    // Mark the registration paid and confirmed.
    const {
      data: updatedRegistration,
      error: updateError,
    } = await supabase
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
          paystack_gateway_response:
            transaction.gateway_response,
          paystack_status: transaction.status,
          verified_at: new Date().toISOString(),
        },
      })
      .eq("id", registration.id)
      // Prevent a second process from fulfilling an already-paid record.
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
      console.error(
        "Academy registration payment update failed:",
        updateError
      );

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

    // Another verification process may have updated the row first.
    if (!updatedRegistration) {
      const {
        data: latestRegistration,
        error: latestRegistrationError,
      } = await supabase
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

      if (
        latestRegistrationError ||
        !latestRegistration
      ) {
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

      return jsonResponse({
        success:
          latestRegistration.payment_status === "paid",
        alreadyVerified: true,
        registrationId: latestRegistration.id,
        reference:
          latestRegistration.payment_reference,
        paymentStatus:
          latestRegistration.payment_status,
        registrationStatus:
          latestRegistration.registration_status,
        amountPaid: latestRegistration.amount_paid,
        currency: latestRegistration.currency,
        paidAt: latestRegistration.paid_at,
        program: latestRegistration.program,
        learnerName:
          `${latestRegistration.first_name} ${latestRegistration.last_name}`,
        message:
          latestRegistration.payment_status === "paid"
            ? "Your payment has already been verified."
            : "The payment status is still being updated.",
      });
    }

    // Return the verified registration details to the callback page.
    return jsonResponse({
      success: true,
      alreadyVerified: false,
      registrationId: updatedRegistration.id,
      reference:
        updatedRegistration.payment_reference,
      paymentStatus:
        updatedRegistration.payment_status,
      registrationStatus:
        updatedRegistration.registration_status,
      amountPaid: updatedRegistration.amount_paid,
      currency: updatedRegistration.currency,
      paidAt: updatedRegistration.paid_at,
      program: updatedRegistration.program,
      learnerName:
        `${updatedRegistration.first_name} ${updatedRegistration.last_name}`,
      message:
        "Payment verified successfully. Your registration is confirmed.",
    });
  } catch (error) {
    console.error(
      "Unexpected Academy payment verification error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        message:
          "An unexpected error occurred while verifying the payment.",
      },
      500
    );
  }
};