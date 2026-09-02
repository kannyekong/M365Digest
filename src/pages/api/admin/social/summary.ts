import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../../lib/supabase/server";
import { getSocialPostSummary } from "../../../../lib/social/social-repository";

/* Returns aggregate CloudTweak social publishing statistics. */
export const GET: APIRoute = async () => {
  try {
    const supabase = createSupabaseAdminClient();

    const summary = await getSocialPostSummary(supabase);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to retrieve social publishing summary:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve social publishing summary.",
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
