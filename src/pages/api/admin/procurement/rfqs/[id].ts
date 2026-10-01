import type { APIRoute } from "astro";
import {
  archiveProcurementRfq,
  updateProcurementRfq,
  updateProcurementRfqStatus,
} from "../../../../../lib/procurement";

// Updates or archives a specific RFQ/RFP.
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "RFQ ID is required.",
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

    if (body.action === "archive") {
      await archiveProcurementRfq(id);

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

    if (body.action === "status") {
      if (!body.status) {
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

      const rfq = await updateProcurementRfqStatus(id, body.status);

      return new Response(
        JSON.stringify({
          success: true,
          data: rfq,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const rfq = await updateProcurementRfq({
      ...body,
      id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: rfq,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to update procurement RFQ:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update procurement RFQ.",
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
