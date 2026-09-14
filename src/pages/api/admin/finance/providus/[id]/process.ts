import type { APIRoute } from "astro";

import { processProvidusTransaction } from "../../../../../../lib/finance/providus/process-providus-transaction";

export const prerender = false;

/* Processes one persisted Providus transaction through the reconciliation intake workflow. */
export const POST: APIRoute = async ({ params }) => {
  try {
    const transactionId = params.id;

    if (!transactionId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Providus transaction ID is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const result = await processProvidusTransaction(transactionId);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Unable to process Providus transaction:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Unable to process Providus transaction.",
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
