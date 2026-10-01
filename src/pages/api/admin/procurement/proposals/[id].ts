import type { APIRoute } from "astro";
import {
  archiveProcurementProposal,
  createProcurementProposalVersion,
  updateProcurementProposal,
  updateProcurementProposalStatus,
} from "../../../../../lib/procurement";

// Handles updates, status changes, version creation and archiving.
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Proposal ID is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body = await request.json();

    // Archives the proposal.
    if (body.action === "archive") {
      await archiveProcurementProposal(id);

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

    // Changes the proposal lifecycle status.
    if (body.action === "status") {
      if (!body.status) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Proposal status is required.",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      const proposal = await updateProcurementProposalStatus(id, body.status);

      return new Response(
        JSON.stringify({
          success: true,
          data: proposal,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Creates a new revision while preserving the previous version.
    if (body.action === "create_version") {
      const { action: _action, ...changes } = body;

      const proposal = await createProcurementProposalVersion(id, changes);

      return new Response(
        JSON.stringify({
          success: true,
          data: proposal,
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Updates the existing proposal.
    const proposal = await updateProcurementProposal({
      ...body,
      id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: proposal,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to update procurement proposal:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update procurement proposal.",
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
