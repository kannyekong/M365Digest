import type { APIRoute } from "astro";

import { tweakMartAdminSupabase } from "../../../../../../lib/tweakmart/supabase-server";

const allowedMovementTypes = new Set([
  "stock_received",
  "return",
  "damaged",
  "lost",
  "correction",
  "manual_adjustment",
]);

/* Converts an unknown request value into a trimmed optional string. */
function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/* Creates an audited inventory adjustment through the transactional database RPC. */
export const POST: APIRoute = async ({ params, request }) => {
  const variantId = params.variantId;

  if (!variantId) {
    return Response.json(
      {
        error: "Variant ID is required.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const body = await request.json();

    const quantity = Number(body.quantity);
    const movementType =
      typeof body.movement_type === "string" ? body.movement_type.trim() : "";

    if (!Number.isInteger(quantity) || quantity === 0) {
      return Response.json(
        {
          error: "Adjustment quantity must be a non-zero whole number.",
        },
        {
          status: 400,
        }
      );
    }

    if (!allowedMovementTypes.has(movementType)) {
      return Response.json(
        {
          error: "Invalid inventory movement type.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Enforce the expected direction for movement types whose
     * stock effect is unambiguous.
     */
    if (["stock_received", "return"].includes(movementType) && quantity < 0) {
      return Response.json(
        {
          error: "This movement type requires a positive quantity.",
        },
        {
          status: 400,
        }
      );
    }

    if (["damaged", "lost"].includes(movementType) && quantity > 0) {
      return Response.json(
        {
          error: "This movement type requires a negative quantity.",
        },
        {
          status: 400,
        }
      );
    }

    const reason = optionalString(body.reason);

    /*
     * Require an explanation for administrative stock changes so
     * movement history remains useful for future auditing.
     */
    if (!reason) {
      return Response.json(
        {
          error: "A reason for the inventory adjustment is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } = await tweakMartAdminSupabase.rpc(
      "adjust_inventory",
      {
        p_variant_id: variantId,
        p_quantity: quantity,
        p_movement_type: movementType,
        p_reason: reason,
        p_notes: optionalString(body.notes),
        p_reference_type: optionalString(body.reference_type),
        p_reference_id: optionalString(body.reference_id),
        p_reference_number: optionalString(body.reference_number),
        p_metadata:
          body.metadata &&
          typeof body.metadata === "object" &&
          !Array.isArray(body.metadata)
            ? body.metadata
            : {},
      }
    );

    if (error) {
      /*
       * PostgreSQL validation errors from adjust_inventory are returned
       * as 400-level errors because the request cannot be applied.
       */
      return Response.json(
        {
          error: error.message || "Unable to adjust inventory.",
        },
        {
          status: 400,
        }
      );
    }

    return Response.json({
      result: data,
    });
  } catch {
    return Response.json(
      {
        error: "Invalid inventory adjustment request.",
      },
      {
        status: 400,
      }
    );
  }
};
