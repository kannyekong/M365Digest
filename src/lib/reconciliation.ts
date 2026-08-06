import { supabase } from "./superbase";
import type {
  DisputeTransactionInput,
  ListReconciliationOptions,
  ReconciliationDetails,
  ReconciliationHistoryItem,
  ReconciliationListResponse,
  ReconciliationStatistics,
  ReconciliationTransaction,
  ReconcileTransactionInput,
  UndoReconciliationInput,
} from "../types/reconciliation";

/**
 * Convert one PostgreSQL numeric value into a safe JavaScript number.
 */
function toSafeNumber(value: number | string | null | undefined) {
  const normalizedValue = Number(value ?? 0);

  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

/**
 * Convert one nullable PostgreSQL numeric value into a number or null.
 */
function toNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizedValue = Number(value);

  return Number.isFinite(normalizedValue) ? normalizedValue : null;
}

/**
 * Escape characters with special meaning inside PostgREST search expressions.
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

/**
 * Normalize one raw Reconciliation transaction row.
 */
function normalizeReconciliationTransaction(
  transaction: Record<string, unknown>
): ReconciliationTransaction {
  return {
    id: String(transaction.id ?? ""),

    transaction_type: String(transaction.transaction_type ?? ""),

    transaction_category: String(transaction.transaction_category ?? ""),

    description: String(transaction.description ?? ""),

    customer_name:
      typeof transaction.customer_name === "string"
        ? transaction.customer_name
        : null,

    customer_email:
      typeof transaction.customer_email === "string"
        ? transaction.customer_email
        : null,

    customer_phone:
      typeof transaction.customer_phone === "string"
        ? transaction.customer_phone
        : null,

    internal_reference: String(transaction.internal_reference ?? ""),

    provider_reference:
      typeof transaction.provider_reference === "string"
        ? transaction.provider_reference
        : null,

    reconciliation_reference:
      typeof transaction.reconciliation_reference === "string"
        ? transaction.reconciliation_reference
        : null,

    invoice_number:
      typeof transaction.invoice_number === "string"
        ? transaction.invoice_number
        : null,

    receipt_number:
      typeof transaction.receipt_number === "string"
        ? transaction.receipt_number
        : null,

    provider: String(transaction.provider ?? ""),

    payment_method:
      typeof transaction.payment_method === "string"
        ? transaction.payment_method
        : null,

    bank_account:
      typeof transaction.bank_account === "string"
        ? transaction.bank_account
        : null,

    amount: toSafeNumber(
      transaction.amount as number | string | null | undefined
    ),

    fee_amount: toSafeNumber(
      transaction.fee_amount as number | string | null | undefined
    ),

    tax_amount: toSafeNumber(
      transaction.tax_amount as number | string | null | undefined
    ),

    refunded_amount: toSafeNumber(
      transaction.refunded_amount as number | string | null | undefined
    ),

    external_amount: toNullableNumber(
      transaction.external_amount as number | string | null | undefined
    ),

    amount_difference: toNullableNumber(
      transaction.amount_difference as number | string | null | undefined
    ),

    currency: String(transaction.currency ?? "NGN"),

    base_currency: String(transaction.base_currency ?? "NGN"),

    exchange_rate: toSafeNumber(
      transaction.exchange_rate as number | string | null | undefined
    ),

    base_amount: toSafeNumber(
      transaction.base_amount as number | string | null | undefined
    ),

    status: String(transaction.status ?? ""),

    reconciliation_status:
      transaction.reconciliation_status as ReconciliationTransaction["reconciliation_status"],

    transaction_date: String(transaction.transaction_date ?? ""),

    paid_at:
      typeof transaction.paid_at === "string" ? transaction.paid_at : null,

    settlement_date:
      typeof transaction.settlement_date === "string"
        ? transaction.settlement_date
        : null,

    reconciled_at:
      typeof transaction.reconciled_at === "string"
        ? transaction.reconciled_at
        : null,

    reconciled_by:
      typeof transaction.reconciled_by === "string"
        ? transaction.reconciled_by
        : null,

    reconciliation_notes:
      typeof transaction.reconciliation_notes === "string"
        ? transaction.reconciliation_notes
        : null,

    dispute_reason:
      typeof transaction.dispute_reason === "string"
        ? transaction.dispute_reason
        : null,

    source_table:
      typeof transaction.source_table === "string"
        ? transaction.source_table
        : null,

    source_id:
      typeof transaction.source_id === "string" ? transaction.source_id : null,

    created_at: String(transaction.created_at ?? ""),

    updated_at: String(transaction.updated_at ?? ""),
  };
}

/**
 * Normalize one Reconciliation history record.
 */
function normalizeReconciliationHistory(
  history: Record<string, unknown>
): ReconciliationHistoryItem {
  return {
    id: String(history.id ?? ""),

    transaction_id: String(history.transaction_id ?? ""),

    previous_status:
      typeof history.previous_status === "string"
        ? (history.previous_status as ReconciliationHistoryItem["previous_status"])
        : null,

    new_status: history.new_status as ReconciliationHistoryItem["new_status"],

    internal_amount: toSafeNumber(
      history.internal_amount as number | string | null | undefined
    ),

    external_amount: toNullableNumber(
      history.external_amount as number | string | null | undefined
    ),

    amount_difference: toNullableNumber(
      history.amount_difference as number | string | null | undefined
    ),

    internal_reference:
      typeof history.internal_reference === "string"
        ? history.internal_reference
        : null,

    external_reference:
      typeof history.external_reference === "string"
        ? history.external_reference
        : null,

    provider: typeof history.provider === "string" ? history.provider : null,

    settlement_date:
      typeof history.settlement_date === "string"
        ? history.settlement_date
        : null,

    dispute_reason:
      typeof history.dispute_reason === "string"
        ? history.dispute_reason
        : null,

    notes: typeof history.notes === "string" ? history.notes : null,

    evidence_url:
      typeof history.evidence_url === "string" ? history.evidence_url : null,

    action: history.action as ReconciliationHistoryItem["action"],

    performed_by:
      typeof history.performed_by === "string" ? history.performed_by : null,

    performed_at: String(history.performed_at ?? ""),

    metadata:
      history.metadata && typeof history.metadata === "object"
        ? (history.metadata as Record<string, unknown>)
        : {},
  };
}

/**
 * Build authenticated headers for protected Reconciliation API routes.
 */
async function getReconciliationAuthorizationHeaders() {
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
 * Parse one Reconciliation API response safely.
 */
async function parseReconciliationApiResponse<T>(
  response: Response
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const responseText = await response.text();

    console.error("Reconciliation API returned a non-JSON response:", {
      status: response.status,
      url: response.url,
      responseText,
    });

    throw new Error(
      response.status === 404
        ? "The Reconciliation API route was not found. Verify the route file and restart Astro."
        : `The Reconciliation API returned an unexpected response (${response.status}).`
    );
  }

  const result = (await response.json()) as {
    success?: boolean;
    message?: string;
    transaction?: T;
    data?: T;
  };

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ??
        `The Reconciliation request failed with status ${response.status}.`
    );
  }

  const responseData = result.transaction ?? result.data;

  if (!responseData) {
    throw new Error("The Reconciliation API returned no transaction data.");
  }

  return responseData;
}

/**
 * Retrieve paginated financial transactions for Reconciliation.
 */
export async function listReconciliationTransactions({
  page = 1,
  pageSize = 10,
  filters = {},
  sortBy = "transaction_date",
  sortDirection = "desc",
}: ListReconciliationOptions = {}): Promise<ReconciliationListResponse> {
  const safePage = Math.max(1, page);

  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const rangeStart = (safePage - 1) * safePageSize;

  const rangeEnd = rangeStart + safePageSize - 1;

  let query = supabase.from("finance_reconciliation_transactions").select("*", {
    count: "exact",
  });

  if (filters.reconciliationStatus && filters.reconciliationStatus !== "all") {
    query = query.eq("reconciliation_status", filters.reconciliationStatus);
  }

  if (filters.transactionType && filters.transactionType !== "all") {
    query = query.eq("transaction_type", filters.transactionType);
  }

  if (filters.transactionStatus && filters.transactionStatus !== "all") {
    query = query.eq("status", filters.transactionStatus);
  }

  if (filters.provider && filters.provider !== "all") {
    query = query.eq("provider", filters.provider);
  }

  if (filters.currency?.trim()) {
    query = query.eq("currency", filters.currency.trim().toUpperCase());
  }

  if (filters.dateFrom) {
    query = query.gte("transaction_date", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("transaction_date", filters.dateTo);
  }

  if (filters.search?.trim()) {
    const searchValue = escapePostgrestSearch(filters.search.trim());

    query = query.or(
      [
        `internal_reference.ilike.%${searchValue}%`,
        `provider_reference.ilike.%${searchValue}%`,
        `reconciliation_reference.ilike.%${searchValue}%`,
        `invoice_number.ilike.%${searchValue}%`,
        `receipt_number.ilike.%${searchValue}%`,
        `description.ilike.%${searchValue}%`,
        `customer_name.ilike.%${searchValue}%`,
        `customer_email.ilike.%${searchValue}%`,
        `customer_phone.ilike.%${searchValue}%`,
        `bank_account.ilike.%${searchValue}%`,
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
    console.error("Failed to load Reconciliation transactions:", error);

    throw error;
  }

  const total = count ?? 0;

  return {
    transactions: (data ?? []).map((transaction) =>
      normalizeReconciliationTransaction(transaction as Record<string, unknown>)
    ),

    total,

    page: safePage,

    pageSize: safePageSize,

    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

/**
 * Retrieve one transaction and its complete Reconciliation history.
 */
export async function getReconciliationDetails(
  transactionId: string
): Promise<ReconciliationDetails> {
  const { data: transaction, error: transactionError } = await supabase
    .from("finance_reconciliation_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (transactionError || !transaction) {
    console.error(
      "Failed to load Reconciliation transaction:",
      transactionError
    );

    throw (
      transactionError ??
      new Error("The Reconciliation transaction was not found.")
    );
  }

  const { data: history, error: historyError } = await supabase
    .from("finance_reconciliation_history")
    .select("*")
    .eq("transaction_id", transactionId)
    .order("performed_at", {
      ascending: false,
    });

  if (historyError) {
    console.error("Failed to load Reconciliation history:", historyError);

    throw historyError;
  }

  return {
    ...normalizeReconciliationTransaction(
      transaction as Record<string, unknown>
    ),

    history: (history ?? []).map((historyItem) =>
      normalizeReconciliationHistory(historyItem as Record<string, unknown>)
    ),
  };
}

/**
 * Retrieve Reconciliation dashboard statistics.
 */
export async function getReconciliationStatistics(): Promise<ReconciliationStatistics> {
  const { data, error } = await supabase
    .from("finance_reconciliation_transactions")
    .select(
      `
        amount,
        amount_difference,
        currency,
        reconciliation_status
        `
    );

  if (error) {
    console.error("Failed to load Reconciliation statistics:", error);

    throw error;
  }

  const statistics: ReconciliationStatistics = {
    totalTransactions: 0,

    unreconciledCount: 0,

    reconciledCount: 0,

    disputedCount: 0,

    unreconciledAmount: 0,

    reconciledAmount: 0,

    disputedAmount: 0,

    totalDifference: 0,

    reconciliationRate: 0,

    currency: "NGN",
  };

  for (const transaction of data ?? []) {
    const amount = toSafeNumber(transaction.amount);

    const difference = toNullableNumber(transaction.amount_difference) ?? 0;

    statistics.totalTransactions += 1;

    statistics.totalDifference += difference;

    statistics.currency = transaction.currency || statistics.currency;

    switch (transaction.reconciliation_status) {
      case "reconciled":
        statistics.reconciledCount += 1;

        statistics.reconciledAmount += amount;

        break;

      case "disputed":
        statistics.disputedCount += 1;

        statistics.disputedAmount += amount;

        break;

      case "unreconciled":
      default:
        statistics.unreconciledCount += 1;

        statistics.unreconciledAmount += amount;

        break;
    }
  }

  statistics.reconciliationRate =
    statistics.totalTransactions > 0
      ? Number(
          (
            (statistics.reconciledCount / statistics.totalTransactions) *
            100
          ).toFixed(2)
        )
      : 0;

  return statistics;
}

/**
 * Mark one financial transaction as reconciled.
 */
export async function reconcileTransaction(
  transactionId: string,
  input: ReconcileTransactionInput
): Promise<ReconciliationTransaction> {
  const headers = await getReconciliationAuthorizationHeaders();

  const response = await fetch(
    `/api/reconciliation/${encodeURIComponent(transactionId)}/reconcile`,
    {
      method: "POST",

      headers,

      body: JSON.stringify(input),
    }
  );

  return parseReconciliationApiResponse<ReconciliationTransaction>(response);
}

/**
 * Mark one financial transaction as disputed.
 */
export async function disputeTransaction(
  transactionId: string,
  input: DisputeTransactionInput
): Promise<ReconciliationTransaction> {
  const headers = await getReconciliationAuthorizationHeaders();

  const response = await fetch(
    `/api/reconciliation/${encodeURIComponent(transactionId)}/dispute`,
    {
      method: "POST",

      headers,

      body: JSON.stringify(input),
    }
  );

  return parseReconciliationApiResponse<ReconciliationTransaction>(response);
}

/**
 * Undo the current Reconciliation state of one financial transaction.
 */
export async function undoReconciliation(
  transactionId: string,
  input: UndoReconciliationInput = {}
): Promise<ReconciliationTransaction> {
  const headers = await getReconciliationAuthorizationHeaders();

  const response = await fetch(
    `/api/reconciliation/${encodeURIComponent(transactionId)}/undo`,
    {
      method: "POST",

      headers,

      body: JSON.stringify(input),
    }
  );

  return parseReconciliationApiResponse<ReconciliationTransaction>(response);
}
