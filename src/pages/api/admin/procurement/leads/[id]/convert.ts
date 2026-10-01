import type { APIRoute } from "astro";
import {
  convertLeadToOpportunity,
  getProcurementLead,
} from "../../../../../../lib/procurement";
import type { CreateProcurementOpportunityInput } from "../../../../../../types/procurement";

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
 * Converts a procurement lead into an opportunity.
 */
export const POST: APIRoute = async ({ params, request }) => {
  try {
    const leadId = params.id;

    if (!leadId) {
      return jsonResponse(
        {
          success: false,
          error: "Lead ID is required.",
        },
        400
      );
    }

    const lead = await getProcurementLead(leadId);

    if (!lead) {
      return jsonResponse(
        {
          success: false,
          error: "Procurement lead not found.",
        },
        404
      );
    }

    if (!lead.client_id) {
      return jsonResponse(
        {
          success: false,
          error:
            "This lead cannot be converted because it is not associated with an organisation.",
        },
        400
      );
    }

    if (lead.status === "converted") {
      return jsonResponse(
        {
          success: false,
          error: "This lead has already been converted.",
        },
        409
      );
    }

    if (lead.status === "lost" || lead.status === "unqualified") {
      return jsonResponse(
        {
          success: false,
          error:
            "Lost or unqualified leads cannot be converted into opportunities.",
        },
        400
      );
    }

    let body: Partial<CreateProcurementOpportunityInput> = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const opportunity = await convertLeadToOpportunity(leadId, {
      client_id: lead.client_id,
      primary_contact_id: body.primary_contact_id ?? lead.contact_id,
      assigned_to: body.assigned_to ?? lead.assigned_to,
      name: body.name?.trim() || lead.title,
      description: body.description ?? lead.description,
      stage: body.stage ?? "qualified",
      status: body.status ?? "open",
      service_type: body.service_type ?? lead.service_interest,
      source: body.source ?? lead.source,
      estimated_value: body.estimated_value ?? lead.estimated_value,
      currency: body.currency ?? lead.currency,
      probability: body.probability ?? 20,
      expected_close_date: body.expected_close_date ?? null,
      vendor_registration_required: body.vendor_registration_required ?? false,
      rfq_required: body.rfq_required ?? false,
      notes: body.notes ?? lead.notes,
    });

    return jsonResponse(
      {
        success: true,
        message: "Lead converted into an opportunity successfully.",
        data: opportunity,
      },
      201
    );
  } catch (error) {
    console.error("Procurement lead conversion error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to convert procurement lead.",
      },
      500
    );
  }
};
