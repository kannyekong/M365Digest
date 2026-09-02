import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../../../lib/supabase/server";
import {
  getBufferChannels,
  getBufferOrganizations,
} from "../../../../../lib/buffer/buffer-server";
import { normalizeBufferPlatform } from "../../../../../lib/social/social-platforms";

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

/* Retrieves all destination rows belonging to one social campaign. */
export const GET: APIRoute = async ({ params }) => {
  try {
    const campaignId = params.campaignId?.trim();

    if (!campaignId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "A valid campaign ID is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("social_posts")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Unable to retrieve social campaign: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Social campaign was not found.",
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
        campaignId,
        posts: data,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to retrieve social campaign:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve social campaign.",
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

interface UpdateCampaignDestination {
  channelId: string;
  caption: string;
}

interface UpdateCampaignRequest {
  title?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  destinations: UpdateCampaignDestination[];
}

/* Validates an individual campaign destination update. */
function isValidDestination(
  value: unknown
): value is UpdateCampaignDestination {
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

/* Validates a draft campaign update request. */
function isValidUpdateRequest(value: unknown): value is UpdateCampaignRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const request = value as Record<string, unknown>;

  return (
    Array.isArray(request.destinations) &&
    request.destinations.length > 0 &&
    request.destinations.every(isValidDestination) &&
    (request.title === undefined ||
      request.title === null ||
      typeof request.title === "string") &&
    (request.mediaUrl === undefined ||
      request.mediaUrl === null ||
      typeof request.mediaUrl === "string") &&
    (request.mediaType === undefined ||
      request.mediaType === null ||
      request.mediaType === "image" ||
      request.mediaType === "video")
  );
}

/* Updates an existing draft campaign without recreating its destination rows. */
export const PATCH: APIRoute = async ({ request, params }) => {
  try {
    const campaignId = params.campaignId?.trim();

    if (!campaignId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "A valid campaign ID is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body: unknown = await request.json();

    if (!isValidUpdateRequest(body)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid campaign update request.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabase = createSupabaseAdminClient();

    /*
     * Retrieves the authoritative campaign before permitting any mutation.
     */
    const { data: existingPosts, error: existingError } = await supabase
      .from("social_posts")
      .select("*")
      .eq("campaign_id", campaignId);

    if (existingError) {
      throw new Error(
        `Unable to retrieve social campaign: ${existingError.message}`
      );
    }

    if (!existingPosts || existingPosts.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Social campaign was not found.",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Full editing is deliberately limited to campaigns that have never
     * entered the publishing lifecycle.
     */
    if (existingPosts.some((post) => post.status !== "draft")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Only draft campaigns can be edited.",
        }),
        {
          status: 409,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const organization = await getCloudTweakBufferOrganization();
    const channels = await getBufferChannels(organization.id);

    const channelMap = new Map(
      channels.map((channel) => [channel.id, channel])
    );

    const requestedChannelIds = body.destinations.map((destination) =>
      destination.channelId.trim()
    );

    if (new Set(requestedChannelIds).size !== requestedChannelIds.length) {
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

    /*
     * Validate every requested destination before changing any database row.
     */
    for (const destination of body.destinations) {
      const channel = channelMap.get(destination.channelId.trim());

      if (!channel) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "One or more selected social channels are unavailable.",
          }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (!normalizeBufferPlatform(channel.service)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `The ${channel.service} platform is not currently supported.`,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    /*
     * At this stage we deliberately keep destination membership unchanged.
     * Adding/removing destinations will be handled separately so an edit
     * cannot accidentally orphan or recreate campaign rows.
     */
    const existingChannelIds = existingPosts
      .map((post) => post.buffer_channel_id)
      .sort();

    const updatedChannelIds = [...requestedChannelIds].sort();

    if (
      existingChannelIds.length !== updatedChannelIds.length ||
      existingChannelIds.some(
        (channelId, index) => channelId !== updatedChannelIds[index]
      )
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Changing campaign destinations is not supported during editing yet.",
        }),
        {
          status: 409,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const updatedPosts = [];

    /*
     * Updates each existing destination row while preserving its ID and
     * campaign publishing history.
     */
    for (const destination of body.destinations) {
      const channelId = destination.channelId.trim();

      const existingPost = existingPosts.find(
        (post) => post.buffer_channel_id === channelId
      );

      if (!existingPost) {
        throw new Error(`Unable to resolve existing destination ${channelId}.`);
      }

      const characterCount = Array.from(destination.caption).length;

      const { data: updatedPost, error: updateError } = await supabase
        .from("social_posts")
        .update({
          title: body.title?.trim() || null,
          caption: destination.caption,
          character_count: characterCount,
          media_url: body.mediaUrl?.trim() || null,
          media_type: body.mediaType ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPost.id)
        .eq("campaign_id", campaignId)
        .eq("status", "draft")
        .select("*")
        .single();

      if (updateError) {
        throw new Error(
          `Unable to update social campaign: ${updateError.message}`
        );
      }

      updatedPosts.push(updatedPost);
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaignId,
        posts: updatedPosts,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to update social campaign:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update social campaign.",
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
