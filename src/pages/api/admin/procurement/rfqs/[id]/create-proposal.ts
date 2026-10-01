import type { APIRoute } from "astro";

import { createProcurementProposal } from "../../../../../../lib/procurement";
import { createSupabaseAdminClient } from "../../../../../../lib/supabase/server";

/**
 * Creates a draft proposal from an RFQ.
 *
 * If the RFQ already has an active proposal, the existing proposal
 * is returned instead of creating a duplicate.
 */
export const POST: APIRoute = async ({ params }) => {
  const rfqId = params.id;

  if (!rfqId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "RFQ ID is required.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const supabase = createSupabaseAdminClient();

  /*
   * Check whether this RFQ already has an active proposal.
   * This makes repeated button clicks safe.
   */
  const { data: existingProposal, error: existingProposalError } =
    await supabase
      .from("procurement_proposals")
      .select("*")
      .eq("rfq_id", rfqId)
      .is("archived_at", null)
      .maybeSingle();

  if (existingProposalError) {
    return new Response(
      JSON.stringify({
        success: false,
        error: existingProposalError.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  if (existingProposal) {
    return new Response(
      JSON.stringify({
        success: true,
        data: existingProposal,
        existing: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /*
   * Load the RFQ that will become the foundation of the proposal.
   */
  const { data: rfq, error: rfqError } = await supabase
    .from("procurement_rfqs")
    .select("*")
    .eq("id", rfqId)
    .is("archived_at", null)
    .single();

  if (rfqError || !rfq) {
    return new Response(
      JSON.stringify({
        success: false,
        error: rfqError?.message ?? "RFQ not found.",
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /*
   * Create the initial draft proposal using information already
   * captured on the RFQ.
   */
  try {
    const proposal = await createProcurementProposal({
      client_id: rfq.client_id,
      opportunity_id: rfq.opportunity_id ?? null,
      rfq_id: rfq.id,
      contact_id: rfq.contact_id ?? null,
      assigned_to: rfq.assigned_to ?? null,
      title: rfq.title,
      status: "draft",
      quoted_value: rfq.estimated_value ?? null,
      currency: rfq.currency ?? "NGN",
      expected_decision_date: rfq.evaluation_date ?? null,
      executive_summary: rfq.description ?? null,
      submission_instructions: rfq.submission_instructions ?? null,
      internal_notes: rfq.notes ?? null,
      requirements: rfq.requirements ?? [],
      source_reference: rfq.source_reference ?? null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: proposal,
        existing: false,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    /*
     * A concurrent request may have created the proposal after
     * the initial existence check. The unique index protects the
     * database; this fallback returns the proposal that won the race.
     */
    const message =
      error instanceof Error ? error.message : "Unable to create proposal.";

    const { data: concurrentProposal } = await supabase
      .from("procurement_proposals")
      .select("*")
      .eq("rfq_id", rfqId)
      .is("archived_at", null)
      .maybeSingle();

    if (concurrentProposal) {
      return new Response(
        JSON.stringify({
          success: true,
          data: concurrentProposal,
          existing: true,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
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
