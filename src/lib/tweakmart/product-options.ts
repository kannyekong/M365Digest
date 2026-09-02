import { tweakMartAdminSupabase } from "./supabase-server";

export interface TweakMartProductOption {
  id: string;
  name: string;
}

export interface TweakMartProductFormOptions {
  vendors: TweakMartProductOption[];
  categories: TweakMartProductOption[];
  brands: TweakMartProductOption[];
}

/* Loads the vendor, category, and brand options required by the product form. */
export async function getTweakMartProductFormOptions(): Promise<TweakMartProductFormOptions> {
  const [vendorsResult, categoriesResult, brandsResult] = await Promise.all([
    tweakMartAdminSupabase.from("vendors").select("id, name").order("name", {
      ascending: true,
    }),

    tweakMartAdminSupabase.from("categories").select("id, name").order("name", {
      ascending: true,
    }),

    tweakMartAdminSupabase.from("brands").select("id, name").order("name", {
      ascending: true,
    }),
  ]);

  if (vendorsResult.error) {
    throw new Error(
      `Unable to load TweakMart vendors: ${vendorsResult.error.message}`
    );
  }

  if (categoriesResult.error) {
    throw new Error(
      `Unable to load TweakMart categories: ${categoriesResult.error.message}`
    );
  }

  if (brandsResult.error) {
    throw new Error(
      `Unable to load TweakMart brands: ${brandsResult.error.message}`
    );
  }

  return {
    vendors: vendorsResult.data ?? [],
    categories: categoriesResult.data ?? [],
    brands: brandsResult.data ?? [],
  };
}
