import type { APIRoute } from "astro";
import {
  archiveProcurementFollowUp,
  updateProcurementFollowUp,
  updateProcurementFollowUpStatus,
} from "../../../../../lib/procurement";
import type {
  ProcurementFollowUpStatus,
  UpdateProcurementFollowUpInput,
} from "../../../../../types/procurement";

/**
 * Updates or performs an action against a procurement follow-up.
 */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Follow-up ID is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "archive") {
      const followUp = await archiveProcurementFollowUp(id);

      return new Response(
        JSON.stringify({
          success: true,
          data: followUp,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (body.action === "status") {
      const status = body.status as ProcurementFollowUpStatus;

      if (!status) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Status is required.",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      const followUp = await updateProcurementFollowUpStatus(id, status);

      return new Response(
        JSON.stringify({
          success: true,
          data: followUp,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const followUp = await updateProcurementFollowUp({
      ...(body as Omit<UpdateProcurementFollowUpInput, "id">),
      id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: followUp,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to update procurement follow-up:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update procurement follow-up.",
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
