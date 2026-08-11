import type { APIRoute } from "astro";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

/**
 * Archive one Client without deleting its related business records.
 */
export const POST: APIRoute = async ({ request, params }) => {
  try {
    const clientId = params.id;

    if (!clientId) {
      return financeJsonResponse(
        {
          success: false,

          message: "Client ID is required.",
        },
        400
      );
    }

    const { adminSupabase, userId } = await getFinanceApiClients(request);

    const { data: existingClient, error: existingClientError } =
      await adminSupabase
        .from("clients")
        .select(
          `
          id,
          archived_at
          `
        )
        .eq("id", clientId)
        .single();

    if (existingClientError || !existingClient) {
      throw existingClientError ?? new Error("The Client could not be found.");
    }

    if (existingClient.archived_at) {
      throw new Error("This Client is already archived.");
    }

    const now = new Date().toISOString();

    const { data: client, error: archiveError } = await adminSupabase
      .from("clients")
      .update({
        archived_at: now,

        updated_by: userId,

        updated_at: now,
      })
      .eq("id", clientId)
      .is("archived_at", null)
      .select("*")
      .single();

    if (archiveError || !client) {
      throw archiveError ?? new Error("The Client could not be archived.");
    }

    return financeJsonResponse({
      success: true,

      client,

      message: "Client archived successfully.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
