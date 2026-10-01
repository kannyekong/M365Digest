import type { APIRoute } from "astro";
import { createProcurementContractFromNegotiation } from "../../../../../../lib/procurement";

/**
 * Creates or retrieves the active contract associated with a negotiation.
 *
 * The operation is intentionally idempotent so repeated clicks do not
 * create duplicate active contracts for the same negotiation.
 */
export const POST: APIRoute = async ({ params, request }) => {
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

  try {
    let staffId: string | null = null;

    try {
      const body = await request.json();

      if (body && typeof body.staff_id === "string") {
        staffId = body.staff_id;
      }
    } catch {
      // An empty request body is valid for this endpoint.
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
      "Failed to create contract from procurement negotiation:",
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
