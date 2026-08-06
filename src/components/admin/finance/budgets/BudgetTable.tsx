import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  Pencil,
  RotateCcw,
} from "lucide-react";
import type {
  BudgetHealthStatus,
  BudgetListItem,
  BudgetStatus,
} from "../../../../types/budget";

interface BudgetTableProps {
  budgets: BudgetListItem[];

  page: number;

  pageSize: number;

  total: number;

  totalPages: number;

  archivedView: boolean;

  processingBudgetId: string | null;

  onView: (budget: BudgetListItem) => void;

  onEdit: (budget: BudgetListItem) => void;

  onArchive: (budget: BudgetListItem) => void;

  onRestore: (budget: BudgetListItem) => void;

  onPageChange: (page: number) => void;

  onPageSizeChange: (pageSize: number) => void;
}

/**
 * Format one Budget monetary value.
 */
function formatBudgetCurrency(amount: number, currency = "NGN") {
  return `${currency.toUpperCase()} ${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/**
 * Format one Budget date.
 */
function formatBudgetDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Convert one internal Budget label into readable text.
 */
function formatBudgetLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return theme-aware classes for one Budget status.
 */
function getBudgetStatusClasses(status: BudgetStatus) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "draft":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

    case "completed":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/**
 * Return theme-aware classes for one Budget health status.
 */
function getBudgetHealthClasses(status: BudgetHealthStatus) {
  switch (status) {
    case "healthy":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "warning":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

    case "exceeded":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/**
 * Return the progress-bar classes for one Budget health status.
 */
function getBudgetProgressClasses(status: BudgetHealthStatus) {
  switch (status) {
    case "healthy":
      return "bg-emerald-500";

    case "warning":
      return "bg-amber-500";

    case "exceeded":
      return "bg-red-500";

    default:
      return "bg-blue-500";
  }
}

/**
 * Render the paginated Budget table.
 */
export default function BudgetTable({
  budgets,
  page,
  pageSize,
  total,
  totalPages,
  archivedView,
  processingBudgetId,
  onView,
  onEdit,
  onArchive,
  onRestore,
  onPageChange,
  onPageSizeChange,
}: BudgetTableProps) {
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;

  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full">
          <thead className="bg-slate-50 dark:bg-slate-900/70">
            <tr className="divide-x divide-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <th className={`px-4 py-3`}>Budget</th>

              <th className="px-4 py-3">Period</th>

              <th className="px-4 py-3">Status</th>

              <th className="px-4 py-3">Allocated</th>

              <th className="px-4 py-3">Used</th>

              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-900">
            {budgets.map((budget) => {
              const processing = processingBudgetId === budget.id;

              const progressWidth = Math.min(budget.usage_percentage, 100);

              return (
                <tr
                  key={budget.id}
                  className="divide-x divide-slate-200 text-xs text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900/50"
                >
                  <td className="max-w-[260px] px-4 py-4">
                    <p
                      title={budget.name}
                      className="truncate font-semibold text-slate-950 dark:text-white"
                    >
                      {budget.name}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>{formatBudgetLabel(budget.budget_type)}</span>
                      {budget.department && (
                        <>
                          <span>•</span>

                          <span className="max-w-32 truncate">
                            {budget.department}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>
                        {budget.allocations_count} allocation
                        {budget.allocations_count === 1 ? "" : "s"}
                      </span>

                      <span className="font-bold text-blue-500">
                        Budget:{" "}
                        {formatBudgetCurrency(
                          budget.total_amount,
                          budget.currency
                        )}
                      </span>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {formatBudgetDate(budget.start_date)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      to {formatBudgetDate(budget.end_date)}
                    </p>
                  </td>

                  <td className="px-1 justify-center">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex w-fit rounded-full px-2 text-xs font-semibold ${getBudgetStatusClasses(
                            budget.status
                          )}`}
                        >
                          {formatBudgetLabel(budget.status)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex w-fit rounded-full px-2 text-xs font-semibold ${getBudgetHealthClasses(
                            budget.health_status
                          )}`}
                        >
                          {formatBudgetLabel(budget.health_status)}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-1 py-4 text-right font-semibold text-slate-950 dark:text-white">
                    {formatBudgetCurrency(
                      budget.allocated_amount,
                      budget.currency
                    )}
                  </td>

                  <td className="min-w-48 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatBudgetCurrency(
                          budget.remaining_amount,
                          budget.currency
                        )}
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getBudgetProgressClasses(
                          budget.health_status
                        )}`}
                        style={{
                          width: `${progressWidth}%`,
                        }}
                      />
                    </div>

                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {budget.usage_percentage}% Used against allocated Budget
                      of{" "}
                      {formatBudgetCurrency(
                        budget.allocated_amount,
                        budget.currency
                      )}
                    </p>
                  </td>

                  {/* <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getBudgetHealthClasses(
                        budget.health_status
                      )}`}
                    >
                      {formatBudgetLabel(budget.health_status)}
                    </span>
                  </td> */}

                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title="View Budget"
                        aria-label="View Budget"
                        onClick={() => onView(budget)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                      >
                        <Eye size={16} />
                      </button>

                      {!archivedView && (
                        <>
                          <button
                            type="button"
                            title="Edit Budget"
                            aria-label="Edit Budget"
                            onClick={() => onEdit(budget)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            title="Archive Budget"
                            aria-label="Archive Budget"
                            disabled={processing}
                            onClick={() => onArchive(budget)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            {processing ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Archive size={16} />
                            )}
                          </button>
                        </>
                      )}

                      {archivedView && (
                        <button
                          type="button"
                          title="Restore Budget"
                          aria-label="Restore Budget"
                          disabled={processing}
                          onClick={() => onRestore(budget)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-950/30"
                        >
                          {processing ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <RotateCcw size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing {rangeStart}–{rangeEnd} of {total}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-slate-200 bg-transparent px-2.5 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>

          <button
            type="button"
            title="Previous Page"
            aria-label="Previous Page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {page} / {totalPages}
          </span>

          <button
            type="button"
            title="Next Page"
            aria-label="Next Page"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </footer>
    </section>
  );
}
