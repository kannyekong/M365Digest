import type { SupabaseClient } from "@supabase/supabase-js";

import { publishSocialPostNow, queueSocialPost } from "./social-publisher";

import { getSocialPostsByCampaignId } from "./social-repository";

import type { SocialPost } from "./social-types";

export type SocialCampaignDeliveryMode = "queue" | "publish";

interface SocialCampaignDeliveryResult {
  socialPostId: string;
  channelId: string;
  channelName: string | null;
  platform: string;
  success: boolean;
  post: SocialPost | null;
  error: string | null;
}

interface SocialCampaignDeliverySummary {
  total: number;
  succeeded: number;
  failed: number;
}

export interface SocialCampaignDeliveryResponse {
  campaignId: string;
  mode: SocialCampaignDeliveryMode;
  success: boolean;
  partialSuccess: boolean;
  results: SocialCampaignDeliveryResult[];
  summary: SocialCampaignDeliverySummary;
}

/* Delivers one social destination while isolating failures from other destinations. */
async function deliverCampaignPost(
  supabase: SupabaseClient,
  post: SocialPost,
  mode: SocialCampaignDeliveryMode
): Promise<SocialCampaignDeliveryResult> {
  try {
    const result =
      mode === "queue"
        ? await queueSocialPost(supabase, post.id)
        : await publishSocialPostNow(supabase, post.id);

    return {
      socialPostId: post.id,
      channelId: post.buffer_channel_id,
      channelName: post.channel_name,
      platform: post.platform,
      success: true,
      post: result.post,
      error: null,
    };
  } catch (error) {
    return {
      socialPostId: post.id,
      channelId: post.buffer_channel_id,
      channelName: post.channel_name,
      platform: post.platform,
      success: false,
      post: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to deliver social post.",
    };
  }
}

/* Delivers every destination in a campaign independently. */
export async function deliverSocialCampaign(
  supabase: SupabaseClient,
  campaignId: string,
  mode: SocialCampaignDeliveryMode
): Promise<SocialCampaignDeliveryResponse> {
  const posts = await getSocialPostsByCampaignId(supabase, campaignId);

  if (posts.length === 0) {
    throw new Error("No social posts were found for this campaign.");
  }

  const results = await Promise.all(
    posts.map((post) => deliverCampaignPost(supabase, post, mode))
  );

  const succeeded = results.filter((result) => result.success).length;

  const failed = results.length - succeeded;

  return {
    campaignId,
    mode,

    success: succeeded === results.length,

    partialSuccess: succeeded > 0 && failed > 0,

    results,

    summary: {
      total: results.length,
      succeeded,
      failed,
    },
  };
}
