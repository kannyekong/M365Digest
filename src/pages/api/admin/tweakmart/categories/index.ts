import type { APIRoute } from "astro";

import { tweakMartAdminSupabase } from "../../../../../lib/tweakmart/supabase-server";

interface CreateCategoryPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  featured?: boolean;
  display_order?: number;
}

/* Extracts a useful error message from standard errors and Supabase/PostgREST errors. */
function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unable to complete the TweakMart category request.";
}

/* Normalizes a category slug before it is stored in TweakMart. */
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

/* Returns all TweakMart categories to the CloudTweak admin interface. */
export const GET: APIRoute = async () => {
  try {
    const { data: categories, error } = await tweakMartAdminSupabase
      .from("categories")
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
      .order("display_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        categories: categories ?? [],
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
    console.error("Failed to load TweakMart categories:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load TweakMart categories.",
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

/* Creates a new TweakMart category. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = (await request.json()) as CreateCategoryPayload;

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
      .insert({
        name,
        slug,
        description: payload.description?.trim() || null,
        image_url: payload.image_url?.trim() || null,
        is_active: payload.is_active ?? true,
        featured: Boolean(payload.featured),
        display_order: normalizeDisplayOrder(payload.display_order),
      })
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
        message: "Category created successfully.",
        category,
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
    console.error("Failed to create TweakMart category:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create TweakMart category.",
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
