interface TweakMartNotificationCustomer {
  name: string;
  email: string;
}

interface TweakMartOrderNotificationInput {
  orderNumber: string;
  status:
    | "confirmed"
    | "processing"
    | "ready_for_delivery"
    | "out_for_delivery"
    | "delivered";
  customer: TweakMartNotificationCustomer;
}

interface TweakMartReturnNotificationInput {
  returnNumber: string;
  orderNumber: string;
  status: "approved" | "rejected" | "refunded";
  customer: TweakMartNotificationCustomer;
  refundAmount?: number;
}

/* Sends an email notification through the configured mail API endpoint. */
async function sendNotificationEmail(
  recipient: string,
  subject: string,
  html: string
) {
  const baseUrl = import.meta.env.PUBLIC_SITE_URL;

  if (!baseUrl) {
    throw new Error("PUBLIC_SITE_URL is not configured.");
  }

  const response = await fetch(`${baseUrl}/api/notifications/email`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      to: recipient,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(message || "Notification email could not be sent.");
  }
}

/* Returns customer-facing text for an order lifecycle event. */
function getOrderStatusCopy(status: TweakMartOrderNotificationInput["status"]) {
  switch (status) {
    case "confirmed":
      return {
        subject: "Your TweakMart order has been confirmed",
        heading: "Order confirmed",
        message: "Your order has been confirmed and is moving into processing.",
      };

    case "processing":
      return {
        subject: "Your TweakMart order is being processed",
        heading: "Processing started",
        message: "We have started processing your order.",
      };

    case "ready_for_delivery":
      return {
        subject: "Your TweakMart order is ready for delivery",
        heading: "Ready for delivery",
        message: "Your order has been fulfilled and is ready for dispatch.",
      };

    case "out_for_delivery":
      return {
        subject: "Your TweakMart order is out for delivery",
        heading: "Out for delivery",
        message: "Your order has been dispatched and is on the way.",
      };

    case "delivered":
      return {
        subject: "Your TweakMart order has been delivered",
        heading: "Order delivered",
        message: "Your order has been marked as delivered.",
      };
  }
}

/* Sends one TweakMart order lifecycle email. */
export async function notifyTweakMartOrderStatus(
  input: TweakMartOrderNotificationInput
) {
  const copy = getOrderStatusCopy(input.status);

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2>${copy.heading}</h2>

      <p>Hello ${input.customer.name},</p>

      <p>${copy.message}</p>

      <p>
        Order:
        <strong>${input.orderNumber}</strong>
      </p>

      <p>
        Thank you for shopping with TweakMart.
      </p>
    </div>
  `;

  await sendNotificationEmail(input.customer.email, copy.subject, html);
}

/* Returns customer-facing text for a return lifecycle event. */
function getReturnStatusCopy(
  status: TweakMartReturnNotificationInput["status"],
  refundAmount?: number
) {
  switch (status) {
    case "approved":
      return {
        subject: "Your TweakMart return has been approved",
        heading: "Return approved",
        message:
          "Your return request has been approved. We will continue processing the returned item.",
      };

    case "rejected":
      return {
        subject: "Update on your TweakMart return",
        heading: "Return request rejected",
        message:
          "Your return request has been reviewed and could not be approved.",
      };

    case "refunded":
      return {
        subject: "Your TweakMart refund has been processed",
        heading: "Refund processed",
        message:
          refundAmount !== undefined
            ? `Your refund of ${new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
              }).format(refundAmount)} has been processed.`
            : "Your refund has been processed.",
      };
  }
}

/* Sends one TweakMart return/refund email. */
export async function notifyTweakMartReturnStatus(
  input: TweakMartReturnNotificationInput
) {
  const copy = getReturnStatusCopy(input.status, input.refundAmount);

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2>${copy.heading}</h2>

      <p>Hello ${input.customer.name},</p>

      <p>${copy.message}</p>

      <p>
        Return:
        <strong>${input.returnNumber}</strong>
      </p>

      <p>
        Order:
        <strong>${input.orderNumber}</strong>
      </p>

      <p>
        Thank you for shopping with TweakMart.
      </p>
    </div>
  `;

  await sendNotificationEmail(input.customer.email, copy.subject, html);
}
