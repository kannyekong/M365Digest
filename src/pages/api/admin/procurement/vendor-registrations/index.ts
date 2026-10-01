import type { APIRoute } from "astro";
import {
  createVendorRegistration,
  getVendorRegistrations,
} from "../../../../../lib/procurement";
import type {
  CreateVendorRegistrationInput,
  VendorRegistrationFilters,
} from "../../../../../types/procurement";

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
 * Reads vendor registration filters from the request URL.
 */
function getRegistrationFilters(url: URL): VendorRegistrationFilters {
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("page_size") ?? "25");

  return {
    search: url.searchParams.get("search") ?? undefined,
    status:
      (url.searchParams.get("status") as VendorRegistrationFilters["status"]) ??
      undefined,
    client_id: url.searchParams.get("client_id") ?? undefined,
    portal_id: url.searchParams.get("portal_id") ?? undefined,
    assigned_to: url.searchParams.get("assigned_to") ?? undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    page_size: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
  };
}

/**
 * Retrieves vendor registrations.
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const result = await getVendorRegistrations(getRegistrationFilters(url));

    return jsonResponse({
      success: true,
      data: result.data,
      total: result.total,
    });
  } catch (error) {
    console.error("Vendor registrations GET error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve vendor registrations.",
      },
      500
    );
  }
};

/**
 * Creates a vendor registration.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as CreateVendorRegistrationInput;

    if (!body.client_id) {
      return jsonResponse(
        {
          success: false,
          error: "Organisation is required.",
        },
        400
      );
    }

    const registration = await createVendorRegistration(body);

    return jsonResponse(
      {
        success: true,
        data: registration,
      },
      201
    );
  } catch (error) {
    console.error("Vendor registrations POST error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create vendor registration.",
      },
      500
    );
  }
};
