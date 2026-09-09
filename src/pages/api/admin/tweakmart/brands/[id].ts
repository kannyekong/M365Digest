import type { APIRoute } from "astro";

import { tweakMartAdminSupabase } from "../../../../../lib/tweakmart/supabase-server";

/* Normalizes a brand slug before storing it in the database. */
function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Updates an existing TweakMart brand. */
export const PATCH: APIRoute = async ({ params, request }) => {
  const { id } = params;

  if (!id) {
    return Response.json(
      {
        error: "Brand ID is required.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";

    const slug = typeof body.slug === "string" ? createSlug(body.slug) : "";

    if (!name || !slug) {
      return Response.json(
        {
          error: "Brand name and slug are required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } = await tweakMartAdminSupabase
      .from("brands")
      .update({
        name,
        slug,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim()
            : null,
        logo_url:
          typeof body.logo_url === "string" && body.logo_url.trim()
            ? body.logo_url.trim()
            : null,
        website_url:
          typeof body.website_url === "string" && body.website_url.trim()
            ? body.website_url.trim()
            : null,
        is_active: typeof body.is_active === "boolean" ? body.is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      const status = error.code === "23505" ? 409 : 500;

      return Response.json(
        {
          error:
            error.code === "23505"
              ? "A brand with this name or slug already exists."
              : `Unable to update brand: ${error.message}`,
        },
        {
          status,
        }
      );
    }

    return Response.json({
      brand: data,
    });
  } catch {
    return Response.json(
      {
        error: "Invalid brand update request.",
      },
      {
        status: 400,
      }
    );
  }
};

/* Deletes an unused TweakMart brand while protecting product relationships. */
export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return Response.json(
      {
        error: "Brand ID is required.",
      },
      {
        status: 400,
      }
    );
  }

  const { count, error: productCountError } = await tweakMartAdminSupabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("brand_id", id);

  if (productCountError) {
    return Response.json(
      {
        error: `Unable to verify brand usage: ${productCountError.message}`,
      },
      {
        status: 500,
      }
    );
  }

  if ((count ?? 0) > 0) {
    return Response.json(
      {
        error: `This brand is assigned to ${count} ${
          count === 1 ? "product" : "products"
        }. Reassign those products before deleting the brand.`,
      },
      {
        status: 409,
      }
    );
  }

  const { error } = await tweakMartAdminSupabase
    .from("brands")
    .delete()
    .eq("id", id);

  if (error) {
    return Response.json(
      {
        error: `Unable to delete brand: ${error.message}`,
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    success: true,
  });
};
