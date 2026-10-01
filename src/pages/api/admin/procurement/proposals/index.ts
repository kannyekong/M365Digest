import type { APIRoute } from "astro";
import {
  createProcurementProposal,
  getProcurementProposals,
} from "../../../../../lib/procurement";

// Handles procurement proposal listing and creation.
export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = url.searchParams;

    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("page_size") ?? "20");

    const result = await getProcurementProposals({
      search: searchParams.get("search") ?? undefined,

      status:
        (searchParams.get("status") as
          | "draft"
          | "internal_review"
          | "approved"
          | "submitted"
          | "under_evaluation"
          | "clarification"
          | "negotiation"
          | "accepted"
          | "rejected"
          | "expired"
          | "cancelled"
          | null) ?? undefined,

      client_id: searchParams.get("client_id") ?? undefined,

      opportunity_id: searchParams.get("opportunity_id") ?? undefined,

      rfq_id: searchParams.get("rfq_id") ?? undefined,

      assigned_to: searchParams.get("assigned_to") ?? undefined,

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
    console.error("Failed to retrieve procurement proposals:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve procurement proposals.",
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

// Creates a new procurement proposal.
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const proposal = await createProcurementProposal(body);

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
  } catch (error) {
    console.error("Failed to create procurement proposal:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create procurement proposal.",
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
