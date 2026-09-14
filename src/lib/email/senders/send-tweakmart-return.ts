import { getResendClient } from "../resend";
import { EMAIL_BRAND } from "../email-brand";

export type TweakMartOrderEmailStatus =
  | "confirmed"
  | "processing"
  | "ready_for_delivery"
  | "out_for_delivery"
  | "delivered";

interface SendTweakMartOrderEmailInput {
  orderId: string;
  orderNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  status: TweakMartOrderEmailStatus;
}

interface OrderNotificationCopy {
  badge: string;
  subject: string;
  heading: string;
  message: string;
  nextStepTitle: string;
  nextStepMessage: string;
}

/* Escapes dynamic values before inserting them into transactional email HTML. */
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Converts one order lifecycle state into customer-facing email content. */
function getOrderNotificationCopy(
  status: TweakMartOrderEmailStatus
): OrderNotificationCopy {
  switch (status) {
    case "confirmed":
      return {
        badge: "ORDER CONFIRMED",
        subject: "Your TweakMart order has been confirmed",
        heading: "Your order has been confirmed",
        message:
          "We have confirmed your TweakMart order and it is now entering our fulfilment workflow.",
        nextStepTitle: "What happens next?",
        nextStepMessage:
          "Our team will begin processing your order and preparing your items for fulfilment.",
      };

    case "processing":
      return {
        badge: "PROCESSING",
        subject: "Your TweakMart order is being processed",
        heading: "Processing has started",
        message:
          "Your TweakMart order is now being processed by our fulfilment team.",
        nextStepTitle: "We're preparing your order",
        nextStepMessage:
          "Your items are being prepared for fulfilment. We will notify you again when your order is ready for delivery.",
      };

    case "ready_for_delivery":
      return {
        badge: "READY FOR DELIVERY",
        subject: "Your TweakMart order is ready for delivery",
        heading: "Your order is ready",
        message:
          "Your TweakMart order has been fulfilled successfully and is now ready for dispatch.",
        nextStepTitle: "Up next",
        nextStepMessage:
          "Your order will be handed over for delivery. You will receive another update once it is on the way.",
      };

    case "out_for_delivery":
      return {
        badge: "OUT FOR DELIVERY",
        subject: "Your TweakMart order is on the way",
        heading: "Your order is out for delivery",
        message:
          "Good news — your TweakMart order has been dispatched and is now on the way to you.",
        nextStepTitle: "Please be available",
        nextStepMessage:
          "Please ensure that someone is available at the delivery address to receive the order.",
      };

    case "delivered":
      return {
        badge: "DELIVERED",
        subject: "Your TweakMart order has been delivered",
        heading: "Your order has been delivered",
        message:
          "Your TweakMart order has been marked as successfully delivered. We hope you enjoy your purchase.",
        nextStepTitle: "Thank you for choosing TweakMart",
        nextStepMessage:
          "If you need help with your order or need to request a return, our team is available to assist you.",
      };
  }
}

/* Sends one lifecycle notification for a TweakMart customer order. */
export async function sendTweakMartOrderEmail({
  orderId,
  orderNumber,
  firstName,
  lastName,
  email,
  status,
}: SendTweakMartOrderEmailInput) {
  const resend = getResendClient();

  const customerName = `${firstName} ${lastName}`.trim();

  const safeFirstName = escapeHtml(firstName || "Customer");
  const safeCustomerName = escapeHtml(customerName || "Customer");
  const safeOrderNumber = escapeHtml(orderNumber);

  /* Normalize the customer's email before sending the transactional message. */
  const recipientEmail = email.trim().toLowerCase();

  const copy = getOrderNotificationCopy(status);

  /*
   * Keep this deterministic so retries or repeated lifecycle requests
   * cannot send the same order-status email more than once.
   */
  const idempotencyKey = `tweakmart-order-${orderId}-${status}`;

  const { data, error } = await resend.emails.send(
    {
      from: EMAIL_BRAND.tweakMartSender,
      to: [recipientEmail],
      replyTo: EMAIL_BRAND.tweakMartReplyTo,

      subject: copy.subject,

      html: `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />

    <title>${escapeHtml(copy.subject)}</title>
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
        <td
          align="center"
          style="padding:40px 16px;"
        >
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
                  padding:26px 32px;
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
                      <div
                        style="
                          font-size:19px;
                          font-weight:800;
                          color:#0f172a;
                          letter-spacing:-0.02em;
                        "
                      >
                        ${EMAIL_BRAND.tweakMartName}
                      </div>

                      <div
                        style="
                          margin-top:3px;
                          font-size:12px;
                          color:#94a3b8;
                        "
                      >
                        by CloudTweak
                      </div>
                    </td>

                    <td
                      align="right"
                      style="
                        font-size:12px;
                        font-weight:700;
                        color:#64748b;
                      "
                    >
                      ${safeOrderNumber}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding:40px 32px 24px;
                "
              >
                <div
                  style="
                    display:inline-block;
                    margin-bottom:18px;
                    padding:7px 12px;
                    border-radius:999px;
                    background:#eef2ff;
                    font-size:11px;
                    font-weight:800;
                    letter-spacing:.06em;
                    color:#3157d5;
                  "
                >
                  ${escapeHtml(copy.badge)}
                </div>

                <h1
                  style="
                    margin:0;
                    font-size:30px;
                    line-height:1.25;
                    font-weight:800;
                    color:#0f172a;
                    letter-spacing:-0.025em;
                  "
                >
                  ${escapeHtml(copy.heading)}
                </h1>

                <p
                  style="
                    margin:16px 0 0;
                    font-size:16px;
                    line-height:1.75;
                    color:#475569;
                  "
                >
                  Hello ${safeFirstName},
                </p>

                <p
                  style="
                    margin:10px 0 0;
                    font-size:16px;
                    line-height:1.75;
                    color:#475569;
                  "
                >
                  ${escapeHtml(copy.message)}
                </p>
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding:0 32px 28px;
                "
              >
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
                    <td
                      style="
                        padding:24px;
                      "
                    >
                      <p
                        style="
                          margin:0 0 18px;
                          font-size:12px;
                          font-weight:800;
                          text-transform:uppercase;
                          letter-spacing:.08em;
                          color:#64748b;
                        "
                      >
                        Order Summary
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
                            Customer
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
                            ${safeCustomerName}
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
                            Order
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
                            ${safeOrderNumber}
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
                            Status
                          </td>

                          <td
                            align="right"
                            style="
                              padding:0;
                              font-size:14px;
                              font-weight:700;
                              color:#3157d5;
                            "
                          >
                            ${escapeHtml(copy.badge)}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding:0 32px 32px;
                "
              >
                <div
                  style="
                    border-radius:16px;
                    border:1px solid #e2e8f0;
                    padding:24px;
                  "
                >
                  <p
                    style="
                      margin:0;
                      font-size:15px;
                      font-weight:800;
                      color:#0f172a;
                    "
                  >
                    ${escapeHtml(copy.nextStepTitle)}
                  </p>

                  <p
                    style="
                      margin:8px 0 0;
                      font-size:14px;
                      line-height:1.7;
                      color:#64748b;
                    "
                  >
                    ${escapeHtml(copy.nextStepMessage)}
                  </p>
                </div>
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding:0 32px 32px;
                "
              >
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
                    Need help with your order?
                  </p>

                  <p
                    style="
                      margin:8px 0 0;
                      font-size:14px;
                      line-height:1.65;
                      color:#cbd5e1;
                    "
                  >
                    Reply to this email if you have any questions about
                    your TweakMart order and our team will assist you.
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
                  TweakMart order.
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
        `${copy.heading}`,
        "",
        `Hello ${firstName || "Customer"},`,
        "",
        copy.message,
        "",
        `Customer: ${customerName || "Customer"}`,
        `Order: ${orderNumber}`,
        `Status: ${copy.badge}`,
        "",
        copy.nextStepTitle,
        copy.nextStepMessage,
        "",
        "Need help?",
        "Reply to this email if you have questions about your order.",
        "",
        "TweakMart",
        EMAIL_BRAND.companyName,
        EMAIL_BRAND.websiteUrl,
      ].join("\n"),
    },
    {
      idempotencyKey,
    }
  );

  if (error) {
    throw new Error(
      error.message || "The TweakMart order notification could not be sent."
    );
  }

  return {
    emailId: data?.id ?? null,
  };
}
