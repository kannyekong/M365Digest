import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

interface AcademyRegistrationRequest {
  programId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  state?: string;
  city?: string;
  learningGoal?: string;
  referralSource?: string;
  availability?: string;
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

/**
 * Return a JSON response with the supplied HTTP status.
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
 * Normalize an email address for reliable matching.
 */
function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Convert an optional string into a trimmed nullable value.
 */
function toNullableString(value?: string) {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

/**
 * Validate the incoming Academy registration request.
 */
function validateRegistrationRequest(values: AcademyRegistrationRequest) {
  if (!values.programId?.trim()) {
    return "A valid Academy program is required.";
  }

  if (!values.firstName?.trim()) {
    return "First name is required.";
  }

  if (!values.lastName?.trim()) {
    return "Last name is required.";
  }

  if (!values.email?.trim()) {
    return "Email address is required.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(values.email.trim())) {
    return "Enter a valid email address.";
  }

  if (!values.phone?.trim()) {
    return "WhatsApp number is required.";
  }

  if (!values.country?.trim()) {
    return "Country is required.";
  }

  return null;
}

/**
 * Generate a unique Paystack transaction reference.
 */
function generatePaymentReference(programCode?: string | null) {
  const safeProgramCode = (programCode || "ACADEMY")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "-");

  return `CTA-${safeProgramCode}-${crypto.randomUUID()}`;
}

/**
 * Create or resume an Academy registration and initialize Paystack.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Read required server-only environment variables.
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    const paystackSecretKey = import.meta.env.PAYSTACK_SECRET_KEY;
    const publicSiteUrl = import.meta.env.PUBLIC_SITE_URL;

    // Stop when the server configuration is incomplete.
    if (
      !supabaseUrl ||
      !supabaseServiceRoleKey ||
      !paystackSecretKey ||
      !publicSiteUrl
    ) {
      console.error(
        "Academy registration environment variables are incomplete."
      );

      return jsonResponse(
        {
          success: false,
          message:
            "Registration is temporarily unavailable. Please contact support.",
        },
        500
      );
    }

    // Create a server-side Supabase client with the service-role key.
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Parse the submitted registration values.
    const values = (await request.json()) as AcademyRegistrationRequest;

    // Validate all required fields.
    const validationError = validateRegistrationRequest(values);

    if (validationError) {
      return jsonResponse(
        {
          success: false,
          message: validationError,
        },
        400
      );
    }

    const normalizedEmail = normalizeEmail(values.email);

    // Load the selected program from the trusted database.
    const { data: program, error: programError } = await supabase
      .from("academy_programs")
      .select(
        `
          id,
          title,
          slug,
          code,
          price,
          discount_price,
          currency,
          registration_open,
          registration_deadline,
          status
          `
      )
      .eq("id", values.programId)
      .eq("status", "published")
      .single();

    if (programError || !program) {
      console.error("Academy program lookup failed:", programError);

      return jsonResponse(
        {
          success: false,
          message: "The selected Academy program could not be found.",
        },
        404
      );
    }

    // Prevent registration for a program that has been closed.
    if (!program.registration_open) {
      return jsonResponse(
        {
          success: false,
          message: "Registration is currently closed for this program.",
        },
        409
      );
    }

    // Prevent registration after the configured deadline.
    if (program.registration_deadline) {
      const deadline = new Date(program.registration_deadline);

      if (
        !Number.isNaN(deadline.getTime()) &&
        deadline.getTime() < Date.now()
      ) {
        return jsonResponse(
          {
            success: false,
            message: "The registration deadline for this program has passed.",
          },
          409
        );
      }
    }

    // Calculate the trusted amount from the program record.
    const amountExpected =
      program.discount_price !== null
        ? Number(program.discount_price)
        : Number(program.price);

    if (!Number.isFinite(amountExpected) || amountExpected <= 0) {
      return jsonResponse(
        {
          success: false,
          message:
            "A valid payment amount has not been configured for this program.",
        },
        409
      );
    }

    const currency = (program.currency || "NGN").toUpperCase();

    // Find the learner's most recent registration for this program.
    const { data: existingRegistration, error: existingRegistrationError } =
      await supabase
        .from("academy_registrations")
        .select("*")
        .eq("program_id", program.id)
        .ilike("email", normalizedEmail)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (existingRegistrationError) {
      console.error(
        "Existing registration lookup failed:",
        existingRegistrationError
      );

      return jsonResponse(
        {
          success: false,
          message: "Your registration could not be checked. Please try again.",
        },
        500
      );
    }

    // Prevent another payment when this learner has already paid.
    if (existingRegistration?.payment_status === "paid") {
      return jsonResponse(
        {
          success: false,
          alreadyRegistered: true,
          registrationId: existingRegistration.id,
          message: "You are already registered and paid for this program.",
        },
        409
      );
    }

    const paymentReference = generatePaymentReference(program.code);

    const registrationValues = {
      program_id: program.id,
      first_name: values.firstName.trim(),
      last_name: values.lastName.trim(),
      email: normalizedEmail,
      phone: values.phone.trim(),
      country: values.country.trim(),
      state: toNullableString(values.state),
      city: toNullableString(values.city),
      learning_goal: toNullableString(values.learningGoal),
      referral_source: toNullableString(values.referralSource),
      availability: toNullableString(values.availability),
      registration_status: "pending",
      payment_status: "processing",
      payment_reference: paymentReference,
      payment_provider: "paystack",
      amount_expected: amountExpected,
      currency,
      source: "academy_website",
      metadata: {
        program_slug: program.slug,
        program_title: program.title,
        payment_attempted_at: new Date().toISOString(),
      },
    };

    let registrationId: string;

    // Reuse a non-paid registration instead of creating a duplicate.
    if (existingRegistration) {
      const { data: updatedRegistration, error } = await supabase
        .from("academy_registrations")
        .update(registrationValues)
        .eq("id", existingRegistration.id)
        .select("id")
        .single();

      if (error || !updatedRegistration) {
        console.error("Pending registration update failed:", error);

        return jsonResponse(
          {
            success: false,
            message: "Your existing registration could not be resumed.",
          },
          500
        );
      }

      registrationId = updatedRegistration.id;
    } else {
      // Create a new pending registration for a new learner.
      const { data: createdRegistration, error } = await supabase
        .from("academy_registrations")
        .insert(registrationValues)
        .select("id")
        .single();

      if (error || !createdRegistration) {
        console.error("Academy registration creation failed:", error);

        return jsonResponse(
          {
            success: false,
            message: "Your registration could not be created.",
          },
          500
        );
      }

      registrationId = createdRegistration.id;
    }

    // Paystack expects the payment amount in the smallest currency unit.
    const amountInSubunit = Math.round(amountExpected * 100);

    // Initialize the payment transaction from the backend.
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          amount: String(amountInSubunit),
          currency,
          reference: paymentReference,
          callback_url: `${publicSiteUrl}/academy/payment/callback`,
          metadata: JSON.stringify({
            registration_id: registrationId,
            program_id: program.id,
            program_slug: program.slug,
            program_title: program.title,
            student_name: `${values.firstName.trim()} ${values.lastName.trim()}`,
          }),
        }),
      }
    );

    const paystackResult =
      (await paystackResponse.json()) as PaystackInitializeResponse;

    // Revert the registration to pending when Paystack initialization fails.
    if (
      !paystackResponse.ok ||
      !paystackResult.status ||
      !paystackResult.data?.authorization_url
    ) {
      console.error("Paystack initialization failed:", paystackResult);

      await supabase
        .from("academy_registrations")
        .update({
          payment_status: "pending",
        })
        .eq("id", registrationId);

      return jsonResponse(
        {
          success: false,
          message:
            paystackResult.message || "Payment could not be initialized.",
        },
        502
      );
    }

    // Return only the safe values required by the browser.
    return jsonResponse({
      success: true,
      resumed: Boolean(existingRegistration),
      registrationId,
      reference: paymentReference,
      authorizationUrl: paystackResult.data.authorization_url,
      message: existingRegistration
        ? "Your registration has been resumed."
        : "Your registration has been created.",
    });
  } catch (error) {
    console.error("Unexpected Academy registration error:", error);

    return jsonResponse(
      {
        success: false,
        message:
          "An unexpected error occurred while processing your registration.",
      },
      500
    );
  }
};
