import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createBufferPost,
  publishBufferPostNow,
} from "../buffer/buffer-server";

import {
  getSocialPost,
  markSocialPostFailed,
  markSocialPostPublished,
  markSocialPostQueueing,
  markSocialPostScheduled,
  updateSocialPostStatus,
} from "./social-repository";

import { validateSocialContent } from "./social-platforms";

import type { SocialPost, SocialPublishResult } from "./social-types";

/* Defines the social-post states that may be handed to Buffer for queueing. */
const QUEUEABLE_STATUSES = new Set(["ready", "failed"]);

/* Defines the social-post states that may be published immediately. */
const PUBLISHABLE_STATUSES = new Set(["ready", "failed", "scheduled"]);

/* Ensures a social post is ready for delivery before Buffer is contacted. */
function validatePostForDelivery(post: SocialPost) {
  const validation = validateSocialContent(post.platform, post.caption);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  if (!post.buffer_channel_id.trim()) {
    throw new Error("The social post does not have a valid Buffer channel.");
  }

  if (post.media_url && !post.media_url.startsWith("https://")) {
    throw new Error("Social media assets must use a public HTTPS URL.");
  }

  return validation;
}

/* Converts a successful Buffer response into CloudTweak's provider-neutral result. */
function createPublishResult(post: {
  id: string;
  status: string;
  dueAt: string | null;
  externalLink?: string | null;
}): SocialPublishResult {
  return {
    provider: "buffer",
    providerPostId: post.id,
    status: post.status,
    scheduledFor: post.dueAt,
    externalUrl: post.externalLink ?? null,
  };
}

/* Determines whether CloudTweak already has a Buffer post to reuse. */
function hasExistingBufferPost(post: SocialPost) {
  return Boolean(post.buffer_post_id?.trim());
}

/*
 * Restores a failed CloudTweak row that already has a Buffer post back to
 * scheduled tracking without creating another remote Buffer post.
 */
async function restoreExistingBufferPost(
  supabase: SupabaseClient,
  post: SocialPost
) {
  if (!post.buffer_post_id) {
    throw new Error("The social post does not have an existing Buffer post.");
  }

  return await markSocialPostScheduled(supabase, post.id, {
    bufferPostId: post.buffer_post_id,
    bufferStatus: post.buffer_status ?? "scheduled",
    scheduledFor: post.scheduled_for,
    externalUrl: post.external_url,
  });
}

/* Queues an existing CloudTweak social post through Buffer. */
export async function queueSocialPost(
  supabase: SupabaseClient,
  socialPostId: string
) {
  const post = await getSocialPost(supabase, socialPostId);

  if (!QUEUEABLE_STATUSES.has(post.status)) {
    throw new Error(
      `Social post cannot be queued while its status is "${post.status}".`
    );
  }

  try {
    validatePostForDelivery(post);

    /*
     * A failed row may already represent a successfully created Buffer post.
     * In that case, restore local tracking instead of creating a duplicate.
     */
    if (post.status === "failed" && hasExistingBufferPost(post)) {
      const trackedPost = await restoreExistingBufferPost(supabase, post);

      return {
        post: trackedPost,
        provider: {
          provider: "buffer",
          providerPostId: post.buffer_post_id as string,
          status: post.buffer_status ?? "scheduled",
          scheduledFor: post.scheduled_for,
          externalUrl: post.external_url,
        } satisfies SocialPublishResult,
      };
    }

    await markSocialPostQueueing(supabase, post.id);

    /*
     * Only ready posts and failed posts without a Buffer ID are allowed to
     * create a new remote Buffer post.
     */
    const bufferPost = await createBufferPost({
      channelId: post.buffer_channel_id,
      text: post.caption,
      imageUrl: post.media_url ?? undefined,
    });

    const trackedPost = await markSocialPostScheduled(supabase, post.id, {
      bufferPostId: bufferPost.id,
      bufferStatus: bufferPost.status,
      scheduledFor: bufferPost.dueAt,
      externalUrl: null,
    });

    return {
      post: trackedPost,
      provider: createPublishResult({
        ...bufferPost,
        externalLink: null,
      }),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to queue social post.";

    try {
      await markSocialPostFailed(supabase, post.id, message);
    } catch (trackingError) {
      console.error(
        "Unable to record social publishing failure:",
        trackingError
      );
    }

    throw new Error(message);
  }
}

/* Publishes an existing CloudTweak social post immediately. */
export async function publishSocialPostNow(
  supabase: SupabaseClient,
  socialPostId: string
) {
  const post = await getSocialPost(supabase, socialPostId);

  if (!PUBLISHABLE_STATUSES.has(post.status)) {
    throw new Error(
      `Social post cannot be published while its status is "${post.status}".`
    );
  }

  try {
    validatePostForDelivery(post);

    /*
     * Scheduled posts already exist in Buffer. Failed posts may also already
     * have a Buffer post when an earlier immediate-publish attempt failed
     * after remote creation. Both cases must reuse that existing Buffer post.
     */
    if (
      (post.status === "scheduled" || post.status === "failed") &&
      hasExistingBufferPost(post)
    ) {
      const bufferPostId = post.buffer_post_id as string;

      await updateSocialPostStatus(supabase, post.id, "publishing");

      const bufferPost = await publishBufferPostNow(bufferPostId, post.caption);

      const trackedPost = await markSocialPostPublished(supabase, post.id, {
        bufferStatus: bufferPost.status,
        externalUrl: bufferPost.externalLink ?? null,
        publishedAt: bufferPost.sentAt ?? new Date().toISOString(),
      });

      return {
        post: trackedPost,
        provider: createPublishResult(bufferPost),
      };
    }

    /*
     * At this point the post does not have a reusable Buffer post.
     * A new remote post can therefore be created safely.
     */
    await markSocialPostQueueing(supabase, post.id);

    const bufferPost = await createBufferPost({
      channelId: post.buffer_channel_id,
      text: post.caption,
      imageUrl: post.media_url ?? undefined,
    });

    /*
     * Persist the Buffer post ID before attempting share-now. If share-now
     * fails afterward, the failed row retains this ID and a retry can safely
     * reuse the same remote Buffer post.
     */
    await markSocialPostScheduled(supabase, post.id, {
      bufferPostId: bufferPost.id,
      bufferStatus: bufferPost.status,
      scheduledFor: bufferPost.dueAt,
      externalUrl: null,
    });

    const publishedBufferPost = await publishBufferPostNow(
      bufferPost.id,
      post.caption
    );

    const trackedPost = await markSocialPostPublished(supabase, post.id, {
      bufferStatus: publishedBufferPost.status,
      externalUrl: publishedBufferPost.externalLink ?? null,
      publishedAt: publishedBufferPost.sentAt ?? new Date().toISOString(),
    });

    return {
      post: trackedPost,
      provider: createPublishResult(publishedBufferPost),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to publish social post.";

    try {
      await markSocialPostFailed(supabase, post.id, message);
    } catch (trackingError) {
      console.error(
        "Unable to record immediate social publishing failure:",
        trackingError
      );
    }

    throw new Error(message);
  }
}
