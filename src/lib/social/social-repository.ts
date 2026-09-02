import type { SupabaseClient } from "@supabase/supabase-js";

import {
  countSocialCharacters,
  validateSocialContent,
} from "./social-platforms";

import type {
  CreateSocialPostInput,
  SocialCampaignListItem,
  SocialCampaignStatus,
  SocialPost,
  SocialPostStatus,
} from "./social-types";

interface SocialPostSummary {
  total: number;
  draft: number;
  ready: number;
  scheduled: number;
  published: number;
  failed: number;
}

interface SocialPostFilters {
  status?: SocialPostStatus;
  platform?: string;
  sourceType?: "blog" | "campaign";
  search?: string;
}

interface SocialPostPagination {
  page?: number;
  pageSize?: number;
}

interface SocialPostPage {
  posts: SocialPost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface SocialCampaignPage {
  campaigns: SocialCampaignListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface SocialCampaignGroup {
  campaignId: string | null;
  posts: SocialPost[];
}

/* Defines the lifecycle states displayed in the social dashboard summary. */
const SOCIAL_SUMMARY_STATUSES = [
  "draft",
  "ready",
  "scheduled",
  "published",
  "failed",
] as const satisfies readonly SocialPostStatus[];

type SocialSummaryStatus = (typeof SOCIAL_SUMMARY_STATUSES)[number];

/* Retrieves aggregate social-post counts directly from the database. */
export async function getSocialPostSummary(
  supabase: SupabaseClient
): Promise<SocialPostSummary> {
  const totalQuery = supabase.from("social_posts").select("*", {
    count: "exact",
    head: true,
  });

  const statusQueries = SOCIAL_SUMMARY_STATUSES.map((status) =>
    supabase
      .from("social_posts")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", status)
  );

  const [totalResult, ...statusResults] = await Promise.all([
    totalQuery,
    ...statusQueries,
  ]);

  if (totalResult.error) {
    throw new Error(
      `Unable to retrieve social post summary: ${totalResult.error.message}`
    );
  }

  const counts = SOCIAL_SUMMARY_STATUSES.reduce<
    Record<SocialSummaryStatus, number>
  >(
    (result, status, index) => {
      const statusResult = statusResults[index];

      if (statusResult.error) {
        throw new Error(
          `Unable to retrieve ${status} social post count: ${statusResult.error.message}`
        );
      }

      result[status] = statusResult.count ?? 0;

      return result;
    },
    {
      draft: 0,
      ready: 0,
      scheduled: 0,
      published: 0,
      failed: 0,
    }
  );

  return {
    total: totalResult.count ?? 0,

    draft: counts.draft,

    ready: counts.ready,

    scheduled: counts.scheduled,

    published: counts.published,

    failed: counts.failed,
  };
}
/* Creates a CloudTweak social post before any delivery provider is called. */
export async function createSocialPost(
  supabase: SupabaseClient,
  input: CreateSocialPostInput
) {
  const caption = input.caption.trim();

  const validation = validateSocialContent(input.platform, caption);

  const requestedStatus = input.status ?? "draft";

  const status: "draft" | "ready" =
    requestedStatus === "ready" && validation.valid ? "ready" : "draft";

  const { data, error } = await supabase
    .from("social_posts")
    .insert({
      blog_post_id: input.blogPostId ?? null,

      source_type: input.sourceType,

      title: input.title?.trim() || null,

      buffer_channel_id: input.channelId,

      campaign_id: input.campaignId ?? null,

      channel_name: input.channelName?.trim() || null,

      platform: input.platform,

      caption,

      character_count: validation.characterCount,

      media_url: input.mediaUrl?.trim() || null,

      media_type: input.mediaType ?? null,

      status,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to create social post: ${error.message}`);
  }

  return {
    post: data as SocialPost,
    validation,
  };
}

/* Creates multiple destination-specific social posts independently. */
export async function createSocialPosts(
  supabase: SupabaseClient,
  inputs: CreateSocialPostInput[]
) {
  const results: Array<{
    post: SocialPost;
    validation: ReturnType<typeof validateSocialContent>;
  }> = [];

  for (const input of inputs) {
    const result = await createSocialPost(supabase, input);

    results.push(result);
  }

  return results;
}

/* Retrieves one social post by its CloudTweak identifier. */
export async function getSocialPost(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("social_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Unable to retrieve social post: ${error.message}`);
  }

  return data as SocialPost;
}

/* Derives the dashboard lifecycle state for all destinations in a campaign. */
function getCampaignStatus(posts: SocialPost[]): SocialCampaignStatus {
  const statuses = new Set(posts.map((post) => post.status));

  if (statuses.size === 1) {
    return posts[0].status;
  }

  if (statuses.has("failed")) {
    return "partial_failure";
  }

  return "in_progress";
}

/* Returns the earliest available date from a collection of nullable dates. */
function getEarliestDate(values: Array<string | null>) {
  const dates = values.filter((value): value is string => Boolean(value));

  if (dates.length === 0) {
    return null;
  }

  return dates.reduce((earliest, current) =>
    new Date(current).getTime() < new Date(earliest).getTime()
      ? current
      : earliest
  );
}

/* Returns the latest available date from a collection of nullable dates. */
function getLatestDate(values: Array<string | null>) {
  const dates = values.filter((value): value is string => Boolean(value));

  if (dates.length === 0) {
    return null;
  }

  return dates.reduce((latest, current) =>
    new Date(current).getTime() > new Date(latest).getTime() ? current : latest
  );
}

/* Converts destination-level social posts into one dashboard campaign record. */
function mapCampaignGroup(
  campaignId: string | null,
  posts: SocialPost[]
): SocialCampaignListItem {
  const firstPost = posts[0];

  return {
    key: campaignId ?? firstPost.id,

    campaignId,

    legacyPostId: campaignId ? null : firstPost.id,

    title: firstPost.title,

    caption: firstPost.caption,

    sourceType: firstPost.source_type,

    status: getCampaignStatus(posts),

    destinations: posts.map((post) => ({
      socialPostId: post.id,

      channelId: post.buffer_channel_id,

      channelName: post.channel_name,

      platform: post.platform,

      status: post.status,

      externalUrl: post.external_url,

      bufferPostId: post.buffer_post_id,

      errorMessage: post.error_message,
    })),

    destinationCount: posts.length,

    createdAt: getEarliestDate(posts.map((post) => post.created_at))!,

    scheduledFor: getEarliestDate(posts.map((post) => post.scheduled_for)),

    publishedAt: getLatestDate(posts.map((post) => post.published_at)),
  };
}

/* Retrieves social posts using database pagination and optional filters. */
export async function getSocialPosts(
  supabase: SupabaseClient,
  filters: SocialPostFilters = {},
  pagination: SocialPostPagination = {}
): Promise<SocialPostPage> {
  const page = Math.max(pagination.page ?? 1, 1);

  const pageSize = Math.min(Math.max(pagination.pageSize ?? 20, 1), 100);

  const from = (page - 1) * pageSize;

  const to = from + pageSize - 1;

  let query = supabase.from("social_posts").select("*", {
    count: "exact",
  });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.platform) {
    query = query.eq("platform", filters.platform);
  }

  if (filters.sourceType) {
    query = query.eq("source_type", filters.sourceType);
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim().replace(/[%(),]/g, "");

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,caption.ilike.%${search}%,channel_name.ilike.%${search}%`
      );
    }
  }

  const { data, error, count } = await query
    .order("created_at", {
      ascending: false,
    })
    .range(from, to);

  if (error) {
    throw new Error(`Unable to retrieve social posts: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    posts: (data ?? []) as SocialPost[],

    total,

    page,

    pageSize,

    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}

/* Retrieves grouped social campaigns before applying dashboard pagination. */
export async function getSocialCampaigns(
  supabase: SupabaseClient,
  filters: SocialPostFilters = {},
  pagination: SocialPostPagination = {}
): Promise<SocialCampaignPage> {
  const page = Math.max(pagination.page ?? 1, 1);

  const pageSize = Math.min(Math.max(pagination.pageSize ?? 20, 1), 100);

  let query = supabase.from("social_posts").select("*").order("created_at", {
    ascending: false,
  });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.platform) {
    query = query.eq("platform", filters.platform);
  }

  if (filters.sourceType) {
    query = query.eq("source_type", filters.sourceType);
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim().replace(/[%(),]/g, "");

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,caption.ilike.%${search}%,channel_name.ilike.%${search}%`
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to retrieve social campaigns: ${error.message}`);
  }

  const posts = (data ?? []) as SocialPost[];

  const campaignGroups = new Map<string, SocialCampaignGroup>();

  /* Groups modern campaigns by campaign_id while preserving legacy rows. */
  for (const post of posts) {
    const key = post.campaign_id
      ? `campaign:${post.campaign_id}`
      : `legacy:${post.id}`;

    const existingGroup = campaignGroups.get(key);

    if (existingGroup) {
      existingGroup.posts.push(post);

      continue;
    }

    campaignGroups.set(key, {
      campaignId: post.campaign_id,
      posts: [post],
    });
  }

  const campaigns = Array.from(campaignGroups.values())
    .map((group) => mapCampaignGroup(group.campaignId, group.posts))
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );

  const total = campaigns.length;

  const from = (page - 1) * pageSize;

  const paginatedCampaigns = campaigns.slice(from, from + pageSize);

  return {
    campaigns: paginatedCampaigns,

    total,

    page,

    pageSize,

    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}
/* Updates the prepared caption and recalculates its validation metadata. */
export async function updateSocialPostContent(
  supabase: SupabaseClient,
  id: string,
  caption: string
) {
  const existingPost = await getSocialPost(supabase, id);

  const normalizedCaption = caption.trim();

  const validation = validateSocialContent(
    existingPost.platform,
    normalizedCaption
  );

  const { data, error } = await supabase
    .from("social_posts")
    .update({
      caption: normalizedCaption,

      character_count: validation.characterCount,

      status: validation.valid ? "ready" : "draft",

      error_message: null,

      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update social post content: ${error.message}`);
  }

  return {
    post: data as SocialPost,
    validation,
  };
}

/* Changes a social post lifecycle status without contacting Buffer. */
export async function updateSocialPostStatus(
  supabase: SupabaseClient,
  id: string,
  status: SocialPostStatus,
  errorMessage?: string | null
) {
  const { data, error } = await supabase
    .from("social_posts")
    .update({
      status,

      error_message: errorMessage ?? null,

      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update social post status: ${error.message}`);
  }

  return data as SocialPost;
}

/* Marks a social post as being handed to the delivery provider. */
export async function markSocialPostQueueing(
  supabase: SupabaseClient,
  id: string
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("social_posts")
    .update({
      status: "queueing",

      error_message: null,

      last_attempt_at: now,

      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to mark social post as queueing: ${error.message}`);
  }

  return data as SocialPost;
}

/* Records a successful Buffer queue operation against the existing social post. */
export async function markSocialPostScheduled(
  supabase: SupabaseClient,
  id: string,
  input: {
    bufferPostId: string;
    bufferStatus: string;
    scheduledFor: string | null;
    externalUrl?: string | null;
  }
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("social_posts")
    .update({
      status: "scheduled",

      buffer_post_id: input.bufferPostId,

      buffer_status: input.bufferStatus,

      scheduled_for: input.scheduledFor,

      queued_at: now,

      external_url: input.externalUrl ?? null,

      error_message: null,

      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to record scheduled social post: ${error.message}`);
  }

  return data as SocialPost;
}

/* Records a successful immediate publication against the social post. */
export async function markSocialPostPublished(
  supabase: SupabaseClient,
  id: string,
  input: {
    bufferStatus?: string | null;
    externalUrl?: string | null;
    publishedAt?: string | null;
  } = {}
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("social_posts")
    .update({
      status: "published",

      buffer_status: input.bufferStatus ?? "published",

      published_at: input.publishedAt ?? now,

      external_url: input.externalUrl ?? null,

      error_message: null,

      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Unable to mark social post as published: ${error.message}`
    );
  }

  return data as SocialPost;
}

/* Records a failed delivery attempt while preserving the post for retry. */
export async function markSocialPostFailed(
  supabase: SupabaseClient,
  id: string,
  errorMessage: string
) {
  const existingPost = await getSocialPost(supabase, id);

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("social_posts")
    .update({
      status: "failed",

      error_message: errorMessage,

      retry_count: existingPost.retry_count + 1,

      last_attempt_at: now,

      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Unable to record social publishing failure: ${error.message}`
    );
  }

  return data as SocialPost;
}

/* Cancels a social post locally without deleting its publishing history. */
export async function cancelSocialPost(supabase: SupabaseClient, id: string) {
  return updateSocialPostStatus(supabase, id, "cancelled");
}

/* Recalculates the stored character count for an existing social post. */
export async function refreshSocialPostCharacterCount(
  supabase: SupabaseClient,
  id: string
) {
  const post = await getSocialPost(supabase, id);

  const characterCount = countSocialCharacters(post.caption);

  const { data, error } = await supabase
    .from("social_posts")
    .update({
      character_count: characterCount,

      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Unable to refresh social post character count: ${error.message}`
    );
  }

  return data as SocialPost;
}

/* Retrieves every social destination belonging to one campaign. */
export async function getSocialPostsByCampaignId(
  supabase: SupabaseClient,
  campaignId: string
) {
  const { data, error } = await supabase
    .from("social_posts")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to retrieve social campaign posts: ${error.message}`
    );
  }

  return (data ?? []) as SocialPost[];
}

/* Permanently removes all destination records belonging to a social campaign. */
export async function deleteSocialCampaign(
  supabase: SupabaseClient,
  campaignId: string
) {
  /* Confirm that the campaign exists before attempting deletion. */
  const { data: campaignPosts, error: fetchError } = await supabase
    .from("social_posts")
    .select("id, status, buffer_post_id")
    .eq("campaign_id", campaignId);

  if (fetchError) {
    throw new Error(
      `Unable to retrieve social campaign: ${fetchError.message}`
    );
  }

  if (!campaignPosts || campaignPosts.length === 0) {
    throw new Error("Social campaign was not found.");
  }

  /* Delete all local destination records belonging to the campaign. */
  const { data, error } = await supabase
    .from("social_posts")
    .delete()
    .eq("campaign_id", campaignId)
    .select("id");

  if (error) {
    throw new Error(`Unable to delete social campaign: ${error.message}`);
  }

  return {
    campaignId,
    deletedCount: data?.length ?? 0,
  };
}
