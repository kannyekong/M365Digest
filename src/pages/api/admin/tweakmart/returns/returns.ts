import type { APIRoute } from "astro";

import {
  createTweakMartReturn,
  type TweakMartReturnItemCondition,
} from "../../../../../lib/tweakmart/returns";
import { tweakMartAdminSupabase } from "../../../../../lib/tweakmart/supabase-server";

interface ReturnItemBody {
  order_item_id?: string;
  quantity?: number;
  condition?: TweakMartReturnItemCondition;
  notes?: string;
}

interface CreateReturnBody {
  reason?: string;
  customer_notes?: string;
  items?: ReturnItemBody[];
}

/* Returns a consistent JSON response from the TweakMart returns API. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/* Safely reads the incoming return request body. */
async function readReturnBody(
  request: Request
): Promise<CreateReturnBody | null> {
  try {
    return (await request.json()) as CreateReturnBody;
  } catch {
    return null;
  }
}

/* Creates a return request against one delivered TweakMart order. */
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

  const body = await readReturnBody(request);

  if (!body) {
    return jsonResponse(
      {
        success: false,
        message: "Invalid request body.",
      },
      400
    );
  }

  if (!body.reason?.trim()) {
    return jsonResponse(
      {
        success: false,
        message: "Select or enter a return reason.",
      },
      400
    );
  }

  if (!body.items?.length) {
    return jsonResponse(
      {
        success: false,
        message: "Select at least one item to return.",
      },
      400
    );
  }

  const invalidItem = body.items.some(
    (item) =>
      !item.order_item_id ||
      !Number.isInteger(item.quantity) ||
      Number(item.quantity) <= 0
  );

  if (invalidItem) {
    return jsonResponse(
      {
        success: false,
        message: "One or more return items are invalid.",
      },
      400
    );
  }

  try {
    const result = await createTweakMartReturn({
      orderId,
      reason: body.reason,
      customerNotes: body.customer_notes,
      items: body.items.map((item) => ({
        order_item_id: item.order_item_id!,
        quantity: Number(item.quantity),
        condition: item.condition ?? null,
        notes: item.notes ?? null,
      })),
    });

    return jsonResponse({
      success: true,
      message: `${result.return_number} was created successfully.`,
      return: result,
    });
  } catch (error) {
    console.error(
      `Unable to create return for TweakMart order ${orderId}:`,
      error
    );

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create this return request.",
      },
      500
    );
  }
};
export interface RefundTweakMartReturnInput {
  amount: number;
  method: "paystack" | "cash" | "transfer" | "pos" | "other";
  reference?: string | null;
  notes?: string | null;
}

/* Finalizes a validated return refund through the database RPC. */
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
