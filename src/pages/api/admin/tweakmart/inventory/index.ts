import type { APIRoute } from "astro";

import { tweakMartAdminSupabase } from "../../../../../lib/tweakmart/supabase-server";

/* Returns all TweakMart inventory records with their product and variant information. */
export const GET: APIRoute = async () => {
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
    .order("updated_at", {
      ascending: false,
    });

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

  return Response.json({
    inventory: data ?? [],
  });
};
