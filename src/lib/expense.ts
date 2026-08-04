import { supabase } from "./superbase";
import type {
  CreateExpenseInput,
  ExpenseFilters,
  ExpenseListResponse,
  ExpenseStatistics,
  ExpenseTransaction,
  ListExpensesOptions,
  UpdateExpenseInput,
} from "../types/expense";

const EXPENSE_TRANSACTION_TYPE = "expense";

const SETTLED_EXPENSE_STATUSES = ["paid", "completed", "successful"] as const;

const PENDING_EXPENSE_STATUSES = ["pending", "processing"] as const;

const REFUNDED_EXPENSE_STATUSES = ["refunded", "partially_refunded"] as const;

/**
 * Convert a PostgreSQL numeric value into a safe JavaScript number.
 */
function toSafeNumber(value: number | string | null | undefined) {
  const normalizedValue = Number(value ?? 0);

  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

/**
 * Convert unknown JSON values into a plain object.
 */
function normalizeJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

/**
 * Confirm whether one Expense status represents settled spending.
 */
function isSettledExpenseStatus(status: string | null | undefined) {
  return SETTLED_EXPENSE_STATUSES.includes(
    status as (typeof SETTLED_EXPENSE_STATUSES)[number]
  );
}

/**
 * Confirm whether one Expense status represents pending spending.
 */
function isPendingExpenseStatus(status: string | null | undefined) {
  return PENDING_EXPENSE_STATUSES.includes(
    status as (typeof PENDING_EXPENSE_STATUSES)[number]
  );
}

/**
 * Confirm whether one Expense status represents refunded spending.
 */
function isRefundedExpenseStatus(status: string | null | undefined) {
  return REFUNDED_EXPENSE_STATUSES.includes(
    status as (typeof REFUNDED_EXPENSE_STATUSES)[number]
  );
}

/**
 * Escape characters that have special meaning inside PostgREST filters.
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
 * Normalize one financial transaction as an Expense transaction.
 */
function normalizeExpenseTransaction(
  transaction: Record<string, unknown>
): ExpenseTransaction {
  return {
    id: String(transaction.id),

    transaction_type: "expense",

    transaction_category:
      transaction.transaction_category as ExpenseTransaction["transaction_category"],

    provider: String(transaction.provider ?? "manual"),

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

    status: transaction.status as ExpenseTransaction["status"],

    reconciliation_status:
      transaction.reconciliation_status as ExpenseTransaction["reconciliation_status"],

    transaction_date: String(transaction.transaction_date ?? ""),

    paid_at:
      typeof transaction.paid_at === "string" ? transaction.paid_at : null,

    reconciled_at:
      typeof transaction.reconciled_at === "string"
        ? transaction.reconciled_at
        : null,

    provider_payload: normalizeJsonObject(transaction.provider_payload),

    metadata: normalizeJsonObject(transaction.metadata),

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
 * Build the authenticated Authorization header required by Expense APIs.
 */
async function getExpenseAuthorizationHeaders() {
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
 * Parse one Expense API response and surface server errors consistently.
 */
async function parseExpenseApiResponse<T>(response: Response): Promise<T> {
  const result = (await response.json()) as {
    success?: boolean;
    message?: string;
    data?: T;
    expense?: T;
  };

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ?? "The Expense request could not be completed."
    );
  }

  const responseData = result.data ?? result.expense;

  if (!responseData) {
    throw new Error("The Expense API returned no data.");
  }

  return responseData;
}

/**
 * Retrieve paginated Expense transactions.
 */
export async function listExpenses({
  page = 1,
  pageSize = 10,
  filters = {},
  sortBy = "transaction_date",
  sortDirection = "desc",
}: ListExpensesOptions = {}): Promise<ExpenseListResponse> {
  const safePage = Math.max(1, page);

  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const rangeStart = (safePage - 1) * safePageSize;

  const rangeEnd = rangeStart + safePageSize - 1;

  let query = supabase
    .from("financial_transactions")
    .select("*", {
      count: "exact",
    })
    .eq("transaction_type", EXPENSE_TRANSACTION_TYPE);

  if (filters.archived === true) {
    query = query.not("archived_at", "is", null);
  } else {
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
        `description.ilike.%${searchValue}%`,
        `internal_reference.ilike.%${searchValue}%`,
        `provider_reference.ilike.%${searchValue}%`,
        `receipt_number.ilike.%${searchValue}%`,
        `customer_name.ilike.%${searchValue}%`,
        `customer_email.ilike.%${searchValue}%`,
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
    console.error("Failed to load Expenses:", error);

    throw error;
  }

  const total = count ?? 0;

  return {
    expenses: (data ?? []).map((transaction) =>
      normalizeExpenseTransaction(transaction as Record<string, unknown>)
    ),

    total,

    page: safePage,

    pageSize: safePageSize,

    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

/**
 * Retrieve one active Expense transaction by ID.
 */
export async function getExpenseById(
  expenseId: string
): Promise<ExpenseTransaction> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("id", expenseId)
    .eq("transaction_type", EXPENSE_TRANSACTION_TYPE)
    .single();

  if (error) {
    console.error("Failed to load Expense:", error);

    throw error;
  }

  return normalizeExpenseTransaction(data as Record<string, unknown>);
}

/**
 * Retrieve aggregated Expense statistics.
 */
export async function getExpenseStatistics(): Promise<ExpenseStatistics> {
  const currentDate = new Date();

  const currentMonthStart = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1)
  );

  const nextMonthStart = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 1)
  );

  const previousMonthStart = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 1, 1)
  );

  const { data, error } = await supabase
    .from("financial_transactions")
    .select(
      `
      amount,
      base_amount,
      currency,
      status,
      reconciliation_status,
      transaction_date,
      archived_at
      `
    )
    .eq("transaction_type", EXPENSE_TRANSACTION_TYPE)
    .is("archived_at", null);

  if (error) {
    console.error("Failed to load Expense statistics:", error);

    throw error;
  }

  let totalExpenses = 0;
  let currentMonthExpenses = 0;
  let previousMonthExpenses = 0;

  let pendingExpenses = 0;
  let paidExpenses = 0;
  let unreconciledExpenses = 0;
  let refundedExpenses = 0;

  let currency = "NGN";

  for (const expense of data ?? []) {
    const amount = toSafeNumber(expense.base_amount ?? expense.amount);

    if (expense.currency) {
      currency = expense.currency;
    }

    if (expense.reconciliation_status === "unreconciled") {
      unreconciledExpenses += amount;
    }

    if (isSettledExpenseStatus(expense.status)) {
      totalExpenses += amount;
      paidExpenses += amount;

      const transactionDate = new Date(
        `${expense.transaction_date}T00:00:00.000Z`
      );

      if (
        !Number.isNaN(transactionDate.getTime()) &&
        transactionDate >= currentMonthStart &&
        transactionDate < nextMonthStart
      ) {
        currentMonthExpenses += amount;
      }

      if (
        !Number.isNaN(transactionDate.getTime()) &&
        transactionDate >= previousMonthStart &&
        transactionDate < currentMonthStart
      ) {
        previousMonthExpenses += amount;
      }
    }

    if (isPendingExpenseStatus(expense.status)) {
      pendingExpenses += amount;
    }

    if (isRefundedExpenseStatus(expense.status)) {
      refundedExpenses += amount;
    }
  }

  const percentageChange =
    previousMonthExpenses > 0
      ? Number(
          (
            ((currentMonthExpenses - previousMonthExpenses) /
              previousMonthExpenses) *
            100
          ).toFixed(1)
        )
      : currentMonthExpenses > 0
        ? 100
        : 0;

  return {
    totalExpenses,
    currentMonthExpenses,
    previousMonthExpenses,
    percentageChange,
    pendingExpenses,
    paidExpenses,
    unreconciledExpenses,
    refundedExpenses,
    currency,
  };
}

/**
 * Create one Expense using the protected server endpoint.
 */
export async function createExpense(
  input: CreateExpenseInput
): Promise<ExpenseTransaction> {
  const headers = await getExpenseAuthorizationHeaders();

  const response = await fetch("/api/expenses", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });

  const expense =
    await parseExpenseApiResponse<Record<string, unknown>>(response);

  return normalizeExpenseTransaction(expense);
}

/**
 * Update one Expense using the protected server endpoint.
 */
export async function updateExpense(
  expenseId: string,
  input: UpdateExpenseInput
): Promise<ExpenseTransaction> {
  const headers = await getExpenseAuthorizationHeaders();

  const response = await fetch(
    `/api/expenses/${encodeURIComponent(expenseId)}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(input),
    }
  );

  const expense =
    await parseExpenseApiResponse<Record<string, unknown>>(response);

  return normalizeExpenseTransaction(expense);
}

/**
 * Archive one Expense without deleting its audit history.
 */
export async function archiveExpense(
  expenseId: string
): Promise<ExpenseTransaction> {
  const headers = await getExpenseAuthorizationHeaders();

  const response = await fetch(
    `/api/expenses/${encodeURIComponent(expenseId)}/archive`,
    {
      method: "POST",
      headers,
    }
  );

  const expense =
    await parseExpenseApiResponse<Record<string, unknown>>(response);

  return normalizeExpenseTransaction(expense);
}

/**
 * Restore one archived Expense.
 */
export async function restoreExpense(
  expenseId: string
): Promise<ExpenseTransaction> {
  const headers = await getExpenseAuthorizationHeaders();

  const response = await fetch(
    `/api/expenses/${encodeURIComponent(expenseId)}/restore`,
    {
      method: "POST",
      headers,
    }
  );

  const expense =
    await parseExpenseApiResponse<Record<string, unknown>>(response);

  return normalizeExpenseTransaction(expense);
}

/**
 * Mark one Expense as reconciled.
 */
export async function reconcileExpense(
  expenseId: string
): Promise<ExpenseTransaction> {
  return updateExpense(expenseId, {
    reconciliation_status: "reconciled",

    paid_at: new Date().toISOString(),
  });
}

/**
 * Export the supplied Expense transactions to CSV.
 */
export function exportExpensesCsv(expenses: ExpenseTransaction[]) {
  const rows = [
    [
      "Date",
      "Reference",
      "Description",
      "Category",
      "Provider",
      "Payment Method",
      "Amount",
      "Currency",
      "Status",
      "Reconciliation",
      "Receipt Number",
    ],

    ...expenses.map((expense) => [
      expense.transaction_date,
      expense.internal_reference,
      expense.description,
      expense.transaction_category,
      expense.provider,
      expense.payment_method ?? "",
      expense.amount,
      expense.currency,
      expense.status,
      expense.reconciliation_status,
      expense.receipt_number ?? "",
    ]),
  ];

  /**
   * Escape CSV values containing commas, quotes, or line breaks.
   */
  const csvContent = rows
    .map((row) =>
      row
        .map((value) => {
          const stringValue = String(value ?? "");

          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }

          return stringValue;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const downloadUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = downloadUrl;

  anchor.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(downloadUrl);
}
