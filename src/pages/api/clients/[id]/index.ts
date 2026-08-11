import type { APIRoute } from "astro";
import type {
  ClientStatus,
  ClientType,
  UpdateClientInput,
} from "../../../../types/client";
import type { Database, Json } from "../../../../types/supabase";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

const ALLOWED_CLIENT_TYPES: ClientType[] = ["individual", "organisation"];

const ALLOWED_CLIENT_STATUSES: ClientStatus[] = [
  "lead",
  "prospect",
  "active",
  "inactive",
  "suspended",
];

/**
 * Normalize one optional text field.
 */
function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue || null;
}

/**
 * Normalize and validate an optional email address.
 */
function normalizeEmail(value: unknown) {
  const email = normalizeOptionalText(value);

  if (!email) {
    return null;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw new Error("Enter a valid Client email address.");
  }

  return email.toLowerCase();
}

/**
 * Normalize and validate one optional website URL.
 */
function normalizeWebsite(value: unknown) {
  const website = normalizeOptionalText(value);

  if (!website) {
    return null;
  }

  try {
    return new URL(website).toString();
  } catch {
    throw new Error("Enter a valid website URL, including https://.");
  }
}

/**
 * Update one existing Client.
 */
export const PATCH: APIRoute = async ({ request, params }) => {
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

    const body = (await request.json()) as UpdateClientInput;

    const { data: existingClient, error: existingClientError } =
      await adminSupabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();

    if (existingClientError || !existingClient) {
      throw existingClientError ?? new Error("The Client could not be found.");
    }

    const updates: ClientUpdate = {
      updated_by: userId,

      updated_at: new Date().toISOString(),
    };

    if (body.client_type !== undefined) {
      if (!ALLOWED_CLIENT_TYPES.includes(body.client_type)) {
        throw new Error("Select a valid Client type.");
      }

      updates.client_type = body.client_type;
    }

    if (body.display_name !== undefined) {
      const displayName = body.display_name.trim();

      if (!displayName) {
        throw new Error("Client display name cannot be empty.");
      }

      updates.display_name = displayName;
    }

    if (body.status !== undefined) {
      if (!ALLOWED_CLIENT_STATUSES.includes(body.status)) {
        throw new Error("Select a valid Client status.");
      }

      updates.status = body.status;
    }

    if (body.email !== undefined) {
      const email = normalizeEmail(body.email);

      if (email) {
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
            .ilike("email", email)
            .neq("id", clientId)
            .is("archived_at", null)
            .maybeSingle();

        if (duplicateError) {
          throw duplicateError;
        }

        if (duplicateClient) {
          throw new Error(
            `Another Client already uses this email: ${duplicateClient.client_code} — ${duplicateClient.display_name}.`
          );
        }
      }

      updates.email = email;
    }

    if (body.website !== undefined) {
      updates.website = normalizeWebsite(body.website);
    }

    if (body.company_name !== undefined) {
      updates.company_name = normalizeOptionalText(body.company_name);
    }

    if (body.first_name !== undefined) {
      updates.first_name = normalizeOptionalText(body.first_name);
    }

    if (body.last_name !== undefined) {
      updates.last_name = normalizeOptionalText(body.last_name);
    }

    if (body.phone !== undefined) {
      updates.phone = normalizeOptionalText(body.phone);
    }

    if (body.alternative_phone !== undefined) {
      updates.alternative_phone = normalizeOptionalText(body.alternative_phone);
    }

    if (body.industry !== undefined) {
      updates.industry = normalizeOptionalText(body.industry);
    }

    if (body.tax_identification_number !== undefined) {
      updates.tax_identification_number = normalizeOptionalText(
        body.tax_identification_number
      );
    }

    if (body.billing_address !== undefined) {
      updates.billing_address = normalizeOptionalText(body.billing_address);
    }

    if (body.city !== undefined) {
      updates.city = normalizeOptionalText(body.city);
    }

    if (body.state !== undefined) {
      updates.state = normalizeOptionalText(body.state);
    }

    if (body.country !== undefined) {
      const country = body.country.trim();

      if (!country) {
        throw new Error("Client country cannot be empty.");
      }

      updates.country = country;
    }

    if (body.postal_code !== undefined) {
      updates.postal_code = normalizeOptionalText(body.postal_code);
    }

    if (body.account_manager_id !== undefined) {
      updates.account_manager_id = body.account_manager_id || null;
    }

    if (body.source !== undefined) {
      updates.source = normalizeOptionalText(body.source);
    }

    if (body.notes !== undefined) {
      updates.notes = normalizeOptionalText(body.notes);
    }

    if (body.metadata !== undefined) {
      updates.metadata = body.metadata as Json;
    }

    const { data: client, error: updateError } = await adminSupabase
      .from("clients")
      .update(updates)
      .eq("id", clientId)
      .select("*")
      .single();

    if (updateError || !client) {
      throw updateError ?? new Error("The Client could not be updated.");
    }

    return financeJsonResponse({
      success: true,

      client,

      message: "Client updated successfully.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
