import type { APIRoute } from "astro";
import {
  createProcurementOpportunity,
  getProcurementOpportunities,
} from "../../../../../lib/procurement";
import type {
  CreateProcurementOpportunityInput,
  ProcurementOpportunityFilters,
} from "../../../../../types/procurement";

/**
 * Returns a consistent JSON response for procurement API requests.
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
 * Reads procurement opportunity filters from the request URL.
 */
function getOpportunityFilters(url: URL): ProcurementOpportunityFilters {
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("page_size") ?? "25");

  return {
    search: url.searchParams.get("search") ?? undefined,
    stage:
      (url.searchParams.get(
        "stage"
      ) as ProcurementOpportunityFilters["stage"]) ?? undefined,
    status:
      (url.searchParams.get(
        "status"
      ) as ProcurementOpportunityFilters["status"]) ?? undefined,
    assigned_to: url.searchParams.get("assigned_to") ?? undefined,
    client_id: url.searchParams.get("client_id") ?? undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    page_size: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
  };
}

/**
 * Retrieves procurement opportunities using the supplied filters.
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const filters = getOpportunityFilters(url);
    const result = await getProcurementOpportunities(filters);

    return jsonResponse({
      success: true,
      data: result.data,
      total: result.total,
      page: filters.page,
      page_size: filters.page_size,
    });
  } catch (error) {
    console.error("Procurement opportunities GET error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve procurement opportunities.",
      },
      500
    );
  }
};

/**
 * Creates a new procurement opportunity.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as CreateProcurementOpportunityInput;

    if (!body.client_id) {
      return jsonResponse(
        {
          success: false,
          error: "Client is required.",
        },
        400
      );
    }

    if (!body.name?.trim()) {
      return jsonResponse(
        {
          success: false,
          error: "Opportunity name is required.",
        },
        400
      );
    }

    const opportunity = await createProcurementOpportunity(body);

    return jsonResponse(
      {
        success: true,
        data: opportunity,
      },
      201
    );
  } catch (error) {
    console.error("Procurement opportunities POST error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create procurement opportunity.",
      },
      500
    );
  }
};
