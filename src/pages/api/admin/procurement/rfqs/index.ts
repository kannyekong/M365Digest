import type { APIRoute } from "astro";
import {
  createProcurementRfq,
  getProcurementRfqs,
} from "../../../../../lib/procurement";

// Handles RFQ/RFP list retrieval and creation.
export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = url.searchParams;

    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("page_size") ?? "20");

    const result = await getProcurementRfqs({
      search: searchParams.get("search") ?? undefined,
      request_type:
        (searchParams.get("request_type") as "rfq" | "rfp" | "tender" | null) ??
        undefined,
      status:
        (searchParams.get("status") as
          | "received"
          | "reviewing"
          | "qualification"
          | "preparing"
          | "submitted"
          | "under_evaluation"
          | "clarification"
          | "awarded"
          | "not_awarded"
          | "cancelled"
          | "expired"
          | null) ?? undefined,
      priority:
        (searchParams.get("priority") as
          "low" | "medium" | "high" | "urgent" | null) ?? undefined,
      client_id: searchParams.get("client_id") ?? undefined,
      opportunity_id: searchParams.get("opportunity_id") ?? undefined,
      assigned_to: searchParams.get("assigned_to") ?? undefined,
      portal_id: searchParams.get("portal_id") ?? undefined,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      page_size: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: result.data,
        count: result.count,
        page,
        page_size: pageSize,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to retrieve procurement RFQs:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve procurement RFQs.",
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

// Creates a new RFQ/RFP.
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const rfq = await createProcurementRfq(body);

    return new Response(
      JSON.stringify({
        success: true,
        data: rfq,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to create procurement RFQ:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create procurement RFQ.",
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
