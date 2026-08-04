import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  Pencil,
  RotateCcw,
} from "lucide-react";

import type { ExpenseTransaction } from "../../../../types/expense";

interface ExpenseTableProps {
  expenses: ExpenseTransaction[];

  page: number;
  pageSize: number;
  total: number;
  totalPages: number;

  loadingExpenseId: string | null;

  archivedView: boolean;

  onView: (expense: ExpenseTransaction) => void;

  onEdit: (expense: ExpenseTransaction) => void;

  onArchive: (expense: ExpenseTransaction) => void;

  onRestore: (expense: ExpenseTransaction) => void;

  onReconcile: (expense: ExpenseTransaction) => void;

  onPageChange: (page: number) => void;

  onPageSizeChange: (size: number) => void;
}

/* Formats one currency value. */
function formatCurrency(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
  }).format(amount);
}

/* Formats one ISO date string. */
function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/* Converts enum values into readable labels. */
function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* Returns Tailwind classes for status badges. */
function statusClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";

    case "pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";

    case "processing":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";

    case "failed":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";

    case "cancelled":
      return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

    case "refunded":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/* Returns Tailwind classes for reconciliation badges. */
function reconciliationClass(value: string) {
  switch (value) {
    case "reconciled":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";

    case "disputed":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";

    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
}

/* Renders the Expenses table. */
export default function ExpenseTable({
  expenses,
  page,
  pageSize,
  total,
  totalPages,
  archivedView,
  loadingExpenseId,
  onView,
  onEdit,
  onArchive,
  onRestore,
  onReconcile,
  onPageChange,
  onPageSizeChange,
}: ExpenseTableProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;

  const to = Math.min(page * pageSize, total);

  return (
    <div className="overflow-hidden rounded-2xl border border-border border-slate-200 bg-background">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase">
                Date
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase">
                Expense
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase">
                Category
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase">
                Provider
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase">
                Amount
              </th>

              <th className="px-5 py-3 text-center text-xs font-semibold uppercase">
                Status
              </th>

              <th className="px-5 py-3 text-center text-xs font-semibold uppercase">
                Reconciliation
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {expenses.map((expense) => {
              const loading = loadingExpenseId === expense.id;

              return (
                <tr
                  key={expense.id}
                  className="border-t border-border border-slate-200 hover:bg-muted/20"
                >
                  <td className="px-5 py-4 whitespace-nowrap">
                    {formatDate(expense.transaction_date)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold text-xs line-clamp-2">
                      {expense.description}
                    </div>

                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {expense.internal_reference}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {formatLabel(expense.transaction_category)}
                  </td>

                  <td className="px-5 py-4">{expense.provider}</td>

                  <td className="px-5 py-4 text-right font-semibold">
                    {formatCurrency(expense.amount, expense.currency)}
                  </td>

                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                        expense.status
                      )}`}
                    >
                      {formatLabel(expense.status)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${reconciliationClass(
                        expense.reconciliation_status
                      )}`}
                    >
                      {formatLabel(expense.reconciliation_status)}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        title="View"
                        onClick={() => onView(expense)}
                        className="rounded-lg p-2 hover:bg-muted"
                      >
                        <Eye size={17} />
                      </button>

                      {!archivedView && (
                        <>
                          <button
                            title="Edit"
                            onClick={() => onEdit(expense)}
                            className="rounded-lg p-2 hover:bg-muted"
                          >
                            <Pencil size={17} />
                          </button>

                          {expense.reconciliation_status !== "reconciled" && (
                            <button
                              title="Reconcile"
                              disabled={loading}
                              onClick={() => onReconcile(expense)}
                              className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                            >
                              {loading ? (
                                <LoaderCircle
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <CheckCircle2 size={17} />
                              )}
                            </button>
                          )}

                          <button
                            title="Archive"
                            disabled={loading}
                            onClick={() => onArchive(expense)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          >
                            <Archive size={17} />
                          </button>
                        </>
                      )}

                      {archivedView && (
                        <button
                          title="Restore"
                          disabled={loading}
                          onClick={() => onRestore(expense)}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                        >
                          <RotateCcw size={17} />
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

      <footer className="flex items-center justify-between border-t border-slate-200 border-border p-4">
        <span className="text-sm text-muted-foreground">
          Showing {from}-{to} of {total}
        </span>

        <div className="flex items-center gap-3">
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>

          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-lg border border-border p-2 disabled:opacity-40"
          >
            <ChevronLeft size={17} />
          </button>

          <span className="font-semibold">
            {page} / {totalPages}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-lg border border-border p-2 disabled:opacity-40"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </footer>
    </div>
  );
}
