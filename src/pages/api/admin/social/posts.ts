import type { APIRoute } from "astro";
import { createSupabaseAdminClient } from "../../../../lib/supabase/server";
import { getSocialCampaigns } from "../../../../lib/social/social-repository";

import type {
  SocialPostSource,
  SocialPostStatus,
} from "../../../../lib/social/social-types";

const VALID_STATUSES = new Set<SocialPostStatus>([
  "draft",
  "ready",
  "queueing",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "cancelled",
]);

const VALID_SOURCES = new Set<SocialPostSource>(["blog", "campaign"]);

/* Safely converts a URL parameter into a positive integer. */
function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/* Validates a requested social-post lifecycle status. */
function parseStatus(value: string | null): SocialPostStatus | undefined {
  if (value && VALID_STATUSES.has(value as SocialPostStatus)) {
    return value as SocialPostStatus;
  }

  return undefined;
}

/* Validates a requested social-post source. */
function parseSource(value: string | null): SocialPostSource | undefined {
  if (value && VALID_SOURCES.has(value as SocialPostSource)) {
    return value as SocialPostSource;
  }

  return undefined;
}

/* Returns paginated CloudTweak social posts for the admin dashboard. */
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);

    const page = parsePositiveInteger(url.searchParams.get("page"), 1);

    const pageSize = Math.min(
      parsePositiveInteger(url.searchParams.get("pageSize"), 10),
      50
    );

    const search = url.searchParams.get("search")?.trim() || undefined;

    const platform = url.searchParams.get("platform")?.trim() || undefined;

    const status = parseStatus(url.searchParams.get("status"));

    const sourceType = parseSource(url.searchParams.get("sourceType"));

    const supabase = createSupabaseAdminClient();

    const result = await getSocialCampaigns(
      supabase,
      {
        search,
        platform,
        status,
        sourceType,
      },
      {
        page,
        pageSize,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to retrieve social posts:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve social posts.",
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
