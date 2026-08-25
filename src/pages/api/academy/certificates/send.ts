import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

import type { Database, Json } from "../../../../types/supabase";

export const prerender = false;

interface SendCertificateBody {
  certificateId?: string;
}

/* Returns a consistent JSON response from the certificate email endpoint. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/* Converts stored Supabase JSON metadata into a safe object. */
function normalizeMetadata(metadata: Json | null): Record<string, Json> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, Json>;
  }

  return {};
}

/* Formats an Academy certificate issue date for the recipient email. */
function formatCertificateDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

/* Escapes dynamic text before inserting it into the HTML email template. */
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Sends an issued Academy certificate to the registration owner. */
export const POST: APIRoute = async ({ request }) => {
  try {
    /* Read the authenticated administrator's access token. */
    const authorizationHeader = request.headers.get("authorization");

    if (!authorizationHeader?.startsWith("Bearer ")) {
      return jsonResponse(
        {
          success: false,
          message: "Authentication is required.",
        },
        401
      );
    }

    /* Validate the certificate identifier supplied by the admin interface. */
    const body = (await request.json()) as SendCertificateBody;

    const certificateId = body.certificateId?.trim();

    if (!certificateId) {
      return jsonResponse(
        {
          success: false,
          message: "Certificate ID is required.",
        },
        400
      );
    }

    /* Read server-only configuration. */
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = import.meta.env.RESEND_API_KEY;

    const siteUrl =
      import.meta.env.PUBLIC_SITE_URL ?? new URL(request.url).origin;

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey ||
      !resendApiKey
    ) {
      throw new Error(
        "Certificate email environment variables are incomplete."
      );
    }

    /*
     * Use the administrator's token first so Supabase confirms that the
     * requesting user has access through your existing RLS policies.
     */
    const userSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: authorizationHeader,
        },
      },
    });

    /* Confirm the requesting administrator can access this certificate. */
    const { data: authorizedCertificate, error: authorizationError } =
      await userSupabase
        .from("academy_certificates")
        .select("id")
        .eq("id", certificateId)
        .maybeSingle();

    if (authorizationError || !authorizedCertificate) {
      console.error(
        "Certificate email authorization failed:",
        authorizationError
      );

      return jsonResponse(
        {
          success: false,
          message: "You are not authorized to send this certificate.",
        },
        403
      );
    }

    /*
     * Use the service role only after authorization has succeeded.
     * This allows the server to obtain the registration's trusted email
     * address without accepting recipient information from the browser.
     */
    const adminSupabase = createClient<Database>(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    /* Load the certificate itself. */
    const { data: certificate, error: certificateError } = await adminSupabase
      .from("academy_certificates")
      .select(
        `
          id,
          registration_id,
          program_id,
          certificate_number,
          verification_code,
          recipient_name,
          program_title,
          issue_date,
          completion_date,
          file_url,
          status,
          revoked_at,
          metadata
          `
      )
      .eq("id", certificateId)
      .single();

    if (certificateError || !certificate) {
      console.error(
        "Certificate email certificate lookup failed:",
        certificateError
      );

      return jsonResponse(
        {
          success: false,
          message: "The certificate could not be found.",
        },
        404
      );
    }

    /* Never deliver a certificate that has been revoked. */
    if (certificate.revoked_at || certificate.status === "revoked") {
      return jsonResponse(
        {
          success: false,
          message: "A revoked certificate cannot be emailed.",
        },
        409
      );
    }

    /* Load the trusted recipient from the original Academy registration. */
    const { data: registration, error: registrationError } = await adminSupabase
      .from("academy_registrations")
      .select(
        `
          id,
          first_name,
          last_name,
          email,
          registration_status
          `
      )
      .eq("id", certificate.registration_id)
      .single();

    if (registrationError || !registration) {
      console.error("Certificate recipient lookup failed:", registrationError);

      return jsonResponse(
        {
          success: false,
          message: "The certificate recipient could not be loaded.",
        },
        404
      );
    }

    const recipientEmail = registration.email?.trim().toLowerCase();

    if (!recipientEmail) {
      return jsonResponse(
        {
          success: false,
          message: "The registration does not have a recipient email address.",
        },
        409
      );
    }

    /*
     * Build the public certificate verification URL.
     *
     * If your existing verification page uses a different URL structure,
     * we'll change only this line to match it.
     */
    const verificationUrl =
      `${siteUrl}/verify-certificate` +
      `?code=${encodeURIComponent(certificate.verification_code)}`;

    /*
     * Use the existing file URL when your generated certificate already
     * points to a downloadable certificate file.
     */
    const certificateUrl = certificate.file_url?.trim() || null;

    const recipientName = certificate.recipient_name.trim();
    const programTitle = certificate.program_title.trim();
    const certificateNumber = certificate.certificate_number.trim();

    const safeRecipientName = escapeHtml(recipientName);
    const safeProgramTitle = escapeHtml(programTitle);
    const safeCertificateNumber = escapeHtml(certificateNumber);
    const safeVerificationUrl = escapeHtml(verificationUrl);
    const safeCertificateUrl = certificateUrl
      ? escapeHtml(certificateUrl)
      : null;

    const issueDate = formatCertificateDate(certificate.issue_date);

    const resend = new Resend(resendApiKey);

    /*
     * Use the certificate UUID as part of the idempotency key.
     * The version suffix lets us deliberately send another certificate
     * email later if we explicitly implement a resend workflow.
     */
    /* Reads the previous certificate email delivery metadata. */
    const certificateMetadata = normalizeMetadata(certificate.metadata);

    const previousEmailDelivery =
      certificateMetadata.email_delivery &&
      typeof certificateMetadata.email_delivery === "object" &&
      !Array.isArray(certificateMetadata.email_delivery)
        ? (certificateMetadata.email_delivery as Record<string, Json>)
        : {};

    /* Calculates the next intentional certificate email send number. */
    const previousSendCount = Number(previousEmailDelivery.send_count ?? 0);

    const sendCount = previousSendCount + 1;

    /* Generates a unique idempotency key for each intentional certificate send. */
    const idempotencyKey = `academy-certificate-${certificate.id}-v${sendCount}`;

    /* Send the branded Academy certificate email through Resend. */
    const { data: emailResult, error: emailError } = await resend.emails.send(
      {
        from: "CloudTweak Academy <certificates@cloudtweak.net>",
        to: [recipientEmail],
        subject: `Your CloudTweak Academy Certificate — ${programTitle}`,
        html: `
            <!doctype html>
            <html>
              <body
                style="
                  margin:0;
                  padding:0;
                  background:#f8fafc;
                  font-family:Arial,Helvetica,sans-serif;
                  color:#0f172a;
                "
              >
                <div
                  style="
                    max-width:640px;
                    margin:0 auto;
                    padding:40px 20px;
                  "
                >
                  <div
                    style="
                      background:#ffffff;
                      border:1px solid #e2e8f0;
                      border-radius:20px;
                      overflow:hidden;
                    "
                  >
                    <div
                      style="
                        padding:32px;
                        border-bottom:1px solid #e2e8f0;
                      "
                    >
                      <p
                        style="
                          margin:0 0 10px;
                          font-size:13px;
                          font-weight:700;
                          letter-spacing:.08em;
                          text-transform:uppercase;
                          color:#3157d5;
                        "
                      >
                        CloudTweak Academy
                      </p>

                      <h1
                        style="
                          margin:0;
                          font-size:28px;
                          line-height:1.3;
                          color:#0f172a;
                        "
                      >
                        Congratulations, ${safeRecipientName}!
                      </h1>
                    </div>

                    <div style="padding:32px;">
                      <p
                        style="
                          margin:0 0 18px;
                          font-size:16px;
                          line-height:1.7;
                          color:#475569;
                        "
                      >
                        You have successfully completed
                        <strong style="color:#0f172a;">
                          ${safeProgramTitle}
                        </strong>.
                      </p>

                      <p
                        style="
                          margin:0 0 28px;
                          font-size:16px;
                          line-height:1.7;
                          color:#475569;
                        "
                      >
                        Your CloudTweak Academy certificate has been
                        issued and is now available.
                      </p>

                      ${
                        safeCertificateUrl
                          ? `
                            <div style="margin:0 0 14px;">
                              <a
                                href="${safeCertificateUrl}"
                                style="
                                  display:inline-block;
                                  padding:14px 22px;
                                  background:#3157d5;
                                  color:#ffffff;
                                  text-decoration:none;
                                  font-size:14px;
                                  font-weight:700;
                                  border-radius:10px;
                                "
                              >
                                View Certificate
                              </a>
                            </div>
                          `
                          : ""
                      }

                      <div style="margin:0 0 28px;">
                        <a
                          href="${safeVerificationUrl}"
                          style="
                            display:inline-block;
                            padding:13px 21px;
                            border:1px solid #cbd5e1;
                            color:#334155;
                            text-decoration:none;
                            font-size:14px;
                            font-weight:700;
                            border-radius:10px;
                          "
                        >
                          Verify Certificate
                        </a>
                      </div>

                      <div
                        style="
                          padding:20px;
                          background:#f8fafc;
                          border-radius:12px;
                        "
                      >
                        <p
                          style="
                            margin:0 0 8px;
                            font-size:12px;
                            text-transform:uppercase;
                            letter-spacing:.06em;
                            color:#64748b;
                          "
                        >
                          Certificate Number
                        </p>

                        <p
                          style="
                            margin:0 0 18px;
                            font-size:15px;
                            font-weight:700;
                            color:#0f172a;
                          "
                        >
                          ${safeCertificateNumber}
                        </p>

                        <p
                          style="
                            margin:0 0 8px;
                            font-size:12px;
                            text-transform:uppercase;
                            letter-spacing:.06em;
                            color:#64748b;
                          "
                        >
                          Issue Date
                        </p>

                        <p
                          style="
                            margin:0;
                            font-size:15px;
                            color:#0f172a;
                          "
                        >
                          ${issueDate}
                        </p>
                      </div>

                      <p
                        style="
                          margin:28px 0 0;
                          font-size:15px;
                          line-height:1.7;
                          color:#475569;
                        "
                      >
                        Congratulations once again on completing your
                        program.
                      </p>

                      <p
                        style="
                          margin:8px 0 0;
                          font-size:15px;
                          font-weight:700;
                          color:#0f172a;
                        "
                      >
                        CloudTweak Academy
                      </p>
                    </div>
                  </div>

                  <p
                    style="
                      margin:20px 0 0;
                      text-align:center;
                      font-size:12px;
                      line-height:1.6;
                      color:#94a3b8;
                    "
                  >
                    This certificate was issued by CloudTweak Academy.
                  </p>
                </div>
              </body>
            </html>
          `,
        text: [
          `Congratulations, ${recipientName}!`,
          "",
          `You have successfully completed ${programTitle}.`,
          "",
          "Your CloudTweak Academy certificate has been issued.",
          "",
          certificateUrl ? `View Certificate: ${certificateUrl}` : "",
          `Verify Certificate: ${verificationUrl}`,
          "",
          `Certificate Number: ${certificateNumber}`,
          `Issue Date: ${issueDate}`,
          "",
          "Congratulations once again on completing your program.",
          "",
          "CloudTweak Academy",
        ]
          .filter(Boolean)
          .join("\n"),
      },
      {
        idempotencyKey,
      }
    );

    if (emailError) {
      console.error("Resend certificate email failed:", emailError);

      /* Preserve the failed attempt in certificate metadata for diagnostics. */
      await adminSupabase
        .from("academy_certificates")
        .update({
          metadata: {
            ...normalizeMetadata(certificate.metadata),
            email_delivery: {
              status: "failed",
              recipient: recipientEmail,
              failed_at: new Date().toISOString(),
              error: emailError.message,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", certificate.id);

      return jsonResponse(
        {
          success: false,
          message:
            emailError.message || "The certificate email could not be sent.",
        },
        400
      );
    }

    const sentAt = new Date().toISOString();

    /* Record the successful Resend submission against the certificate. */
    const { error: metadataUpdateError } = await adminSupabase
      .from("academy_certificates")
      .update({
        metadata: {
          ...certificateMetadata,
          email_delivery: {
            status: "sent",
            recipient: recipientEmail,
            resend_email_id: emailResult?.id ?? null,
            sent_at: sentAt,
            send_count: sendCount,
          },
        },
        updated_at: sentAt,
      })
      .eq("id", certificate.id);

    if (metadataUpdateError) {
      console.error(
        "Certificate email was sent but metadata could not be updated:",
        metadataUpdateError
      );
    }

    return jsonResponse({
      success: true,
      message: `Certificate sent successfully to ${recipientEmail}.`,
      certificateId: certificate.id,
      emailId: emailResult?.id ?? null,
      recipient: recipientEmail,
    });
  } catch (error) {
    console.error("Unexpected certificate email error:", error);

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "The certificate email could not be sent.",
      },
      500
    );
  }
};
