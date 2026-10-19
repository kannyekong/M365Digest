import type { APIRoute } from "astro";

import { createClient } from "@supabase/supabase-js";

import { Resend } from "resend";

// Defines the audiences the admin is allowed to publish to.

type NotificationAudience = "organization" | "program" | "student";

// Defines the validated publishing request.

type PublishRequest = {
  audience: NotificationAudience;

  programId?: string;

  studentId?: string;

  title: string;

  message: string;

  link?: string;

  sendEmail?: boolean;

  emailOnlyTest?: boolean;
};

// Sends a consistent JSON response from this API endpoint.

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,

    headers: { "Content-Type": "application/json" },
  });
}

// Validates UUIDs before using them in database queries.

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

// Creates a privileged client only after validating the admin's session.

async function getAdminClient(request: Request) {
  const authorization = request.headers.get("authorization");

  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return { error: "Authentication is required.", status: 401 as const };
  }

  const supabaseUrl = import.meta.env.SUPABASE_URL;

  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  const allowedEmails = (import.meta.env.ADMIN_EMAILS ?? "")

    .split(",")

    .map((email: string) => email.trim().toLowerCase())

    .filter(Boolean);

  if (!supabaseUrl || !serviceRoleKey || allowedEmails.length === 0) {
    console.error("Student notification API environment is incomplete.");

    return {
      error: "The notification service is not configured.",

      status: 500 as const,
    };
  }

  // Disable browser-session persistence for this server-only client.

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,

      persistSession: false,
    },
  });

  // Verify the supplied token with Supabase Auth.

  const {
    data: { user },

    error,
  } = await client.auth.getUser(token);

  if (error || !user?.email) {
    return { error: "Your admin session is invalid.", status: 401 as const };
  }

  // Enforce the same email allowlist used by the existing admin API.

  if (!allowedEmails.includes(user.email.toLowerCase())) {
    return {
      error: "You are not authorized to publish notifications.",

      status: 403 as const,
    };
  }

  return { client, user, email: user.email, error: null };
}

// Escapes dynamic content before it is inserted into an HTML email.

function escapeHtml(value: string): string {
  return value

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");
}

// Sends an Academy announcement email and returns the provider result.

async function sendAnnouncementEmail(
  recipient: string,

  title: string,

  message: string,

  link: string,

  siteUrl: string
) {
  const apiKey = import.meta.env.RESEND_API_KEY;

  console.log("[Student notifications] Email send attempt:", {
    recipient,
    title,
    apiKeyConfigured: Boolean(apiKey),
  });

  if (!apiKey) {
    throw new Error("The email service is not configured.");
  }

  const resend = new Resend(apiKey);

  const safeTitle = escapeHtml(title);

  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br>");

  const safeLink = link ? escapeHtml(new URL(link, siteUrl).toString()) : "";

  console.log("[Student notifications] Submitting email to Resend:", {
    recipient,
    from: "CloudTweak Academy <learn@cloudtweak.net>",
  });

  const { data, error } = await resend.emails.send({
    from: "CloudTweak Academy <learn@cloudtweak.net>",

    to: [recipient],

    subject: title,

    html: `

       <!doctype html>

       <html>

         <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">

           <main style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">

             <p style="color:#3157d5;font-weight:700">CloudTweak Academy</p>

             <h1>${safeTitle}</h1>

             <p style="font-size:16px;line-height:1.8;color:#475569">${safeMessage}</p>

             ${
               safeLink
                 ? `<p><a href="${safeLink}" style="display:inline-block;padding:12px 20px;background:#3157d5;color:#ffffff;text-decoration:none;border-radius:8px">View Announcement</a></p>`
                 : ""
             }

             <p style="margin-top:32px;color:#64748b;font-size:13px">CloudTweak Academy</p>

           </main>

         </body>

       </html>

     `,

    text: `${title}\n\n${message}${link ? `\n\nView announcement: ${new URL(link, siteUrl).toString()}` : ""}`,
  });

  if (error) {
    console.error("[Student notifications] Resend rejected email:", {
      recipient,
      error,
    });

    throw new Error(
      error.message || "The email provider rejected the request."
    );
  }

  console.log("[Student notifications] Resend accepted email:", {
    recipient,
    emailId: data?.id ?? null,
  });

  return { emailId: data?.id ?? null };
}

// Publishes student notifications to the selected audience.

export const POST: APIRoute = async ({ request }) => {
  console.log("[Student notifications] Request received:", {
    method: request.method,
    url: request.url,
  });

  try {
    const admin = await getAdminClient(request);

    if (admin.error || !admin.client) {
      return jsonResponse(
        { success: false, message: admin.error },

        admin.status
      );
    }

    let body: PublishRequest;

    try {
      body = (await request.json()) as PublishRequest;
    } catch {
      return jsonResponse(
        { success: false, message: "The request body must be valid JSON." },

        400
      );
    }

    console.log("[Student notifications] Request body options:", {
      audience: body.audience,
      sendEmail: body.sendEmail,
      emailOnlyTest: body.emailOnlyTest,
      hasTitle: Boolean(body.title),
      hasMessage: Boolean(body.message),
    });

    const audience = body.audience;

    const title = typeof body.title === "string" ? body.title.trim() : "";

    const message = typeof body.message === "string" ? body.message.trim() : "";

    const link = typeof body.link === "string" ? body.link.trim() : "";

    // Validate required fields and enforce reasonable content limits.

    if (
      !["organization", "program", "student"].includes(audience) ||
      !title ||
      title.length > 150 ||
      !message ||
      message.length > 5000
    ) {
      return jsonResponse(
        {
          success: false,

          message:
            "Provide a valid audience, a title up to 150 characters, and a message up to 5,000 characters.",
        },

        400
      );
    }

    // Only permit internal application paths for notification links.

    if (
      link &&
      (!link.startsWith("/") || link.startsWith("//") || link.includes("\\\\"))
    ) {
      return jsonResponse(
        {
          success: false,

          message:
            "The notification link must be an internal application path.",
        },

        400
      );
    }

    if (audience === "program" && !isUuid(body.programId)) {
      return jsonResponse(
        { success: false, message: "Select a valid Academy program." },

        400
      );
    }

    if (audience === "student" && !isUuid(body.studentId)) {
      return jsonResponse(
        { success: false, message: "Select a valid student." },

        400
      );
    }

    // Test email delivery to the authenticated administrator without publishing

    // an in-app notification or contacting the student audience.

    if (body.emailOnlyTest === true) {
      console.log("[Student notifications] Email-only test requested:", {
        sendEmail: body.sendEmail,
        adminEmailAvailable: Boolean(admin.email),
        testRecipientConfigured: Boolean(import.meta.env.RESEND_TEST_EMAIL),
      });

      if (body.sendEmail !== true || !admin.email) {
        return jsonResponse(
          {
            success: false,

            message: "Enable email delivery to run the email-only test.",
          },

          400
        );
      }

      try {
        const siteUrl =
          import.meta.env.PUBLIC_SITE_URL ?? new URL(request.url).origin;

        const testRecipient = import.meta.env.RESEND_TEST_EMAIL;

        console.log(
          "[Student notifications] Email-only test recipient:",
          testRecipient ?? "(not configured)"
        );

        if (!testRecipient) {
          throw new Error("The test recipient email is not configured.");
        }

        const result = await sendAnnouncementEmail(
          testRecipient,

          title,

          message,

          link,

          siteUrl
        );

        return jsonResponse({
          success: true,

          email: {
            accepted: true,

            recipient: admin.email,

            emailId: result.emailId,
          },

          inApp: {
            sent: 0,

            failed: 0,

            skipped: true,
          },

          message:
            "The email was accepted by Resend. Inbox delivery is not yet confirmed.",
        });
      } catch (error) {
        console.error("Announcement email-only test failed:", error);

        return jsonResponse(
          {
            success: false,

            email: {
              accepted: false,

              failed: 1,
            },

            inApp: {
              sent: 0,

              failed: 0,

              skipped: true,
            },

            message:
              error instanceof Error
                ? error.message
                : "The test email could not be submitted.",
          },

          502
        );
      }
    }

    const client = admin.client;

    // Start with active enrollments and narrow them to the requested audience.

    let enrollmentQuery = client

      .from("student_enrollments")

      .select("student_id, program_id")

      .eq("status", "active");

    if (audience === "program") {
      enrollmentQuery = enrollmentQuery.eq("program_id", body.programId!);
    }

    if (audience === "student") {
      enrollmentQuery = enrollmentQuery.eq("student_id", body.studentId!);
    }

    const { data: enrollments, error: enrollmentError } = await enrollmentQuery;

    if (enrollmentError) {
      console.error(
        "Failed to resolve notification enrollments:",

        enrollmentError
      );

      return jsonResponse(
        { success: false, message: "Eligible students could not be loaded." },

        500
      );
    }

    // Deduplicate profile IDs because a student can have multiple enrollments.

    const profileIds = [
      ...new Set((enrollments ?? []).map((item) => item.student_id)),
    ];

    if (profileIds.length === 0) {
      return jsonResponse({
        success: true,

        sent: 0,

        failed: 0,

        message: "No students with active enrollments matched this audience.",
      });
    }

    // Resolve profile IDs to authentication user IDs for recipient_id.

    const { data: profiles, error: profilesError } = await client

      .from("student_profiles")

      .select("id, user_id")

      .in("id", profileIds);

    if (profilesError) {
      console.error("Failed to resolve student accounts:", profilesError);

      return jsonResponse(
        { success: false, message: "Student accounts could not be loaded." },

        500
      );
    }

    const recipients = [
      ...new Set(
        (profiles ?? [])

          .map((profile) => profile.user_id)

          .filter((userId): userId is string => Boolean(userId))
      ),
    ];

    // Persist a canonical announcement before sending any delivery so the history has a stable ID.
    const { data: announcementRecord, error: announcementInsertError } =
      await client
        .from("academy_announcements")
        .insert({
          title,
          message,
          link: link || null,
          audience,
          program_id: audience === "program" ? body.programId : null,
          student_id: audience === "student" ? body.studentId : null,
          delivery_method: body.sendEmail === true ? "both" : "in-app",
          published_by: admin.user?.id ?? null,
          recipients_count: recipients.length,
        })
        .select("id")
        .single();

    if (announcementInsertError || !announcementRecord) {
      console.error(
        "Failed to create canonical Academy announcement:",
        announcementInsertError
      );
      return jsonResponse(
        {
          success: false,
          message:
            "The announcement could not be saved. No notifications were sent.",
        },
        500
      );
    }

    // Publish in-app notifications and optional emails independently so a failure
    // in one channel does not prevent delivery through the other channel.
    let sent = 0;
    const failures: string[] = [];
    let emailSent = 0;
    const emailFailures: string[] = [];
    const sendEmail = body.sendEmail === true;
    const siteUrl =
      import.meta.env.PUBLIC_SITE_URL ?? new URL(request.url).origin;

    for (const recipientId of recipients) {
      // Preserve the existing in-app notification publishing path.
      const { error } = await client.rpc("create_student_notification", {
        p_recipient_id: recipientId,
        p_type: "academy_announcement",
        p_title: title,
        p_message: message,
        p_link: link || null,
        p_source_table: "academy_notifications",
        p_source_id: announcementRecord.id,
        p_metadata: {
          audience,
          program_id: audience === "program" ? body.programId : null,
          announcement_id: announcementRecord.id,
          published_at: new Date().toISOString(),
        },
      });

      if (error) {
        console.error("Student notification publish failed:", {
          recipientId,
          error,
        });
        failures.push(recipientId);
      } else {
        sent += 1;
      }

      // Email is opt-in per request and runs independently of in-app delivery.
      if (sendEmail) {
        try {
          const { data: authUserData, error: authUserError } =
            await client.auth.admin.getUserById(recipientId);

          const recipientEmail = authUserData?.user?.email;

          if (authUserError || !recipientEmail) {
            console.error(
              "Student announcement email recipient could not be resolved:",
              {
                recipientId,
                error:
                  authUserError?.message ??
                  "No email address is associated with this account.",
              }
            );
            emailFailures.push(recipientId);
            continue;
          }

          await sendAnnouncementEmail(
            recipientEmail,
            title,
            message,
            link,
            siteUrl
          );
          emailSent += 1;
        } catch (emailError) {
          console.error("Student announcement email failed:", {
            recipientId,
            error:
              emailError instanceof Error ? emailError.message : emailError,
          });
          emailFailures.push(recipientId);
        }
      }
    }

    const { error: announcementStatsError } = await client
      .from("academy_announcements")
      .update({
        in_app_sent: sent,
        in_app_failed: failures.length,
        email_sent: emailSent,
        email_failed: emailFailures.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", announcementRecord.id);

    if (announcementStatsError) {
      console.error(
        "Failed to update Academy announcement delivery totals:",
        announcementStatsError
      );
    }

    const inAppSuccess = failures.length === 0;
    const emailSuccess = !sendEmail || emailFailures.length === 0;
    const allSuccess = inAppSuccess && emailSuccess;
    const messageParts = [
      `${sent} in-app notification(s) sent; ${failures.length} failed.`,
    ];

    if (sendEmail) {
      messageParts.push(
        `${emailSent} email(s) sent; ${emailFailures.length} failed.`
      );
    } else {
      messageParts.push("Email delivery was not requested.");
    }

    return jsonResponse(
      {
        success: allSuccess,
        // Keep the original top-level counters for existing frontend consumers.
        sent,
        failed: failures.length,
        inApp: {
          sent,
          failed: failures.length,
          skipped: false,
        },
        email: {
          sent: emailSent,
          failed: emailFailures.length,
          skipped: !sendEmail,
        },
        message: messageParts.join(" "),
      },
      allSuccess ? 200 : 207
    );
  } catch (error) {
    console.error("Unexpected student notification publishing error:", error);

    return jsonResponse(
      {
        success: false,

        message: "An unexpected error occurred while publishing.",
      },

      500
    );
  }
};
