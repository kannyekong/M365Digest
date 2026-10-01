import type { APIRoute } from "astro";
import {
  archiveProcurementCompany,
  updateProcurementCompany,
} from "../../../../../lib/procurement";

/**
 * Updates or archives a procurement company.
 */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Company ID is required.",
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
      const result = await archiveProcurementCompany(id);

      return new Response(
        JSON.stringify({
          success: true,
          data: result,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const result = await updateProcurementCompany({
      id,
      ...body,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to update procurement company:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Unable to update company.",
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
