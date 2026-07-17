import { createClient } from "@supabase/supabase-js";

// This interface describes the Paystack webhook payload we need.
interface PaystackWebhook {
  event: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    customer: {
      email: string;
    };
  };
}

// This is the expected payment amount for testing.
// Paystack represents NGN amounts in kobo.
// ₦5 = 500 kobo.
const EXPECTED_PAYMENT_AMOUNT = 10000;

// This function creates an HMAC SHA512 signature for the raw Paystack payload.
async function createPaystackSignature(
  payload: string,
  secretKey: string
): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    {
      name: "HMAC",
      hash: "SHA-512",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// This function handles incoming Paystack webhook events.
Deno.serve(async (request) => {
  try {
    // Read the raw request body before parsing it.
    const rawBody = await request.text();

    // Read the Paystack signature from the request headers.
    const paystackSignature = request.headers.get("x-paystack-signature");

    // Retrieve the Paystack secret key from Supabase secrets.
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    // Validate that the Paystack secret key exists.
    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY is not configured.");

      return new Response(
        JSON.stringify({
          error: "Paystack secret key is not configured.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Reject requests without a Paystack signature.
    if (!paystackSignature) {
      return new Response(
        JSON.stringify({
          error: "Missing Paystack signature.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Generate the expected signature from the raw webhook payload.
    const expectedSignature = await createPaystackSignature(
      rawBody,
      paystackSecretKey
    );

    // Compare the received signature with the expected signature.
    if (paystackSignature !== expectedSignature) {
      console.error("Invalid Paystack signature.");

      return new Response(
        JSON.stringify({
          error: "Invalid Paystack signature.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Parse the verified webhook payload.
    const payload = JSON.parse(rawBody) as PaystackWebhook;

    // Ignore events that are not successful charges.
    if (payload.event !== "charge.success") {
      return new Response(
        JSON.stringify({
          message: "Event ignored.",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Ignore successful events with an unexpected transaction status.
    if (payload.data.status !== "success") {
      return new Response(
        JSON.stringify({
          message: "Transaction was not successful.",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Reject successful transactions with an unexpected payment amount.
    if (payload.data.amount !== EXPECTED_PAYMENT_AMOUNT) {
      console.error(
        `Unexpected payment amount. Expected ${EXPECTED_PAYMENT_AMOUNT} kobo but received ${payload.data.amount} kobo.`
      );

      return new Response(
        JSON.stringify({
          error: "Unexpected payment amount.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Extract the customer's email and Paystack transaction reference.
    const customerEmail = payload.data.customer.email.trim().toLowerCase();

    const paymentReference = payload.data.reference;

    // Create a Supabase admin client using the service role key.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check whether this payment reference has already been processed.
    const { data: existingPayment, error: existingPaymentError } =
      await supabase
        .from("bootcamp_registrations")
        .select("id, payment_status")
        .eq("payment_reference", paymentReference)
        .maybeSingle();

    // Stop if the duplicate payment lookup failed.
    if (existingPaymentError) {
      console.error(
        "Failed to check existing payment:",
        existingPaymentError.message
      );

      return new Response(
        JSON.stringify({
          error: "Failed to check existing payment.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Return success when Paystack retries an already processed payment.
    if (existingPayment) {
      console.log(
        `Payment ${paymentReference} has already been processed.`
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already processed.",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Find the most recent pending registration for the customer's email.
    const { data: registration, error: registrationError } = await supabase
      .from("bootcamp_registrations")
      .select("id, email, payment_status")
      .eq("email", customerEmail)
      .eq("payment_status", "Pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Stop if the registration lookup failed.
    if (registrationError) {
      console.error(
        "Failed to find registration:",
        registrationError.message
      );

      return new Response(
        JSON.stringify({
          error: "Failed to find registration.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Stop if no pending registration matches the payment email.
    if (!registration) {
      console.warn(`No pending registration found for ${customerEmail}`);

      return new Response(
        JSON.stringify({
          message: "No matching pending registration found.",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Update the matching registration as paid.
    const { error: updateError } = await supabase
      .from("bootcamp_registrations")
      .update({
        payment_status: "Paid",
        payment_reference: paymentReference,
        payment_confirmed_at: new Date().toISOString(),
      })
      .eq("id", registration.id)
      .eq("payment_status", "Pending");

    // Stop if the payment update failed.
    if (updateError) {
      console.error(
        "Failed to update registration:",
        updateError.message
      );

      return new Response(
        JSON.stringify({
          error: "Failed to update registration.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Log the successful payment confirmation.
    console.log(
      `Payment confirmed for ${customerEmail}. Reference: ${paymentReference}`
    );

    // Return a successful response to Paystack.
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment processed successfully.",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    // Catch and log unexpected errors.
    console.error("Unexpected webhook error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});