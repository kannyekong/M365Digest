import { supabase } from "./superbase";
import type {
  Client,
  ClientDetails,
  ClientListItem,
  ClientListResponse,
  ClientOption,
  ClientStatistics,
  CreateClientInput,
  ListClientsOptions,
  UpdateClientInput,
} from "../types/client";

/**
 * Convert a PostgreSQL numeric value into a safe JavaScript number.
 */
function toSafeNumber(value: number | string | null | undefined) {
  const normalizedValue = Number(value ?? 0);

  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

/**
 * Convert one unknown JSON value into a plain object.
 */
function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

/**
 * Escape characters that have special meaning in PostgREST search expressions.
 */
function escapePostgrestSearch(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, "\\,")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/* Retrieves one Client by its UUID. */

/**
 * Normalize one raw Client database record.
 */
function normalizeClient(client: Record<string, unknown>): Client {
  return {
    id: String(client.id ?? ""),

    client_code: String(client.client_code ?? ""),

    client_type: client.client_type as Client["client_type"],

    display_name: String(client.display_name ?? ""),

    company_name:
      typeof client.company_name === "string" ? client.company_name : null,

    first_name:
      typeof client.first_name === "string" ? client.first_name : null,

    last_name: typeof client.last_name === "string" ? client.last_name : null,

    email: typeof client.email === "string" ? client.email : null,

    phone: typeof client.phone === "string" ? client.phone : null,

    alternative_phone:
      typeof client.alternative_phone === "string"
        ? client.alternative_phone
        : null,

    website: typeof client.website === "string" ? client.website : null,

    industry: typeof client.industry === "string" ? client.industry : null,

    tax_identification_number:
      typeof client.tax_identification_number === "string"
        ? client.tax_identification_number
        : null,

    billing_address:
      typeof client.billing_address === "string"
        ? client.billing_address
        : null,

    city: typeof client.city === "string" ? client.city : null,

    state: typeof client.state === "string" ? client.state : null,

    country: String(client.country ?? "Nigeria"),

    postal_code:
      typeof client.postal_code === "string" ? client.postal_code : null,

    status: client.status as Client["status"],

    account_manager_id:
      typeof client.account_manager_id === "string"
        ? client.account_manager_id
        : null,

    source: typeof client.source === "string" ? client.source : null,

    notes: typeof client.notes === "string" ? client.notes : null,

    metadata: normalizeMetadata(client.metadata),

    created_by:
      typeof client.created_by === "string" ? client.created_by : null,

    updated_by:
      typeof client.updated_by === "string" ? client.updated_by : null,

    created_at: String(client.created_at ?? ""),

    updated_at: String(client.updated_at ?? ""),

    archived_at:
      typeof client.archived_at === "string" ? client.archived_at : null,
  };
}

/**
 * Build authenticated request headers for protected Client API routes.
 */
async function getClientAuthorizationHeaders() {
  const { data: sessionResult, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken = sessionResult.session?.access_token;

  if (!accessToken) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

/**
 * Parse one Client API response and safely handle non-JSON errors.
 */
async function parseClientApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const responseText = await response.text();

    console.error("Client API returned a non-JSON response:", {
      status: response.status,
      url: response.url,
      responseText,
    });

    throw new Error(
      response.status === 404
        ? "The Client API route was not found. Verify the route file and restart Astro."
        : `The Client API returned an unexpected response (${response.status}).`
    );
  }

  const result = (await response.json()) as {
    success?: boolean;
    message?: string;
    client?: T;
    data?: T;
  };

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ??
        `The Client request failed with status ${response.status}.`
    );
  }

  const responseData = result.client ?? result.data;

  if (!responseData) {
    throw new Error("The Client API returned no Client data.");
  }

  return responseData;
}

/**
 * Retrieve related financial and project summaries for a list of Clients.
 */
async function loadClientSummaries(
  clients: Client[]
): Promise<ClientListItem[]> {
  const clientIds = clients.map((client) => client.id);

  if (clientIds.length === 0) {
    return [];
  }

  const [projectResult, invoiceResult, transactionResult] = await Promise.all([
    supabase
      .from("projects")
      .select(
        `
        id,
        client_id,
        status
        `
      )
      .in("client_id", clientIds),

    supabase
      .from("invoices")
      .select(
        `
        id,
        customer_id,
        currency,
        total_amount,
        amount_paid,
        amount_due,
        archived_at
        `
      )
      .in("customer_id", clientIds)
      .is("archived_at", null),

    supabase
      .from("financial_transactions")
      .select(
        `
        id,
        client_id,
        transaction_type,
        amount,
        refunded_amount,
        currency,
        status,
        archived_at
        `
      )
      .in("client_id", clientIds)
      .is("archived_at", null),
  ]);

  if (projectResult.error) {
    throw projectResult.error;
  }

  if (invoiceResult.error) {
    throw invoiceResult.error;
  }

  if (transactionResult.error) {
    throw transactionResult.error;
  }

  return clients.map((client) => {
    const clientProjects = (projectResult.data ?? []).filter(
      (project) => project.client_id === client.id
    );

    const clientInvoices = (invoiceResult.data ?? []).filter(
      (invoice) => invoice.customer_id === client.id
    );

    const clientTransactions = (transactionResult.data ?? []).filter(
      (transaction) => transaction.client_id === client.id
    );

    const totalInvoiced = clientInvoices.reduce(
      (total, invoice) => total + toSafeNumber(invoice.total_amount),
      0
    );

    const totalPaid = clientInvoices.reduce(
      (total, invoice) => total + toSafeNumber(invoice.amount_paid),
      0
    );

    const outstandingAmount = clientInvoices.reduce(
      (total, invoice) => total + toSafeNumber(invoice.amount_due),
      0
    );

    const incomeTransactions = clientTransactions.filter(
      (transaction) =>
        transaction.transaction_type === "income" &&
        ["paid", "refunded"].includes(transaction.status)
    );

    const lifetimeRevenue = incomeTransactions.reduce(
      (total, transaction) =>
        total +
        Math.max(
          toSafeNumber(transaction.amount) -
            toSafeNumber(transaction.refunded_amount),
          0
        ),
      0
    );

    const refundedAmount = incomeTransactions.reduce(
      (total, transaction) => total + toSafeNumber(transaction.refunded_amount),
      0
    );

    const currency =
      clientInvoices.find((invoice) => invoice.currency)?.currency ??
      incomeTransactions.find((transaction) => transaction.currency)
        ?.currency ??
      "NGN";

    return {
      ...client,

      projects_count: clientProjects.length,

      active_projects_count: clientProjects.filter(
        (project) =>
          !["completed", "cancelled", "archived"].includes(
            String(project.status).toLowerCase()
          )
      ).length,

      invoices_count: clientInvoices.length,

      total_invoiced: totalInvoiced,

      total_paid: totalPaid,

      outstanding_amount: outstandingAmount,

      lifetime_revenue: lifetimeRevenue,

      refunded_amount: refundedAmount,

      currency,
    };
  });
}

/**
 * Retrieve paginated Client records with project and financial summaries.
 */
export async function listClients({
  page = 1,
  pageSize = 10,
  filters = {},
  sortBy = "created_at",
  sortDirection = "desc",
}: ListClientsOptions = {}): Promise<ClientListResponse> {
  const safePage = Math.max(1, page);

  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const rangeStart = (safePage - 1) * safePageSize;

  const rangeEnd = rangeStart + safePageSize - 1;

  let query = supabase.from("clients").select("*", {
    count: "exact",
  });

  if (filters.archived) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  if (filters.clientType && filters.clientType !== "all") {
    query = query.eq("client_type", filters.clientType);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.accountManagerId && filters.accountManagerId !== "all") {
    query = query.eq("account_manager_id", filters.accountManagerId);
  }

  if (filters.country?.trim()) {
    query = query.ilike(
      "country",
      `%${escapePostgrestSearch(filters.country.trim())}%`
    );
  }

  if (filters.search?.trim()) {
    const searchValue = escapePostgrestSearch(filters.search.trim());

    query = query.or(
      [
        `client_code.ilike.%${searchValue}%`,
        `display_name.ilike.%${searchValue}%`,
        `company_name.ilike.%${searchValue}%`,
        `first_name.ilike.%${searchValue}%`,
        `last_name.ilike.%${searchValue}%`,
        `email.ilike.%${searchValue}%`,
        `phone.ilike.%${searchValue}%`,
        `industry.ilike.%${searchValue}%`,
      ].join(",")
    );
  }

  const { data, error, count } = await query
    .order(sortBy, {
      ascending: sortDirection === "asc",
      nullsFirst: false,
    })
    .range(rangeStart, rangeEnd);

  if (error) {
    console.error("Failed to load Clients:", error);

    throw error;
  }

  const clients = (data ?? []).map((client) =>
    normalizeClient(client as Record<string, unknown>)
  );

  const clientItems = await loadClientSummaries(clients);

  const total = count ?? 0;

  return {
    clients: clientItems,

    total,

    page: safePage,

    pageSize: safePageSize,

    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

/**
 * Retrieve one Client and its relationship counts and financial summary.
 */
export async function getClientById(clientId: string): Promise<ClientDetails> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (error || !data) {
    console.error("Failed to load Client:", error);

    throw error ?? new Error("The Client could not be found.");
  }

  const client = normalizeClient(data as Record<string, unknown>);

  const [clientSummary] = await loadClientSummaries([client]);

  const [contactsResult, notesResult] = await Promise.all([
    supabase
      .from("client_contacts")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("client_id", clientId)
      .is("archived_at", null),

    supabase
      .from("client_notes")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("client_id", clientId)
      .is("archived_at", null),
  ]);

  if (contactsResult.error) {
    throw contactsResult.error;
  }

  if (notesResult.error) {
    throw notesResult.error;
  }

  return {
    ...clientSummary,

    contacts_count: contactsResult.count ?? 0,

    notes_count: notesResult.count ?? 0,
  };
}

/**
 * Retrieve compact active Client options for form select fields.
 */
export async function listClientOptions(): Promise<ClientOption[]> {
  const { data, error } = await supabase
    .from("clients")
    .select(
      `
        id,
        client_code,
        display_name,
        company_name,
        email,
        status,
        phone,
        billing_address
        `
    )
    .eq("status", "active")
    .is("archived_at", null)
    .order("display_name", {
      ascending: true,
    });

  if (error) {
    console.error("Failed to load Client options:", error);

    throw error;
  }

  return (data ?? []).map((client) => ({
    id: client.id,

    client_code: client.client_code,

    display_name: client.display_name,

    company_name: client.company_name,

    email: client.email,

    phone: client.phone,

    billing_address: client.billing_address,

    status: client.status as ClientOption["status"],
  }));
}

/**
 * Retrieve Client dashboard statistics.
 */
export async function getClientStatistics(): Promise<ClientStatistics> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .is("archived_at", null);

  if (error) {
    console.error("Failed to load Client statistics:", error);

    throw error;
  }

  const clients = (data ?? []).map((client) =>
    normalizeClient(client as Record<string, unknown>)
  );

  const clientItems = await loadClientSummaries(clients);

  const statistics: ClientStatistics = {
    totalClients: clientItems.length,

    activeClients: 0,

    leads: 0,

    prospects: 0,

    inactiveClients: 0,

    suspendedClients: 0,

    totalInvoiced: 0,

    totalPaid: 0,

    totalOutstanding: 0,

    lifetimeRevenue: 0,

    currency: "NGN",
  };

  for (const client of clientItems) {
    statistics.totalInvoiced += client.total_invoiced;

    statistics.totalPaid += client.total_paid;

    statistics.totalOutstanding += client.outstanding_amount;

    statistics.lifetimeRevenue += client.lifetime_revenue;

    statistics.currency = client.currency || statistics.currency;

    switch (client.status) {
      case "active":
        statistics.activeClients += 1;
        break;

      case "lead":
        statistics.leads += 1;
        break;

      case "prospect":
        statistics.prospects += 1;
        break;

      case "inactive":
        statistics.inactiveClients += 1;
        break;

      case "suspended":
        statistics.suspendedClients += 1;
        break;
    }
  }

  return statistics;
}

/**
 * Create one Client through the protected server endpoint.
 */
export async function createClient(input: CreateClientInput): Promise<Client> {
  const headers = await getClientAuthorizationHeaders();

  const response = await fetch("/api/clients", {
    method: "POST",

    headers,

    body: JSON.stringify(input),
  });

  return parseClientApiResponse<Client>(response);
}

/**
 * Update one Client through the protected server endpoint.
 */
export async function updateClient(
  clientId: string,
  input: UpdateClientInput
): Promise<Client> {
  const headers = await getClientAuthorizationHeaders();

  const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
    method: "PATCH",

    headers,

    body: JSON.stringify(input),
  });

  return parseClientApiResponse<Client>(response);
}

/**
 * Archive one Client while preserving related business records.
 */
export async function archiveClient(clientId: string): Promise<Client> {
  const headers = await getClientAuthorizationHeaders();

  const response = await fetch(
    `/api/clients/${encodeURIComponent(clientId)}/archive`,
    {
      method: "POST",

      headers,
    }
  );

  return parseClientApiResponse<Client>(response);
}

/**
 * Restore one previously archived Client.
 */
export async function restoreClient(clientId: string): Promise<Client> {
  const headers = await getClientAuthorizationHeaders();

  const response = await fetch(
    `/api/clients/${encodeURIComponent(clientId)}/restore`,
    {
      method: "POST",

      headers,
    }
  );

  return parseClientApiResponse<Client>(response);
}
