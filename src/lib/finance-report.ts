import { supabase } from "./superbase";
import type {
  FinanceMonthlyPerformance,
  FinanceReportBreakdownItem,
  FinanceReportFilters,
  FinanceReportSummary,
  FinanceReportTransaction,
} from "../types/finance-report";

const RECOGNIZED_PAID_STATUSES = [
  "paid",
  "completed",
  "successful",
] as const;

/**
 * Convert a PostgreSQL numeric value into a safe JavaScript number.
 */
function toSafeNumber(
  value: number | string | null | undefined
) {
  const normalizedValue = Number(value ?? 0);

  return Number.isFinite(normalizedValue)
    ? normalizedValue
    : 0;
}

/**
 * Confirm whether one status represents a recognized settled transaction.
 */
function isRecognizedPaidStatus(
  status: string | null | undefined
) {
  return RECOGNIZED_PAID_STATUSES.includes(
    status as (typeof RECOGNIZED_PAID_STATUSES)[number]
  );
}

/**
 * Convert one database row into a normalized Finance report transaction.
 */
function normalizeFinanceReportTransaction(
  transaction: Record<string, unknown>
): FinanceReportTransaction {
  return {
    id: String(transaction.id),

    transaction_type:
      transaction.transaction_type as
        | "income"
        | "expense",

    transaction_category: String(
      transaction.transaction_category ?? "other"
    ),

    provider: String(
      transaction.provider ?? "manual"
    ),

    amount: toSafeNumber(
      transaction.amount as number | string | null
    ),

    base_amount:
      transaction.base_amount === null ||
      transaction.base_amount === undefined
        ? null
        : toSafeNumber(
            transaction.base_amount as
              | number
              | string
          ),

    currency: String(
      transaction.currency ?? "NGN"
    ),

    status: String(
      transaction.status ?? ""
    ),

    transaction_date: String(
      transaction.transaction_date ?? ""
    ),

    paid_at:
      typeof transaction.paid_at === "string"
        ? transaction.paid_at
        : null,

    description: String(
      transaction.description ?? ""
    ),

    customer_name:
      typeof transaction.customer_name === "string"
        ? transaction.customer_name
        : null,

    provider_reference:
      typeof transaction.provider_reference === "string"
        ? transaction.provider_reference
        : null,

    archived_at:
      typeof transaction.archived_at === "string"
        ? transaction.archived_at
        : null,
  };
}

/**
 * Convert one key/value map into a sorted Finance breakdown.
 */
function buildBreakdown(
  amounts: Map<
    string,
    {
      amount: number;
      count: number;
    }
  >,
  total: number
): FinanceReportBreakdownItem[] {
  return Array.from(
    amounts.entries()
  )
    .map(
      ([label, value]) => ({
        label,
        amount: value.amount,
        count: value.count,
        percentage:
          total > 0
            ? Number(
                (
                  (value.amount / total) *
                  100
                ).toFixed(1)
              )
            : 0,
      })
    )
    .sort(
      (first, second) =>
        second.amount - first.amount
    );
}

/**
 * Format a YYYY-MM month key into a readable label.
 */
function formatMonthLabel(
  monthKey: string
) {
  const date = new Date(
    `${monthKey}-01T00:00:00.000Z`
  );

  if (Number.isNaN(date.getTime())) {
    return monthKey;
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }
  ).format(date);
}

/**
 * Build a continuous month range for Finance reporting.
 */
function getMonthRange(
  dateFrom?: string,
  dateTo?: string
) {
  const endDate = dateTo
    ? new Date(
        `${dateTo}T00:00:00.000Z`
      )
    : new Date();

  const startDate = dateFrom
    ? new Date(
        `${dateFrom}T00:00:00.000Z`
      )
    : new Date(
        Date.UTC(
          endDate.getUTCFullYear(),
          endDate.getUTCMonth() - 11,
          1
        )
      );

  const cursor = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      1
    )
  );

  const finalMonth = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      1
    )
  );

  const monthKeys: string[] = [];

  while (cursor <= finalMonth) {
    monthKeys.push(
      cursor.toISOString().slice(0, 7)
    );

    cursor.setUTCMonth(
      cursor.getUTCMonth() + 1
    );
  }

  return monthKeys;
}

/**
 * Retrieve the complete Finance report summary.
 */
export async function getFinanceReportSummary(
  filters: FinanceReportFilters = {}
): Promise<FinanceReportSummary> {
  let query = supabase
    .from("financial_transactions")
    .select(
      `
      id,
      transaction_type,
      transaction_category,
      provider,
      amount,
      base_amount,
      currency,
      status,
      transaction_date,
      paid_at,
      description,
      customer_name,
      provider_reference,
      archived_at
      `
    )
    .in("transaction_type", [
      "income",
      "expense",
    ])
    .is("archived_at", null);

  if (filters.currency) {
    query = query.eq(
      "currency",
      filters.currency
        .trim()
        .toUpperCase()
    );
  }

  if (filters.dateFrom) {
    query = query.gte(
      "transaction_date",
      filters.dateFrom
    );
  }

  if (filters.dateTo) {
    query = query.lte(
      "transaction_date",
      filters.dateTo
    );
  }

  const { data, error } =
    await query.order(
      "transaction_date",
      {
        ascending: true,
      }
    );

  if (error) {
    console.error(
      "Failed to load Finance report:",
      error
    );

    throw error;
  }

  const transactions = (data ?? [])
    .map((transaction) =>
      normalizeFinanceReportTransaction(
        transaction as Record<
          string,
          unknown
        >
      )
    )
    .filter((transaction) =>
      isRecognizedPaidStatus(
        transaction.status
      )
    );

  let totalRevenue = 0;
  let totalExpenses = 0;
  let paidRevenueTransactions = 0;
  let paidExpenseTransactions = 0;
  let currency =
    filters.currency?.toUpperCase() ??
    "NGN";

  const revenueCategoryMap =
    new Map<
      string,
      {
        amount: number;
        count: number;
      }
    >();

  const expenseCategoryMap =
    new Map<
      string,
      {
        amount: number;
        count: number;
      }
    >();

  const revenueProviderMap =
    new Map<
      string,
      {
        amount: number;
        count: number;
      }
    >();

  const monthMap = new Map<
    string,
    FinanceMonthlyPerformance
  >();

  for (const monthKey of getMonthRange(
    filters.dateFrom,
    filters.dateTo
  )) {
    monthMap.set(monthKey, {
      month: monthKey,
      monthLabel:
        formatMonthLabel(monthKey),
      revenue: 0,
      expenses: 0,
      profit: 0,
    });
  }

  for (const transaction of transactions) {
    const amount =
      transaction.base_amount ??
      transaction.amount;

    currency =
      transaction.currency ||
      currency;

    const monthKey =
      transaction.transaction_date.slice(
        0,
        7
      );

    const monthValue =
      monthMap.get(monthKey) ?? {
        month: monthKey,
        monthLabel:
          formatMonthLabel(monthKey),
        revenue: 0,
        expenses: 0,
        profit: 0,
      };

    if (
      transaction.transaction_type ===
      "income"
    ) {
      totalRevenue += amount;
      paidRevenueTransactions += 1;

      monthValue.revenue += amount;

      const categoryValue =
        revenueCategoryMap.get(
          transaction.transaction_category
        ) ?? {
          amount: 0,
          count: 0,
        };

      categoryValue.amount += amount;
      categoryValue.count += 1;

      revenueCategoryMap.set(
        transaction.transaction_category,
        categoryValue
      );

      const providerValue =
        revenueProviderMap.get(
          transaction.provider
        ) ?? {
          amount: 0,
          count: 0,
        };

      providerValue.amount += amount;
      providerValue.count += 1;

      revenueProviderMap.set(
        transaction.provider,
        providerValue
      );
    }

    if (
      transaction.transaction_type ===
      "expense"
    ) {
      totalExpenses += amount;
      paidExpenseTransactions += 1;

      monthValue.expenses += amount;

      const categoryValue =
        expenseCategoryMap.get(
          transaction.transaction_category
        ) ?? {
          amount: 0,
          count: 0,
        };

      categoryValue.amount += amount;
      categoryValue.count += 1;

      expenseCategoryMap.set(
        transaction.transaction_category,
        categoryValue
      );
    }

    monthValue.profit =
      monthValue.revenue -
      monthValue.expenses;

    monthMap.set(
      monthKey,
      monthValue
    );
  }

  const grossProfit =
    totalRevenue - totalExpenses;

  const profitMargin =
    totalRevenue > 0
      ? Number(
          (
            (grossProfit /
              totalRevenue) *
            100
          ).toFixed(1)
        )
      : 0;

  return {
    totalRevenue,
    totalExpenses,
    grossProfit,
    profitMargin,
    paidRevenueTransactions,
    paidExpenseTransactions,
    currency,

    revenueByCategory:
      buildBreakdown(
        revenueCategoryMap,
        totalRevenue
      ),

    expensesByCategory:
      buildBreakdown(
        expenseCategoryMap,
        totalExpenses
      ),

    revenueByProvider:
      buildBreakdown(
        revenueProviderMap,
        totalRevenue
      ),

    monthlyPerformance:
      Array.from(
        monthMap.values()
      ).sort((first, second) =>
        first.month.localeCompare(
          second.month
        )
      ),

    transactions,
  };
}

/**
 * Escape one CSV cell safely.
 */
function escapeCsvCell(
  value: unknown
) {
  const stringValue = String(
    value ?? ""
  );

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(
      /"/g,
      '""'
    )}"`;
  }

  return stringValue;
}

/**
 * Export Finance report transactions to CSV.
 */
export function exportFinanceReportCsv(
  summary: FinanceReportSummary
) {
  const rows = [
    [
      "Date",
      "Type",
      "Category",
      "Provider",
      "Description",
      "Customer",
      "Reference",
      "Amount",
      "Currency",
      "Status",
    ],

    ...summary.transactions.map(
      (transaction) => [
        transaction.transaction_date,
        transaction.transaction_type,
        transaction.transaction_category,
        transaction.provider,
        transaction.description,
        transaction.customer_name ?? "",
        transaction.provider_reference ?? "",
        transaction.base_amount ??
          transaction.amount,
        transaction.currency,
        transaction.status,
      ]
    ),
  ];

  const csvContent = rows
    .map((row) =>
      row
        .map(escapeCsvCell)
        .join(",")
    )
    .join("\n");

  const blob = new Blob(
    [csvContent],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const downloadUrl =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = downloadUrl;
  anchor.download =
    `finance-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(
    downloadUrl
  );
}
