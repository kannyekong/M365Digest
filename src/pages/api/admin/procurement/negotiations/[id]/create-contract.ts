import type { APIRoute } from "astro";
import { createProcurementContractFromNegotiation } from "../../../../../../lib/procurement";
import { createSupabaseAdminClient } from "../../../../../../lib/supabase/server";

/**
 * Creates or retrieves the procurement contract associated with a negotiation.
 *
 * This endpoint is intentionally idempotent. If an active contract already
 * exists for the negotiation, that contract is returned instead of creating
 * another one.
 */
export const POST: APIRoute = async ({ params, request }) => {
  try {
    const negotiationId = params.id;

    if (!negotiationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Negotiation ID is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    /**
     * Read the optional staff ID from the request body.
     *
     * An empty body is also valid because the service can create the
     * contract without an explicit staff ID.
     */
    let staffId: string | null = null;

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));

      staffId =
        typeof body?.staff_id === "string" && body.staff_id.trim()
          ? body.staff_id
          : null;
    }

    /**
     * Verify that the negotiation exists before attempting contract
     * creation. This also gives us a clean API response instead of an
     * unhelpful server error.
     */
    const supabase = createSupabaseAdminClient();

    const { data: negotiation, error: negotiationError } = await supabase
      .from("procurement_negotiations")
      .select("id,status,title")
      .eq("id", negotiationId)
      .is("archived_at", null)
      .maybeSingle();

    if (negotiationError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: negotiationError.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!negotiation) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "The negotiation could not be found.",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    /**
     * A contract can only be created after the negotiation has reached
     * the agreed or contract stage.
     */
    if (!["agreed", "contract"].includes(negotiation.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "A contract can only be created from an agreed or contract-stage negotiation.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const contract = await createProcurementContractFromNegotiation(
      negotiationId,
      staffId
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: contract,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Failed to create procurement contract from negotiation:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create procurement contract.",
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
