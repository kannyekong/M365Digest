import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../../lib/supabase/server";
import { queueSocialPost } from "../../../../lib/social/social-publisher";

interface QueueSocialPostRequest {
  socialPostId: string;
}

/* Validates a request to queue an existing CloudTweak social post. */
function isValidRequest(value: unknown): value is QueueSocialPostRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const request = value as Record<string, unknown>;

  return (
    typeof request.socialPostId === "string" &&
    request.socialPostId.trim().length > 0
  );
}

/* Queues an existing CloudTweak social post through the configured delivery provider. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body: unknown = await request.json();

    if (!isValidRequest(body)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "A valid social post ID is required.",
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

    const result = await queueSocialPost(supabase, body.socialPostId.trim());

    return new Response(
      JSON.stringify({
        success: true,
        post: result.post,
        provider: result.provider,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to queue social post:", error);

    const message =
      error instanceof Error ? error.message : "Unable to queue social post.";

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
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
