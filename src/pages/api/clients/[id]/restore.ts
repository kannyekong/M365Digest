import type { APIRoute } from "astro";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

/**
 * Restore one previously archived Client.
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
          email,
          archived_at
          `
        )
        .eq("id", clientId)
        .single();

    if (existingClientError || !existingClient) {
      throw existingClientError ?? new Error("The Client could not be found.");
    }

    if (!existingClient.archived_at) {
      throw new Error("This Client is not archived.");
    }

    if (existingClient.email) {
      const { data: duplicateClient, error: duplicateError } =
        await adminSupabase
          .from("clients")
          .select(
            `
            id,
            client_code,
            display_name
            `
          )
          .ilike("email", existingClient.email)
          .neq("id", clientId)
          .is("archived_at", null)
          .maybeSingle();

      if (duplicateError) {
        throw duplicateError;
      }

      if (duplicateClient) {
        throw new Error(
          `This Client cannot be restored because an active Client already uses the same email: ${duplicateClient.client_code} — ${duplicateClient.display_name}.`
        );
      }
    }

    const now = new Date().toISOString();

    const { data: client, error: restoreError } = await adminSupabase
      .from("clients")
      .update({
        archived_at: null,

        updated_by: userId,

        updated_at: now,
      })
      .eq("id", clientId)
      .not("archived_at", "is", null)
      .select("*")
      .single();

    if (restoreError || !client) {
      throw restoreError ?? new Error("The Client could not be restored.");
    }

    return financeJsonResponse({
      success: true,

      client,

      message: "Client restored successfully.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
