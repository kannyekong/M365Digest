import type { APIRoute } from "astro";

import { tweakMartAdminSupabase } from "../../../../../lib/tweakmart/supabase-server";

/* Normalizes a brand name into a URL-safe slug when one is not supplied. */
function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Returns all TweakMart brands for the administrative brand manager. */
export const GET: APIRoute = async () => {
  const { data, error } = await tweakMartAdminSupabase
    .from("brands")
    .select(
      `
			id,
			name,
			slug,
			description,
			logo_url,
			website_url,
			is_active,
			metadata,
			created_at,
			updated_at
		`
    )
    .order("name", {
      ascending: true,
    });

  if (error) {
    return Response.json(
      {
        error: `Unable to load brands: ${error.message}`,
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    brands: data ?? [],
  });
};

/* Creates a new TweakMart brand from the administrative brand manager. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";

    const slug =
      typeof body.slug === "string" && body.slug.trim()
        ? createSlug(body.slug)
        : createSlug(name);

    if (!name) {
      return Response.json(
        {
          error: "Brand name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!slug) {
      return Response.json(
        {
          error: "A valid brand slug is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } = await tweakMartAdminSupabase
      .from("brands")
      .insert({
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
        metadata: {},
      })
      .select()
      .single();

    if (error) {
      const status = error.code === "23505" ? 409 : 500;

      return Response.json(
        {
          error:
            error.code === "23505"
              ? "A brand with this name or slug already exists."
              : `Unable to create brand: ${error.message}`,
        },
        {
          status,
        }
      );
    }

    return Response.json(
      {
        brand: data,
      },
      {
        status: 201,
      }
    );
  } catch {
    return Response.json(
      {
        error: "Invalid brand request.",
      },
      {
        status: 400,
      }
    );
  }
};
