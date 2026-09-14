import { tweakMartAdminSupabase } from "./supabase-server";

export type TweakMartOrderPaymentStatus =
  "pending" | "unpaid" | "paid" | "failed" | "refunded" | "partially_refunded";

export type TweakMartOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready_for_delivery"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type TweakMartInventoryStatus =
  "not_reserved" | "reserved" | "released" | "consumed";

export type TweakMartPaymentMethod = "paystack" | "pay_on_delivery";

export interface TweakMartOrderNotificationRecipient {
  orderNumber: string;
  firstName: string;
  lastName: string;
  email: string;
}

/* Retrieves the customer details required for TweakMart order notifications. */
export async function getTweakMartOrderNotificationRecipient(
  orderId: string
): Promise<TweakMartOrderNotificationRecipient> {
  const { data, error } = await tweakMartAdminSupabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      customer_first_name,
      customer_last_name,
      customer_email
    `
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load TweakMart notification recipient: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("TweakMart order was not found.");
  }

  if (!data.customer_email) {
    throw new Error(`No customer email is available for ${data.order_number}.`);
  }

  return {
    orderNumber: data.order_number,
    firstName: data.customer_first_name ?? "",
    lastName: data.customer_last_name ?? "",
    email: data.customer_email,
  };
}

export interface TweakMartAdminOrder {
  id: string;
  order_number: string;

  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;

  delivery_city: string;
  delivery_state: string;

  total: number;
  currency: string;

  payment_method: TweakMartPaymentMethod;
  payment_status: TweakMartOrderPaymentStatus;
  payment_channel: string | null;

  order_status: TweakMartOrderStatus;
  inventory_status: TweakMartInventoryStatus;

  paid_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;

  requires_manual_review: boolean;
}

export interface TweakMartOrderStats {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  manualReviewOrders: number;
}

export interface TweakMartOrdersResult {
  orders: TweakMartAdminOrder[];
  stats: TweakMartOrderStats;
}

export interface TweakMartAdminOrderItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

export interface TweakMartPaymentAttempt {
  id: string;
  order_id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  channel: string | null;
  provider_response: unknown;
  created_at: string;
  updated_at: string;
}

export interface TweakMartInventoryReservation {
  id: string;
  inventory_id: string;
  variant_id: string;
  quantity: number;
  status: string;
  reservation_key: string | null;
  order_id: string | null;
  expires_at: string;
  committed_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TweakMartInventoryMovement {
  id: string;
  inventory_id: string;
  variant_id: string;
  movement_type: string;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface TweakMartAdminOrderDetails extends TweakMartAdminOrder {
  delivery_address: string;
  delivery_notes: string | null;

  subtotal: number;
  delivery_fee: number;

  inventory_reserved_at: string | null;
  inventory_released_at: string | null;
  inventory_consumed_at: string | null;

  delivered_at: string | null;
  cancelled_at: string | null;

  items: TweakMartAdminOrderItem[];
  payment_attempts: TweakMartPaymentAttempt[];
  reservations: TweakMartInventoryReservation[];
  inventory_movements: TweakMartInventoryMovement[];
}

export interface TweakMartOrderActionResult {
  order_id: string;
  order_number: string;
  order_status: TweakMartOrderStatus;
  inventory_status: TweakMartInventoryStatus;
  already_processed: boolean;
}

/*
 * Determines whether an order represents a payment or fulfillment
 * exception requiring intervention from a TweakMart administrator.
 *
 * A paid order that remains pending after its inventory was released
 * means the customer's payment succeeded but fulfillment did not.
 */
function requiresManualReview(order: {
  payment_status: string;
  order_status: string;
  inventory_status: string;
}) {
  return (
    order.payment_status === "paid" &&
    order.order_status === "pending" &&
    order.inventory_status === "released"
  );
}

/*
 * Converts numeric values returned by Supabase into safe JavaScript numbers.
 */
function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

/*
 * Converts raw Supabase order data into the consistent administrative
 * order model consumed by the TweakMart management interface.
 */
function mapAdminOrder(order: any): TweakMartAdminOrder {
  return {
    id: order.id,
    order_number: order.order_number,

    customer_first_name: order.customer_first_name,
    customer_last_name: order.customer_last_name,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,

    delivery_city: order.delivery_city,
    delivery_state: order.delivery_state,

    total: toNumber(order.total),
    currency: order.currency,

    payment_method: order.payment_method as TweakMartPaymentMethod,
    payment_status: order.payment_status as TweakMartOrderPaymentStatus,
    payment_channel: order.payment_channel,

    order_status: order.order_status as TweakMartOrderStatus,
    inventory_status: order.inventory_status as TweakMartInventoryStatus,

    paid_at: order.paid_at,
    confirmed_at: order.confirmed_at,
    created_at: order.created_at,
    updated_at: order.updated_at,

    requires_manual_review: requiresManualReview(order),
  };
}

/*
 * Loads TweakMart orders from the dedicated Marketplace Supabase
 * project for use inside the CloudTweak administrative workspace.
 */
export async function getTweakMartAdminOrders(): Promise<TweakMartOrdersResult> {
  const { data, error } = await tweakMartAdminSupabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        customer_first_name,
        customer_last_name,
        customer_email,
        customer_phone,
        delivery_city,
        delivery_state,
        total,
        currency,
        payment_method,
        payment_status,
        payment_channel,
        order_status,
        inventory_status,
        paid_at,
        confirmed_at,
        created_at,
        updated_at
      `
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(`Unable to load TweakMart orders: ${error.message}`);
  }

  const orders = (data ?? []).map(mapAdminOrder);

  /*
   * Calculates dashboard statistics from the same authoritative
   * order result so the table and summary cards remain consistent.
   */
  const stats: TweakMartOrderStats = {
    totalOrders: orders.length,

    paidOrders: orders.filter((order) => order.payment_status === "paid")
      .length,

    pendingOrders: orders.filter((order) => order.order_status === "pending")
      .length,

    manualReviewOrders: orders.filter((order) => order.requires_manual_review)
      .length,
  };

  return {
    orders,
    stats,
  };
}

/*
 * Loads a complete TweakMart order and its related payment and
 * inventory history for the CloudTweak management workspace.
 */
export async function getTweakMartAdminOrder(
  orderNumber: string
): Promise<TweakMartAdminOrderDetails | null> {
  const { data: order, error: orderError } = await tweakMartAdminSupabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        customer_first_name,
        customer_last_name,
        customer_email,
        customer_phone,
        delivery_address,
        delivery_city,
        delivery_state,
        delivery_notes,
        subtotal,
        delivery_fee,
        total,
        currency,
        payment_method,
        payment_status,
        payment_channel,
        order_status,
        inventory_status,
        paid_at,
        confirmed_at,
        inventory_reserved_at,
        inventory_released_at,
        inventory_consumed_at,
        delivered_at,
        cancelled_at,
        created_at,
        updated_at
      `
    )
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (orderError) {
    throw new Error(`Unable to load TweakMart order: ${orderError.message}`);
  }

  if (!order) {
    return null;
  }

  /*
   * Loads the order items, payment attempts, reservations and inventory
   * movements concurrently after the authoritative order is found.
   */
  const [
    itemsResult,
    paymentAttemptsResult,
    reservationsResult,
    movementsResult,
  ] = await Promise.all([
    tweakMartAdminSupabase
      .from("order_items")
      .select(
        `
          id,
          product_id,
          variant_id,
          product_name,
          variant_name,
          sku,
          quantity,
          unit_price,
          line_total,
          created_at
        `
      )
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),

    tweakMartAdminSupabase
      .from("payment_attempts")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false }),

    tweakMartAdminSupabase
      .from("inventory_reservations")
      .select(
        `
          id,
          inventory_id,
          variant_id,
          quantity,
          status,
          reservation_key,
          order_id,
          expires_at,
          committed_at,
          released_at,
          created_at,
          updated_at
        `
      )
      .eq("order_id", order.id)
      .order("created_at", { ascending: false }),

    tweakMartAdminSupabase
      .from("inventory_movements")
      .select(
        `
          id,
          inventory_id,
          variant_id,
          movement_type,
          quantity,
          quantity_before,
          quantity_after,
          reference_type,
          reference_id,
          reference_number,
          reason,
          notes,
          created_at
        `
      )
      .eq("reference_id", order.id)
      .order("created_at", { ascending: false }),
  ]);

  if (itemsResult.error) {
    throw new Error(`Unable to load order items: ${itemsResult.error.message}`);
  }

  if (paymentAttemptsResult.error) {
    throw new Error(
      `Unable to load payment history: ${paymentAttemptsResult.error.message}`
    );
  }

  if (reservationsResult.error) {
    throw new Error(
      `Unable to load inventory reservations: ${reservationsResult.error.message}`
    );
  }

  if (movementsResult.error) {
    throw new Error(
      `Unable to load inventory movements: ${movementsResult.error.message}`
    );
  }

  const mappedOrder = mapAdminOrder(order);

  return {
    ...mappedOrder,

    delivery_address: order.delivery_address,
    delivery_notes: order.delivery_notes,

    subtotal: toNumber(order.subtotal),
    delivery_fee: toNumber(order.delivery_fee),

    inventory_reserved_at: order.inventory_reserved_at,
    inventory_released_at: order.inventory_released_at,
    inventory_consumed_at: order.inventory_consumed_at,

    delivered_at: order.delivered_at,
    cancelled_at: order.cancelled_at,

    items: (itemsResult.data ?? []).map((item) => ({
      ...item,
      quantity: toNumber(item.quantity),
      unit_price: toNumber(item.unit_price),
      line_total: toNumber(item.line_total),
    })),

    payment_attempts: (paymentAttemptsResult.data ?? []).map((attempt) => ({
      ...attempt,
      amount: toNumber(attempt.amount),
    })),

    reservations: (reservationsResult.data ?? []).map((reservation) => ({
      ...reservation,
      quantity: toNumber(reservation.quantity),
    })),

    inventory_movements: (movementsResult.data ?? []).map((movement) => ({
      ...movement,
      quantity: toNumber(movement.quantity),
      quantity_before: toNumber(movement.quantity_before),
      quantity_after: toNumber(movement.quantity_after),
    })),
  };
}

/*
 * Atomically consumes inventory reserved for an order and advances
 * the order into the ready-for-delivery stage.
 *
 * The database RPC is responsible for row locking, inventory validation,
 * stock deduction, movement creation and idempotency.
 */
export async function fulfillTweakMartOrder(
  orderId: string
): Promise<TweakMartOrderActionResult> {
  const { data, error } = await tweakMartAdminSupabase.rpc(
    "fulfill_tweakmart_order",
    {
      p_order_id: orderId,
    }
  );

  if (error) {
    throw new Error(`Unable to fulfill TweakMart order: ${error.message}`);
  }

  const result = data?.[0];

  if (!result) {
    throw new Error(
      "The fulfillment operation completed without returning an order."
    );
  }

  return {
    order_id: result.order_id,
    order_number: result.order_number,
    order_status: result.order_status as TweakMartOrderStatus,
    inventory_status: result.inventory_status as TweakMartInventoryStatus,
    already_processed: Boolean(result.already_processed),
  };
}

/*
 * Atomically cancels an order and releases its reserved inventory
 * when that inventory has not already been consumed.
 *
 * The database RPC also prevents repeated cancellation from releasing
 * inventory more than once.
 */
export async function cancelTweakMartOrder(
  orderId: string,
  reason?: string
): Promise<TweakMartOrderActionResult> {
  const { data, error } = await tweakMartAdminSupabase.rpc(
    "cancel_tweakmart_order",
    {
      p_order_id: orderId,
      p_reason: reason?.trim() || null,
    }
  );

  if (error) {
    throw new Error(`Unable to cancel TweakMart order: ${error.message}`);
  }

  const result = data?.[0];

  if (!result) {
    throw new Error(
      "The cancellation operation completed without returning an order."
    );
  }

  return {
    order_id: result.order_id,
    order_number: result.order_number,
    order_status: result.order_status as TweakMartOrderStatus,
    inventory_status: result.inventory_status as TweakMartInventoryStatus,
    already_processed: Boolean(result.already_processed),
  };
}

/*
 * Confirms a pending TweakMart order after PostgreSQL validates its
 * payment, inventory and lifecycle state.
 */
export async function confirmTweakMartOrder(
  orderId: string
): Promise<TweakMartOrderActionResult> {
  const { data, error } = await tweakMartAdminSupabase.rpc(
    "confirm_tweakmart_order",
    {
      p_order_id: orderId,
    }
  );

  if (error) {
    throw new Error(`Unable to confirm TweakMart order: ${error.message}`);
  }

  const result = data?.[0];

  if (!result) {
    throw new Error(
      "The confirmation operation completed without returning an order."
    );
  }

  return {
    order_id: result.order_id,
    order_number: result.order_number,
    order_status: result.order_status as TweakMartOrderStatus,
    inventory_status: result.inventory_status as TweakMartInventoryStatus,
    already_processed: Boolean(result.already_processed),
  };
}

/*
 * Moves a confirmed TweakMart order into processing after PostgreSQL
 * validates payment, inventory and lifecycle state.
 */
export async function startTweakMartOrderProcessing(
  orderId: string
): Promise<TweakMartOrderActionResult> {
  const { data, error } = await tweakMartAdminSupabase.rpc(
    "start_tweakmart_order_processing",
    {
      p_order_id: orderId,
    }
  );

  if (error) {
    throw new Error(
      `Unable to start TweakMart order processing: ${error.message}`
    );
  }

  const result = data?.[0];

  if (!result) {
    throw new Error(
      "The processing operation completed without returning an order."
    );
  }

  return {
    order_id: result.order_id,
    order_number: result.order_number,
    order_status: result.order_status as TweakMartOrderStatus,
    inventory_status: result.inventory_status as TweakMartInventoryStatus,
    already_processed: Boolean(result.already_processed),
  };
}
/*
 * Dispatches a fulfilled TweakMart order after PostgreSQL confirms that
 * it is ready for delivery and its inventory has already been consumed.
 */
export async function dispatchTweakMartOrder(
  orderId: string
): Promise<TweakMartOrderActionResult> {
  const { data, error } = await tweakMartAdminSupabase.rpc(
    "dispatch_tweakmart_order",
    {
      p_order_id: orderId,
    }
  );

  if (error) {
    throw new Error(`Unable to dispatch TweakMart order: ${error.message}`);
  }

  const result = data?.[0];

  if (!result) {
    throw new Error(
      "The dispatch operation completed without returning an order."
    );
  }

  return {
    order_id: result.order_id,
    order_number: result.order_number,
    order_status: result.order_status as TweakMartOrderStatus,
    inventory_status: result.inventory_status as TweakMartInventoryStatus,
    already_processed: Boolean(result.already_processed),
  };
}

/*
 * Marks an out-for-delivery TweakMart order as delivered after the
 * database verifies that fulfillment and payment are both complete.
 */
export async function markTweakMartOrderDelivered(
  orderId: string
): Promise<TweakMartOrderActionResult> {
  const { data, error } = await tweakMartAdminSupabase.rpc(
    "mark_tweakmart_order_delivered",
    {
      p_order_id: orderId,
    }
  );

  if (error) {
    throw new Error(
      `Unable to mark TweakMart order as delivered: ${error.message}`
    );
  }

  const result = data?.[0];

  if (!result) {
    throw new Error(
      "The delivery operation completed without returning an order."
    );
  }

  return {
    order_id: result.order_id,
    order_number: result.order_number,
    order_status: result.order_status as TweakMartOrderStatus,
    inventory_status: result.inventory_status as TweakMartInventoryStatus,
    already_processed: Boolean(result.already_processed),
  };
}

/* Records a completed Pay on Delivery payment for one dispatched order. */
export async function recordTweakMartPodPayment(
  orderId: string,
  input: {
    channel: "cash" | "pos" | "transfer";
    reference?: string;
    notes?: string;
  }
) {
  const { data, error } = await tweakMartAdminSupabase.rpc(
    "record_tweakmart_pod_payment",
    {
      p_order_id: orderId,
      p_channel: input.channel,
      p_reference: input.reference?.trim() || null,
      p_notes: input.notes?.trim() || null,
    }
  );

  if (error) {
    throw new Error(
      `Unable to record Pay on Delivery payment: ${error.message}`
    );
  }

  const result = data?.[0];

  if (!result) {
    throw new Error(
      "The payment operation completed without returning an order."
    );
  }

  return result;
}
