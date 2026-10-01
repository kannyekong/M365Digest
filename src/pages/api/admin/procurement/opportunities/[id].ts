import type { APIRoute } from "astro";
import {
  archiveProcurementOpportunity,
  getProcurementOpportunity,
  updateProcurementOpportunity,
} from "../../../../../lib/procurement";
import type { UpdateProcurementOpportunityInput } from "../../../../../types/procurement";

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
 * Retrieves a single procurement opportunity.
 */
export const GET: APIRoute = async ({ params }) => {
  try {
    const id = params.id;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: "Opportunity ID is required.",
        },
        400
      );
    }

    const opportunity = await getProcurementOpportunity(id);

    if (!opportunity) {
      return jsonResponse(
        {
          success: false,
          error: "Procurement opportunity not found.",
        },
        404
      );
    }

    return jsonResponse({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    console.error("Procurement opportunity GET error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve procurement opportunity.",
      },
      500
    );
  }
};

/**
 * Updates an existing procurement opportunity.
 */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: "Opportunity ID is required.",
        },
        400
      );
    }

    const body = (await request.json()) as Omit<
      UpdateProcurementOpportunityInput,
      "id"
    >;

    const opportunity = await updateProcurementOpportunity({
      ...body,
      id,
    });

    return jsonResponse({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    console.error("Procurement opportunity PATCH error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update procurement opportunity.",
      },
      500
    );
  }
};

/**
 * Cancels an existing procurement opportunity.
 */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = params.id;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: "Opportunity ID is required.",
        },
        400
      );
    }

    await archiveProcurementOpportunity(id);

    return jsonResponse({
      success: true,
      message: "Procurement opportunity cancelled successfully.",
    });
  } catch (error) {
    console.error("Procurement opportunity DELETE error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to cancel procurement opportunity.",
      },
      500
    );
  }
};
