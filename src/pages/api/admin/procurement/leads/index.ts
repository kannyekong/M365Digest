import type { APIRoute } from "astro";
import {
  createProcurementLead,
  getProcurementLeads,
} from "../../../../../lib/procurement";
import type {
  CreateProcurementLeadInput,
  ProcurementLeadFilters,
} from "../../../../../types/procurement";

/**
 * Returns a JSON response using the procurement API response format.
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
 * Reads and validates the requested procurement lead filters.
 */
function getLeadFilters(url: URL): ProcurementLeadFilters {
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("page_size") ?? "25");

  return {
    search: url.searchParams.get("search") ?? undefined,
    status:
      (url.searchParams.get("status") as ProcurementLeadFilters["status"]) ??
      undefined,
    priority:
      (url.searchParams.get(
        "priority"
      ) as ProcurementLeadFilters["priority"]) ?? undefined,
    source:
      (url.searchParams.get("source") as ProcurementLeadFilters["source"]) ??
      undefined,
    assigned_to: url.searchParams.get("assigned_to") ?? undefined,
    client_id: url.searchParams.get("client_id") ?? undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    page_size: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
  };
}

/**
 * Handles procurement lead retrieval.
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const filters = getLeadFilters(url);
    const result = await getProcurementLeads(filters);

    return jsonResponse({
      success: true,
      data: result.data,
      total: result.total,
      page: filters.page,
      page_size: filters.page_size,
    });
  } catch (error) {
    console.error("Procurement leads GET error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve procurement leads.",
      },
      500
    );
  }
};

/**
 * Handles procurement lead creation.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as CreateProcurementLeadInput;

    if (!body.title?.trim()) {
      return jsonResponse(
        {
          success: false,
          error: "Lead title is required.",
        },
        400
      );
    }

    if (!body.source) {
      return jsonResponse(
        {
          success: false,
          error: "Lead source is required.",
        },
        400
      );
    }

    const lead = await createProcurementLead(body);

    return jsonResponse(
      {
        success: true,
        data: lead,
      },
      201
    );
  } catch (error) {
    console.error("Procurement leads POST error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create procurement lead.",
      },
      500
    );
  }
};
