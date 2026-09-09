import type { APIRoute } from "astro";

import { tweakMartAdminSupabase } from "../../../../../../lib/tweakmart/supabase-server";

/* Returns the audited inventory movement history for one product variant. */
export const GET: APIRoute = async ({ params, url }) => {
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

  const requestedLimit = Number(url.searchParams.get("limit") ?? 50);

  /*
   * Keep movement queries bounded even if an invalid or excessively
   * large limit is supplied by the client.
   */
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 50;

  const { data, error } = await tweakMartAdminSupabase
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
      metadata,
      created_at
    `
    )
    .eq("variant_id", variantId)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    return Response.json(
      {
        error: `Unable to load inventory movements: ${error.message}`,
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    movements: data ?? [],
  });
};
