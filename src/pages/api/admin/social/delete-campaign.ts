import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../../lib/supabase/server";
import { deleteSocialCampaign } from "../../../../lib/social/social-repository";

interface DeleteCampaignRequest {
  campaignId?: string | null;
  socialPostId: string;
}

/* Validates a request to delete a social campaign or legacy social post. */
function isValidDeleteRequest(
  value: unknown
): value is DeleteCampaignRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const request = value as Record<string, unknown>;

  return (
    typeof request.socialPostId === "string" &&
    request.socialPostId.trim().length > 0 &&
    (request.campaignId === undefined ||
      request.campaignId === null ||
      typeof request.campaignId === "string")
  );
}

/* Deletes a campaign or individual legacy social post from CloudTweak. */
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body: unknown = await request.json();

    if (!isValidDeleteRequest(body)) {
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

    const campaignId = body.campaignId?.trim() || null;
    const socialPostId = body.socialPostId.trim();

    /*
     * Modern social posts are campaign-aware, so deleting one campaign row
     * removes every destination belonging to the same campaign.
     */
    if (campaignId) {
      const result = await deleteSocialCampaign(
        supabase,
        campaignId
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
    }

    /*
     * Legacy social posts created before campaign IDs were introduced are
     * deleted individually by their social_posts primary key.
     */
    const { data, error } = await supabase
      .from("social_posts")
      .delete()
      .eq("id", socialPostId)
      .select("id");

    if (error) {
      throw new Error(
        `Unable to delete social post: ${error.message}`
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Social post was not found.",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        socialPostId,
        deletedCount: data.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to delete social post:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete social post.",
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