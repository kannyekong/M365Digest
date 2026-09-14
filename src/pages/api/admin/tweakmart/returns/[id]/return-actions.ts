import type { APIRoute } from "astro";

import {
  getTweakMartReturnPaystackReference,
  inspectTweakMartReturn,
  refundTweakMartReturn,
  updateTweakMartReturnStatus,
  type TweakMartReturnItemCondition,
  type TweakMartReturnStatus,
} from "../../../../../../lib/tweakmart/returns";

import { createPaystackRefund } from "../../../../../../lib/tweakmart/paystack-refund";

type AllowedReturnAction =
  "approve" | "reject" | "receive" | "inspect" | "refund";

interface ReturnActionBody {
  action?: AllowedReturnAction;
  notes?: string;

  items?: {
    return_item_id: string;
    condition: TweakMartReturnItemCondition;
    restock: boolean;
  }[];

  refund_amount?: number;
  refund_method?: "paystack" | "cash" | "transfer" | "pos" | "other";
  refund_reference?: string;
}

/* Maps non-financial administrator actions to their database lifecycle state. */
const statusByAction: Record<
  Exclude<AllowedReturnAction, "inspect" | "refund">,
  Exclude<TweakMartReturnStatus, "requested" | "inspected" | "refunded">
> = {
  approve: "approved",
  reject: "rejected",
  receive: "item_received",
};

/* Returns a consistent JSON response for return lifecycle actions. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/* Safely reads a return lifecycle request body. */
async function readActionBody(
  request: Request
): Promise<ReturnActionBody | null> {
  try {
    return (await request.json()) as ReturnActionBody;
  } catch {
    return null;
  }
}

/* Checks whether an action belongs to the generic return lifecycle map. */
function isStandardReturnAction(
  action: AllowedReturnAction
): action is keyof typeof statusByAction {
  return action in statusByAction;
}

/* Processes one administrator return lifecycle action. */
export const POST: APIRoute = async ({ params, request }) => {
  const returnId = params.id;

  if (!returnId) {
    return jsonResponse(
      {
        success: false,
        message: "Return ID is required.",
      },
      400
    );
  }

  const body = await readActionBody(request);

  if (!body?.action) {
    return jsonResponse(
      {
        success: false,
        message: "Return action is required.",
      },
      400
    );
  }

  try {
    /*
     * Inspection uses its own transactional workflow because it can
     * modify physical inventory and create inventory movements.
     */
    if (body.action === "inspect") {
      if (!body.items?.length) {
        return jsonResponse(
          {
            success: false,
            message: "Inspection details are required.",
          },
          400
        );
      }

      const invalidInspectionItem = body.items.some(
        (item) =>
          !item.return_item_id ||
          !item.condition ||
          typeof item.restock !== "boolean"
      );

      if (invalidInspectionItem) {
        return jsonResponse(
          {
            success: false,
            message: "One or more inspection items are invalid.",
          },
          400
        );
      }

      const result = await inspectTweakMartReturn(
        returnId,
        body.items,
        body.notes
      );

      return jsonResponse({
        success: true,
        message: `${result.return_number} was inspected successfully.`,
        return: result,
      });
    }

    /*
     * Refunds use a dedicated financial workflow.
     *
     * Paystack refunds are submitted to Paystack first. The local return
     * record is finalized only after Paystack accepts the refund request.
     */
    if (body.action === "refund") {
      if (
        typeof body.refund_amount !== "number" ||
        !Number.isFinite(body.refund_amount) ||
        body.refund_amount <= 0
      ) {
        return jsonResponse(
          {
            success: false,
            message: "Enter a valid refund amount greater than zero.",
          },
          400
        );
      }

      if (!body.refund_method) {
        return jsonResponse(
          {
            success: false,
            message: "Select a refund method.",
          },
          400
        );
      }

      let refundReference = body.refund_reference?.trim() || undefined;

      /*
       * Paystack refunds require the successful payment reference for
       * the original order before a provider refund can be initiated.
       */
      if (body.refund_method === "paystack") {
        const transactionReference =
          await getTweakMartReturnPaystackReference(returnId);

        if (!transactionReference) {
          return jsonResponse(
            {
              success: false,
              message:
                "No successful Paystack transaction was found for this return.",
            },
            400
          );
        }

        const paystackRefund = await createPaystackRefund({
          transactionReference,
          amount: body.refund_amount,

          customerNote: "Refund approved for returned TweakMart order.",

          merchantNote:
            body.notes?.trim() || `TweakMart return refund ${returnId}`,
        });

        /*
         * Store Paystack's refund identifier when available so the
         * refund can be traced later in the provider dashboard.
         */
        refundReference =
          paystackRefund.id !== undefined
            ? String(paystackRefund.id)
            : transactionReference;
      }

      /*
       * Records the completed/manual refund or the accepted Paystack
       * refund request in the TweakMart return ledger.
       */
      const result = await refundTweakMartReturn(returnId, {
        amount: body.refund_amount,
        method: body.refund_method,
        reference: refundReference,
        notes: body.notes?.trim() || undefined,
      });

      return jsonResponse({
        success: true,

        message:
          body.refund_method === "paystack"
            ? `${result.return_number} refund was submitted to Paystack successfully.`
            : `${result.return_number} was refunded successfully.`,

        return: result,
      });
    }

    /*
     * Approve, reject and receive use the generic return lifecycle RPC.
     */
    if (isStandardReturnAction(body.action)) {
      const result = await updateTweakMartReturnStatus(
        returnId,
        statusByAction[body.action],
        body.notes
      );

      return jsonResponse({
        success: true,
        message: `${result.return_number} is now ${result.status.replaceAll(
          "_",
          " "
        )}.`,
        return: result,
      });
    }

    return jsonResponse(
      {
        success: false,
        message: "Unsupported return action.",
      },
      400
    );
  } catch (error) {
    console.error(`TweakMart return action failed for ${returnId}:`, error);

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to update this return.",
      },
      500
    );
  }
};
