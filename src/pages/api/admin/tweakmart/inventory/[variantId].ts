import type { APIRoute } from "astro";

import { tweakMartAdminSupabase } from "../../../../../lib/tweakmart/supabase-server";

/* Returns one inventory record together with its product and variant details. */
export const GET: APIRoute = async ({ params }) => {
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

  const { data, error } = await tweakMartAdminSupabase
    .from("inventory")
    .select(
      `
      id,
      variant_id,
      quantity_available,
      quantity_reserved,
      reorder_level,
      track_inventory,
      allow_backorder,
      updated_at,
      product_variants!inner (
        id,
        product_id,
        name,
        sku,
        barcode,
        price,
        attributes,
        weight_kg,
        is_default,
        is_active,
        products!inner (
          id,
          name,
          slug,
          product_type,
          status,
          base_price,
          currency,
          category_id,
          brand_id
        )
      )
    `
    )
    .eq("variant_id", variantId)
    .maybeSingle();

  if (error) {
    return Response.json(
      {
        error: `Unable to load inventory: ${error.message}`,
      },
      {
        status: 500,
      }
    );
  }

  if (!data) {
    return Response.json(
      {
        error: "Inventory record was not found.",
      },
      {
        status: 404,
      }
    );
  }

  return Response.json({
    inventory: data,
  });
};

/* Updates inventory configuration without directly changing stock quantities. */
export const PATCH: APIRoute = async ({ params, request }) => {
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

    const updates: {
      reorder_level?: number;
      track_inventory?: boolean;
      allow_backorder?: boolean;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    /*
     * Validate the reorder level before allowing the inventory
     * configuration to be updated.
     */
    if (body.reorder_level !== undefined) {
      const reorderLevel = Number(body.reorder_level);

      if (!Number.isInteger(reorderLevel) || reorderLevel < 0) {
        return Response.json(
          {
            error: "Reorder level must be a non-negative whole number.",
          },
          {
            status: 400,
          }
        );
      }

      updates.reorder_level = reorderLevel;
    }

    if (typeof body.track_inventory === "boolean") {
      updates.track_inventory = body.track_inventory;
    }

    if (typeof body.allow_backorder === "boolean") {
      updates.allow_backorder = body.allow_backorder;
    }

    const { data, error } = await tweakMartAdminSupabase
      .from("inventory")
      .update(updates)
      .eq("variant_id", variantId)
      .select()
      .maybeSingle();

    if (error) {
      return Response.json(
        {
          error: `Unable to update inventory settings: ${error.message}`,
        },
        {
          status: 500,
        }
      );
    }

    if (!data) {
      return Response.json(
        {
          error: "Inventory record was not found.",
        },
        {
          status: 404,
        }
      );
    }

    return Response.json({
      inventory: data,
    });
  } catch {
    return Response.json(
      {
        error: "Invalid inventory request.",
      },
      {
        status: 400,
      }
    );
  }
};
