import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../../../../lib/supabase/server";

import { getSocialPostsByCampaignId } from "../../../../../../lib/social/social-repository";

interface NormalizedMetrics {
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  reposts: number | null;
  reach: number | null;
  impressions: number | null;
  views: number | null;
  clicks: number | null;
  engagementRate: number | null;
}

interface StoredSocialMetrics {
  provider?: string;

  normalized?: Partial<NormalizedMetrics>;

  raw?: Array<{
    type?: string;
    name?: string;
    value?: number;
    unit?: string;
  }>;

  providerUpdatedAt?: string | null;

  syncedAt?: string | null;
}

/* Converts an unknown stored metric into a usable numeric value. */
function getMetricValue(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/* Adds a nullable metric to an aggregate while preserving availability. */
function addMetric(current: number | null, value: number | null) {
  if (value === null) {
    return current;
  }

  return (current ?? 0) + value;
}

/*
 * Returns stored CloudTweak analytics for a campaign without contacting
 * Buffer. This keeps ordinary campaign page loads inexpensive.
 */
export const GET: APIRoute = async ({ params }) => {
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

    const totals: NormalizedMetrics = {
      reactions: null,
      comments: null,
      shares: null,
      reposts: null,
      reach: null,
      impressions: null,
      views: null,
      clicks: null,
      engagementRate: null,
    };

    let engagementRateTotal = 0;

    let engagementRateDestinationCount = 0;

    let lastUpdatedAt: string | null = null;

    const destinations = campaignPosts.map((post) => {
      const storedMetrics = (post.metrics ?? {}) as StoredSocialMetrics;

      const normalized = storedMetrics.normalized ?? {};

      const metrics: NormalizedMetrics = {
        reactions: getMetricValue(normalized.reactions),
        comments: getMetricValue(normalized.comments),
        shares: getMetricValue(normalized.shares),
        reposts: getMetricValue(normalized.reposts),
        reach: getMetricValue(normalized.reach),
        impressions: getMetricValue(normalized.impressions),
        views: getMetricValue(normalized.views),
        clicks: getMetricValue(normalized.clicks),
        engagementRate: getMetricValue(normalized.engagementRate),
      };

      totals.reactions = addMetric(totals.reactions, metrics.reactions);

      totals.comments = addMetric(totals.comments, metrics.comments);

      totals.shares = addMetric(totals.shares, metrics.shares);

      totals.reposts = addMetric(totals.reposts, metrics.reposts);

      totals.reach = addMetric(totals.reach, metrics.reach);

      totals.impressions = addMetric(totals.impressions, metrics.impressions);

      totals.views = addMetric(totals.views, metrics.views);

      totals.clicks = addMetric(totals.clicks, metrics.clicks);

      /*
       * Engagement rates are averaged across destinations where Buffer
       * actually supplied a rate rather than incorrectly summing percentages.
       */
      if (metrics.engagementRate !== null) {
        engagementRateTotal += metrics.engagementRate;

        engagementRateDestinationCount += 1;
      }

      if (
        post.metrics_updated_at &&
        (!lastUpdatedAt ||
          new Date(post.metrics_updated_at).getTime() >
            new Date(lastUpdatedAt).getTime())
      ) {
        lastUpdatedAt = post.metrics_updated_at;
      }

      return {
        socialPostId: post.id,

        bufferPostId: post.buffer_post_id,

        platform: post.platform,

        channelName: post.channel_name,

        status: post.status,

        externalUrl: post.external_url,

        metrics,

        raw: storedMetrics.raw ?? [],

        metricsUpdatedAt: post.metrics_updated_at,

        providerUpdatedAt: storedMetrics.providerUpdatedAt ?? null,

        syncedAt: storedMetrics.syncedAt ?? null,
      };
    });

    totals.engagementRate =
      engagementRateDestinationCount > 0
        ? engagementRateTotal / engagementRateDestinationCount
        : null;

    return new Response(
      JSON.stringify({
        success: true,

        campaignId,

        analytics: {
          totals,

          destinationCount: campaignPosts.length,

          publishedCount: campaignPosts.filter(
            (post) => post.status === "published"
          ).length,

          destinations,

          lastUpdatedAt,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to retrieve social campaign analytics:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve social campaign analytics.",
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
