import type { APIRoute } from "astro";

import { tweakMartAdminSupabase } from "../../../../../lib/tweakmart/supabase-server";

interface UpdateCategoryPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  featured?: boolean;
  display_order?: number;
}

/* Normalizes a category slug before updating it in TweakMart. */
function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Converts a request value into a safe non-negative integer. */
function normalizeDisplayOrder(value: unknown) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

/* Updates an existing TweakMart category. */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const categoryId = params.id;

    if (!categoryId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Category ID is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const payload = (await request.json()) as UpdateCategoryPayload;

    const name = payload.name?.trim();

    const slug = normalizeSlug(payload.slug?.trim() || name || "");

    if (!name) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Category name is required.",
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
          message: "A valid category slug is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: existingCategory, error: existingCategoryError } =
      await tweakMartAdminSupabase
        .from("categories")
        .select("id")
        .eq("slug", slug)
        .neq("id", categoryId)
        .maybeSingle();

    if (existingCategoryError) {
      throw existingCategoryError;
    }

    if (existingCategory) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Another category already uses this slug.",
        }),
        {
          status: 409,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: category, error } = await tweakMartAdminSupabase
      .from("categories")
      .update({
        name,
        slug,
        description: payload.description?.trim() || null,
        image_url: payload.image_url?.trim() || null,
        is_active: payload.is_active ?? true,
        featured: Boolean(payload.featured),
        display_order: normalizeDisplayOrder(payload.display_order),
        updated_at: new Date().toISOString(),
      })
      .eq("id", categoryId)
      .select(
        `
          id,
          name,
          slug,
          description,
          image_url,
          is_active,
          featured,
          display_order,
          created_at,
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
        message: "Category updated successfully.",
        category,
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
    console.error("Failed to update TweakMart category:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to update TweakMart category.",
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

/* Deletes an existing TweakMart category. */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const categoryId = params.id;

    if (!categoryId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Category ID is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { count, error: productCountError } = await tweakMartAdminSupabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("category_id", categoryId);

    if (productCountError) {
      throw productCountError;
    }

    if ((count ?? 0) > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "This category cannot be deleted while products are assigned to it.",
        }),
        {
          status: 409,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { error } = await tweakMartAdminSupabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Category deleted successfully.",
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
    console.error("Failed to delete TweakMart category:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete TweakMart category.",
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
