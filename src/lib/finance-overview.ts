import { supabase } from "./superbase";
import type {
  FinanceOverviewBreakdownItem,
  FinanceOverviewData,
  FinanceOverviewMonthlyPoint,
} from "../types/finance-overview";

const SETTLED_TRANSACTION_STATUSES = [
  "paid",
  "completed",
  "successful",
] as const;

/**
 * Convert PostgreSQL numeric values into safe JavaScript numbers.
 */
function toSafeNumber(value: number | string | null | undefined) {
  const normalizedValue = Number(value ?? 0);

  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

/**
 * Confirm whether a transaction status represents settled money.
 */
function isSettledTransactionStatus(status: string | null | undefined) {
  return SETTLED_TRANSACTION_STATUSES.includes(
    status as (typeof SETTLED_TRANSACTION_STATUSES)[number]
  );
}

/**
 * Convert a YYYY-MM month key into a readable chart label.
 */
function formatMonthLabel(monthKey: string) {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return monthKey;
  }

  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Build a continuous twelve-month range ending with the current month.
 */
function buildRecentMonthRange() {
  const currentDate = new Date();
  const months: string[] = [];

  for (let monthOffset = 11; monthOffset >= 0; monthOffset -= 1) {
    const monthDate = new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth() - monthOffset,
        1
      )
    );

    months.push(monthDate.toISOString().slice(0, 7));
  }

  return months;
}

/**
 * Build one sorted percentage breakdown from accumulated values.
 */
function buildBreakdown(
  values: Map<
    string,
    {
      amount: number;
      count: number;
    }
  >,
  totalAmount: number
): FinanceOverviewBreakdownItem[] {
  return Array.from(values.entries())
    .map(([label, value]) => ({
      label,
      amount: value.amount,
      count: value.count,

      percentage:
        totalAmount > 0
          ? Number(((value.amount / totalAmount) * 100).toFixed(1))
          : 0,
    }))
    .sort((firstItem, secondItem) => secondItem.amount - firstItem.amount);
}

/**
 * Calculate percentage growth between the current and previous period.
 */
function calculateGrowth(currentValue: number, previousValue: number) {
  if (previousValue > 0) {
    return Number(
      (((currentValue - previousValue) / previousValue) * 100).toFixed(1)
    );
  }

  return currentValue > 0 ? 100 : 0;
}

/**
 * Retrieve and calculate the complete Finance Overview.
 */
export async function getFinanceOverview(): Promise<FinanceOverviewData> {
  const [transactionsResult, invoicesResult, receiptsResult] =
    await Promise.all([
      supabase
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
        archived_at
        `
        )
        .in("transaction_type", ["income", "expense"])
        .is("archived_at", null)
        .order("transaction_date", {
          ascending: true,
        }),

      supabase
        .from("invoices")
        .select(
          `
        id,
        status,
        total_amount,
        amount_paid,
        amount_due,
        currency,
        archived_at
        `
        )
        .is("archived_at", null),

      supabase.from("receipts").select(
        `
        id,
        status,
        currency
        `
      ),
    ]);

  if (transactionsResult.error) {
    console.error(
      "Failed to load Finance Overview transactions:",
      transactionsResult.error
    );

    throw transactionsResult.error;
  }

  if (invoicesResult.error) {
    console.error(
      "Failed to load Finance Overview Invoices:",
      invoicesResult.error
    );

    throw invoicesResult.error;
  }

  if (receiptsResult.error) {
    console.error(
      "Failed to load Finance Overview Receipts:",
      receiptsResult.error
    );

    throw receiptsResult.error;
  }

  const currentDate = new Date();

  const currentMonthKey = currentDate.toISOString().slice(0, 7);

  const previousMonthKey = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 1, 1)
  )
    .toISOString()
    .slice(0, 7);

  let totalRevenue = 0;
  let totalExpenses = 0;

  let currentMonthRevenue = 0;
  let previousMonthRevenue = 0;

  let currentMonthExpenses = 0;
  let previousMonthExpenses = 0;

  let currency = "NGN";

  const monthlyPerformanceMap = new Map<string, FinanceOverviewMonthlyPoint>();

  const revenueCategoryMap = new Map<
    string,
    {
      amount: number;
      count: number;
    }
  >();

  const expenseCategoryMap = new Map<
    string,
    {
      amount: number;
      count: number;
    }
  >();

  const revenueProviderMap = new Map<
    string,
    {
      amount: number;
      count: number;
    }
  >();

  /**
   * Seed the chart with the latest twelve months so months with no
   * transactions still appear as zero values.
   */
  for (const monthKey of buildRecentMonthRange()) {
    monthlyPerformanceMap.set(monthKey, {
      month: monthKey,
      monthLabel: formatMonthLabel(monthKey),
      revenue: 0,
      expenses: 0,
      profit: 0,
    });
  }

  /**
   * Aggregate settled Revenue and Expense transactions.
   */
  for (const transaction of transactionsResult.data ?? []) {
    if (!isSettledTransactionStatus(transaction.status)) {
      continue;
    }

    const amount = toSafeNumber(transaction.base_amount ?? transaction.amount);

    const monthKey = transaction.transaction_date.slice(0, 7);

    const monthlyPoint = monthlyPerformanceMap.get(monthKey) ?? {
      month: monthKey,
      monthLabel: formatMonthLabel(monthKey),
      revenue: 0,
      expenses: 0,
      profit: 0,
    };

    if (transaction.currency) {
      currency = transaction.currency;
    }

    if (transaction.transaction_type === "income") {
      totalRevenue += amount;
      monthlyPoint.revenue += amount;

      if (monthKey === currentMonthKey) {
        currentMonthRevenue += amount;
      }

      if (monthKey === previousMonthKey) {
        previousMonthRevenue += amount;
      }

      const categoryValue = revenueCategoryMap.get(
        transaction.transaction_category
      ) ?? {
        amount: 0,
        count: 0,
      };

      categoryValue.amount += amount;
      categoryValue.count += 1;

      revenueCategoryMap.set(transaction.transaction_category, categoryValue);

      const providerValue = revenueProviderMap.get(transaction.provider) ?? {
        amount: 0,
        count: 0,
      };

      providerValue.amount += amount;
      providerValue.count += 1;

      revenueProviderMap.set(transaction.provider, providerValue);
    }

    if (transaction.transaction_type === "expense") {
      totalExpenses += amount;
      monthlyPoint.expenses += amount;

      if (monthKey === currentMonthKey) {
        currentMonthExpenses += amount;
      }

      if (monthKey === previousMonthKey) {
        previousMonthExpenses += amount;
      }

      const categoryValue = expenseCategoryMap.get(
        transaction.transaction_category
      ) ?? {
        amount: 0,
        count: 0,
      };

      categoryValue.amount += amount;
      categoryValue.count += 1;

      expenseCategoryMap.set(transaction.transaction_category, categoryValue);
    }

    monthlyPoint.profit = monthlyPoint.revenue - monthlyPoint.expenses;

    monthlyPerformanceMap.set(monthKey, monthlyPoint);
  }

  const invoices = invoicesResult.data ?? [];

  const receipts = receiptsResult.data ?? [];

  /**
   * Sum outstanding balances across all active Invoices.
   */
  const outstandingInvoices = invoices.reduce(
    (total, invoice) => total + toSafeNumber(invoice.amount_due),
    0
  );

  /**
   * Count paid and still-actionable Invoices.
   */
  const paidInvoices = invoices.filter(
    (invoice) => invoice.status === "paid"
  ).length;

  const pendingInvoices = invoices.filter(
    (invoice) =>
      invoice.status !== "paid" &&
      invoice.status !== "cancelled" &&
      invoice.status !== "refunded"
  ).length;

  /**
   * Count valid issued Receipts.
   */
  const issuedReceipts = receipts.filter(
    (receipt) => receipt.status === "issued"
  ).length;

  const grossProfit = totalRevenue - totalExpenses;

  const profitMargin =
    totalRevenue > 0
      ? Number(((grossProfit / totalRevenue) * 100).toFixed(1))
      : 0;

  return {
    totalRevenue,
    totalExpenses,
    grossProfit,
    profitMargin,
    outstandingInvoices,

    currentMonthRevenue,
    previousMonthRevenue,

    currentMonthExpenses,
    previousMonthExpenses,

    revenueGrowth: calculateGrowth(currentMonthRevenue, previousMonthRevenue),

    expenseGrowth: calculateGrowth(currentMonthExpenses, previousMonthExpenses),

    paidInvoices,
    pendingInvoices,
    issuedReceipts,
    currency,

    monthlyPerformance: Array.from(monthlyPerformanceMap.values()).sort(
      (firstMonth, secondMonth) =>
        firstMonth.month.localeCompare(secondMonth.month)
    ),

    revenueByCategory: buildBreakdown(revenueCategoryMap, totalRevenue),

    expenseByCategory: buildBreakdown(expenseCategoryMap, totalExpenses),

    revenueByProvider: buildBreakdown(revenueProviderMap, totalRevenue),
  };
}
