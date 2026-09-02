import type { APIRoute } from "astro";

import {
  createTweakMartBanner,
  getTweakMartBanners,
} from "../../../../../lib/tweakmart/banner";

interface CreateBannerRequest {
  title?: unknown;
  image_url?: unknown;
  alt_text?: unknown;
  link_url?: unknown;
  display_order?: unknown;
  is_active?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
  storage_path?: unknown;
}

/* Returns a JSON API response with the supplied HTTP status. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/* Returns all TweakMart banners for the administrative interface. */
export const GET: APIRoute = async () => {
  try {
    const banners = await getTweakMartBanners();

    return jsonResponse({
      success: true,
      banners,
    });
  } catch (error) {
    console.error("Failed to retrieve TweakMart banners:", error);

    return jsonResponse(
      {
        success: false,
        message: "Unable to retrieve featured banners.",
      },
      500
    );
  }
};

/* Creates a TweakMart featured banner after validating the incoming request. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as CreateBannerRequest;

    if (typeof body.title !== "string" || !body.title.trim()) {
      return jsonResponse(
        {
          success: false,
          message: "Banner title is required.",
        },
        400
      );
    }

    if (typeof body.image_url !== "string" || !body.image_url.trim()) {
      return jsonResponse(
        {
          success: false,
          message: "Banner image is required.",
        },
        400
      );
    }

    const displayOrder = Number(body.display_order ?? 1);

    if (!Number.isInteger(displayOrder) || displayOrder < 1) {
      return jsonResponse(
        {
          success: false,
          message: "Display order must be at least 1.",
        },
        400
      );
    }

    const startsAt =
      typeof body.starts_at === "string" && body.starts_at.length > 0
        ? body.starts_at
        : null;

    const endsAt =
      typeof body.ends_at === "string" && body.ends_at.length > 0
        ? body.ends_at
        : null;

    if (
      startsAt &&
      endsAt &&
      new Date(endsAt).getTime() <= new Date(startsAt).getTime()
    ) {
      return jsonResponse(
        {
          success: false,
          message: "Banner end date must be later than its start date.",
        },
        400
      );
    }

    const banner = await createTweakMartBanner({
      title: body.title,
      image_url: body.image_url,

      storage_path:
        typeof body.storage_path === "string" ? body.storage_path : null,

      alt_text: typeof body.alt_text === "string" ? body.alt_text : null,

      link_url: typeof body.link_url === "string" ? body.link_url : null,

      display_order: displayOrder,

      is_active: typeof body.is_active === "boolean" ? body.is_active : true,

      starts_at: startsAt,
      ends_at: endsAt,
    });

    return jsonResponse(
      {
        success: true,
        message: "Featured banner created successfully.",
        banner,
      },
      201
    );
  } catch (error) {
    console.error("Failed to create TweakMart banner:", error);

    return jsonResponse(
      {
        success: false,
        message: "Unable to create featured banner.",
      },
      500
    );
  }
};
