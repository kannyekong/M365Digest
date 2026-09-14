import type { APIRoute } from "astro";

import {
  cancelTweakMartOrder,
  confirmTweakMartOrder,
  dispatchTweakMartOrder,
  fulfillTweakMartOrder,
  getTweakMartOrderNotificationRecipient,
  markTweakMartOrderDelivered,
  recordTweakMartPodPayment,
  startTweakMartOrderProcessing,
} from "../../../../../../lib/tweakmart/order";

import {
  sendTweakMartOrderEmail,
  type TweakMartOrderEmailStatus,
} from "../../../../../../lib/email/senders/send-tweakmart-return";

interface TweakMartOrderActionBody {
  action?:
    | "confirm"
    | "start_processing"
    | "fulfill"
    | "dispatch"
    | "record_pod_payment"
    | "mark_delivered"
    | "cancel";

  reason?: string;

  payment_channel?: "cash" | "pos" | "transfer";

  payment_reference?: string;

  payment_notes?: string;
}

/* Returns a consistent JSON response for TweakMart administrator order actions. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/* Safely reads the incoming JSON body for an administrator order action. */
async function readActionBody(
  request: Request
): Promise<TweakMartOrderActionBody | null> {
  try {
    return (await request.json()) as TweakMartOrderActionBody;
  } catch {
    return null;
  }
}

/*
 * Sends one TweakMart lifecycle email without allowing notification
 * failure to roll back or invalidate an already successful order action.
 */
async function sendOrderNotification(
  orderId: string,
  status: TweakMartOrderEmailStatus
) {
  try {
    const recipient = await getTweakMartOrderNotificationRecipient(orderId);

    await sendTweakMartOrderEmail({
      orderId,
      orderNumber: recipient.orderNumber,
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      email: recipient.email,
      status,
    });
  } catch (error) {
    console.error(
      `TweakMart ${status} notification failed for ${orderId}:`,
      error
    );
  }
}

/* Processes lifecycle actions for one TweakMart order. */
export const POST: APIRoute = async ({ params, request }) => {
  const orderId = params.id;

  if (!orderId) {
    return jsonResponse(
      {
        success: false,
        message: "Order ID is required.",
      },
      400
    );
  }

  const body = await readActionBody(request);

  if (!body) {
    return jsonResponse(
      {
        success: false,
        message: "Invalid request body.",
      },
      400
    );
  }

  try {
    /*
     * Confirms the order and notifies the customer only when the
     * confirmation was newly processed.
     */
    if (body.action === "confirm") {
      const order = await confirmTweakMartOrder(orderId);

      if (!order.already_processed) {
        await sendOrderNotification(orderId, "confirmed");
      }

      return jsonResponse({
        success: true,

        message: order.already_processed
          ? `${order.order_number} has already passed confirmation.`
          : `${order.order_number} has been confirmed successfully.`,

        order,
      });
    }

    /*
     * Moves the order into processing and sends the corresponding
     * customer lifecycle notification.
     */
    if (body.action === "start_processing") {
      const order = await startTweakMartOrderProcessing(orderId);

      if (!order.already_processed) {
        await sendOrderNotification(orderId, "processing");
      }

      return jsonResponse({
        success: true,

        message: order.already_processed
          ? `${order.order_number} has already entered processing.`
          : `${order.order_number} is now being processed.`,

        order,
      });
    }

    /*
     * Consumes reserved inventory and notifies the customer that the
     * order is now ready for delivery.
     */
    if (body.action === "fulfill") {
      const order = await fulfillTweakMartOrder(orderId);

      if (!order.already_processed) {
        await sendOrderNotification(orderId, "ready_for_delivery");
      }

      return jsonResponse({
        success: true,

        message: order.already_processed
          ? `${order.order_number} has already been fulfilled.`
          : `${order.order_number} has been fulfilled successfully.`,

        order,
      });
    }

    /*
     * Dispatches the order and sends the customer an out-for-delivery
     * notification.
     */
    if (body.action === "dispatch") {
      const order = await dispatchTweakMartOrder(orderId);

      if (!order.already_processed) {
        await sendOrderNotification(orderId, "out_for_delivery");
      }

      return jsonResponse({
        success: true,

        message: order.already_processed
          ? `${order.order_number} has already been dispatched.`
          : `${order.order_number} is now out for delivery.`,

        order,
      });
    }

    /*
     * Records payment received for a Pay on Delivery order.
     *
     * Payment recording does not currently generate a separate
     * customer lifecycle email.
     */
    if (body.action === "record_pod_payment") {
      if (!body.payment_channel) {
        return jsonResponse(
          {
            success: false,
            message: "Select a payment channel.",
          },
          400
        );
      }

      const payment = await recordTweakMartPodPayment(orderId, {
        channel: body.payment_channel,
        reference: body.payment_reference,
        notes: body.payment_notes,
      });

      return jsonResponse({
        success: true,

        message: payment.already_processed
          ? `${payment.order_number} already has a recorded POD payment.`
          : `Payment for ${payment.order_number} was recorded successfully.`,

        order: payment,
      });
    }

    /*
     * Completes delivery and sends the final order lifecycle email.
     */
    if (body.action === "mark_delivered") {
      const order = await markTweakMartOrderDelivered(orderId);

      if (!order.already_processed) {
        await sendOrderNotification(orderId, "delivered");
      }

      return jsonResponse({
        success: true,

        message: order.already_processed
          ? `${order.order_number} has already been marked as delivered.`
          : `${order.order_number} has been marked as delivered.`,

        order,
      });
    }

    /*
     * Cancels an eligible order.
     *
     * Cancellation notifications can be added later if required,
     * but are intentionally excluded from the initial launch scope.
     */
    if (body.action === "cancel") {
      const order = await cancelTweakMartOrder(orderId, body.reason);

      return jsonResponse({
        success: true,

        message: order.already_processed
          ? `${order.order_number} has already been cancelled.`
          : `${order.order_number} has been cancelled successfully.`,

        order,
      });
    }

    return jsonResponse(
      {
        success: false,
        message: "Unsupported order action.",
      },
      400
    );
  } catch (error) {
    console.error(`TweakMart order action failed for ${orderId}:`, error);

    return jsonResponse(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to update the TweakMart order.",
      },
      500
    );
  }
};
