import type { APIRoute } from "astro";
import { getProcurementReport } from "../../../../lib/procurement";

/**
 * Returns the aggregated procurement reporting data.
 */
export const GET: APIRoute = async () => {
  try {
    const report = await getProcurementReport();

    return new Response(
      JSON.stringify({
        success: true,
        data: report,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to load procurement report:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load procurement report.",
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
