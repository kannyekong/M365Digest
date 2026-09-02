import type { APIRoute } from "astro";

import { getTweakMartProducts } from "../../../../../lib/tweakmart/products";
import { tweakMartAdminSupabase } from "../../../../../lib/tweakmart/supabase-server";

interface CreateProductPayload {
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

/* Normalizes a product slug before it is stored in TweakMart. */
function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Validates values accepted by the product type database field. */
function isValidProductType(value: string) {
  return ["physical", "digital", "service"].includes(value);
}

/* Validates values accepted by the product condition database field. */
function isValidCondition(value: string) {
  return ["new", "used", "refurbished"].includes(value);
}

/* Validates values accepted by the product status database field. */
function isValidStatus(value: string) {
  return ["draft", "active", "inactive", "archived"].includes(value);
}

/* Converts a URL parameter into a safe positive integer while enforcing an optional maximum. */
function getPositiveInteger(
  value: string | null,
  fallback: number,
  maximum?: number
) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  if (maximum !== undefined && parsedValue > maximum) {
    return maximum;
  }

  return parsedValue;
}

/* Returns a normalized optional filter value from the request URL. */
function getFilterValue(value: string | null) {
  const normalizedValue = value?.trim();

  if (!normalizedValue || normalizedValue === "all") {
    return undefined;
  }

  return normalizedValue;
}

/* Returns paginated and filtered TweakMart products to the CloudTweak admin interface. */
export const GET: APIRoute = async ({ url }) => {
  try {
    const page = getPositiveInteger(url.searchParams.get("page"), 1);

    const pageSize = getPositiveInteger(
      url.searchParams.get("pageSize"),
      10,
      100
    );

    const search = getFilterValue(url.searchParams.get("search"));

    const status = getFilterValue(url.searchParams.get("status"));

    const productType = getFilterValue(url.searchParams.get("productType"));

    const categoryId = getFilterValue(url.searchParams.get("categoryId"));

    const brandId = getFilterValue(url.searchParams.get("brandId"));

    const featuredParameter = url.searchParams.get("featured");

    const featured =
      featuredParameter === "true"
        ? true
        : featuredParameter === "false"
          ? false
          : undefined;

    const result = await getTweakMartProducts({
      page,
      pageSize,
      search,
      status,
      productType,
      categoryId,
      brandId,
      featured,
    });

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
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
    console.error("Failed to load paginated TweakMart products:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load TweakMart products.",
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

/* Creates a new base TweakMart product before images, variants, and inventory are configured. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = (await request.json()) as CreateProductPayload;

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
          message: "A product vendor is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!isValidProductType(productType)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid product type.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!isValidCondition(condition)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid product condition.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!isValidStatus(status)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid product status.",
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

    const { data: existingProduct, error: existingProductError } =
      await tweakMartAdminSupabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

    if (existingProductError) {
      throw existingProductError;
    }

    if (existingProduct) {
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

    const publishedAt = status === "active" ? new Date().toISOString() : null;

    const { data: product, error } = await tweakMartAdminSupabase
      .from("products")
      .insert({
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
      .select(
        `
          id,
          name,
          slug,
          status,
          product_type,
          created_at
        `
      )
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Product created successfully.",
        product,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to create TweakMart product:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create TweakMart product.",
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
