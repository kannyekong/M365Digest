import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { generateAcademyCertificatePdf } from "../../../../../lib/academyCertificate";
import type { AcademyCertificateTemplate } from "../../../../../types/academy";

export const prerender = false;

const CERTIFICATE_BUCKET = "certificates";

/**
 * Return a consistent JSON response from the API endpoint.
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
 * Convert a value into a safe file-name segment.
 */
function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Normalize a joined Supabase relation into one object.
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
 * Generate, upload and attach the PDF for one Academy certificate.
 */
export const POST: APIRoute = async ({ params }) => {
  const certificateId = params.id;

  if (!certificateId) {
    return jsonResponse(
      {
        success: false,
        message: "Certificate ID is required.",
      },
      400
    );
  }

  const supabaseUrl = import.meta.env.SUPABASE_URL;

  const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error(
      "Certificate generation environment variables are incomplete."
    );

    return jsonResponse(
      {
        success: false,
        message: "Certificate generation is temporarily unavailable.",
      },
      500
    );
  }

  // Use the service role only inside this server endpoint.
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Load the certificate, related registration, program and template.
    const { data: certificateData, error: certificateError } =
      await supabaseAdmin
        .from("academy_certificates")
        .select(
          `
        id,
        registration_id,
        program_id,
        template_id,
        certificate_number,
        verification_code,
        recipient_name,
        program_title,
        issue_date,
        completion_date,
        file_url,
        status,
        metadata,
        registration:academy_registrations (
          id,
          first_name,
          last_name,
          email,
          completed_at,
          registration_status,
          certificate_status
        ),
        program:academy_programs (
          id,
          title,
          slug,
          code,
          certificate_template_id
        ),
        template:academy_certificate_templates (
          id,
          name,
          description,
          template_key,
          background_image_url,
          logo_url,
          signature_image_url,
          signatory_name,
          signatory_title,
          primary_color,
          secondary_color,
          text_color,
          orientation,
          configuration,
          is_default,
          is_active,
          created_at,
          updated_at
        )
        `
        )
        .eq("id", certificateId)
        .single();

    if (certificateError || !certificateData) {
      console.error("Certificate could not be loaded:", certificateError);

      return jsonResponse(
        {
          success: false,
          message: "The certificate could not be found.",
        },
        404
      );
    }

    if (certificateData.status === "revoked") {
      return jsonResponse(
        {
          success: false,
          message: "A revoked certificate cannot be regenerated.",
        },
        409
      );
    }

    const registration = normalizeRelation(certificateData.registration);

    const program = normalizeRelation(certificateData.program);

    let template = normalizeRelation(
      certificateData.template
    ) as AcademyCertificateTemplate | null;

    /*
     * Resolve the certificate template using this order:
     * 1. Template already assigned to the certificate
     * 2. Template assigned to the Academy program
     * 3. Active global default template
     */
    if (!template && program?.certificate_template_id) {
      const { data: programTemplate, error: programTemplateError } =
        await supabaseAdmin
          .from("academy_certificate_templates")
          .select("*")
          .eq("id", program.certificate_template_id)
          .eq("is_active", true)
          .maybeSingle();

      if (programTemplateError) {
        console.error(
          "Program certificate template lookup failed:",
          programTemplateError
        );
      }

      template = programTemplate as AcademyCertificateTemplate | null;
    }

    if (!template) {
      const { data: defaultTemplate, error: defaultTemplateError } =
        await supabaseAdmin
          .from("academy_certificate_templates")
          .select("*")
          .eq("is_default", true)
          .eq("is_active", true)
          .maybeSingle();

      if (defaultTemplateError) {
        console.error(
          "Default certificate template lookup failed:",
          defaultTemplateError
        );
      }

      template = defaultTemplate as AcademyCertificateTemplate | null;
    }

    if (!template) {
      return jsonResponse(
        {
          success: false,
          message: "No active certificate template is available.",
        },
        409
      );
    }

    if (!template.is_active) {
      return jsonResponse(
        {
          success: false,
          message: "The selected certificate template is inactive.",
        },
        409
      );
    }

    const recipientName =
      certificateData.recipient_name ||
      [registration?.first_name, registration?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

    const programTitle =
      certificateData.program_title ||
      program?.title ||
      "CloudTweak Academy Program";

    if (!recipientName) {
      return jsonResponse(
        {
          success: false,
          message: "The certificate does not contain a recipient name.",
        },
        422
      );
    }

    // Generate the final PDF bytes using the chosen template.
    const pdfBytes = await generateAcademyCertificatePdf({
      template,

      certificate: {
        recipientName,

        programTitle,

        certificateNumber: certificateData.certificate_number,

        verificationCode: certificateData.verification_code,

        issueDate: certificateData.issue_date,

        completionDate:
          certificateData.completion_date ?? registration?.completed_at ?? null,
      },
    });

    const recipientFileName = sanitizeFileName(recipientName) || "learner";

    const programFileName = sanitizeFileName(programTitle) || "academy-program";

    const certificateFileName =
      sanitizeFileName(certificateData.certificate_number) ||
      certificateData.id;

    const storagePath = [
      programFileName,
      `${recipientFileName}-${certificateFileName}.pdf`,
    ].join("/");

    /*
     * Upload as ArrayBuffer-compatible binary data.
     * The service-role client bypasses normal browser RLS restrictions.
     */
    const uploadBody = new Uint8Array(pdfBytes.byteLength);

    uploadBody.set(pdfBytes);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(CERTIFICATE_BUCKET)
      .upload(storagePath, uploadBody, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Certificate PDF upload failed:", uploadError);

      return jsonResponse(
        {
          success: false,
          message:
            "The certificate PDF was generated but could not be uploaded.",
        },
        500
      );
    }

    /*
     * This implementation uses a public bucket so the saved URL remains
     * stable for downloads and public certificate verification.
     */
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(CERTIFICATE_BUCKET)
      .getPublicUrl(storagePath);

    const fileUrl = publicUrlData.publicUrl;

    if (!fileUrl) {
      return jsonResponse(
        {
          success: false,
          message: "The uploaded certificate URL could not be created.",
        },
        500
      );
    }

    // Save the generated file and resolved template on the certificate.
    const { data: updatedCertificate, error: updateError } = await supabaseAdmin
      .from("academy_certificates")
      .update({
        template_id: template.id,

        file_url: fileUrl,

        generated_at: new Date().toISOString(),

        metadata: {
          ...(typeof certificateData.metadata === "object" &&
          certificateData.metadata !== null
            ? certificateData.metadata
            : {}),

          pdf_generated_at: new Date().toISOString(),

          pdf_storage_bucket: CERTIFICATE_BUCKET,

          pdf_storage_path: storagePath,

          pdf_template_key: template.template_key,
        },
      })
      .eq("id", certificateData.id)
      .select(
        `
        id,
        template_id,
        certificate_number,
        verification_code,
        file_url,
        generated_at,
        status
        `
      )
      .single();

    if (updateError) {
      console.error("Certificate record update failed:", updateError);

      return jsonResponse(
        {
          success: false,
          message:
            "The PDF was uploaded, but the certificate record could not be updated.",
        },
        500
      );
    }

    return jsonResponse({
      success: true,

      message: "Certificate PDF generated successfully.",

      certificate: updatedCertificate,

      fileUrl,

      storagePath,
    });
  } catch (error) {
    console.error("Unexpected certificate generation error:", error);

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "The certificate PDF could not be generated.",
      },
      500
    );
  }
};
