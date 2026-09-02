import type { APIRoute } from "astro";

import {
  deleteTweakMartBanner,
  getTweakMartBanner,
  updateTweakMartBanner,
} from "../../../../../lib/tweakmart/banner";

interface UpdateBannerRequest {
  title?: unknown;
  image_url?: unknown;
  storage_path?: unknown;
  alt_text?: unknown;
  link_url?: unknown;
  display_order?: unknown;
  is_active?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
}

/* Returns a JSON response for an individual banner API operation. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/* Updates an existing TweakMart featured banner. */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          message: "Banner ID is required.",
        },
        400
      );
    }

    const existingBanner = await getTweakMartBanner(id);

    if (!existingBanner) {
      return jsonResponse(
        {
          success: false,
          message: "Featured banner was not found.",
        },
        404
      );
    }

    const body = (await request.json()) as UpdateBannerRequest;

    const title =
      typeof body.title === "string" ? body.title : existingBanner.title;

    const imageUrl =
      typeof body.image_url === "string"
        ? body.image_url
        : existingBanner.image_url;

    const displayOrder =
      body.display_order !== undefined
        ? Number(body.display_order)
        : existingBanner.display_order;

    if (!title.trim()) {
      return jsonResponse(
        {
          success: false,
          message: "Banner title is required.",
        },
        400
      );
    }

    if (!imageUrl.trim()) {
      return jsonResponse(
        {
          success: false,
          message: "Banner image is required.",
        },
        400
      );
    }

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
      body.starts_at === null
        ? null
        : typeof body.starts_at === "string"
          ? body.starts_at || null
          : existingBanner.starts_at;

    const endsAt =
      body.ends_at === null
        ? null
        : typeof body.ends_at === "string"
          ? body.ends_at || null
          : existingBanner.ends_at;

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

    /* Updates the banner while preserving existing values for fields that were not supplied. */
    const banner = await updateTweakMartBanner(id, {
      title,
      image_url: imageUrl,

      storage_path:
        body.storage_path === null
          ? null
          : typeof body.storage_path === "string"
            ? body.storage_path
            : existingBanner.storage_path,

      alt_text:
        body.alt_text === null
          ? null
          : typeof body.alt_text === "string"
            ? body.alt_text
            : existingBanner.alt_text,

      link_url:
        body.link_url === null
          ? null
          : typeof body.link_url === "string"
            ? body.link_url
            : existingBanner.link_url,

      display_order: displayOrder,

      is_active:
        typeof body.is_active === "boolean"
          ? body.is_active
          : existingBanner.is_active,

      starts_at: startsAt,

      ends_at: endsAt,
    });

    return jsonResponse({
      success: true,
      message: "Featured banner updated successfully.",
      banner,
    });
  } catch (error) {
    console.error("Failed to update TweakMart banner:", error);

    return jsonResponse(
      {
        success: false,
        message: "Unable to update featured banner.",
      },
      500
    );
  }
};

/* Permanently deletes a TweakMart featured banner record. */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = params.id;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          message: "Banner ID is required.",
        },
        400
      );
    }

    const banner = await getTweakMartBanner(id);

    if (!banner) {
      return jsonResponse(
        {
          success: false,
          message: "Featured banner was not found.",
        },
        404
      );
    }

    await deleteTweakMartBanner(id);

    return jsonResponse({
      success: true,
      message: "Featured banner deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete TweakMart banner:", error);

    return jsonResponse(
      {
        success: false,
        message: "Unable to delete featured banner.",
      },
      500
    );
  }
};
