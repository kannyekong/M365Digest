import type { APIRoute } from "astro";
import { createProcurementNegotiation } from "../../../../../../lib/procurement";
import { createSupabaseAdminClient } from "../../../../../../lib/supabase/server";

/**
 * Creates or retrieves the negotiation associated with a proposal.
 *
 * An existing active negotiation is returned instead of creating
 * a duplicate negotiation.
 */
export const POST: APIRoute = async ({ params }) => {
  const proposalId = params.id;

  if (!proposalId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Proposal ID is required.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const supabase = createSupabaseAdminClient();

    /**
     * Check whether this proposal already has an active negotiation.
     */
    const { data: existingNegotiation, error: existingError } = await supabase
      .from("procurement_negotiations")
      .select("*")
      .eq("proposal_id", proposalId)
      .is("archived_at", null)
      .not("status", "in", '("closed","cancelled")')
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Unable to check existing negotiation: ${existingError.message}`
      );
    }

    if (existingNegotiation) {
      return new Response(
        JSON.stringify({
          success: true,
          data: existingNegotiation,
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

    /**
     * Retrieve the proposal that will become the basis
     * of the negotiation.
     */
    const { data: proposal, error: proposalError } = await supabase
      .from("procurement_proposals")
      .select("*")
      .eq("id", proposalId)
      .is("archived_at", null)
      .single();

    if (proposalError || !proposal) {
      throw new Error(
        proposalError?.message ?? "The procurement proposal could not be found."
      );
    }

    /**
     * Create the negotiation using the proposal's
     * commercial and relationship information.
     */
    const negotiation = await createProcurementNegotiation({
      client_id: proposal.client_id,
      opportunity_id: proposal.opportunity_id ?? null,
      proposal_id: proposal.id,
      contact_id: proposal.contact_id ?? null,
      assigned_to: proposal.assigned_to ?? null,

      title: `Negotiation — ${proposal.title}`,

      status: "not_started",
      priority: "medium",

      starting_value: proposal.quoted_value ?? null,
      current_value: proposal.quoted_value ?? null,
      agreed_value: null,

      currency: proposal.currency ?? "NGN",

      negotiation_start_date: null,
      target_close_date: proposal.expected_decision_date ?? null,

      agreed_date: null,

      next_action: "Initiate client negotiation",
      next_action_at: null,

      client_requests: null,
      concessions: null,
      agreed_terms: null,
      internal_notes: null,
      outcome: null,

      requirements: [],

      metadata: {
        source: "proposal",
        proposal_version: proposal.version,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: negotiation,
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
    console.error("Failed to create proposal negotiation:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create negotiation.",
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
