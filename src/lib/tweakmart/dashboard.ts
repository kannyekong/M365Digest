import { tweakMartAdminSupabase } from "./supabase-server";

export interface TweakMartOverviewStats {
  products: number;
  categories: number;
  brands: number;
  variants: number;
  activeBanners: number;
  lowStockItems: number;
}

/* Returns zero when a Supabase count query does not return a numeric count. */
function safeCount(count: number | null) {
  return count ?? 0;
}

/* Loads the key operational statistics required by the TweakMart overview dashboard. */
export async function getTweakMartOverviewStats(): Promise<TweakMartOverviewStats> {
  const [
    productsResult,
    categoriesResult,
    brandsResult,
    variantsResult,
    bannersResult,
    inventoryResult,
  ] = await Promise.all([
    tweakMartAdminSupabase.from("products").select("*", {
      count: "exact",
      head: true,
    }),

    tweakMartAdminSupabase.from("categories").select("*", {
      count: "exact",
      head: true,
    }),

    tweakMartAdminSupabase.from("brands").select("*", {
      count: "exact",
      head: true,
    }),

    tweakMartAdminSupabase.from("product_variants").select("*", {
      count: "exact",
      head: true,
    }),

    tweakMartAdminSupabase
      .from("featured_banners")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("is_active", true),

    tweakMartAdminSupabase
      .from("inventory")
      .select(
        `
          id,
          quantity_available,
          quantity_reserved,
          reorder_level,
          track_inventory
        `
      )
      .eq("track_inventory", true),
  ]);

  /* Stops the dashboard from silently hiding Marketplace database failures. */
  const databaseError =
    productsResult.error ||
    categoriesResult.error ||
    brandsResult.error ||
    variantsResult.error ||
    bannersResult.error ||
    inventoryResult.error;

  if (databaseError) {
    console.error(
      "Failed to load TweakMart overview statistics:",
      databaseError
    );
  }

  /* Counts inventory records whose sellable quantity has reached the configured reorder level. */
  const lowStockItems = (inventoryResult.data ?? []).filter((inventory) => {
    const sellableQuantity =
      inventory.quantity_available - inventory.quantity_reserved;

    return sellableQuantity <= inventory.reorder_level;
  }).length;

  return {
    products: safeCount(productsResult.count),
    categories: safeCount(categoriesResult.count),
    brands: safeCount(brandsResult.count),
    variants: safeCount(variantsResult.count),
    activeBanners: safeCount(bannersResult.count),
    lowStockItems,
  };
}
