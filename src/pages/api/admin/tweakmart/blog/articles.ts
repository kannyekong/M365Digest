import type { APIRoute } from "astro";

import {
  createTweakMartPost,
  deleteTweakMartPost,
  getAllTweakMartPosts,
  getTweakMartPost,
  toggleTweakMartPostPublished,
  updateTweakMartPost,
} from "../../../../../lib/tweakmart/blog";

/* Returns either one TweakMart article or the complete article collection. */
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (id) {
      const { data, error } = await getTweakMartPost(id);

      if (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
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
          post: data,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data, error } = await getAllTweakMartPosts();

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        posts: data ?? [],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load TweakMart articles.",
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

/* Changes the published state of a TweakMart article. */
export const PATCH: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (!body.id || typeof body.published !== "boolean") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Article ID and published state are required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data, error } = await toggleTweakMartPostPublished(
      body.id,
      body.published
    );

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: data,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update article status.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

/* Permanently deletes a TweakMart article. */
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (!body.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Article ID is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { error } = await deleteTweakMartPost(body.id);

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete the article.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

/* Handles creation and updates for TweakMart blog articles. */
async function readArticlePayload(request: Request) {
  const body = await request.json();

  if (!body.title?.trim()) {
    throw new Error("Article title is required.");
  }

  if (!body.slug?.trim()) {
    throw new Error("Article slug is required.");
  }

  if (!body.content || body.content.type !== "doc") {
    throw new Error("Article content is invalid.");
  }

  return {
    title: body.title.trim(),
    slug: body.slug.trim(),
    excerpt: body.excerpt?.trim() ?? "",
    content: body.content,
    cover_image: body.cover_image?.trim() ?? "",
    published: Boolean(body.published),
    category: body.category?.trim() || "General",
    seo_title: body.seo_title?.trim() ?? "",
    seo_description: body.seo_description?.trim() ?? "",
    canonical_url: body.canonical_url?.trim() ?? "",
  };
}

/* Creates a new article in the TweakMart Supabase project. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await readArticlePayload(request);

    const { data, error } = await createTweakMartPost(payload);

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: data,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create the article.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

/* Updates an existing article in the TweakMart Supabase project. */
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (!body.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Article ID is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const payload = await readArticlePayload(
      new Request(request.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
    );

    const { data, error } = await updateTweakMartPost(body.id, payload);

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: data,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update the article.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
