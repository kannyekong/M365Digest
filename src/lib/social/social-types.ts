/* Defines the social platforms currently supported by CloudTweak. */
export type SocialPlatform =
  | "linkedin"
  | "twitter"
  | "facebook"
  | "instagram"
  | "threads"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "bluesky"
  | "mastodon"
  | "googlebusiness";

/* Defines where a CloudTweak social post originated. */
export type SocialPostSource = "blog" | "campaign";

/* Defines the lifecycle states of a CloudTweak social post. */
export type SocialPostStatus =
  | "draft"
  | "ready"
  | "queueing"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

/* Defines the supported social media asset types. */
export type SocialMediaType = "image" | "video";

/* Represents a Buffer-connected social destination. */
export interface SocialChannel {
  id: string;
  name: string;
  displayName: string | null;
  platform: SocialPlatform;
  avatar: string | null;
  isQueuePaused: boolean;
}

/* Represents the platform rules CloudTweak uses while composing content. */
export interface SocialPlatformConfig {
  platform: SocialPlatform;
  label: string;

  /**
   * Character limits are nullable because CloudTweak should not invent
   * restrictions when a platform requires more specialized validation.
   */
  maxCharacters: number | null;

  supportsImages: boolean;
  supportsVideo: boolean;
}

/* Represents the result of validating prepared social content. */
export interface SocialContentValidation {
  valid: boolean;
  characterCount: number;
  maxCharacters: number | null;
  remainingCharacters: number | null;
  errors: string[];
  warnings: string[];
}

/* Represents a CloudTweak social post stored before Buffer delivery. */
export interface SocialPost {
  id: string;
  campaign_id: string | null;

  blog_post_id: string | null;
  source_type: SocialPostSource;

  title: string | null;

  buffer_channel_id: string;
  channel_name: string | null;
  platform: SocialPlatform;

  caption: string;
  character_count: number;

  media_url: string | null;
  media_type: SocialMediaType | null;

  status: SocialPostStatus;

  buffer_post_id: string | null;
  buffer_status: string | null;

  scheduled_for: string | null;
  queued_at: string | null;
  published_at: string | null;

  external_url: string | null;

  error_message: string | null;
  retry_count: number;
  last_attempt_at: string | null;

  metrics: Record<string, number | string | null>;
  metrics_updated_at: string | null;

  created_at: string;
  updated_at: string;
}

/* Defines the information required to create a social post before Buffer delivery. */
export interface CreateSocialPostInput {
  blogPostId?: string | null;
  sourceType: SocialPostSource;
  campaignId: string | null;

  title?: string | null;

  channelId: string;
  channelName?: string | null;
  platform: SocialPlatform;

  caption: string;

  mediaUrl?: string | null;
  mediaType?: SocialMediaType | null;

  status?: "draft" | "ready";
}

/* Defines the information required by the social publishing service. */
export interface SocialPublishRequest {
  socialPostId: string;
  channelId: string;
  platform: SocialPlatform;
  text: string;
  mediaUrl?: string | null;
}

/* Represents a successful delivery-provider response. */
export interface SocialPublishResult {
  provider: "buffer";
  providerPostId: string;

  status: string;
  scheduledFor: string | null;

  externalUrl: string | null;
}

/* Represents one destination belonging to a grouped social campaign. */
export interface SocialCampaignDestination {
  socialPostId: string;
  channelId: string;
  channelName: string | null;
  platform: SocialPlatform;
  status: SocialPostStatus;
  externalUrl: string | null;
  bufferPostId: string | null;
  errorMessage: string | null;
}

/* Represents the aggregate lifecycle state displayed for a social campaign. */
export type SocialCampaignStatus =
  SocialPostStatus | "partial_failure" | "in_progress";

/* Represents one campaign-level record displayed in the social dashboard. */
export interface SocialCampaignListItem {
  key: string;
  campaignId: string | null;
  legacyPostId: string | null;

  title: string | null;
  caption: string;
  sourceType: SocialPostSource;

  status: SocialCampaignStatus;

  destinations: SocialCampaignDestination[];
  destinationCount: number;

  createdAt: string;
  scheduledFor: string | null;
  publishedAt: string | null;
}
