import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Download,
  LoaderCircle,
  RefreshCw,
  Scale,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import type {
  FinanceReportBreakdownItem,
  FinanceReportFilters,
  FinanceReportSummary,
} from "../../../../types/finance-report";
import {
  exportFinanceReportCsv,
  getFinanceReportSummary,
} from "../../../../lib/finance-report";

const EMPTY_SUMMARY: FinanceReportSummary = {
  totalRevenue: 0,
  totalExpenses: 0,
  grossProfit: 0,
  profitMargin: 0,
  paidRevenueTransactions: 0,
  paidExpenseTransactions: 0,
  currency: "NGN",
  revenueByCategory: [],
  expensesByCategory: [],
  revenueByProvider: [],
  monthlyPerformance: [],
  transactions: [],
};

/**
 * Format one Finance report currency value.
 */
function formatFinanceCurrency(amount: number, currency = "NGN") {
  return `${currency.toUpperCase()} ${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/**
 * Convert underscore-separated values into readable labels.
 */
function formatFinanceLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Render one Finance breakdown list.
 */
function BreakdownList({
  title,
  items,
  currency,
}: {
  title: string;
  items: FinanceReportBreakdownItem[];
  currency: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h2 className="font-semibold text-slate-950 dark:text-white">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          No report data is available for this period.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((item) => (
            <article key={item.label}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatFinanceLabel(item.label)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.count} transaction
                    {item.count === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="text-right">
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
                  className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                  style={{
                    width: `${Math.min(100, item.percentage)}%`,
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
 * Render the complete Finance Reports dashboard.
 */
export default function FinanceReportsDashboard() {
  const [summary, setSummary] = useState<FinanceReportSummary>(EMPTY_SUMMARY);

  const [filters, setFilters] = useState<FinanceReportFilters>({});

  const [loading, setLoading] = useState(true);

  /**
   * Load the Finance report using the active filters.
   */
  const loadReport = useCallback(async () => {
    setLoading(true);

    try {
      setSummary(await getFinanceReportSummary(filters));
    } catch (error) {
      console.error("Failed to load Finance report:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Finance report could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
            Financial Reports
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Review Revenue, Expenses, profitability, categories and providers.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportFinanceReportCsv(summary)}
            disabled={loading || summary.transactions.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-3">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            From
          </span>

          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                dateFrom: event.target.value || undefined,
              }))
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:text-white"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            To
          </span>

          <input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                dateTo: event.target.value || undefined,
              }))
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:text-white"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Currency
          </span>

          <input
            value={filters.currency ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                currency: event.target.value || undefined,
              }))
            }
            placeholder="NGN"
            maxLength={3}
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm uppercase text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:text-white"
          />
        </label>
      </section>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center">
          <LoaderCircle
            size={30}
            className="animate-spin text-blue-600 dark:text-blue-400"
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
             <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-green-600 dark:text-blue-400 bg-green-100`}
              >
                <ArrowUpRight size={20} />
              </div>

              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                Total Revenue
              </p>

              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                {formatFinanceCurrency(summary.totalRevenue, summary.currency)}
              </p>

              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {summary.paidRevenueTransactions} paid transaction
                {summary.paidRevenueTransactions === 1 ? "" : "s"}
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
             <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-red-600 dark:text-blue-400 bg-red-100`}
              >
                <ArrowDownRight size={20} />
              </div>

              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                Total Expenses
              </p>

              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                {formatFinanceCurrency(summary.totalExpenses, summary.currency)}
              </p>

              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {summary.paidExpenseTransactions} paid transaction
                {summary.paidExpenseTransactions === 1 ? "" : "s"}
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-blue-600 dark:text-blue-400 bg-blue-100`}
              >
                <Banknote size={20} />
              </div>

              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                Gross Profit
              </p>

              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                {formatFinanceCurrency(summary.grossProfit, summary.currency)}
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-yellow-800 dark:text-blue-400 bg-yellow-100`}
              >
                <Scale size={20} />
              </div>

              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                Profit Margin
              </p>

              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                {summary.profitMargin}%
              </p>
            </article>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <TrendingUp
                size={19}
                className="text-blue-600 dark:text-blue-400"
              />

              <h2 className="font-semibold text-slate-950 dark:text-white">
                Monthly Performance
              </h2>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-3 py-3">Month</th>

                    <th className="px-3 py-3 text-right">Revenue</th>

                    <th className="px-3 py-3 text-right">Expenses</th>

                    <th className="px-3 py-3 text-right">Profit</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {summary.monthlyPerformance.map((month) => (
                    <tr
                      key={month.month}
                      className="text-sm text-slate-700 dark:text-slate-200"
                    >
                      <td className="px-3 py-3 font-semibold text-slate-950 dark:text-white">
                        {month.monthLabel}
                      </td>

                      <td className="px-3 py-3 text-right text-emerald-700 dark:text-emerald-300">
                        {formatFinanceCurrency(month.revenue, summary.currency)}
                      </td>

                      <td className="px-3 py-3 text-right text-red-700 dark:text-red-300">
                        {formatFinanceCurrency(
                          month.expenses,
                          summary.currency
                        )}
                      </td>

                      <td className="px-3 py-3 text-right font-semibold">
                        {formatFinanceCurrency(month.profit, summary.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            <BreakdownList
              title="Revenue by Category"
              items={summary.revenueByCategory}
              currency={summary.currency}
            />

            <BreakdownList
              title="Expenses by Category"
              items={summary.expensesByCategory}
              currency={summary.currency}
            />

            <BreakdownList
              title="Revenue by Provider"
              items={summary.revenueByProvider}
              currency={summary.currency}
            />
          </div>
        </>
      )}
    </section>
  );
}
