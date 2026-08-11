import type { APIRoute } from "astro";
import type {
  ClientStatus,
  ClientType,
  CreateClientInput,
} from "../../../types/client";
import type { Database, Json } from "../../../types/supabase";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../lib/server/finance-api";

export const prerender = false;

type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];

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
 * Generate one unique Client code through the database function.
 */
async function generateClientCode(
  adminSupabase: Awaited<
    ReturnType<typeof getFinanceApiClients>
  >["adminSupabase"]
) {
  const { data: clientCode, error: clientCodeError } = await adminSupabase.rpc(
    "generate_client_code"
  );

  if (clientCodeError || !clientCode) {
    throw (
      clientCodeError ?? new Error("The Client code could not be generated.")
    );
  }

  return clientCode;
}
/**
 * Create one Client record.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { adminSupabase, userId } = await getFinanceApiClients(request);

    const body = (await request.json()) as CreateClientInput;

    const displayName = body.display_name?.trim();

    if (!displayName) {
      throw new Error("Client display name is required.");
    }

    const clientType = body.client_type;

    if (!ALLOWED_CLIENT_TYPES.includes(clientType)) {
      throw new Error("Select a valid Client type.");
    }

    const status = body.status ?? "lead";

    if (!ALLOWED_CLIENT_STATUSES.includes(status)) {
      throw new Error("Select a valid Client status.");
    }

    const email = normalizeEmail(body.email);

    if (email) {
      const { data: existingClient, error: duplicateError } =
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
          .is("archived_at", null)
          .maybeSingle();

      if (duplicateError) {
        throw duplicateError;
      }

      if (existingClient) {
        throw new Error(
          `A Client with this email already exists: ${existingClient.client_code} — ${existingClient.display_name}.`
        );
      }
    }

    const clientInsert: ClientInsert = {
      client_code: await generateClientCode(adminSupabase),
      client_type: clientType,

      display_name: displayName,

      company_name: normalizeOptionalText(body.company_name),

      first_name: normalizeOptionalText(body.first_name),

      last_name: normalizeOptionalText(body.last_name),

      email,

      phone: normalizeOptionalText(body.phone),

      alternative_phone: normalizeOptionalText(body.alternative_phone),

      website: normalizeWebsite(body.website),

      industry: normalizeOptionalText(body.industry),

      tax_identification_number: normalizeOptionalText(
        body.tax_identification_number
      ),

      billing_address: normalizeOptionalText(body.billing_address),

      city: normalizeOptionalText(body.city),

      state: normalizeOptionalText(body.state),

      country: body.country?.trim() || "Nigeria",

      postal_code: normalizeOptionalText(body.postal_code),

      status,

      account_manager_id: body.account_manager_id || null,

      source: normalizeOptionalText(body.source),

      notes: normalizeOptionalText(body.notes),

      metadata: (body.metadata ?? {}) as Json,

      created_by: userId,

      updated_by: userId,

      archived_at: null,
    };

    const { data: client, error: clientError } = await adminSupabase
      .from("clients")
      .insert(clientInsert)
      .select("*")
      .single();

    if (clientError || !client) {
      throw clientError ?? new Error("The Client could not be created.");
    }

    return financeJsonResponse(
      {
        success: true,

        client,

        message: "Client created successfully.",
      },
      201
    );
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
