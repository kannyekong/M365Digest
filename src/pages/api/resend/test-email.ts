import type { APIRoute } from "astro";
import { Resend } from "resend";

export const prerender = false;

/* Returns a consistent JSON response from the test email endpoint. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/* Sends one test email through the production Resend configuration. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const resendApiKey = import.meta.env.RESEND_API_KEY;

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured on the server.");
    }

    const body = (await request.json()) as {
      email?: string;
    };

    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return jsonResponse(
        {
          success: false,
          message: "A recipient email address is required.",
        },
        400
      );
    }

    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: "CloudTweak Academy <certificates@cloudtweak.net>",
      to: [email],
      subject: "CloudTweak Academy Email Test",
      html: `
        <!doctype html>
        <html>
          <body
            style="
              margin: 0;
              padding: 0;
              background: #f8fafc;
              font-family: Arial, Helvetica, sans-serif;
              color: #0f172a;
            "
          >
            <div
              style="
                max-width: 600px;
                margin: 0 auto;
                padding: 40px 20px;
              "
            >
              <div
                style="
                  background: #ffffff;
                  border: 1px solid #e2e8f0;
                  border-radius: 16px;
                  padding: 32px;
                "
              >
                <h1
                  style="
                    margin: 0 0 16px;
                    font-size: 24px;
                  "
                >
                  CloudTweak Academy
                </h1>

                <p
                  style="
                    margin: 0 0 16px;
                    line-height: 1.7;
                  "
                >
                  Your CloudTweak Academy email integration is
                  working successfully.
                </p>

                <p
                  style="
                    margin: 0;
                    line-height: 1.7;
                    color: #64748b;
                  "
                >
                  This message was delivered using the CloudTweak
                  production Resend configuration.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text:
        "CloudTweak Academy email integration is working successfully. " +
        "This message was delivered using the CloudTweak production Resend configuration.",
    });

    if (error) {
      console.error("Resend test email failed:", error);

      return jsonResponse(
        {
          success: false,
          message: error.message || "Resend rejected the email.",
        },
        400
      );
    }

    return jsonResponse({
      success: true,
      message: "Test email sent successfully.",
      emailId: data?.id ?? null,
    });
  } catch (error) {
    console.error("Failed to send CloudTweak test email:", error);

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "The test email could not be sent.",
      },
      500
    );
  }
};
