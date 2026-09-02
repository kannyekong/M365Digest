import type { SupabaseClient } from "@supabase/supabase-js";

import { getSocialPostsByCampaignId } from "./social-repository";
import { publishSocialPostNow } from "./social-publisher";

import type {
  SocialPlatform,
  SocialPost,
  SocialPublishResult,
} from "./social-types";

export interface SocialCampaignRetryResult {
  socialPostId: string;
  platform: SocialPlatform;
  channelName: string | null;
  success: boolean;
  post: SocialPost | null;
  provider: SocialPublishResult | null;
  error: string | null;
}

export interface SocialCampaignRetrySummary {
  total: number;
  failed: number;
  attempted: number;
  recovered: number;
  stillFailed: number;
  skipped: number;
}

export interface SocialCampaignRetryResponse {
  success: boolean;
  partialSuccess: boolean;
  campaignId: string;
  results: SocialCampaignRetryResult[];
  summary: SocialCampaignRetrySummary;
}

/* Retries one failed destination without allowing it to interrupt the others. */
async function retryFailedDestination(
  supabase: SupabaseClient,
  post: SocialPost
): Promise<SocialCampaignRetryResult> {
  try {
    const result = await publishSocialPostNow(supabase, post.id);

    return {
      socialPostId: post.id,
      platform: post.platform,
      channelName: post.channel_name,
      success: true,
      post: result.post,
      provider: result.provider,
      error: null,
    };
  } catch (error) {
    return {
      socialPostId: post.id,
      platform: post.platform,
      channelName: post.channel_name,
      success: false,
      post: null,
      provider: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to retry social destination.",
    };
  }
}

/* Retries only failed destinations belonging to the requested campaign. */
export async function retryFailedSocialCampaign(
  supabase: SupabaseClient,
  campaignId: string
): Promise<SocialCampaignRetryResponse> {
  const posts = await getSocialPostsByCampaignId(supabase, campaignId);

  if (posts.length === 0) {
    throw new Error("Social campaign could not be found.");
  }

  const failedPosts = posts.filter((post) => post.status === "failed");

  if (failedPosts.length === 0) {
    return {
      success: true,
      partialSuccess: false,
      campaignId,
      results: [],
      summary: {
        total: posts.length,
        failed: 0,
        attempted: 0,
        recovered: 0,
        stillFailed: 0,
        skipped: posts.length,
      },
    };
  }

  /*
   * Destinations are independent publishing units, so one failed retry
   * must not prevent another failed destination from being recovered.
   */
  const results = await Promise.all(
    failedPosts.map((post) => retryFailedDestination(supabase, post))
  );

  const recovered = results.filter((result) => result.success).length;

  const stillFailed = results.length - recovered;

  return {
    success: stillFailed === 0,
    partialSuccess: recovered > 0 && stillFailed > 0,
    campaignId,
    results,
    summary: {
      total: posts.length,
      failed: failedPosts.length,
      attempted: results.length,
      recovered,
      stillFailed,
      skipped: posts.length - failedPosts.length,
    },
  };
}
