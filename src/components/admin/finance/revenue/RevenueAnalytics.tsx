import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  LoaderCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { exportRevenueTransactions } from "../../../../lib/revenue";
import type {
  RevenueFilters,
  RevenueTransaction,
} from "../../../../types/revenue";
import {
  formatCompactCurrency,
  formatCurrency,
  formatLabel,
} from "../../../../utils/revenueTable";

interface RevenueAnalyticsProps {
  filters: RevenueFilters;
  refreshKey?: string | number;
}

interface AnalyticsBreakdownItem {
  key: string;
  label: string;
  amount: number;
  count: number;
}

interface MonthlyRevenuePoint {
  key: string;
  label: string;
  amount: number;
}

interface TopCustomerItem {
  key: string;
  name: string;
  amount: number;
  transactions: number;
}

/**
 * Return the net recognized value for one Revenue transaction.
 */
function getRecognizedRevenue(transaction: RevenueTransaction) {
  if (
    transaction.status !== "paid" &&
    transaction.status !== "partially_refunded" &&
    transaction.status !== "refunded"
  ) {
    return 0;
  }

  return Math.max(
    Number(transaction.amount || 0) - Number(transaction.refunded_amount || 0),
    0
  );
}

/**
 * Return a valid transaction date or null.
 */
function getTransactionDate(transaction: RevenueTransaction) {
  const date = new Date(transaction.transaction_date);

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Build the last twelve calendar-month buckets.
 */
function buildMonthlyRevenue(transactions: RevenueTransaction[]) {
  const now = new Date();
  const points: MonthlyRevenuePoint[] = [];

  for (let offset = 11; offset >= 0; offset -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${monthDate.getFullYear()}-${String(
      monthDate.getMonth() + 1
    ).padStart(2, "0")}`;

    points.push({
      key,
      label: new Intl.DateTimeFormat("en-NG", {
        month: "short",
      }).format(monthDate),
      amount: 0,
    });
  }

  const pointMap = new Map(points.map((point) => [point.key, point]));

  transactions.forEach((transaction) => {
    const date = getTransactionDate(transaction);

    if (!date) {
      return;
    }

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    const point = pointMap.get(key);

    if (point) {
      point.amount += getRecognizedRevenue(transaction);
    }
  });

  return points;
}

/**
 * Group Revenue transactions by one string field.
 */
function buildBreakdown(
  transactions: RevenueTransaction[],
  getKey: (transaction: RevenueTransaction) => string
) {
  const groups = new Map<string, AnalyticsBreakdownItem>();

  transactions.forEach((transaction) => {
    const key = getKey(transaction) || "other";
    const current = groups.get(key) ?? {
      key,
      label: formatLabel(key),
      amount: 0,
      count: 0,
    };

    current.amount += getRecognizedRevenue(transaction);
    current.count += 1;
    groups.set(key, current);
  });

  return Array.from(groups.values()).sort((first, second) => {
    return second.amount - first.amount;
  });
}

/**
 * Build the highest-value Revenue customers.
 */
function buildTopCustomers(transactions: RevenueTransaction[]) {
  const customers = new Map<string, TopCustomerItem>();

  transactions.forEach((transaction) => {
    const email = transaction.customer_email?.trim().toLowerCase() ?? "";
    const name = transaction.customer_name?.trim() || "Unidentified customer";
    const key = email || name.toLowerCase();
    const current = customers.get(key) ?? {
      key,
      name,
      amount: 0,
      transactions: 0,
    };

    current.amount += getRecognizedRevenue(transaction);
    current.transactions += 1;
    customers.set(key, current);
  });

  return Array.from(customers.values())
    .sort((first, second) => second.amount - first.amount)
    .slice(0, 5);
}

/**
 * Render one proportional analytics bar.
 */
function AnalyticsBar({
  label,
  value,
  maximum,
  displayValue,
}: {
  label: string;
  value: number;
  maximum: number;
  displayValue: string;
}) {
  const width = maximum > 0 ? Math.max((value / maximum) * 100, 2) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </span>
        <span className="shrink-0 text-slate-500 dark:text-slate-400">
          {displayValue}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-500 dark:bg-blue-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Display Revenue analytics calculated from all matching transactions.
 */
export default function RevenueAnalytics({
  filters,
  refreshKey = 0,
}: RevenueAnalyticsProps) {
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Load every transaction matching the active Revenue filters.
   */
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await exportRevenueTransactions(filters);
      setTransactions(result);
    } catch (error) {
      console.error("Failed to load Revenue analytics:", error);
      setErrorMessage("Revenue analytics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Reload analytics whenever its filters or refresh token changes.
  useEffect(() => {
    void refreshKey;
    void loadAnalytics();
  }, [loadAnalytics, refreshKey]);

  // Calculate reusable Revenue analytics values.
  const analytics = useMemo(() => {
    const currency = transactions[0]?.currency || "NGN";
    const monthlyRevenue = buildMonthlyRevenue(transactions);
    const categories = buildBreakdown(
      transactions,
      (transaction) => transaction.transaction_category
    );
    const providers = buildBreakdown(
      transactions,
      (transaction) => transaction.provider
    );
    const statuses = buildBreakdown(
      transactions,
      (transaction) => transaction.status
    );
    const topCustomers = buildTopCustomers(transactions);
    const totalRevenue = transactions.reduce((total, transaction) => {
      return total + getRecognizedRevenue(transaction);
    }, 0);
    const highestMonth = Math.max(
      ...monthlyRevenue.map((point) => point.amount),
      0
    );

    return {
      currency,
      monthlyRevenue,
      categories,
      providers,
      statuses,
      topCustomers,
      totalRevenue,
      highestMonth,
    };
  }, [transactions]);

  if (loading) {
    return (
      <article className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="text-center">
          <LoaderCircle
            size={28}
            className="mx-auto animate-spin text-blue-600 dark:text-blue-400"
          />
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Loading Revenue analytics
          </p>
        </div>
      </article>
    );
  }

  if (errorMessage) {
    return (
      <article className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <BarChart3 size={30} className="text-slate-400" />
        <p className="mt-3 font-semibold text-slate-900 dark:text-white">
          {errorMessage}
        </p>
        <button
          type="button"
          onClick={() => void loadAnalytics()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <RefreshCw size={15} /> Retry analytics
        </button>
      </article>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            Business performance
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
            Revenue analytics
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Insights calculated from all transactions matching the active
            filters.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAnalytics()}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <RefreshCw size={15} /> Refresh analytics
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-950 dark:text-white">
                Twelve-month Revenue trend
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Net recognized Revenue by transaction month.
              </p>
            </div>
            <CalendarDays size={19} className="text-slate-400" />
          </div>

          <div className="mt-6 flex h-56 items-end gap-2">
            {analytics.monthlyRevenue.map((point) => {
              const height = analytics.highestMonth
                ? Math.max((point.amount / analytics.highestMonth) * 100, 3)
                : 3;

              return (
                <div
                  key={point.key}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="hidden text-[10px] font-semibold text-slate-500 dark:text-slate-400 sm:block">
                    {point.amount > 0
                      ? formatCompactCurrency(point.amount, analytics.currency)
                      : "—"}
                  </span>
                  <div className="flex h-40 w-full items-end rounded-lg bg-slate-50 px-1 dark:bg-slate-900/60">
                    <div
                      title={`${point.label}: ${formatCurrency(
                        point.amount,
                        analytics.currency
                      )}`}
                      className="w-full rounded-md bg-blue-600 transition-[height] duration-500 dark:bg-blue-500"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 sm:text-xs">
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CircleDollarSign size={19} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Filtered net Revenue
              </p>
              <p className="text-xl font-bold text-slate-950 dark:text-white">
                {formatCompactCurrency(
                  analytics.totalRevenue,
                  analytics.currency
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {analytics.categories.slice(0, 5).map((category) => (
              <AnalyticsBar
                key={category.key}
                label={category.label}
                value={category.amount}
                maximum={analytics.categories[0]?.amount ?? 0}
                displayValue={formatCompactCurrency(
                  category.amount,
                  analytics.currency
                )}
              />
            ))}

            {analytics.categories.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No recognized Revenue is available for these filters.
              </p>
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="font-bold text-slate-950 dark:text-white">
            Revenue by provider
          </h3>
          <div className="mt-5 space-y-4">
            {analytics.providers.slice(0, 6).map((provider) => (
              <AnalyticsBar
                key={provider.key}
                label={provider.label}
                value={provider.amount}
                maximum={analytics.providers[0]?.amount ?? 0}
                displayValue={formatCompactCurrency(
                  provider.amount,
                  analytics.currency
                )}
              />
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="font-bold text-slate-950 dark:text-white">
            Transactions by status
          </h3>
          <div className="mt-5 space-y-4">
            {analytics.statuses.slice(0, 6).map((status) => (
              <AnalyticsBar
                key={status.key}
                label={status.label}
                value={status.count}
                maximum={Math.max(
                  ...analytics.statuses.map((item) => item.count),
                  0
                )}
                displayValue={`${status.count.toLocaleString("en-NG")} records`}
              />
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-bold text-slate-950 dark:text-white">
              Top customers
            </h3>
            <Users size={18} className="text-slate-400" />
          </div>

          <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
            {analytics.topCustomers.map((customer, index) => (
              <div
                key={customer.key}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {customer.name}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {customer.transactions.toLocaleString("en-NG")}{" "}
                      transactions
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-bold text-slate-950 dark:text-white">
                  {formatCompactCurrency(customer.amount, analytics.currency)}
                </span>
              </div>
            ))}

            {analytics.topCustomers.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No customer Revenue is available yet.
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
