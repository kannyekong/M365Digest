import type { APIRoute } from "astro";

import { tweakMartAdminSupabase } from "../../../../../lib/tweakmart/supabase-server";
import { getTweakMartProductById } from "../../../../../lib/tweakmart/products";

interface UpdateProductPayload {
  name?: string;
  slug?: string;
  vendor_id?: string;
  category_id?: string | null;
  brand_id?: string | null;
  short_description?: string | null;
  description?: string | null;
  product_type?: string;
  condition?: string;
  status?: string;
  base_price?: number;
  compare_at_price?: number | null;
  currency?: string;
  featured?: boolean;
}

/* Normalizes a storefront product slug before persistence. */
function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Validates product types supported by TweakMart. */
function isValidProductType(value: string) {
  return ["physical", "digital", "service"].includes(value);
}

/* Validates supported product conditions. */
function isValidCondition(value: string) {
  return ["new", "used", "refurbished"].includes(value);
}

/* Validates supported TweakMart product statuses. */
function isValidStatus(value: string) {
  return ["draft", "active", "inactive", "archived"].includes(value);
}

/* Returns one TweakMart product for the administrator. */
export const GET: APIRoute = async ({ params }) => {
  try {
    const productId = params.id;

    if (!productId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Product ID is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const product = await getTweakMartProductById(productId);

    if (!product) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Product not found.",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        product,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to load TweakMart product:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to load product.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

/* Updates an existing TweakMart base product after administrator confirmation. */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const productId = params.id;

    if (!productId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Product ID is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const payload = (await request.json()) as UpdateProductPayload;

    const name = payload.name?.trim();

    const vendorId = payload.vendor_id?.trim();

    const slug = normalizeSlug(payload.slug?.trim() || name || "");

    const productType = payload.product_type?.trim() || "physical";

    const condition = payload.condition?.trim() || "new";

    const status = payload.status?.trim() || "draft";

    const currency = payload.currency?.trim().toUpperCase() || "NGN";

    if (!name) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Product name is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!slug) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "A valid product slug is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!vendorId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Product vendor is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (
      !isValidProductType(productType) ||
      !isValidCondition(condition) ||
      !isValidStatus(status)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "One or more product settings are invalid.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const basePrice = Number(payload.base_price ?? 0);

    const compareAtPrice =
      payload.compare_at_price === null ||
      payload.compare_at_price === undefined
        ? null
        : Number(payload.compare_at_price);

    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Base price must be a valid positive amount.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (
      compareAtPrice !== null &&
      (!Number.isFinite(compareAtPrice) || compareAtPrice < 0)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Compare-at price must be a valid positive amount.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: slugOwner, error: slugError } = await tweakMartAdminSupabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .neq("id", productId)
      .maybeSingle();

    if (slugError) {
      throw slugError;
    }

    if (slugOwner) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Another product already uses this slug.",
        }),
        {
          status: 409,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const existingProduct = await getTweakMartProductById(productId);

    if (!existingProduct) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Product not found.",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    let publishedAt = existingProduct.published_at;

    if (status === "active" && !publishedAt) {
      publishedAt = new Date().toISOString();
    }

    if (status === "draft") {
      publishedAt = null;
    }

    const { data: product, error } = await tweakMartAdminSupabase
      .from("products")
      .update({
        vendor_id: vendorId,
        category_id: payload.category_id || null,
        brand_id: payload.brand_id || null,
        name,
        slug,
        short_description: payload.short_description?.trim() || null,
        description: payload.description?.trim() || null,
        product_type: productType,
        condition,
        status,
        base_price: basePrice,
        compare_at_price: compareAtPrice,
        currency,
        featured: Boolean(payload.featured),
        published_at: publishedAt,
      })
      .eq("id", productId)
      .select(
        `
          id,
          name,
          slug,
          status,
          updated_at
        `
      )
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Product updated successfully.",
        product,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to update TweakMart product:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to update product.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
};
