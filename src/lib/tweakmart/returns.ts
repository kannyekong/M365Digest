import { tweakMartAdminSupabase } from "./supabase-server";

export interface RefundTweakMartReturnInput {
  amount: number;
  method: "paystack" | "cash" | "transfer" | "pos" | "other";
  reference?: string | null;
  notes?: string | null;
}

export type TweakMartReturnStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "item_received"
  | "inspected"
  | "refunded";

export type TweakMartReturnType = "refund" | "replacement";

export type TweakMartReturnItemCondition =
  "unopened" | "good" | "damaged" | "defective" | "incorrect_item" | "other";

export interface TweakMartReturnItemInput {
  order_item_id: string;
  quantity: number;
  condition?: TweakMartReturnItemCondition | null;
  notes?: string | null;
}

export interface CreateTweakMartReturnInput {
  orderId: string;
  reason: string;
  customerNotes?: string | null;
  items: TweakMartReturnItemInput[];
}

export interface TweakMartReturnSummary {
  id: string;
  return_number: string;
  order_id: string;
  status: TweakMartReturnStatus;
  return_type: TweakMartReturnType;
  reason: string;
  customer_notes: string | null;
  admin_notes: string | null;
  refund_amount: number;
  refund_method: string | null;
  refund_reference: string | null;
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  received_at: string | null;
  inspected_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TweakMartReturnItem {
  id: string;
  return_id: string;
  order_item_id: string;
  quantity: number;
  condition: TweakMartReturnItemCondition | null;
  restock: boolean;
  notes: string | null;
  created_at: string;

  order_item: {
    id: string;
    product_id: string;
    variant_id: string | null;
    product_name: string;
    variant_name: string | null;
    sku: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  } | null;
}

export interface TweakMartReturnEvent {
  id: string;
  return_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TweakMartInspectionItemInput {
  return_item_id: string;
  condition: TweakMartReturnItemCondition;
  restock: boolean;
}

/* Completes return inspection and restores approved items to inventory atomically. */
export async function inspectTweakMartReturn(
  returnId: string,
  items: TweakMartInspectionItemInput[],
  notes?: string | null
) {
  const { data, error } = await tweakMartAdminSupabase.rpc(
    "inspect_tweakmart_return",
    {
      p_return_id: returnId,
      p_items: items,
      p_notes: notes?.trim() || null,
    }
  );

  if (error) {
    throw new Error(`Unable to inspect TweakMart return: ${error.message}`);
  }

  const result = data?.[0];

  if (!result) {
    throw new Error("Return inspection completed without returning a result.");
  }

  return result;
}

export interface TweakMartReturnDetails extends TweakMartReturnSummary {
  order: {
    id: string;
    order_number: string;
    order_status: string;
    payment_method: string;
    payment_status: string;
    customer_name: string;
    customer_email: string | null;
  } | null;

  items: TweakMartReturnItem[];
  events: TweakMartReturnEvent[];
}

/* Converts a database numeric value into a safe JavaScript number. */
function toNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

/* Creates a return request through the transactional database RPC. */
export async function createTweakMartReturn(input: CreateTweakMartReturnInput) {
  const { data, error } = await tweakMartAdminSupabase.rpc(
    "create_tweakmart_return",
    {
      p_order_id: input.orderId,
      p_reason: input.reason.trim(),
      p_customer_notes: input.customerNotes?.trim() || null,
      p_items: input.items.map((item) => ({
        order_item_id: item.order_item_id,
        quantity: item.quantity,
        condition: item.condition ?? null,
        notes: item.notes?.trim() || null,
      })),
    }
  );

  if (error) {
    throw new Error(`Unable to create TweakMart return: ${error.message}`);
  }

  const result = data?.[0];

  if (!result) {
    throw new Error("The return request completed without returning a result.");
  }

  return result;
}

/* Advances a return through one of the validated database lifecycle states. */
export async function updateTweakMartReturnStatus(
  returnId: string,
  status: Exclude<TweakMartReturnStatus, "requested" | "refunded">,
  notes?: string | null
) {
  const { data, error } = await tweakMartAdminSupabase.rpc(
    "update_tweakmart_return_status",
    {
      p_return_id: returnId,
      p_status: status,
      p_notes: notes?.trim() || null,
    }
  );

  if (error) {
    throw new Error(`Unable to update TweakMart return: ${error.message}`);
  }

  const result = data?.[0];

  if (!result) {
    throw new Error("The return update completed without returning a result.");
  }

  return result;
}

/* Retrieves the returns list for the TweakMart administrator. */
export async function getTweakMartReturns() {
  const { data, error } = await tweakMartAdminSupabase
    .from("order_returns")
    .select(
      `
      *,
      order:orders (
        id,
        order_number,
        order_status,
        payment_method,
        payment_status,
        customer_first_name,
        customer_last_name,
        customer_email
      )
    `
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(`Unable to load TweakMart returns: ${error.message}`);
  }

  return (data ?? []).map((item) => ({
    ...item,
    refund_amount: toNumber(item.refund_amount),

    order: item.order
      ? {
          ...item.order,

          customer_name: [
            item.order.customer_first_name,
            item.order.customer_last_name,
          ]
            .filter(Boolean)
            .join(" "),
        }
      : null,
  }));
}

/* Retrieves one return and all of its items and lifecycle events. */
export async function getTweakMartReturnByNumber(
  returnNumber: string
): Promise<TweakMartReturnDetails | null> {
  const { data: returnData, error: returnError } = await tweakMartAdminSupabase
    .from("order_returns")
    .select(
      `
        *,
        order:orders (
          id,
          order_number,
          order_status,
          payment_method,
          payment_status,
          customer_first_name,
         customer_last_name,
          customer_email
        )
      `
    )
    .eq("return_number", returnNumber)
    .maybeSingle();

  if (returnError) {
    throw new Error(`Unable to load TweakMart return: ${returnError.message}`);
  }

  if (!returnData) {
    return null;
  }

  const { data: itemData, error: itemError } = await tweakMartAdminSupabase
    .from("order_return_items")
    .select(
      `
        *,
        order_item:order_items (
          id,
          product_id,
          variant_id,
          product_name,
          variant_name,
          sku,
          quantity,
          unit_price,
          line_total
        )
      `
    )
    .eq("return_id", returnData.id)
    .order("created_at", {
      ascending: true,
    });

  if (itemError) {
    throw new Error(`Unable to load return items: ${itemError.message}`);
  }

  const { data: eventData, error: eventError } = await tweakMartAdminSupabase
    .from("order_return_events")
    .select("*")
    .eq("return_id", returnData.id)
    .order("created_at", {
      ascending: true,
    });

  if (eventError) {
    throw new Error(`Unable to load return history: ${eventError.message}`);
  }

  return {
    ...returnData,

    refund_amount: toNumber(returnData.refund_amount),

    order: returnData.order
      ? {
          ...returnData.order,

          customer_name: [
            returnData.order.customer_first_name,
            returnData.order.customer_last_name,
          ]
            .filter(Boolean)
            .join(" "),
        }
      : null,

    items: (itemData ?? []).map((item) => ({
      ...item,

      order_item: item.order_item
        ? {
            ...item.order_item,
            unit_price: toNumber(item.order_item.unit_price),
            line_total: toNumber(item.order_item.line_total),
          }
        : null,
    })),

    events: (eventData ?? []).map((event) => ({
      ...event,
      metadata:
        event.metadata &&
        typeof event.metadata === "object" &&
        !Array.isArray(event.metadata)
          ? (event.metadata as Record<string, unknown>)
          : {},
    })),
  } as TweakMartReturnDetails;
}
/* Retrieves the successful Paystack transaction reference for a return's order. */
export async function getTweakMartReturnPaystackReference(returnId: string) {
  const { data: returnRecord, error: returnError } =
    await tweakMartAdminSupabase
      .from("order_returns")
      .select(
        `
        id,
        order_id,
        order:orders (
          id,
          payment_method
        )
      `
      )
      .eq("id", returnId)
      .maybeSingle();

  if (returnError) {
    throw new Error(
      `Unable to load return payment details: ${returnError.message}`
    );
  }

  if (!returnRecord) {
    throw new Error("Return request not found.");
  }

  const order = Array.isArray(returnRecord.order)
    ? returnRecord.order[0]
    : returnRecord.order;

  if (order?.payment_method !== "paystack") {
    return null;
  }

  const { data: paymentAttempt, error: paymentError } =
    await tweakMartAdminSupabase
      .from("payment_attempts")
      .select(
        `
        reference,
        status,
        paid_at
      `
      )
      .eq("order_id", returnRecord.order_id)
      .eq("status", "success")
      .order("paid_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (paymentError) {
    throw new Error(
      `Unable to load Paystack transaction: ${paymentError.message}`
    );
  }

  if (!paymentAttempt?.reference) {
    throw new Error(
      "No successful Paystack transaction was found for this order."
    );
  }

  return paymentAttempt.reference;
}
/* Finalizes a validated return refund through the dedicated database RPC. */
export async function refundTweakMartReturn(
  returnId: string,
  input: RefundTweakMartReturnInput
) {
  const { data, error } = await tweakMartAdminSupabase.rpc("refund_tweakmart_return", {
    p_return_id: returnId,
    p_refund_amount: input.amount,
    p_refund_method: input.method,
    p_refund_reference: input.reference?.trim() || null,
    p_notes: input.notes?.trim() || null,
  });

  if (error) {
    throw new Error(`Unable to refund TweakMart return: ${error.message}`);
  }

  const result = data?.[0];

  if (!result) {
    throw new Error(
      "The refund operation completed without returning a result."
    );
  }

  return result;
}
