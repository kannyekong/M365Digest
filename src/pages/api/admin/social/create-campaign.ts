import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../../lib/supabase/server";

import { createSocialPost } from "../../../../lib/social/social-repository";

import { normalizeBufferPlatform } from "../../../../lib/social/social-platforms";

import type { SocialMediaType } from "../../../../lib/social/social-types";

import {
  getBufferChannels,
  getBufferOrganizations,
} from "../../../../lib/buffer/buffer-server";

interface CampaignDestinationRequest {
  channelId: string;
  caption: string;
}

interface CreateCampaignRequest {
  blogPostId?: string | null;
  sourceType: "blog" | "campaign";
  title?: string | null;
  mediaUrl?: string | null;
  mediaType?: SocialMediaType | null;
  status?: "draft" | "ready";
  destinations: CampaignDestinationRequest[];
}

/* Validates one social destination supplied with a campaign request. */
function isValidDestination(
  value: unknown
): value is CampaignDestinationRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const destination = value as Record<string, unknown>;

  return (
    typeof destination.channelId === "string" &&
    destination.channelId.trim().length > 0 &&
    typeof destination.caption === "string"
  );
}

/* Validates the basic structure of a multi-destination campaign request. */
function isValidRequest(value: unknown): value is CreateCampaignRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const request = value as Record<string, unknown>;

  return (
    (request.sourceType === "blog" || request.sourceType === "campaign") &&
    Array.isArray(request.destinations) &&
    request.destinations.length > 0 &&
    request.destinations.every(isValidDestination) &&
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

/*
 * Creates every destination row for a campaign before any social delivery
 * is attempted.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body: unknown = await request.json();

    if (!isValidRequest(body)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid social campaign request.",
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
          error: "Blog social campaigns require a blog post ID.",
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
     * Prevents the same Buffer destination from being inserted more than once
     * into a single campaign.
     */
    const destinationChannelIds = body.destinations.map((destination) =>
      destination.channelId.trim()
    );

    if (new Set(destinationChannelIds).size !== destinationChannelIds.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "The same social destination cannot be selected more than once.",
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

    /*
     * Builds an authoritative server-side lookup so the browser cannot decide
     * the platform or channel name stored in Supabase.
     */
    const channelMap = new Map(
      channels.map((channel) => [channel.id, channel])
    );

    /*
     * Every destination created by this request shares the same campaign ID.
     */
    const campaignId = crypto.randomUUID();

    const supabase = createSupabaseAdminClient();

    const createdPosts = [];

    /*
     * Creates all destination records in Supabase. No Buffer publishing
     * mutation occurs in this endpoint.
     */
    for (const destination of body.destinations) {
      const channelId = destination.channelId.trim();

      const channel = channelMap.get(channelId);

      if (!channel) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `The selected social channel ${channelId} is not available.`,
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

      const result = await createSocialPost(supabase, {
        campaignId,

        blogPostId: body.blogPostId?.trim() || null,

        sourceType: body.sourceType,

        title: body.title?.trim() || null,

        channelId: channel.id,

        channelName: channel.displayName || channel.name,

        platform,

        caption: destination.caption,

        mediaUrl: body.mediaUrl?.trim() || null,

        mediaType: body.mediaType ?? null,

        status: body.status ?? "draft",
      });

      createdPosts.push({
        post: result.post,
        validation: result.validation,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaignId,
        posts: createdPosts,
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
    console.error("Unable to create social campaign:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create social campaign.",
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
