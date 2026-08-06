import { supabase } from "./superbase";
import type {
  BudgetAllocationSummary,
  BudgetDetails,
  BudgetHealthStatus,
  BudgetListItem,
  BudgetListResponse,
  BudgetStatistics,
  CreateBudgetInput,
  FinanceBudget,
  ListBudgetsOptions,
  UpdateBudgetInput,
} from "../types/budget";

/**
 * Convert a PostgreSQL numeric value into a safe JavaScript number.
 */
function toSafeNumber(value: number | string | null | undefined) {
  const normalizedValue = Number(value ?? 0);

  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

/**
 * Escape characters that have special meaning in PostgREST search filters.
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
 * Determine a Budget's health from its usage and warning threshold.
 */
function getBudgetHealthStatus(
  usagePercentage: number,
  warningThreshold: number
): BudgetHealthStatus {
  if (usagePercentage > 100) {
    return "exceeded";
  }

  if (usagePercentage >= warningThreshold) {
    return "warning";
  }

  return "healthy";
}

/**
 * Normalize one raw Budget database record.
 */
function normalizeBudget(budget: Record<string, unknown>): FinanceBudget {
  return {
    id: String(budget.id),

    name: String(budget.name ?? ""),

    description:
      typeof budget.description === "string" ? budget.description : null,

    budget_type: budget.budget_type as FinanceBudget["budget_type"],

    department:
      typeof budget.department === "string" ? budget.department : null,

    project_code:
      typeof budget.project_code === "string" ? budget.project_code : null,

    currency: String(budget.currency ?? "NGN"),

    total_amount: toSafeNumber(
      budget.total_amount as number | string | null | undefined
    ),

    start_date: String(budget.start_date ?? ""),

    end_date: String(budget.end_date ?? ""),

    status: budget.status as FinanceBudget["status"],

    warning_threshold: toSafeNumber(
      budget.warning_threshold as number | string | null | undefined
    ),

    created_by:
      typeof budget.created_by === "string" ? budget.created_by : null,

    updated_by:
      typeof budget.updated_by === "string" ? budget.updated_by : null,

    created_at: String(budget.created_at ?? ""),

    updated_at: String(budget.updated_at ?? ""),

    archived_at:
      typeof budget.archived_at === "string" ? budget.archived_at : null,
  };
}

/**
 * Normalize one raw Budget allocation summary record.
 */
function normalizeBudgetAllocationSummary(
  allocation: Record<string, unknown>
): BudgetAllocationSummary {
  const usagePercentage = toSafeNumber(
    allocation.usage_percentage as number | string | null | undefined
  );

  const warningThreshold = toSafeNumber(
    allocation.warning_threshold as number | string | null | undefined
  );

  return {
    allocation_id: String(allocation.allocation_id ?? ""),

    budget_id: String(allocation.budget_id ?? ""),

    budget_name: String(allocation.budget_name ?? ""),

    currency: String(allocation.currency ?? "NGN"),

    start_date: String(allocation.start_date ?? ""),

    end_date: String(allocation.end_date ?? ""),

    budget_status:
      allocation.budget_status as BudgetAllocationSummary["budget_status"],

    warning_threshold: warningThreshold,

    transaction_category:
      allocation.transaction_category as BudgetAllocationSummary["transaction_category"],

    allocated_amount: toSafeNumber(
      allocation.allocated_amount as number | string | null | undefined
    ),

    used_amount: toSafeNumber(
      allocation.used_amount as number | string | null | undefined
    ),

    remaining_amount: toSafeNumber(
      allocation.remaining_amount as number | string | null | undefined
    ),

    usage_percentage: usagePercentage,

    health_status: getBudgetHealthStatus(usagePercentage, warningThreshold),
  };
}

/**
 * Build authenticated request headers for protected Budget API routes.
 */
async function getBudgetAuthorizationHeaders() {
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
 * Parse one Budget API response and handle HTML or non-JSON errors safely.
 */
async function parseBudgetApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const responseText = await response.text();

    console.error("Budget API returned a non-JSON response:", {
      status: response.status,
      url: response.url,
      responseText,
    });

    throw new Error(
      response.status === 404
        ? "The Budget API route was not found. Verify the route file and restart Astro."
        : `The Budget API returned an unexpected response (${response.status}).`
    );
  }

  const result = (await response.json()) as {
    success?: boolean;
    message?: string;
    budget?: T;
    data?: T;
  };

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ??
        `The Budget request failed with status ${response.status}.`
    );
  }

  const responseData = result.budget ?? result.data;

  if (!responseData) {
    throw new Error("The Budget API returned no Budget data.");
  }

  return responseData;
}

/**
 * Retrieve Budget allocation summaries, optionally for one Budget.
 */
export async function listBudgetAllocationSummaries(
  budgetId?: string
): Promise<BudgetAllocationSummary[]> {
  let query = supabase.from("finance_budget_allocation_summary").select("*");

  if (budgetId) {
    query = query.eq("budget_id", budgetId);
  }

  const { data, error } = await query.order("transaction_category", {
    ascending: true,
  });

  if (error) {
    console.error("Failed to load Budget allocation summaries:", error);

    throw error;
  }

  return (data ?? []).map((allocation) =>
    normalizeBudgetAllocationSummary(allocation as Record<string, unknown>)
  );
}

/**
 * Retrieve paginated Budgets and combine them with actual Expense usage.
 */
export async function listBudgets({
  page = 1,
  pageSize = 10,
  filters = {},
  sortBy = "start_date",
  sortDirection = "desc",
}: ListBudgetsOptions = {}): Promise<BudgetListResponse> {
  const safePage = Math.max(1, page);

  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const rangeStart = (safePage - 1) * safePageSize;

  const rangeEnd = rangeStart + safePageSize - 1;

  let query = supabase.from("finance_budgets").select("*", {
    count: "exact",
  });

  if (filters.archived === true) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  if (filters.budgetType && filters.budgetType !== "all") {
    query = query.eq("budget_type", filters.budgetType);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.currency?.trim()) {
    query = query.eq("currency", filters.currency.trim().toUpperCase());
  }

  if (filters.department?.trim()) {
    query = query.ilike(
      "department",
      `%${escapePostgrestSearch(filters.department.trim())}%`
    );
  }

  if (filters.dateFrom) {
    query = query.gte("end_date", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("start_date", filters.dateTo);
  }

  if (filters.search?.trim()) {
    const searchValue = escapePostgrestSearch(filters.search.trim());

    query = query.or(
      [
        `name.ilike.%${searchValue}%`,
        `description.ilike.%${searchValue}%`,
        `department.ilike.%${searchValue}%`,
        `project_code.ilike.%${searchValue}%`,
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
    console.error("Failed to load Budgets:", error);

    throw error;
  }

  const budgets = (data ?? []).map((budget) =>
    normalizeBudget(budget as Record<string, unknown>)
  );

  const budgetIds = budgets.map((budget) => budget.id);

  let summaries: BudgetAllocationSummary[] = [];

  if (budgetIds.length > 0) {
    const { data: summaryRows, error: summaryError } = await supabase
      .from("finance_budget_allocation_summary")
      .select("*")
      .in("budget_id", budgetIds)
      .order("transaction_category", {
        ascending: true,
      });

    if (summaryError) {
      console.error("Failed to load Budget summaries:", summaryError);

      throw summaryError;
    }

    summaries = (summaryRows ?? []).map((summary) =>
      normalizeBudgetAllocationSummary(summary as Record<string, unknown>)
    );
  }

  const summariesByBudget = new Map<string, BudgetAllocationSummary[]>();

  for (const summary of summaries) {
    const existingSummaries = summariesByBudget.get(summary.budget_id) ?? [];

    existingSummaries.push(summary);

    summariesByBudget.set(summary.budget_id, existingSummaries);
  }

  const budgetListItems: BudgetListItem[] = budgets.map((budget) => {
    const allocations = summariesByBudget.get(budget.id) ?? [];

    const allocatedAmount = allocations.reduce(
      (total, allocation) => total + allocation.allocated_amount,
      0
    );

    const usedAmount = allocations.reduce(
      (total, allocation) => total + allocation.used_amount,
      0
    );

    const remainingAmount = Math.max(allocatedAmount - usedAmount, 0);

    const usagePercentage =
      allocatedAmount > 0
        ? Number(((usedAmount / allocatedAmount) * 100).toFixed(2))
        : 0;

    return {
      ...budget,

      allocated_amount: allocatedAmount,

      used_amount: usedAmount,

      remaining_amount: remainingAmount,

      usage_percentage: usagePercentage,

      health_status: getBudgetHealthStatus(
        usagePercentage,
        budget.warning_threshold
      ),

      allocations_count: allocations.length,
    };
  });

  const total = count ?? 0;

  return {
    budgets: budgetListItems,

    total,

    page: safePage,

    pageSize: safePageSize,

    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

/**
 * Retrieve one Budget with all its allocation summaries.
 */
export async function getBudgetById(budgetId: string): Promise<BudgetDetails> {
  const { data, error } = await supabase
    .from("finance_budgets")
    .select("*")
    .eq("id", budgetId)
    .single();

  if (error) {
    console.error("Failed to load Budget:", error);

    throw error;
  }

  const budget = normalizeBudget(data as Record<string, unknown>);

  const allocations = await listBudgetAllocationSummaries(budgetId);

  const allocatedAmount = allocations.reduce(
    (total, allocation) => total + allocation.allocated_amount,
    0
  );

  const usedAmount = allocations.reduce(
    (total, allocation) => total + allocation.used_amount,
    0
  );

  const remainingAmount = Math.max(allocatedAmount - usedAmount, 0);

  const usagePercentage =
    allocatedAmount > 0
      ? Number(((usedAmount / allocatedAmount) * 100).toFixed(2))
      : 0;

  return {
    ...budget,

    allocations,

    allocated_amount: allocatedAmount,

    used_amount: usedAmount,

    remaining_amount: remainingAmount,

    usage_percentage: usagePercentage,

    health_status: getBudgetHealthStatus(
      usagePercentage,
      budget.warning_threshold
    ),
  };
}

/**
 * Retrieve Budget statistics for all active, non-archived Budgets.
 */
export async function getBudgetStatistics(): Promise<BudgetStatistics> {
  const { data, error } = await supabase
    .from("finance_budgets")
    .select("*")
    .is("archived_at", null);

  if (error) {
    console.error("Failed to load Budget statistics:", error);

    throw error;
  }

  const budgets = (data ?? []).map((budget) =>
    normalizeBudget(budget as Record<string, unknown>)
  );

  const budgetIds = budgets.map((budget) => budget.id);

  let summaries: BudgetAllocationSummary[] = [];

  if (budgetIds.length > 0) {
    const { data: summaryRows, error: summaryError } = await supabase
      .from("finance_budget_allocation_summary")
      .select("*")
      .in("budget_id", budgetIds);

    if (summaryError) {
      console.error(
        "Failed to load Budget allocation statistics:",
        summaryError
      );

      throw summaryError;
    }

    summaries = (summaryRows ?? []).map((summary) =>
      normalizeBudgetAllocationSummary(summary as Record<string, unknown>)
    );
  }

  const summariesByBudget = new Map<string, BudgetAllocationSummary[]>();

  for (const summary of summaries) {
    const existingSummaries = summariesByBudget.get(summary.budget_id) ?? [];

    existingSummaries.push(summary);

    summariesByBudget.set(summary.budget_id, existingSummaries);
  }

  let totalBudgeted = 0;
  let totalAllocated = 0;
  let totalUsed = 0;
  let activeBudgets = 0;
  let draftBudgets = 0;
  let warningBudgets = 0;
  let exceededBudgets = 0;
  let currency = "NGN";

  for (const budget of budgets) {
    const allocations = summariesByBudget.get(budget.id) ?? [];

    const allocatedAmount = allocations.reduce(
      (total, allocation) => total + allocation.allocated_amount,
      0
    );

    const usedAmount = allocations.reduce(
      (total, allocation) => total + allocation.used_amount,
      0
    );

    const usagePercentage =
      allocatedAmount > 0
        ? Number(((usedAmount / allocatedAmount) * 100).toFixed(2))
        : 0;

    const healthStatus = getBudgetHealthStatus(
      usagePercentage,
      budget.warning_threshold
    );

    totalBudgeted += budget.total_amount;
    totalAllocated += allocatedAmount;
    totalUsed += usedAmount;

    currency = budget.currency || currency;

    if (budget.status === "active") {
      activeBudgets += 1;
    }

    if (budget.status === "draft") {
      draftBudgets += 1;
    }

    if (healthStatus === "warning") {
      warningBudgets += 1;
    }

    if (healthStatus === "exceeded") {
      exceededBudgets += 1;
    }
  }

  return {
    totalBudgeted,

    totalAllocated,

    totalUsed,

    totalRemaining: Math.max(totalAllocated - totalUsed, 0),

    activeBudgets,

    draftBudgets,

    warningBudgets,

    exceededBudgets,

    averageUsagePercentage:
      totalAllocated > 0
        ? Number(((totalUsed / totalAllocated) * 100).toFixed(2))
        : 0,

    currency,
  };
}

/**
 * Create one Budget through the protected server endpoint.
 */
export async function createBudget(
  input: CreateBudgetInput
): Promise<BudgetDetails> {
  const headers = await getBudgetAuthorizationHeaders();

  const response = await fetch("/api/budgets", {
    method: "POST",

    headers,

    body: JSON.stringify(input),
  });

  return parseBudgetApiResponse<BudgetDetails>(response);
}

/**
 * Update one Budget through the protected server endpoint.
 */
export async function updateBudget(
  budgetId: string,
  input: UpdateBudgetInput
): Promise<BudgetDetails> {
  const headers = await getBudgetAuthorizationHeaders();

  const response = await fetch(`/api/budgets/${encodeURIComponent(budgetId)}`, {
    method: "PATCH",

    headers,

    body: JSON.stringify(input),
  });

  return parseBudgetApiResponse<BudgetDetails>(response);
}

/**
 * Archive one Budget while preserving its history.
 */
export async function archiveBudget(budgetId: string): Promise<FinanceBudget> {
  const headers = await getBudgetAuthorizationHeaders();

  const response = await fetch(
    `/api/budgets/${encodeURIComponent(budgetId)}/archive`,
    {
      method: "POST",

      headers,
    }
  );

  const budget =
    await parseBudgetApiResponse<Record<string, unknown>>(response);

  return normalizeBudget(budget);
}

/**
 * Restore one archived Budget.
 */
export async function restoreBudget(budgetId: string): Promise<FinanceBudget> {
  const headers = await getBudgetAuthorizationHeaders();

  const response = await fetch(
    `/api/budgets/${encodeURIComponent(budgetId)}/restore`,
    {
      method: "POST",

      headers,
    }
  );

  const budget =
    await parseBudgetApiResponse<Record<string, unknown>>(response);

  return normalizeBudget(budget);
}

/**
 * Escape one value for safe CSV output.
 */
function escapeBudgetCsvValue(value: unknown) {
  const normalizedValue = String(value ?? "");

  if (
    normalizedValue.includes(",") ||
    normalizedValue.includes('"') ||
    normalizedValue.includes("\n")
  ) {
    return `"${normalizedValue.replace(/"/g, '""')}"`;
  }

  return normalizedValue;
}

/**
 * Export the supplied Budget list to a CSV file.
 */
export function exportBudgetsCsv(budgets: BudgetListItem[]) {
  const rows = [
    [
      "Name",
      "Type",
      "Department",
      "Project Code",
      "Start Date",
      "End Date",
      "Status",
      "Currency",
      "Total Budget",
      "Allocated",
      "Used",
      "Remaining",
      "Usage Percentage",
      "Health",
      "Allocations",
    ],

    ...budgets.map((budget) => [
      budget.name,
      budget.budget_type,
      budget.department ?? "",
      budget.project_code ?? "",
      budget.start_date,
      budget.end_date,
      budget.status,
      budget.currency,
      budget.total_amount,
      budget.allocated_amount,
      budget.used_amount,
      budget.remaining_amount,
      budget.usage_percentage,
      budget.health_status,
      budget.allocations_count,
    ]),
  ];

  const csvContent = rows
    .map((row) => row.map(escapeBudgetCsvValue).join(","))
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const downloadUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = downloadUrl;

  anchor.download = `budgets-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(anchor);

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(downloadUrl);
}
