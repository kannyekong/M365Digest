import type { APIRoute } from "astro";
import {
  createProcurementFollowUp,
  getProcurementFollowUps,
} from "../../../../../lib/procurement";
import type {
  CreateProcurementFollowUpInput,
  ProcurementFollowUpActivityType,
  ProcurementFollowUpPriority,
  ProcurementFollowUpStatus,
} from "../../../../../types/procurement";

/**
 * Returns procurement follow-ups using the supplied filters.
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("page_size") ?? "20");

    const result = await getProcurementFollowUps({
      search: url.searchParams.get("search") || undefined,
      activity_type:
        (url.searchParams.get(
          "activity_type"
        ) as ProcurementFollowUpActivityType) || undefined,
      status:
        (url.searchParams.get("status") as ProcurementFollowUpStatus) ||
        undefined,
      priority:
        (url.searchParams.get("priority") as ProcurementFollowUpPriority) ||
        undefined,
      client_id: url.searchParams.get("client_id") || undefined,
      assigned_to: url.searchParams.get("assigned_to") || undefined,
      lead_id: url.searchParams.get("lead_id") || undefined,
      opportunity_id: url.searchParams.get("opportunity_id") || undefined,
      vendor_registration_id:
        url.searchParams.get("vendor_registration_id") || undefined,
      rfq_id: url.searchParams.get("rfq_id") || undefined,
      proposal_id: url.searchParams.get("proposal_id") || undefined,
      negotiation_id: url.searchParams.get("negotiation_id") || undefined,
      contract_id: url.searchParams.get("contract_id") || undefined,
      due_from: url.searchParams.get("due_from") || undefined,
      due_to: url.searchParams.get("due_to") || undefined,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      page_size:
        Number.isFinite(pageSize) && pageSize > 0
          ? Math.min(pageSize, 100)
          : 20,
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
    console.error("Failed to fetch procurement follow-ups:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch procurement follow-ups.",
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
 * Creates a new procurement follow-up.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body =
      (await request.json()) as Partial<CreateProcurementFollowUpInput>;

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

    if (!body.subject?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Follow-up subject is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const followUp = await createProcurementFollowUp({
      ...body,
      client_id: body.client_id,
      subject: body.subject.trim(),
    } as CreateProcurementFollowUpInput);

    return new Response(
      JSON.stringify({
        success: true,
        data: followUp,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to create procurement follow-up:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create procurement follow-up.",
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
