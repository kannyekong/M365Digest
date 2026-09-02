import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../../lib/supabase/server";
import { editBufferScheduledPost } from "../../../../lib/buffer/buffer-server";

import {
  countSocialCharacters,
  validateSocialContent,
} from "../../../../lib/social/social-platforms";

import type {
  SocialPlatform,
  SocialPost,
} from "../../../../lib/social/social-types";

interface ScheduledDestinationInput {
  channelId: string;
  caption: string;
}

interface UpdateScheduledCampaignRequest {
  campaignId: string;
  title?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | null;
  destinations: ScheduledDestinationInput[];
}

/* Validates the scheduled campaign update request shape. */
function isValidRequest(
  value: unknown
): value is UpdateScheduledCampaignRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const request = value as Record<string, unknown>;

  if (
    typeof request.campaignId !== "string" ||
    request.campaignId.trim().length === 0 ||
    !Array.isArray(request.destinations) ||
    request.destinations.length === 0
  ) {
    return false;
  }

  return request.destinations.every((destination) => {
    if (typeof destination !== "object" || destination === null) {
      return false;
    }

    const item = destination as Record<string, unknown>;

    return (
      typeof item.channelId === "string" &&
      item.channelId.trim().length > 0 &&
      typeof item.caption === "string"
    );
  });
}

/*
 * Synchronizes edits across every existing scheduled Buffer destination while
 * preserving campaign IDs, Buffer post IDs and scheduling information.
 */
export const PATCH: APIRoute = async ({ request }) => {
  try {
    const body: unknown = await request.json();

    if (!isValidRequest(body)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid scheduled campaign update request.",
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

    const campaignId = body.campaignId.trim();

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

    const campaignPosts = data as SocialPost[];

    /*
     * This endpoint intentionally handles only campaigns whose destinations
     * have already been scheduled in Buffer.
     */
    if (campaignPosts.some((post) => post.status !== "scheduled")) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Only fully scheduled campaigns can be synchronized through this endpoint.",
        }),
        {
          status: 409,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Destination membership remains locked during scheduled editing because
     * adding or removing channels requires separate Buffer lifecycle actions.
     */
    const existingChannelIds = campaignPosts
      .map((post) => post.buffer_channel_id)
      .sort();

    const submittedChannelIds = body.destinations
      .map((destination) => destination.channelId)
      .sort();

    const membershipChanged =
      existingChannelIds.length !== submittedChannelIds.length ||
      existingChannelIds.some(
        (channelId, index) => channelId !== submittedChannelIds[index]
      );

    if (membershipChanged) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Destinations cannot currently be added or removed from a scheduled campaign.",
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
     * Validate every destination before attempting any Buffer updates.
     */
    for (const destination of body.destinations) {
      const existingPost = campaignPosts.find(
        (post) => post.buffer_channel_id === destination.channelId
      );

      if (!existingPost) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "A submitted campaign destination was not found.",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      const validation = validateSocialContent(
        existingPost.platform as SocialPlatform,
        destination.caption
      );

      if (!validation.valid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `${
              existingPost.channel_name || existingPost.platform
            }: ${validation.errors[0] || "Invalid social content."}`,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (!existingPost.buffer_post_id) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `${
              existingPost.channel_name || existingPost.platform
            } does not have a Buffer post ID.`,
          }),
          {
            status: 409,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    const results = await Promise.all(
      body.destinations.map(async (destination) => {
        const existingPost = campaignPosts.find(
          (post) => post.buffer_channel_id === destination.channelId
        )!;

        try {
          /*
           * Synchronize Buffer first so CloudTweak never claims that new
           * scheduled content exists when Buffer rejected the edit.
           */
          const bufferPost = await editBufferScheduledPost({
            postId: existingPost.buffer_post_id!,
            text: destination.caption,
            imageUrl: body.mediaUrl?.trim() || null,
          });

          const now = new Date().toISOString();

          /*
           * Persist the exact content that Buffer successfully accepted.
           */
          const { data: updatedPost, error: updateError } = await supabase
            .from("social_posts")
            .update({
              title: body.title?.trim() || null,
              caption: destination.caption,
              character_count: countSocialCharacters(destination.caption),
              media_url: body.mediaUrl?.trim() || null,
              media_type: body.mediaUrl?.trim() ? "image" : null,
              buffer_status: bufferPost.status,
              error_message: null,
              updated_at: now,
            })
            .eq("id", existingPost.id)
            .select("*")
            .single();

          if (updateError) {
            throw new Error(
              `Buffer accepted the update, but CloudTweak could not save it: ${updateError.message}`
            );
          }

          return {
            success: true as const,
            socialPostId: existingPost.id,
            bufferPostId: existingPost.buffer_post_id,
            channelId: existingPost.buffer_channel_id,
            platform: existingPost.platform,
            post: updatedPost,
          };
        } catch (syncError) {
          return {
            success: false as const,
            socialPostId: existingPost.id,
            bufferPostId: existingPost.buffer_post_id,
            channelId: existingPost.buffer_channel_id,
            platform: existingPost.platform,
            error:
              syncError instanceof Error
                ? syncError.message
                : "Unable to synchronize scheduled destination.",
          };
        }
      })
    );

    const succeeded = results.filter((result) => result.success).length;

    const failed = results.length - succeeded;

    return new Response(
      JSON.stringify({
        success: failed === 0,
        partialSuccess: succeeded > 0 && failed > 0,
        campaignId,
        summary: {
          total: results.length,
          succeeded,
          failed,
        },
        results,
      }),
      {
        status: failed === results.length ? 502 : 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to update scheduled social campaign:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update scheduled social campaign.",
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
