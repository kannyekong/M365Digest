import type {
  SocialContentValidation,
  SocialPlatform,
  SocialPlatformConfig,
} from "./social-types";

/* Stores CloudTweak's platform-level social publishing configuration. */
export const SOCIAL_PLATFORM_CONFIG: Record<
  SocialPlatform,
  SocialPlatformConfig
> = {
  linkedin: {
    platform: "linkedin",
    label: "LinkedIn",
    maxCharacters: 3000,
    supportsImages: true,
    supportsVideo: true,
  },

  twitter: {
    platform: "twitter",
    label: "X",
    maxCharacters: 280,
    supportsImages: true,
    supportsVideo: true,
  },

  facebook: {
    platform: "facebook",
    label: "Facebook",
    maxCharacters: null,
    supportsImages: true,
    supportsVideo: true,
  },

  instagram: {
    platform: "instagram",
    label: "Instagram",
    maxCharacters: 2200,
    supportsImages: true,
    supportsVideo: true,
  },

  threads: {
    platform: "threads",
    label: "Threads",
    maxCharacters: 500,
    supportsImages: true,
    supportsVideo: true,
  },

  tiktok: {
    platform: "tiktok",
    label: "TikTok",
    maxCharacters: null,
    supportsImages: true,
    supportsVideo: true,
  },

  youtube: {
    platform: "youtube",
    label: "YouTube",
    maxCharacters: null,
    supportsImages: false,
    supportsVideo: true,
  },

  pinterest: {
    platform: "pinterest",
    label: "Pinterest",
    maxCharacters: null,
    supportsImages: true,
    supportsVideo: true,
  },

  bluesky: {
    platform: "bluesky",
    label: "Bluesky",
    maxCharacters: 300,
    supportsImages: true,
    supportsVideo: true,
  },

  mastodon: {
    platform: "mastodon",
    label: "Mastodon",
    maxCharacters: null,
    supportsImages: true,
    supportsVideo: true,
  },

  googlebusiness: {
    platform: "googlebusiness",
    label: "Google Business Profile",
    maxCharacters: null,
    supportsImages: true,
    supportsVideo: false,
  },
};

/* Returns the publishing configuration for a supported social platform. */
export function getSocialPlatformConfig(platform: SocialPlatform) {
  return SOCIAL_PLATFORM_CONFIG[platform];
}

/* Counts Unicode code points for basic social-content validation. */
export function countSocialCharacters(content: string) {
  return Array.from(content).length;
}

/* Validates prepared social content against CloudTweak's platform configuration. */
export function validateSocialContent(
  platform: SocialPlatform,
  content: string
): SocialContentValidation {
  const config = getSocialPlatformConfig(platform);

  const characterCount = countSocialCharacters(content);

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content.trim()) {
    errors.push("Social post content cannot be empty.");
  }

  if (config.maxCharacters !== null && characterCount > config.maxCharacters) {
    errors.push(
      `${config.label} content exceeds the configured ${config.maxCharacters}-character limit.`
    );
  }

  const remainingCharacters =
    config.maxCharacters === null
      ? null
      : config.maxCharacters - characterCount;

  if (
    remainingCharacters !== null &&
    remainingCharacters >= 0 &&
    remainingCharacters <= 25
  ) {
    warnings.push(
      `${remainingCharacters} characters remaining for ${config.label}.`
    );
  }

  return {
    valid: errors.length === 0,
    characterCount,
    maxCharacters: config.maxCharacters,
    remainingCharacters,
    errors,
    warnings,
  };
}

/* Converts a Buffer service identifier into CloudTweak's platform type. */
export function normalizeBufferPlatform(
  service: string
): SocialPlatform | null {
  const normalizedService = service.trim().toLowerCase();

  const platformMap: Record<string, SocialPlatform> = {
    linkedin: "linkedin",
    twitter: "twitter",
    x: "twitter",
    facebook: "facebook",
    instagram: "instagram",
    threads: "threads",
    tiktok: "tiktok",
    youtube: "youtube",
    pinterest: "pinterest",
    bluesky: "bluesky",
    mastodon: "mastodon",
    googlebusiness: "googlebusiness",
    google_business: "googlebusiness",
  };

  return platformMap[normalizedService] ?? null;
}
