import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import type {
  ReconciliationStatus,
  ReconciliationTransaction,
} from "../../../../types/reconciliation";

interface ReconciliationTableProps {
  transactions: ReconciliationTransaction[];

  page: number;

  pageSize: number;

  total: number;

  totalPages: number;

  processingTransactionId: string | null;

  onView: (transaction: ReconciliationTransaction) => void;

  onReconcile: (transaction: ReconciliationTransaction) => void;

  onDispute: (transaction: ReconciliationTransaction) => void;

  onUndo: (transaction: ReconciliationTransaction) => void;

  onPageChange: (page: number) => void;

  onPageSizeChange: (pageSize: number) => void;
}

/**
 * Format one Reconciliation monetary value.
 */
function formatReconciliationCurrency(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format one transaction date.
 */
function formatReconciliationDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value.includes("T") ? value : `${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: value.includes("T") ? undefined : "UTC",
  }).format(date);
}

/**
 * Convert one internal value into a readable label.
 */
function formatReconciliationLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return theme-aware classes for one Reconciliation status.
 */
function getReconciliationStatusClasses(status: ReconciliationStatus) {
  switch (status) {
    case "reconciled":
      return "bg-blue-200 text-blue-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "disputed":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    case "unreconciled":
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }
}

/**
 * Return theme-aware classes for one transaction type.
 */
function getTransactionTypeClasses(transactionType: string) {
  switch (transactionType) {
    case "income":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "expense":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    case "refund":
      return "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/**
 * Render the paginated Reconciliation transaction table.
 */
export default function ReconciliationTable({
  transactions,
  page,
  pageSize,
  total,
  totalPages,
  processingTransactionId,
  onView,
  onReconcile,
  onDispute,
  onUndo,
  onPageChange,
  onPageSizeChange,
}: ReconciliationTableProps) {
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;

  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="w-full overflow-hidden">
        <table className="w-full table-fixed">
          <thead className="bg-slate-50 dark:bg-slate-900/70">
            <tr className="divide-x divide-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:divide-slate-800 dark:text-slate-400">
              <th className="w-[76%] px-3 py-3 md:w-[40%]">Transaction</th>

              <th className="hidden px-3 py-3 md:table-cell md:w-[20%]">
                Customer
              </th>

              <th className="hidden px-3 py-3 md:table-cell md:w-[24%]">
                Provider
              </th>

              <th className="w-[24%] px-2 py-3 text-center md:w-[16%]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
            {transactions.map((transaction) => {
              const processing = processingTransactionId === transaction.id;

              return (
                <tr
                  key={transaction.id}
                  className="divide-x divide-slate-200 text-xs text-slate-700 transition hover:bg-slate-50 dark:divide-slate-800 dark:text-slate-200 dark:hover:bg-slate-900/50"
                >
                  <td className="min-w-0 overflow-hidden px-3 py-4">
                    <div className="min-w-0">
                      <p
                        title={transaction.internal_reference}
                        className="truncate font-semibold text-slate-950 dark:text-white"
                      >
                        {transaction.internal_reference}
                      </p>

                      <p
                        title={transaction.description}
                        className="mt-1 truncate text-slate-500 dark:text-slate-400"
                      >
                        {transaction.description}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <span
                          className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${getTransactionTypeClasses(
                            transaction.transaction_type
                          )}`}
                        >
                          {formatReconciliationLabel(
                            transaction.transaction_type
                          )}
                        </span>

                        <span className="inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:text-xs">
                          {formatReconciliationLabel(
                            transaction.transaction_category
                          )}
                        </span>

                        <span
                          className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${getReconciliationStatusClasses(
                            transaction.reconciliation_status
                          )}`}
                        >
                          {formatReconciliationLabel(
                            transaction.reconciliation_status
                          )}
                        </span>
                      </div>

                      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        Transaction:{" "}
                        {formatReconciliationLabel(transaction.status)}
                      </p>

                      <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 md:hidden">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Customer
                          </p>

                          <p className="mt-1 truncate font-medium text-slate-900 dark:text-white">
                            {transaction.customer_name ?? "Not available"}
                          </p>

                          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {transaction.customer_email ?? "No email"}
                          </p>

                          {transaction.customer_phone && (
                            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                              {transaction.customer_phone}
                            </p>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Provider
                          </p>

                          <p className="mt-1 truncate font-medium text-slate-900 dark:text-white">
                            {formatReconciliationLabel(transaction.provider)}
                          </p>

                          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {transaction.payment_method
                              ? formatReconciliationLabel(
                                  transaction.payment_method
                                )
                              : "Not specified"}
                          </p>

                          <p
                            title={transaction.provider_reference ?? undefined}
                            className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400"
                          >
                            {transaction.provider_reference ??
                              "No provider reference"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="hidden min-w-0 overflow-hidden px-3 py-4 md:table-cell">
                    <p
                      title={transaction.customer_name ?? undefined}
                      className="truncate font-medium text-slate-900 dark:text-white"
                    >
                      {transaction.customer_name ?? "Not available"}
                    </p>

                    <p
                      title={transaction.customer_email ?? undefined}
                      className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400"
                    >
                      {transaction.customer_email ?? "No email"}
                    </p>

                    {transaction.customer_phone && (
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {transaction.customer_phone}
                      </p>
                    )}
                  </td>

                  <td className="hidden min-w-0 overflow-hidden px-3 py-4 md:table-cell">
                    <p className="truncate font-medium text-slate-900 dark:text-white">
                      {formatReconciliationLabel(transaction.provider)}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {transaction.payment_method
                        ? formatReconciliationLabel(transaction.payment_method)
                        : "Not specified"}
                    </p>

                    <p
                      title={transaction.provider_reference ?? undefined}
                      className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400"
                    >
                      {transaction.provider_reference ??
                        "No provider reference"}
                    </p>
                  </td>

                  <td className="px-1 py-4 align-top">
                    <div className="grid grid-cols-1 place-items-center gap-1 sm:grid-cols-2 md:flex md:flex-wrap md:justify-center">
                      <button
                        type="button"
                        title="View Reconciliation Details"
                        aria-label="View Reconciliation Details"
                        onClick={() => onView(transaction)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                      >
                        <Eye size={15} />
                      </button>

                      {transaction.reconciliation_status !== "reconciled" && (
                        <button
                          type="button"
                          title="Reconcile Transaction"
                          aria-label="Reconcile Transaction"
                          disabled={processing}
                          onClick={() => onReconcile(transaction)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        >
                          {processing ? (
                            <LoaderCircle size={15} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={15} />
                          )}
                        </button>
                      )}

                      {transaction.reconciliation_status !== "disputed" && (
                        <button
                          type="button"
                          title="Dispute Transaction"
                          aria-label="Dispute Transaction"
                          disabled={processing}
                          onClick={() => onDispute(transaction)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <AlertTriangle size={15} />
                        </button>
                      )}

                      {transaction.reconciliation_status !== "unreconciled" && (
                        <button
                          type="button"
                          title="Undo Reconciliation"
                          aria-label="Undo Reconciliation"
                          disabled={processing}
                          onClick={() => onUndo(transaction)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-950/30"
                        >
                          <RotateCcw size={15} />
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
