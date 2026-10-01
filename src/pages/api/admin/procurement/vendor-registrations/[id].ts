import type { APIRoute } from "astro";
import {
  archiveVendorRegistration,
  updateVendorRegistration,
} from "../../../../../lib/procurement";
import type { UpdateVendorRegistrationInput } from "../../../../../types/procurement";

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
 * Updates a vendor registration.
 */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: "Registration ID is required.",
        },
        400
      );
    }

    const body = (await request.json()) as Omit<
      UpdateVendorRegistrationInput,
      "id"
    >;

    const registration = await updateVendorRegistration({
      ...body,
      id,
    });

    return jsonResponse({
      success: true,
      data: registration,
    });
  } catch (error) {
    console.error("Vendor registration PATCH error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update vendor registration.",
      },
      500
    );
  }
};

/**
 * Archives a vendor registration.
 */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = params.id;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: "Registration ID is required.",
        },
        400
      );
    }

    await archiveVendorRegistration(id);

    return jsonResponse({
      success: true,
      message: "Vendor registration archived successfully.",
    });
  } catch (error) {
    console.error("Vendor registration DELETE error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to archive vendor registration.",
      },
      500
    );
  }
};
