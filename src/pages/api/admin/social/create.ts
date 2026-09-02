import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../../lib/supabase/server";

import { createSocialPost } from "../../../../lib/social/social-repository";

import { normalizeBufferPlatform } from "../../../../lib/social/social-platforms";

import {
  getBufferChannels,
  getBufferOrganizations,
} from "../../../../lib/buffer/buffer-server";

interface CreateSocialPostRequest {
  blogPostId?: string | null;
  sourceType: "blog" | "campaign";
  title?: string | null;
  channelId: string;
  caption: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  status?: "draft" | "ready";
}

/* Validates the basic structure of a social-post creation request. */
function isValidRequest(value: unknown): value is CreateSocialPostRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const request = value as Record<string, unknown>;

  return (
    (request.sourceType === "blog" || request.sourceType === "campaign") &&
    typeof request.channelId === "string" &&
    request.channelId.trim().length > 0 &&
    typeof request.caption === "string" &&
    (request.blogPostId === undefined ||
      request.blogPostId === null ||
      typeof request.blogPostId === "string") &&
    (request.title === undefined ||
      request.title === null ||
      typeof request.title === "string") &&
    (request.mediaUrl === undefined ||
      request.mediaUrl === null ||
      typeof request.mediaUrl === "string") &&
    (request.mediaType === undefined ||
      request.mediaType === null ||
      request.mediaType === "image" ||
      request.mediaType === "video") &&
    (request.status === undefined ||
      request.status === "draft" ||
      request.status === "ready")
  );
}

/* Returns the Buffer organization used by CloudTweak social publishing. */
async function getCloudTweakBufferOrganization() {
  const organizations = await getBufferOrganizations();

  const organization =
    organizations.find(
      (item) => item.name === "Cloudtweak Technologies Limited"
    ) ?? organizations[0];

  if (!organization) {
    throw new Error("No Buffer organization was found.");
  }

  return organization;
}

/* Creates a CloudTweak social post without sending it to Buffer for delivery. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body: unknown = await request.json();

    if (!isValidRequest(body)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid social post request.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (body.sourceType === "blog" && !body.blogPostId?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Blog social posts require a blog post ID.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const organization = await getCloudTweakBufferOrganization();

    const channels = await getBufferChannels(organization.id);

    const channel = channels.find((item) => item.id === body.channelId.trim());

    if (!channel) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "The selected Buffer channel is not available.",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const platform = normalizeBufferPlatform(channel.service);

    if (!platform) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `The ${channel.service} platform is not currently supported by CloudTweak Social Publishing.`,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Every social post belongs to a campaign group.
     * A single-destination post simply receives its own unique campaign ID.
     */
    const campaignId = crypto.randomUUID();

    const supabase = createSupabaseAdminClient();

    const result = await createSocialPost(supabase, {
      campaignId,

      blogPostId: body.blogPostId?.trim() || null,

      sourceType: body.sourceType,

      title: body.title?.trim() || null,

      channelId: channel.id,

      channelName: channel.displayName || channel.name,

      platform,

      caption: body.caption,

      mediaUrl: body.mediaUrl?.trim() || null,

      mediaType: body.mediaType ?? null,

      status: body.status ?? "draft",
    });

    return new Response(
      JSON.stringify({
        success: true,

        campaignId,

        post: result.post,

        validation: result.validation,

        deliveryAttempted: false,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to create social post:", error);

    return new Response(
      JSON.stringify({
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to create social post.",
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
