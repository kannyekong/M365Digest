import { getResendClient } from "../resend";
import { EMAIL_BRAND } from "../email-brand";

interface SendAcademyWelcomeEmailInput {
  registrationId: string;
  firstName: string;
  lastName: string;
  email: string;
  programTitle: string;
  amountPaid: number;
  currency: string;
  paymentReference: string;
}

/* Formats one amount for the Academy welcome email. */
function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
  }).format(value);
}

/* Escapes dynamic text before inserting it into the HTML email. */
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Sends the transactional Academy welcome email after a confirmed payment. */
export async function sendAcademyWelcomeEmail({
  registrationId,
  firstName,
  lastName,
  email,
  programTitle,
  amountPaid,
  currency,
  paymentReference,
}: SendAcademyWelcomeEmailInput) {
  const resend = getResendClient();

  const learnerName = `${firstName} ${lastName}`.trim();

  const safeFirstName = escapeHtml(firstName);
  const safeLearnerName = escapeHtml(learnerName);
  const safeProgramTitle = escapeHtml(programTitle);
  const safePaymentReference = escapeHtml(paymentReference);

  const formattedAmount = formatCurrency(amountPaid, currency);

  /*
   * Keep this deterministic so duplicate Paystack webhook deliveries
   * cannot send the same welcome email multiple times.
   */
  const idempotencyKey = `academy-welcome-${registrationId}`;

  const { data, error } = await resend.emails.send(
    {
      from: EMAIL_BRAND.academySender,
      to: EMAIL_BRAND.replyTo,
      subject: `Welcome to CloudTweak Academy — ${programTitle}`,
      html: `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Welcome to CloudTweak Academy</title>
    </head>

    <body
      style="
        margin:0;
        padding:0;
        background:#f5f7fb;
        font-family:Inter,Arial,Helvetica,sans-serif;
        color:#0f172a;
      "
    >
      <table
        role="presentation"
        width="100%"
        cellspacing="0"
        cellpadding="0"
        border="0"
        style="background:#f5f7fb;"
      >
        <tr>
          <td align="center" style="padding:40px 16px;">
            <table
              role="presentation"
              width="100%"
              cellspacing="0"
              cellpadding="0"
              border="0"
              style="
                max-width:640px;
                background:#ffffff;
                border:1px solid #e2e8f0;
                border-radius:24px;
                overflow:hidden;
                box-shadow:0 18px 50px rgba(15,23,42,0.08);
              "
            >
              <tr>
                <td
                  style="
                    padding:28px 32px;
                    border-bottom:1px solid #eef2f7;
                  "
                >
                  <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                  >
                    <tr>
                      <td align="left">
                        <img
                          src=<img
                          src="${EMAIL_BRAND.logoUrl}"
                          alt="CloudTweak"
                          width="150"
                          style="
                            display:block;
                            max-width:150px;
                            height:auto;
                            border:0;
                          "
                        />
                      </td>

                      <td
                        align="right"
                        style="
                          font-size:12px;
                          font-weight:700;
                          letter-spacing:.08em;
                          text-transform:uppercase;
                          color:#64748b;
                        "
                      >
                        Academy
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:40px 32px 24px;">
                  <div
                    style="
                      display:inline-block;
                      margin-bottom:18px;
                      padding:7px 12px;
                      border-radius:999px;
                      background:#eef2ff;
                      font-size:12px;
                      font-weight:700;
                      color:#3157d5;
                    "
                  >
                    PAYMENT CONFIRMED
                  </div>

                  <h1
                    style="
                      margin:0;
                      font-size:30px;
                      line-height:1.25;
                      font-weight:800;
                      color:#0f172a;
                    "
                  >
                    Welcome to CloudTweak Academy, ${safeFirstName} 👋
                  </h1>

                  <p
                    style="
                      margin:16px 0 0;
                      font-size:16px;
                      line-height:1.75;
                      color:#475569;
                    "
                  >
                    Your payment has been confirmed and your registration
                    for
                    <strong style="color:#0f172a;">
                      ${safeProgramTitle}
                    </strong>
                    is now active.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:0 32px 28px;">
                  <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                      background:#f8fafc;
                      border:1px solid #e2e8f0;
                      border-radius:16px;
                    "
                  >
                    <tr>
                      <td style="padding:24px;">
                        <p
                          style="
                            margin:0 0 18px;
                            font-size:13px;
                            font-weight:700;
                            text-transform:uppercase;
                            letter-spacing:.08em;
                            color:#64748b;
                          "
                        >
                          Registration Summary
                        </p>

                        <table
                          role="presentation"
                          width="100%"
                          cellspacing="0"
                          cellpadding="0"
                          border="0"
                        >
                          <tr>
                            <td
                              style="
                                padding:0 0 16px;
                                font-size:14px;
                                color:#64748b;
                              "
                            >
                              Learner
                            </td>

                            <td
                              align="right"
                              style="
                                padding:0 0 16px;
                                font-size:14px;
                                font-weight:700;
                                color:#0f172a;
                              "
                            >
                              ${safeLearnerName}
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding:0 0 16px;
                                font-size:14px;
                                color:#64748b;
                              "
                            >
                              Program
                            </td>

                            <td
                              align="right"
                              style="
                                padding:0 0 16px;
                                font-size:14px;
                                font-weight:700;
                                color:#0f172a;
                              "
                            >
                              ${safeProgramTitle}
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding:0 0 16px;
                                font-size:14px;
                                color:#64748b;
                              "
                            >
                              Payment
                            </td>

                            <td
                              align="right"
                              style="
                                padding:0 0 16px;
                                font-size:14px;
                                font-weight:700;
                                color:#0f172a;
                              "
                            >
                              ${formattedAmount}
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding:0;
                                font-size:14px;
                                color:#64748b;
                              "
                            >
                              Reference
                            </td>

                            <td
                              align="right"
                              style="
                                padding:0;
                                font-size:14px;
                                font-weight:700;
                                color:#0f172a;
                              "
                            >
                              ${safePaymentReference}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:0 32px 32px;">
                  <h2
                    style="
                      margin:0 0 16px;
                      font-size:18px;
                      font-weight:800;
                      color:#0f172a;
                    "
                  >
                    What happens next?
                  </h2>

                  <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                  >
                    <tr>
                      <td
                        valign="top"
                        style="
                          width:32px;
                          padding:0 12px 18px 0;
                          font-size:18px;
                        "
                      >
                        01
                      </td>

                      <td style="padding:0 0 18px;">
                        <p
                          style="
                            margin:0;
                            font-size:15px;
                            font-weight:700;
                            color:#0f172a;
                          "
                        >
                          Program information
                        </p>

                        <p
                          style="
                            margin:5px 0 0;
                            font-size:14px;
                            line-height:1.65;
                            color:#64748b;
                          "
                        >
                          You will receive your schedule, class details,
                          and any learning instructions from the Academy team.
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td
                        valign="top"
                        style="
                          width:32px;
                          padding:0 12px 18px 0;
                          font-size:18px;
                        "
                      >
                        02
                      </td>

                      <td style="padding:0 0 18px;">
                        <p
                          style="
                            margin:0;
                            font-size:15px;
                            font-weight:700;
                            color:#0f172a;
                          "
                        >
                          Attend your sessions
                        </p>

                        <p
                          style="
                            margin:5px 0 0;
                            font-size:14px;
                            line-height:1.65;
                            color:#64748b;
                          "
                        >
                          Join your scheduled sessions and complete the
                          required practical activities.
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td
                        valign="top"
                        style="
                          width:32px;
                          padding:0 12px 0 0;
                          font-size:18px;
                        "
                      >
                        03
                      </td>

                      <td>
                        <p
                          style="
                            margin:0;
                            font-size:15px;
                            font-weight:700;
                            color:#0f172a;
                          "
                        >
                          Earn your certificate
                        </p>

                        <p
                          style="
                            margin:5px 0 0;
                            font-size:14px;
                            line-height:1.65;
                            color:#64748b;
                          "
                        >
                          Once your program requirements are completed,
                          your certificate will be issued by CloudTweak Academy.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:0 32px 32px;">
                  <div
                    style="
                      border-radius:16px;
                      background:#0f172a;
                      padding:24px;
                    "
                  >
                    <p
                      style="
                        margin:0;
                        font-size:14px;
                        font-weight:700;
                        color:#ffffff;
                      "
                    >
                      Need help?
                    </p>

                    <p
                      style="
                        margin:8px 0 0;
                        font-size:14px;
                        line-height:1.65;
                        color:#cbd5e1;
                      "
                    >
                      Reply to this email or contact the CloudTweak Academy
                      team if you have questions about your registration.
                    </p>
                  </div>
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding:24px 32px;
                    border-top:1px solid #eef2f7;
                    background:#fafafa;
                  "
                >
                  <p
                    style="
                      margin:0;
                      font-size:13px;
                      line-height:1.6;
                      color:#64748b;
                    "
                  >
                    This is a transactional email related to your
                    CloudTweak Academy registration.
                  </p>

                  <p
                    style="
                      margin:8px 0 0;
                      font-size:13px;
                      font-weight:700;
                      color:#0f172a;
                    "
                  >
                    ${EMAIL_BRAND.companyName}
                  </p>

                  <p
                    style="
                      margin:4px 0 0;
                      font-size:12px;
                      color:#94a3b8;
                    "
                  >
                   ${EMAIL_BRAND.websiteUrl}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`,
      text: [
        `Welcome, ${firstName}!`,
        "",
        `Your payment has been confirmed and your registration for ${programTitle} is now active.`,
        "",
        `Learner: ${learnerName}`,
        `Program: ${programTitle}`,
        `Payment: ${formattedAmount}`,
        `Payment Reference: ${paymentReference}`,
        "",
        "Further program information, schedules and learning instructions will be communicated by the CloudTweak Academy team.",
        "",
        "CloudTweak Academy",
      ].join("\n"),
    },
    {
      idempotencyKey,
    }
  );

  if (error) {
    throw new Error(
      error.message || "The Academy welcome email could not be sent."
    );
  }

  return {
    emailId: data?.id ?? null,
  };
}
