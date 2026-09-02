import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../../lib/supabase/server";
import { validateSocialContent } from "../../../../lib/social/social-platforms";

import type {
  SocialPlatform,
  SocialPost,
} from "../../../../lib/social/social-types";

interface PrepareDraftCampaignRequest {
  campaignId: string;
}

/* Validates a request to prepare an existing draft campaign for delivery. */
function isValidRequest(value: unknown): value is PrepareDraftCampaignRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const request = value as Record<string, unknown>;

  return (
    typeof request.campaignId === "string" &&
    request.campaignId.trim().length > 0
  );
}

/* Validates every destination before a draft campaign enters the delivery lifecycle. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body: unknown = await request.json();

    if (!isValidRequest(body)) {
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

    const campaignId = body.campaignId.trim();

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

    const posts = data as SocialPost[];

    /*
     * A ready campaign may be retried after preparation succeeded but the
     * subsequent delivery request never reached the publishing endpoint.
     */
    if (posts.every((post) => post.status === "ready")) {
      return new Response(
        JSON.stringify({
          success: true,
          campaignId,
          posts,
          alreadyReady: true,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Preparation is only valid before any destination has entered the
     * publishing lifecycle.
     */
    if (posts.some((post) => post.status !== "draft")) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "This campaign can no longer be prepared because one or more destinations have already entered the publishing lifecycle.",
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
     * Validate the complete campaign before changing any row to ready.
     */
    for (const post of posts) {
      const validation = validateSocialContent(
        post.platform as SocialPlatform,
        post.caption
      );

      if (!validation.valid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `${post.channel_name || post.platform} is not ready: ${
              validation.errors[0] || "Invalid social content."
            }`,
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

    const now = new Date().toISOString();

    /*
     * Transition every destination together after the complete campaign has
     * passed validation.
     */
    const { data: updatedPosts, error: updateError } = await supabase
      .from("social_posts")
      .update({
        status: "ready",
        error_message: null,
        updated_at: now,
      })
      .eq("campaign_id", campaignId)
      .eq("status", "draft")
      .select("*");

    if (updateError) {
      throw new Error(
        `Unable to prepare social campaign: ${updateError.message}`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaignId,
        posts: updatedPosts ?? [],
        alreadyReady: false,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to prepare social campaign:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to prepare social campaign.",
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
