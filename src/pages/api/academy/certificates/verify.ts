import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

/**
 * Return a consistent JSON response from the verification endpoint.
 */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,

    headers: {
      "Content-Type": "application/json",

      "Cache-Control": "no-store",
    },
  });
}

/**
 * Normalize a Supabase joined relation into one object.
 */
function normalizeRelation<Relation>(
  relation: Relation | Relation[] | null | undefined
): Relation | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

/**
 * Verify one Academy certificate using its public verification code.
 */
export const GET: APIRoute = async ({ request }) => {
  const requestUrl = new URL(request.url);

  const verificationCode = requestUrl.searchParams
    .get("code")
    ?.trim()
    .toUpperCase();

  // Require a verification code before querying Supabase.
  if (!verificationCode) {
    return jsonResponse(
      {
        success: false,

        status: "missing_code",

        message: "Enter a certificate verification code.",
      },
      400
    );
  }

  const supabaseUrl = import.meta.env.SUPABASE_URL;

  const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  // Ensure server-side Supabase credentials are available.
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error(
      "Certificate verification environment variables are incomplete."
    );

    return jsonResponse(
      {
        success: false,

        status: "unavailable",

        message: "Certificate verification is temporarily unavailable.",
      },
      500
    );
  }

  // Use the service-role key only within this server endpoint.
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,

      persistSession: false,
    },
  });

  try {
    // Retrieve only the fields safe for public certificate verification.
    const { data: certificateData, error: certificateError } =
      await supabaseAdmin
        .from("academy_certificates")
        .select(
          `
        id,
        certificate_number,
        verification_code,
        recipient_name,
        program_title,
        issue_date,
        completion_date,
        file_url,
        status,
        generated_at,
        revoked_at,
        revocation_reason,
        program:academy_programs (
          id,
          title,
          slug,
          code
        ),
        template:academy_certificate_templates (
          id,
          name,
          orientation
        )
        `
        )
        .ilike("verification_code", verificationCode)
        .maybeSingle();

    if (certificateError) {
      console.error("Certificate verification query failed:", certificateError);

      return jsonResponse(
        {
          success: false,

          status: "error",

          message: "The certificate could not be verified.",
        },
        500
      );
    }

    // Return a clear not-found response without exposing database details.
    if (!certificateData) {
      return jsonResponse(
        {
          success: false,

          status: "not_found",

          message: "No certificate was found with this verification code.",
        },
        404
      );
    }

    const program = normalizeRelation(certificateData.program);

    const template = normalizeRelation(certificateData.template);

    // Return revoked certificates as found but invalid.
    if (certificateData.status === "revoked") {
      return jsonResponse({
        success: true,

        valid: false,

        status: "revoked",

        message: "This certificate has been revoked.",

        certificate: {
          id: certificateData.id,

          certificateNumber: certificateData.certificate_number,

          verificationCode: certificateData.verification_code,

          recipientName: certificateData.recipient_name,

          programTitle: certificateData.program_title,

          programCode: program?.code ?? null,

          issueDate: certificateData.issue_date,

          completionDate: certificateData.completion_date,

          generatedAt: certificateData.generated_at,

          fileUrl: null,

          templateName: template?.name ?? null,

          orientation: template?.orientation ?? null,

          revokedAt: certificateData.revoked_at,

          revocationReason: certificateData.revocation_reason,
        },
      });
    }

    // Return a verified and currently valid certificate.
    return jsonResponse({
      success: true,

      valid: true,

      status: "valid",

      message:
        "This certificate is valid and was issued by CloudTweak Academy.",

      certificate: {
        id: certificateData.id,

        certificateNumber: certificateData.certificate_number,

        verificationCode: certificateData.verification_code,

        recipientName: certificateData.recipient_name,

        programTitle: certificateData.program_title,

        programCode: program?.code ?? null,

        programSlug: program?.slug ?? null,

        issueDate: certificateData.issue_date,

        completionDate: certificateData.completion_date,

        generatedAt: certificateData.generated_at,

        fileUrl: certificateData.file_url,

        templateName: template?.name ?? null,

        orientation: template?.orientation ?? null,

        revokedAt: null,

        revocationReason: null,
      },
    });
  } catch (error) {
    console.error("Unexpected certificate verification error:", error);

    return jsonResponse(
      {
        success: false,

        status: "error",

        message: "The certificate could not be verified.",
      },
      500
    );
  }
};
