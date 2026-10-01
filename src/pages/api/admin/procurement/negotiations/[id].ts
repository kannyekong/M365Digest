import type { APIRoute } from "astro";
import {
  archiveProcurementNegotiation,
  updateProcurementNegotiation,
  updateProcurementNegotiationStatus,
} from "../../../../../lib/procurement";
import type { ProcurementNegotiationStatus } from "../../../../../types/procurement";

/**
 * Updates or performs an action against a procurement negotiation.
 */
export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id;

  if (!id) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Negotiation ID is required.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const body = await request.json();

    /**
     * Archives the negotiation without deleting the database record.
     */
    if (body.action === "archive") {
      await archiveProcurementNegotiation(id);

      return new Response(
        JSON.stringify({
          success: true,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    /**
     * Updates only the negotiation lifecycle status.
     */
    if (body.action === "status") {
      if (!body.status) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Negotiation status is required.",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      const negotiation = await updateProcurementNegotiationStatus(
        id,
        body.status as ProcurementNegotiationStatus
      );

      return new Response(
        JSON.stringify({
          success: true,
          data: negotiation,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    /**
     * Remove the action field before passing the remaining
     * properties to the negotiation service.
     */
    const { action: _action, ...changes } = body;

    const negotiation = await updateProcurementNegotiation({
      id,
      ...changes,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: negotiation,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to update procurement negotiation:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update procurement negotiation.",
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
