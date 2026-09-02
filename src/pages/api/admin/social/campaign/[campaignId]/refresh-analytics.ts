import type { APIRoute } from "astro";

import {
  getBufferPostMetrics,
  normalizeBufferPostMetrics,
} from "../../../../../../lib/buffer/buffer-server";

import { createSupabaseAdminClient } from "../../../../../../lib/supabase/server";

import { getSocialPostsByCampaignId } from "../../../../../../lib/social/social-repository";

/* Describes the result of refreshing one campaign destination. */
interface DestinationRefreshResult {
  socialPostId: string;
  bufferPostId: string | null;
  platform: string;
  success: boolean;
  skipped: boolean;
  error: string | null;
}

/*
 * Refreshes Buffer analytics for every eligible destination in one
 * CloudTweak social campaign and stores the metrics in Supabase.
 */
export const POST: APIRoute = async ({ params }) => {
  try {
    const campaignId = params.campaignId?.trim();

    if (!campaignId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Campaign ID is required.",
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

    const campaignPosts = await getSocialPostsByCampaignId(
      supabase,
      campaignId
    );

    if (campaignPosts.length === 0) {
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

    const results: DestinationRefreshResult[] = [];

    /*
     * Refresh each destination independently so one Buffer/network failure
     * cannot prevent analytics from being synchronized for the others.
     */
    for (const post of campaignPosts) {
      /*
       * Buffer analytics are only useful once a destination has a Buffer
       * post identifier and has reached the published lifecycle.
       */
      if (!post.buffer_post_id || post.status !== "published") {
        results.push({
          socialPostId: post.id,
          bufferPostId: post.buffer_post_id,
          platform: post.platform,
          success: false,
          skipped: true,
          error: null,
        });

        continue;
      }

      try {
        const bufferMetrics = await getBufferPostMetrics(post.buffer_post_id);

        const normalizedMetrics = normalizeBufferPostMetrics(
          bufferMetrics.metrics
        );

        const syncedAt = new Date().toISOString();

        /*
         * Keep both normalized and raw metrics. Normalized values power
         * CloudTweak's cross-platform dashboard while raw metrics preserve
         * network-specific data for future analytics features.
         */
        const storedMetrics = {
          provider: "buffer",

          normalized: normalizedMetrics,

          raw: bufferMetrics.metrics ?? [],

          providerUpdatedAt: bufferMetrics.metricsUpdatedAt,

          syncedAt,
        };

        /*
         * Prefer Buffer's metric timestamp when available while retaining the
         * local synchronization timestamp inside the JSON payload.
         */
        const metricsUpdatedAt = bufferMetrics.metricsUpdatedAt ?? syncedAt;

        const { error: updateError } = await supabase
          .from("social_posts")
          .update({
            metrics: storedMetrics,
            metrics_updated_at: metricsUpdatedAt,
            updated_at: syncedAt,
          })
          .eq("id", post.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        results.push({
          socialPostId: post.id,
          bufferPostId: post.buffer_post_id,
          platform: post.platform,
          success: true,
          skipped: false,
          error: null,
        });
      } catch (refreshError) {
        results.push({
          socialPostId: post.id,
          bufferPostId: post.buffer_post_id,
          platform: post.platform,
          success: false,
          skipped: false,
          error:
            refreshError instanceof Error
              ? refreshError.message
              : "Unable to refresh destination analytics.",
        });
      }
    }

    const refreshed = results.filter((result) => result.success).length;

    const skipped = results.filter((result) => result.skipped).length;

    const failed = results.filter(
      (result) => !result.success && !result.skipped
    ).length;

    return new Response(
      JSON.stringify({
        success: failed === 0,
        partialSuccess: refreshed > 0 && failed > 0,

        campaignId,

        summary: {
          total: results.length,
          refreshed,
          skipped,
          failed,
        },

        results,
      }),
      {
        status: failed > 0 && refreshed === 0 ? 502 : 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to refresh social campaign analytics:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to refresh social campaign analytics.",
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
