import type { APIRoute } from "astro";
import {
  archiveProcurementPortal,
  updateProcurementPortal,
} from "../../../../../lib/procurement";
import type { UpdateProcurementPortalInput } from "../../../../../types/procurement";

/**
 * Creates a consistent JSON response for procurement requests.
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
 * Updates a procurement portal.
 */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: "Portal ID is required.",
        },
        400
      );
    }

    const body = (await request.json()) as Omit<
      UpdateProcurementPortalInput,
      "id"
    >;

    const portal = await updateProcurementPortal({
      ...body,
      id,
    });

    return jsonResponse({
      success: true,
      data: portal,
    });
  } catch (error) {
    console.error("Procurement portal PATCH error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update procurement portal.",
      },
      500
    );
  }
};

/**
 * Archives a procurement portal.
 */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = params.id;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: "Portal ID is required.",
        },
        400
      );
    }

    await archiveProcurementPortal(id);

    return jsonResponse({
      success: true,
      message: "Procurement portal archived successfully.",
    });
  } catch (error) {
    console.error("Procurement portal DELETE error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to archive procurement portal.",
      },
      500
    );
  }
};
