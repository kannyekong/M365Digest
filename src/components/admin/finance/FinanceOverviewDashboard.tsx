import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  FileText,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Sector,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  FinanceOverviewBreakdownItem,
  FinanceOverviewData,
} from "../../../types/finance-overview";
import { getFinanceOverview } from "../../../lib/finance-overview";
import FinanceStatePanel from "./FinanceStatePanel";

const EMPTY_OVERVIEW: FinanceOverviewData = {
  totalRevenue: 0,
  totalExpenses: 0,
  grossProfit: 0,
  profitMargin: 0,
  outstandingInvoices: 0,

  currentMonthRevenue: 0,
  previousMonthRevenue: 0,

  currentMonthExpenses: 0,
  previousMonthExpenses: 0,

  revenueGrowth: 0,
  expenseGrowth: 0,

  paidInvoices: 0,
  pendingInvoices: 0,
  issuedReceipts: 0,

  currency: "NGN",

  monthlyPerformance: [],
  revenueByCategory: [],
  expenseByCategory: [],
  revenueByProvider: [],
};

const PIE_CHART_COLORS = [
  "#2563eb",
  "#db2777",
  "#7c3aed",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#4f46e5",
];

/**
 * Format a Finance amount using the active ISO currency code.
 */
function formatFinanceCurrency(amount: number, currency = "NGN") {
  return `${currency.toUpperCase()} ${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/**
 * Convert underscore-separated database values into readable labels.
 */
function formatFinanceLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return readable growth text for one Finance metric.
 */
function formatGrowthText(growth: number, label: string) {
  if (growth === 0) {
    return `No change in ${label}`;
  }

  return `${Math.abs(growth)}% ${growth > 0 ? "increase" : "decrease"}`;
}

/**
 * Return theme-aware classes for a growth indicator.
 */
function getGrowthClasses(growth: number, inverse = false) {
  const positive = inverse ? growth <= 0 : growth >= 0;

  return positive
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
}

/**
 * Render one summary card for the Finance Overview.
 */
function OverviewMetricCard({
  title,
  value,
  note,
  icon: Icon,
  iconClassName,
  noteClassName,
}: {
  title: string;
  value: string;
  note: string;
  icon: typeof Banknote;
  iconClassName: string;
  noteClassName?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClassName}`}
        >
          <Icon size={20} />
        </div>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
        {value}
      </p>

      <p
        className={`mt-2 text-xs font-medium ${
          noteClassName ?? "text-slate-500 dark:text-slate-400"
        }`}
      >
        {note}
      </p>
    </article>
  );
}

/**
 * Render one Finance breakdown list beside graphical charts.
 */
function FinanceBreakdownList({
  title,
  items,
  currency,
}: {
  title: string;
  items: FinanceOverviewBreakdownItem[];
  currency: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h2 className="font-semibold text-slate-950 dark:text-white">{title}</h2>

      {items.length === 0 ? (
        <div className="mt-5">
          <FinanceStatePanel
            type="empty"
            title="No breakdown data"
            message="This section will populate as settled Finance transactions are recorded."
          />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {items.slice(0, 5).map((item, index) => (
            <article key={item.label}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {formatFinanceLabel(item.label)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.count} transaction
                    {item.count === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    {formatFinanceCurrency(item.amount, currency)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.percentage}%
                  </p>
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, item.percentage)}%`,
                    backgroundColor:
                      PIE_CHART_COLORS[index % PIE_CHART_COLORS.length],
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Render the complete graphical Finance Overview.
 */
export default function FinanceOverviewDashboard() {
  const [overview, setOverview] = useState<FinanceOverviewData>(EMPTY_OVERVIEW);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Retrieve the latest Finance Overview data.
   */
  const loadOverview = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const overviewData = await getFinanceOverview();

      setOverview(overviewData);
    } catch (error) {
      console.error("Failed to load Finance Overview:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The Finance Overview could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const revenueCategoryChartData = useMemo(
    () =>
      overview.revenueByCategory.map((item) => ({
        name: formatFinanceLabel(item.label),

        value: item.amount,
      })),
    [overview.revenueByCategory]
  );

  const revenueProviderChartData = useMemo(
    () =>
      overview.revenueByProvider.map((item) => ({
        name: formatFinanceLabel(item.label),

        value: item.amount,
      })),
    [overview.revenueByProvider]
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
            Finance Overview
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Monitor Revenue, Expenses, profitability, Invoices and Receipts from
            one live dashboard.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOverview()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {loading ? (
        <FinanceStatePanel type="loading" />
      ) : errorMessage ? (
        <FinanceStatePanel
          type="error"
          message={errorMessage}
          onRetry={() => void loadOverview()}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewMetricCard
              title="Total Revenue"
              value={formatFinanceCurrency(
                overview.totalRevenue,
                overview.currency
              )}
              note={formatGrowthText(overview.revenueGrowth, "Revenue")}
              icon={ArrowUpRight}
              iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              noteClassName={getGrowthClasses(overview.revenueGrowth)}
            />

            <OverviewMetricCard
              title="Total Expenses"
              value={formatFinanceCurrency(
                overview.totalExpenses,
                overview.currency
              )}
              note={formatGrowthText(overview.expenseGrowth, "Expenses")}
              icon={ArrowDownRight}
              iconClassName="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              noteClassName={getGrowthClasses(overview.expenseGrowth, true)}
            />

            <OverviewMetricCard
              title="Gross Profit"
              value={formatFinanceCurrency(
                overview.grossProfit,
                overview.currency
              )}
              note={`${overview.profitMargin}% profit margin`}
              icon={Banknote}
              iconClassName="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
            />

            <OverviewMetricCard
              title="Outstanding Invoices"
              value={formatFinanceCurrency(
                overview.outstandingInvoices,
                overview.currency
              )}
              note={`${overview.pendingInvoices} pending Invoice${
                overview.pendingInvoices === 1 ? "" : "s"
              }`}
              icon={FileText}
              iconClassName="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <TrendingUp
                  size={19}
                  className="text-blue-600 dark:text-blue-400"
                />

                <div>
                  <h2 className="font-semibold text-slate-950 dark:text-white">
                    Revenue vs Expenses
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Settled monthly Finance performance
                  </p>
                </div>
              </div>

              <div className="mt-6 h-80">
                {overview.monthlyPerformance.length === 0 ? (
                  <FinanceStatePanel
                    type="empty"
                    title="No monthly data"
                    message="Monthly Finance performance will appear as settled transactions are recorded."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={overview.monthlyPerformance}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />

                      <XAxis
                        dataKey="monthLabel"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                      />

                      <YAxis tickLine={false} axisLine={false} fontSize={12} />

                      <Tooltip
                        formatter={(value) =>
                          formatFinanceCurrency(
                            Number(value),
                            overview.currency
                          )
                        }
                      />

                      <Legend />

                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#16a34a"
                        fill="#16a34a"
                        fillOpacity={0.12}
                        strokeWidth={2}
                      />

                      <Area
                        type="monotone"
                        dataKey="expenses"
                        name="Expenses"
                        stroke="#dc2626"
                        fill="#dc2626"
                        fillOpacity={0.08}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  Monthly Profit
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Revenue minus Expenses
                </p>
              </div>

              <div className="mt-6 h-80">
                {overview.monthlyPerformance.length === 0 ? (
                  <FinanceStatePanel
                    type="empty"
                    title="No Profit data"
                    message="Profit values will appear after Revenue and Expense transactions are recorded."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={overview.monthlyPerformance}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />

                      <XAxis
                        dataKey="monthLabel"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                      />

                      <YAxis tickLine={false} axisLine={false} fontSize={12} />

                      <Tooltip
                        formatter={(value) =>
                          formatFinanceCurrency(
                            Number(value),
                            overview.currency
                          )
                        }
                      />

                      <Bar
                        dataKey="profit"
                        name="Profit"
                        fill="#2563eb"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  Revenue by Category
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Revenue distribution across business categories
                </p>
              </div>

              <div className="mt-5 h-72">
                {revenueCategoryChartData.length === 0 ? (
                  <FinanceStatePanel
                    type="empty"
                    title="No Revenue categories"
                    message="Category distribution will appear after settled Revenue transactions are recorded."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueCategoryChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={3}
                      >
                        {revenueCategoryChartData.map((entry, index) => (
                          <Cell
                            key={`${entry.name}-${index}`}
                            fill={
                              PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={(value) =>
                          formatFinanceCurrency(
                            Number(value),
                            overview.currency
                          )
                        }
                      />

                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  Revenue by Provider
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Payment provider contribution
                </p>
              </div>

              <div className="mt-5 h-72">
                {revenueProviderChartData.length === 0 ? (
                  <FinanceStatePanel
                    type="empty"
                    title="No provider data"
                    message="Provider distribution will appear after Revenue transactions are recorded."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueProviderChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={3}
                      >
                        {revenueProviderChartData.map((entry, index) => (
                          <Cell
                            key={`${entry.name}-${index}`}
                            fill={
                              PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={(value) =>
                          formatFinanceCurrency(
                            Number(value),
                            overview.currency
                          )
                        }
                      />

                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <FinanceBreakdownList
              title="Revenue Categories"
              items={overview.revenueByCategory}
              currency={overview.currency}
            />

            <FinanceBreakdownList
              title="Expense Categories"
              items={overview.expenseByCategory}
              currency={overview.currency}
            />

            <FinanceBreakdownList
              title="Revenue Providers"
              items={overview.revenueByProvider}
              currency={overview.currency}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <a
              href="/admin/finance/invoices"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
            >
              <FileText
                size={20}
                className="text-violet-600 dark:text-violet-400"
              />

              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Paid Invoices
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                {overview.paidInvoices}
              </p>
            </a>

            <a
              href="/admin/finance/invoices"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
            >
              <WalletCards
                size={20}
                className="text-amber-600 dark:text-amber-400"
              />

              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Pending Invoices
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                {overview.pendingInvoices}
              </p>
            </a>

            <a
              href="/admin/finance/receipts"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
            >
              <ReceiptText
                size={20}
                className="text-emerald-600 dark:text-emerald-400"
              />

              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Issued Receipts
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                {overview.issuedReceipts}
              </p>
            </a>

            <a
              href="/admin/finance/revenue"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
            >
              <CircleDollarSign
                size={20}
                className="text-blue-600 dark:text-blue-400"
              />

              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Revenue This Month
              </p>

              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                {formatFinanceCurrency(
                  overview.currentMonthRevenue,
                  overview.currency
                )}
              </p>
            </a>
          </div>
        </>
      )}
    </section>
  );
}
