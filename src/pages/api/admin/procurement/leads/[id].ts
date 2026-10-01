import type { APIRoute } from "astro";
import {
  archiveProcurementLead,
  getProcurementLead,
  updateProcurementLead,
} from "../../../../../lib/procurement";
import type { UpdateProcurementLeadInput } from "../../../../../types/procurement";

/**
 * Returns a consistent JSON response for procurement requests.
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
 * Retrieves a single procurement lead.
 */
export const GET: APIRoute = async ({ params }) => {
  try {
    const id = params.id;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: "Lead ID is required.",
        },
        400
      );
    }

    const lead = await getProcurementLead(id);

    if (!lead) {
      return jsonResponse(
        {
          success: false,
          error: "Procurement lead not found.",
        },
        404
      );
    }

    return jsonResponse({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Procurement lead GET error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve procurement lead.",
      },
      500
    );
  }
};

/**
 * Updates an existing procurement lead.
 */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: "Lead ID is required.",
        },
        400
      );
    }

    const body = (await request.json()) as Omit<
      UpdateProcurementLeadInput,
      "id"
    >;

    const lead = await updateProcurementLead({
      ...body,
      id,
    });

    return jsonResponse({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Procurement lead PATCH error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update procurement lead.",
      },
      500
    );
  }
};

/**
 * Archives an existing procurement lead.
 */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = params.id;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: "Lead ID is required.",
        },
        400
      );
    }

    await archiveProcurementLead(id);

    return jsonResponse({
      success: true,
      message: "Procurement lead archived successfully.",
    });
  } catch (error) {
    console.error("Procurement lead DELETE error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to archive procurement lead.",
      },
      500
    );
  }
};
