import type { APIRoute } from "astro";
import {
  createProcurementPortal,
  getProcurementPortals,
} from "../../../../../lib/procurement";
import type {
  CreateProcurementPortalInput,
  ProcurementPortalFilters,
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
 * Reads procurement portal filters from the request URL.
 */
function getPortalFilters(url: URL): ProcurementPortalFilters {
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("page_size") ?? "25");

  const activeParam = url.searchParams.get("active");

  return {
    search: url.searchParams.get("search") ?? undefined,
    portal_type:
      (url.searchParams.get(
        "portal_type"
      ) as ProcurementPortalFilters["portal_type"]) ?? undefined,
    active: activeParam === null ? undefined : activeParam === "true",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    page_size: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
  };
}

/**
 * Retrieves procurement portals.
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const result = await getProcurementPortals(getPortalFilters(url));

    return jsonResponse({
      success: true,
      data: result.data,
      total: result.total,
    });
  } catch (error) {
    console.error("Procurement portals GET error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve procurement portals.",
      },
      500
    );
  }
};

/**
 * Creates a procurement portal.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as CreateProcurementPortalInput;

    if (!body.name?.trim()) {
      return jsonResponse(
        {
          success: false,
          error: "Portal name is required.",
        },
        400
      );
    }

    if (!body.organisation_name?.trim()) {
      return jsonResponse(
        {
          success: false,
          error: "Organisation name is required.",
        },
        400
      );
    }

    const portal = await createProcurementPortal(body);

    return jsonResponse(
      {
        success: true,
        data: portal,
      },
      201
    );
  } catch (error) {
    console.error("Procurement portals POST error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create procurement portal.",
      },
      500
    );
  }
};
