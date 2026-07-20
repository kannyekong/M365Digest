import { createClient } from "@supabase/supabase-js";

// This interface describes the certificate data returned from Supabase.
interface Certificate {
  certificate_number: string;
  certificate_name: string;
  course_name: string;
  issued_at: string;
}

// This function creates a Supabase admin client using the service role key.
function createSupabaseAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// This function creates a JSON response with the correct content type.
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// This function verifies a certificate using its verification token.
Deno.serve(async (request) => {
  try {
    // Only allow GET requests for public certificate verification.
    if (request.method !== "GET") {
      return jsonResponse(
        {
          error: "Method not allowed.",
        },
        405
      );
    }

    // Read the verification token from the URL query string.
    const url = new URL(request.url);

    // Extract the token from the token query parameter.
    const verificationToken = url.searchParams.get("token");

    // Reject requests without a verification token.
    if (!verificationToken) {
      return jsonResponse(
        {
          verified: false,
          error: "Verification token is required.",
        },
        400
      );
    }

    // Create the Supabase admin client.
    const supabase = createSupabaseAdminClient();

    // Find the certificate associated with the verification token.
    const { data: certificate, error: certificateError } = await supabase
      .from("certificates")
      .select("certificate_number, certificate_name, course_name, issued_at")
      .eq("verification_token", verificationToken)
      .maybeSingle();

    // Stop if the certificate lookup failed.
    if (certificateError) {
      console.error("Failed to verify certificate:", certificateError.message);

      return jsonResponse(
        {
          verified: false,
          error: "Certificate verification failed.",
        },
        500
      );
    }

    // Return an invalid result when no matching certificate exists.
    if (!certificate) {
      return jsonResponse({
        verified: false,
        message: "Certificate not found.",
      });
    }

    // Log successful certificate verification.
    console.log(`Certificate verified: ${certificate.certificate_number}`);

    // Return the verified certificate details.
    return jsonResponse({
      verified: true,
      certificate: certificate as Certificate,
    });
  } catch (error) {
    // Catch and log unexpected verification errors.
    console.error("Unexpected certificate verification error:", error);

    return jsonResponse(
      {
        verified: false,
        error: "Internal server error.",
      },
      500
    );
  }
});
