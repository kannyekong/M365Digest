import type { APIRoute } from "astro";
import { getProcurementStatistics } from "../../../../lib/procurement";

/**
 * Returns a consistent JSON response for procurement API requests.
 */
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Retrieves the procurement dashboard statistics.
 */
export const GET: APIRoute = async () => {
  try {
    const statistics = await getProcurementStatistics();

    return jsonResponse({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error("Procurement statistics GET error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve procurement statistics.",
      },
      500
    );
  }
};
