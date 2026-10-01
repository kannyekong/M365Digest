import type { APIRoute } from "astro";
import {
  archiveProcurementContact,
  updateProcurementContact,
} from "../../../../../lib/procurement";

/**
 * Updates or archives a procurement contact.
 */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Contact ID is required.",
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
      await archiveProcurementContact(id);

      return new Response(
        JSON.stringify({
          success: true,
          data: true,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const contact = await updateProcurementContact({
      id,
      ...body,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: contact,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to update procurement contact:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update procurement contact.",
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
