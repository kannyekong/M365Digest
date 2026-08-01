import { supabase } from "./superbase";
import type {
  CreateRevenueTransactionInput,
  ListRevenueOptions,
  RevenueFilters,
  RevenueListResponse,
  RevenueStatistics,
  RevenueTransaction,
  UpdateRevenueTransactionInput,
} from "../types/revenue";

/**
 * Converts PostgreSQL numeric values into safe JavaScript numbers.
 */
function toSafeNumber(value: number | string | null | undefined) {
  const normalizedValue = Number(value ?? 0);

  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

/**
 * Converts an optional string into a trimmed nullable value.
 */
function toNullableString(value?: string | null) {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

/**
 * Escapes special characters used by PostgREST search filters.
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
 * Normalizes a raw Revenue record returned by Supabase.
 */
function normalizeRevenueTransaction(
  transaction: Record<string, unknown>
): RevenueTransaction {
  return {
    id: String(transaction.id),

    transaction_type:
      transaction.transaction_type as RevenueTransaction["transaction_type"],

    transaction_category:
      transaction.transaction_category as RevenueTransaction["transaction_category"],

    provider: transaction.provider as RevenueTransaction["provider"],

    payment_method:
      typeof transaction.payment_method === "string"
        ? transaction.payment_method
        : null,

    source_table:
      typeof transaction.source_table === "string"
        ? transaction.source_table
        : null,

    source_id:
      typeof transaction.source_id === "string" ? transaction.source_id : null,

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

    description: String(transaction.description ?? ""),

    internal_notes:
      typeof transaction.internal_notes === "string"
        ? transaction.internal_notes
        : null,

    internal_reference: String(transaction.internal_reference ?? ""),

    provider_reference:
      typeof transaction.provider_reference === "string"
        ? transaction.provider_reference
        : null,

    invoice_number:
      typeof transaction.invoice_number === "string"
        ? transaction.invoice_number
        : null,

    receipt_number:
      typeof transaction.receipt_number === "string"
        ? transaction.receipt_number
        : null,

    bank_account:
      typeof transaction.bank_account === "string"
        ? transaction.bank_account
        : null,

    amount: toSafeNumber(transaction.amount as number | string | null),

    fee_amount: toSafeNumber(transaction.fee_amount as number | string | null),

    tax_amount: toSafeNumber(transaction.tax_amount as number | string | null),

    refunded_amount: toSafeNumber(
      transaction.refunded_amount as number | string | null
    ),

    currency: String(transaction.currency ?? "NGN"),

    base_currency: String(transaction.base_currency ?? "NGN"),

    exchange_rate: toSafeNumber(
      transaction.exchange_rate as number | string | null
    ),

    base_amount:
      transaction.base_amount === null || transaction.base_amount === undefined
        ? null
        : toSafeNumber(transaction.base_amount as number | string),

    status: transaction.status as RevenueTransaction["status"],

    reconciliation_status:
      transaction.reconciliation_status as RevenueTransaction["reconciliation_status"],

    transaction_date: String(transaction.transaction_date ?? ""),

    paid_at:
      typeof transaction.paid_at === "string" ? transaction.paid_at : null,

    reconciled_at:
      typeof transaction.reconciled_at === "string"
        ? transaction.reconciled_at
        : null,

    provider_payload:
      typeof transaction.provider_payload === "object" &&
      transaction.provider_payload !== null
        ? (transaction.provider_payload as Record<string, unknown>)
        : {},

    metadata:
      typeof transaction.metadata === "object" && transaction.metadata !== null
        ? (transaction.metadata as Record<string, unknown>)
        : {},

    created_by:
      typeof transaction.created_by === "string"
        ? transaction.created_by
        : null,

    updated_by:
      typeof transaction.updated_by === "string"
        ? transaction.updated_by
        : null,

    created_at: String(transaction.created_at ?? ""),

    updated_at: String(transaction.updated_at ?? ""),

    archived_at:
      typeof transaction.archived_at === "string"
        ? transaction.archived_at
        : null,
  };
}

/**
 * Normalizes Revenue values before sending them to Supabase.
 */
function normalizeRevenueValues(
  values: CreateRevenueTransactionInput | UpdateRevenueTransactionInput
) {
  return {
    ...values,

    customer_name:
      "customer_name" in values
        ? toNullableString(values.customer_name)
        : undefined,

    customer_email:
      "customer_email" in values
        ? toNullableString(values.customer_email)
        : undefined,

    customer_phone:
      "customer_phone" in values
        ? toNullableString(values.customer_phone)
        : undefined,

    payment_method:
      "payment_method" in values
        ? toNullableString(values.payment_method)
        : undefined,

    source_table:
      "source_table" in values
        ? toNullableString(values.source_table)
        : undefined,

    source_id:
      "source_id" in values ? toNullableString(values.source_id) : undefined,

    description:
      "description" in values && values.description !== undefined
        ? values.description.trim()
        : undefined,

    internal_notes:
      "internal_notes" in values
        ? toNullableString(values.internal_notes)
        : undefined,

    internal_reference:
      "internal_reference" in values && values.internal_reference !== undefined
        ? values.internal_reference.trim().toUpperCase()
        : undefined,

    provider_reference:
      "provider_reference" in values
        ? toNullableString(values.provider_reference)
        : undefined,

    invoice_number:
      "invoice_number" in values
        ? toNullableString(values.invoice_number)
        : undefined,

    receipt_number:
      "receipt_number" in values
        ? toNullableString(values.receipt_number)
        : undefined,

    bank_account:
      "bank_account" in values
        ? toNullableString(values.bank_account)
        : undefined,

    currency:
      "currency" in values && values.currency
        ? values.currency.trim().toUpperCase()
        : undefined,

    base_currency:
      "base_currency" in values && values.base_currency
        ? values.base_currency.trim().toUpperCase()
        : undefined,
  };
}

/**
 * Retrieves paginated company Revenue transactions.
 */
export async function listRevenueTransactions({
  page = 1,
  pageSize = 10,
  filters = {},
  sortBy = "transaction_date",
  sortDirection = "desc",
}: ListRevenueOptions = {}): Promise<RevenueListResponse> {
  const safePage = Math.max(1, page);

  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const rangeStart = (safePage - 1) * safePageSize;

  const rangeEnd = rangeStart + safePageSize - 1;

  let query = supabase
    .from("financial_transactions")
    .select("*", {
      count: "exact",
    })
    .eq("transaction_type", "income");

  if (!filters.includeArchived) {
    query = query.is("archived_at", null);
  }

  if (filters.category && filters.category !== "all") {
    query = query.eq("transaction_category", filters.category);
  }

  if (filters.provider && filters.provider !== "all") {
    query = query.eq("provider", filters.provider);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.reconciliationStatus && filters.reconciliationStatus !== "all") {
    query = query.eq("reconciliation_status", filters.reconciliationStatus);
  }

  if (filters.currency) {
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
        `customer_name.ilike.%${searchValue}%`,
        `customer_email.ilike.%${searchValue}%`,
        `description.ilike.%${searchValue}%`,
        `internal_reference.ilike.%${searchValue}%`,
        `provider_reference.ilike.%${searchValue}%`,
        `invoice_number.ilike.%${searchValue}%`,
        `receipt_number.ilike.%${searchValue}%`,
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
    console.error("Failed to load Revenue transactions:", error);

    throw error;
  }

  const total = count ?? 0;

  return {
    transactions: (data ?? []).map((transaction) =>
      normalizeRevenueTransaction(transaction as Record<string, unknown>)
    ),

    total,

    page: safePage,

    pageSize: safePageSize,

    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

/**
 * Retrieves one company Revenue transaction by ID.
 */
export async function getRevenueTransactionById(
  transactionId: string
): Promise<RevenueTransaction> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("transaction_type", "income")
    .single();

  if (error) {
    console.error("Failed to load Revenue transaction:", error);

    throw error;
  }

  return normalizeRevenueTransaction(data as Record<string, unknown>);
}

/**
 * Creates a new company Revenue transaction.
 */
export async function createRevenueTransaction(
  values: CreateRevenueTransactionInput
): Promise<RevenueTransaction> {
  const normalizedValues = normalizeRevenueValues(values);

  if (!normalizedValues.description) {
    throw new Error("Revenue description is required.");
  }

  if (!normalizedValues.internal_reference) {
    throw new Error("Internal reference is required.");
  }

  if (!Number.isFinite(values.amount) || values.amount < 0) {
    throw new Error("Revenue amount must be zero or greater.");
  }

  const transactionDate =
    values.transaction_date ?? new Date().toISOString().slice(0, 10);

  const status = values.status ?? "pending";

  const paidAt =
    status === "paid"
      ? (values.paid_at ?? new Date().toISOString())
      : (values.paid_at ?? null);

  const reconciliationStatus = values.reconciliation_status ?? "unreconciled";

  const reconciledAt =
    reconciliationStatus === "reconciled"
      ? (values.reconciled_at ?? new Date().toISOString())
      : (values.reconciled_at ?? null);

  const { data, error } = await supabase
    .from("financial_transactions")
    .insert({
      ...normalizedValues,

      transaction_type: "income",

      transaction_date: transactionDate,

      status,

      paid_at: paidAt,

      reconciliation_status: reconciliationStatus,

      reconciled_at: reconciledAt,

      fee_amount: values.fee_amount ?? 0,

      tax_amount: values.tax_amount ?? 0,

      refunded_amount: values.refunded_amount ?? 0,

      currency: normalizedValues.currency ?? "NGN",

      base_currency: normalizedValues.base_currency ?? "NGN",

      exchange_rate: values.exchange_rate ?? 1,

      provider_payload: values.provider_payload ?? {},

      metadata: values.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create Revenue transaction:", error);

    throw error;
  }

  return normalizeRevenueTransaction(data as Record<string, unknown>);
}

/**
 * Updates an existing company Revenue transaction.
 */
export async function updateRevenueTransaction(
  transactionId: string,
  updates: UpdateRevenueTransactionInput
): Promise<RevenueTransaction> {
  const normalizedUpdates = normalizeRevenueValues(updates);

  if (
    normalizedUpdates.description !== undefined &&
    !normalizedUpdates.description
  ) {
    throw new Error("Revenue description cannot be empty.");
  }

  if (
    normalizedUpdates.internal_reference !== undefined &&
    !normalizedUpdates.internal_reference
  ) {
    throw new Error("Internal reference cannot be empty.");
  }

  if (
    updates.amount !== undefined &&
    (!Number.isFinite(updates.amount) || updates.amount < 0)
  ) {
    throw new Error("Revenue amount must be zero or greater.");
  }

  const statusUpdates: Record<string, unknown> = {};

  if (updates.status === "paid" && updates.paid_at === undefined) {
    statusUpdates.paid_at = new Date().toISOString();
  }

  if (
    updates.status &&
    updates.status !== "paid" &&
    updates.paid_at === undefined
  ) {
    statusUpdates.paid_at = null;
  }

  if (
    updates.reconciliation_status === "reconciled" &&
    updates.reconciled_at === undefined
  ) {
    statusUpdates.reconciled_at = new Date().toISOString();
  }

  if (
    updates.reconciliation_status &&
    updates.reconciliation_status !== "reconciled" &&
    updates.reconciled_at === undefined
  ) {
    statusUpdates.reconciled_at = null;
  }

  const { data, error } = await supabase
    .from("financial_transactions")
    .update({
      ...normalizedUpdates,
      ...statusUpdates,
    })
    .eq("id", transactionId)
    .eq("transaction_type", "income")
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update Revenue transaction:", error);

    throw error;
  }

  return normalizeRevenueTransaction(data as Record<string, unknown>);
}

/**
 * Archives a Revenue transaction without deleting its financial history.
 */
export async function archiveRevenueTransaction(
  transactionId: string
): Promise<RevenueTransaction> {
  return updateRevenueTransaction(transactionId, {
    archived_at: new Date().toISOString(),
  });
}

/**
 * Restores a previously archived Revenue transaction.
 */
export async function restoreRevenueTransaction(
  transactionId: string
): Promise<RevenueTransaction> {
  return updateRevenueTransaction(transactionId, {
    archived_at: null,
  });
}

/**
 * Permanently deletes a draft Revenue transaction.
 *
 * Paid or reconciled financial records should be archived,
 * refunded, or adjusted instead of deleted.
 */
export async function deleteDraftRevenueTransaction(
  transaction: RevenueTransaction
) {
  if (transaction.status !== "draft") {
    throw new Error(
      "Only draft Revenue transactions can be permanently deleted."
    );
  }

  if (transaction.reconciliation_status === "reconciled") {
    throw new Error("A reconciled Revenue transaction cannot be deleted.");
  }

  const { error } = await supabase
    .from("financial_transactions")
    .delete()
    .eq("id", transaction.id)
    .eq("transaction_type", "income")
    .eq("status", "draft");

  if (error) {
    console.error("Failed to delete draft Revenue transaction:", error);

    throw error;
  }
}

/**
 * Retrieves Revenue statistics for the dashboard.
 */
export async function getRevenueStatistics(): Promise<RevenueStatistics> {
  const currentDate = new Date();

  const currentMonthStart = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1)
  ).toISOString();

  const nextMonthStart = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 1)
  ).toISOString();

  const previousMonthStart = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 1, 1)
  ).toISOString();

  const { data, error } = await supabase
    .from("financial_transactions")
    .select(
      `
      id,
      transaction_category,
      provider,
      amount,
      base_amount,
      fee_amount,
      tax_amount,
      refunded_amount,
      currency,
      status,
      paid_at,
      created_at,
      archived_at
      `
    )
    .eq("transaction_type", "income")
    .is("archived_at", null);

  if (error) {
    console.error("Failed to load Revenue statistics:", error);

    throw error;
  }

  const transactions = data ?? [];

  let currentMonthRevenue = 0;
  let previousMonthRevenue = 0;
  let totalRevenue = 0;
  let pendingRevenue = 0;
  let refundedRevenue = 0;
  let paidTransactions = 0;
  let pendingTransactions = 0;

  let paystackRevenue = 0;
  let providusRevenue = 0;
  let manualRevenue = 0;
  let otherProviderRevenue = 0;

  let currency = "NGN";

  for (const transaction of transactions) {
    const amount = toSafeNumber(transaction.base_amount ?? transaction.amount);

    const refundedAmount = toSafeNumber(transaction.refunded_amount);

    const paidAt =
      typeof transaction.paid_at === "string" ? transaction.paid_at : null;

    if (typeof transaction.currency === "string" && transaction.currency) {
      currency = transaction.currency;
    }

    if (transaction.status === "paid") {
      totalRevenue += amount;

      paidTransactions += 1;

      if (paidAt && paidAt >= currentMonthStart && paidAt < nextMonthStart) {
        currentMonthRevenue += amount;
      }

      if (
        paidAt &&
        paidAt >= previousMonthStart &&
        paidAt < currentMonthStart
      ) {
        previousMonthRevenue += amount;
      }

      switch (transaction.provider) {
        case "paystack":
          paystackRevenue += amount;
          break;

        case "providus":
          providusRevenue += amount;
          break;

        case "manual":
        case "bank_transfer":
        case "cash":
          manualRevenue += amount;
          break;

        default:
          otherProviderRevenue += amount;
          break;
      }
    }

    if (
      transaction.status === "pending" ||
      transaction.status === "processing"
    ) {
      pendingRevenue += amount;

      pendingTransactions += 1;
    }

    if (
      transaction.status === "refunded" ||
      transaction.status === "partially_refunded"
    ) {
      refundedRevenue += refundedAmount > 0 ? refundedAmount : amount;
    } else if (refundedAmount > 0) {
      refundedRevenue += refundedAmount;
    }
  }

  const netRevenue = totalRevenue - refundedRevenue;

  const growthPercentage =
    previousMonthRevenue > 0
      ? Number(
          (
            ((currentMonthRevenue - previousMonthRevenue) /
              previousMonthRevenue) *
            100
          ).toFixed(1)
        )
      : currentMonthRevenue > 0
        ? 100
        : 0;

  return {
    currentMonthRevenue,

    previousMonthRevenue,

    totalRevenue,

    pendingRevenue,

    refundedRevenue,

    netRevenue,

    paidTransactions,

    pendingTransactions,

    growthPercentage,

    currency,

    paystackRevenue,

    providusRevenue,

    manualRevenue,

    otherProviderRevenue,
  };
}

/**
 * Retrieves Revenue records matching the active filters for CSV export.
 */
export async function exportRevenueTransactions(
  filters: RevenueFilters = {}
): Promise<RevenueTransaction[]> {
  const transactions: RevenueTransaction[] = [];

  let page = 1;
  const pageSize = 100;

  while (true) {
    const result = await listRevenueTransactions({
      page,

      pageSize,

      filters,

      sortBy: "transaction_date",

      sortDirection: "desc",
    });

    transactions.push(...result.transactions);

    if (page >= result.totalPages || result.transactions.length === 0) {
      break;
    }

    page += 1;
  }

  return transactions;
}
