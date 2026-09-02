import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../../lib/supabase/server";

import { retryFailedSocialCampaign } from "../../../../lib/social/social-campaign-retry";

interface RetryCampaignRequest {
  campaignId?: string;
}

/* Retries only failed destinations belonging to a social campaign. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as RetryCampaignRequest;

    const campaignId = body.campaignId?.trim();

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

    const result = await retryFailedSocialCampaign(supabase, campaignId);

    /*
     * A partial retry is still a successfully processed API request.
     * The response tells the UI which destinations remain failed.
     */
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to retry failed social destinations.";

    const status =
      message === "Social campaign could not be found." ? 404 : 500;

    return new Response(
      JSON.stringify({
        success: false,
        partialSuccess: false,
        error: message,
      }),
      {
        status,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
