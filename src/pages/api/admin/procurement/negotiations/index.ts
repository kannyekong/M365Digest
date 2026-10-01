import type { APIRoute } from "astro";
import {
  createProcurementNegotiation,
  getProcurementNegotiations,
} from "../../../../../lib/procurement";

/**
 * Returns the procurement negotiations matching the supplied filters.
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("page_size") ?? "20");

    const result = await getProcurementNegotiations({
      page,
      page_size: pageSize,
      search: url.searchParams.get("search") || undefined,
      status:
        (url.searchParams.get("status") as
          | "not_started"
          | "active"
          | "client_review"
          | "counter_offer"
          | "internal_approval"
          | "agreed"
          | "contract"
          | "closed"
          | "cancelled"
          | null) ?? undefined,
      priority:
        (url.searchParams.get("priority") as
          "low" | "medium" | "high" | "urgent" | null) ?? undefined,
      client_id: url.searchParams.get("client_id") || undefined,
      opportunity_id: url.searchParams.get("opportunity_id") || undefined,
      proposal_id: url.searchParams.get("proposal_id") || undefined,
      assigned_to: url.searchParams.get("assigned_to") || undefined,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: result.data,
        count: result.count,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to retrieve procurement negotiations:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve procurement negotiations.",
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

/**
 * Creates a new procurement negotiation.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (!body.client_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Client is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!body.title?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Negotiation title is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const negotiation = await createProcurementNegotiation(body);

    return new Response(
      JSON.stringify({
        success: true,
        data: negotiation,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to create procurement negotiation:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create procurement negotiation.",
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
