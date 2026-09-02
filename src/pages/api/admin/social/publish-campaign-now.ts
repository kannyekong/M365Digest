import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../../lib/supabase/server";

import { deliverSocialCampaign } from "../../../../lib/social/social-campaign-publisher";

interface CampaignRequest {
  campaignId: string;
}

/* Immediately publishes every eligible destination belonging to a campaign. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as CampaignRequest;

    const campaignId = body.campaignId?.trim();

    if (!campaignId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "A campaign ID is required.",
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

    const result = await deliverSocialCampaign(supabase, campaignId, "publish");

    return new Response(JSON.stringify(result), {
      status: result.summary.failed === result.summary.total ? 502 : 200,

      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Unable to publish social campaign:", error);

    return new Response(
      JSON.stringify({
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to publish social campaign.",
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
