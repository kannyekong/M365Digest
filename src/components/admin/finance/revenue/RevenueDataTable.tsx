import {
  Archive,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  Eye,
  LoaderCircle,
  ReceiptText,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import type {
  RevenueSortField,
  RevenueTransaction,
} from "../../../../types/revenue";
import type { SortDirection } from "../../../../types/revenuetable";
import {
  formatCurrency,
  formatDate,
  formatLabel,
  getProviderIcon,
  getReconciliationClasses,
  getRevenueStatusClasses,
} from "../../../../utils/revenueTable";

interface RevenueDataTableProps {
  transactions: RevenueTransaction[];
  loading: boolean;
  sortBy: RevenueSortField;
  sortDirection: SortDirection;
  updatingTransactionId: string | null;
  archivingTransactionId: string | null;
  restoringTransactionId: string | null;
  deletingTransactionId: string | null;
  onSort: (field: RevenueSortField) => void;
  onView: (transaction: RevenueTransaction) => void;
  onArchive: (transaction: RevenueTransaction) => void;
  onRestore: (transaction: RevenueTransaction) => void;
  onDeleteDraft: (transaction: RevenueTransaction) => void;
}

/**
 * Display the Revenue transaction table and its row-level actions.
 */
export default function RevenueDataTable({
  transactions,
  loading,
  sortBy,
  sortDirection,
  updatingTransactionId,
  archivingTransactionId,
  restoringTransactionId,
  deletingTransactionId,
  onSort,
  onView,
  onArchive,
  onRestore,
  onDeleteDraft,
}: RevenueDataTableProps) {
  /**
   * Copy one transaction reference to the clipboard.
   */
  async function copyReference(reference: string) {
    try {
      await navigator.clipboard.writeText(reference);
      toast.success("Reference copied.");
    } catch {
      toast.error("Reference could not be copied.");
    }
  }

  /**
   * Render the icon showing the active sort direction.
   */
  function renderSortIcon(field: RevenueSortField) {
    if (sortBy !== field) {
      return <ChevronDown size={14} className="opacity-40" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUp size={14} />
    ) : (
      <ArrowDown size={14} />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900/60">
          <tr>
            <th className="px-5 py-3 text-left">
              <button
                type="button"
                onClick={() => onSort("transaction_date")}
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Date {renderSortIcon("transaction_date")}
              </button>
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Transaction
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Customer
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Provider
            </th>
            <th className="px-5 py-3 text-left">
              <button
                type="button"
                onClick={() => onSort("amount")}
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Amount {renderSortIcon("amount")}
              </button>
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Reconciliation
            </th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                <td colSpan={8} className="px-5 py-4">
                  <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                </td>
              </tr>
            ))
          ) : transactions.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-6 py-16 text-center">
                <ReceiptText size={34} className="mx-auto text-slate-400" />
                <p className="mt-3 font-semibold text-slate-900 dark:text-white">
                  No Revenue records found
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Adjust your filters or create a manual Revenue entry.
                </p>
              </td>
            </tr>
          ) : (
            transactions.map((transaction) => {
              const ProviderIcon = getProviderIcon(transaction.provider);
              const busy = [
                updatingTransactionId,
                archivingTransactionId,
                restoringTransactionId,
                deletingTransactionId,
              ].includes(transaction.id);

              return (
                <tr
                  key={transaction.id}
                  className={
                    transaction.archived_at
                      ? "bg-slate-50/80 opacity-75 dark:bg-slate-900/40"
                      : "hover:bg-slate-50/60 dark:hover:bg-slate-900/30"
                  }
                >
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                    {formatDate(transaction.transaction_date)}
                  </td>
                  <td className="max-w-xs px-5 py-4">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {transaction.description}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void copyReference(transaction.internal_reference)
                      }
                      className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400"
                    >
                      <Copy size={12} />
                      {transaction.internal_reference}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {transaction.customer_name || "Not provided"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {transaction.customer_email ||
                        transaction.customer_phone ||
                        "No contact"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <ProviderIcon size={15} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {formatLabel(transaction.provider)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatLabel(transaction.transaction_category)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <p className="text-sm font-bold text-slate-950 dark:text-white">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                    {transaction.refunded_amount > 0 && (
                      <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                        {formatCurrency(
                          transaction.refunded_amount,
                          transaction.currency
                        )}{" "}
                        refunded
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRevenueStatusClasses(
                        transaction.status
                      )}`}
                    >
                      {formatLabel(transaction.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getReconciliationClasses(
                        transaction.reconciliation_status
                      )}`}
                    >
                      {formatLabel(transaction.reconciliation_status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onView(transaction)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                        aria-label="View transaction"
                      >
                        <Eye size={16} />
                      </button>

                      {transaction.archived_at ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onRestore(transaction)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 disabled:opacity-50 dark:hover:bg-slate-800"
                          aria-label="Restore transaction"
                        >
                          {restoringTransactionId === transaction.id ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <RotateCcw size={16} />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onArchive(transaction)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-amber-600 disabled:opacity-50 dark:hover:bg-slate-800"
                          aria-label="Archive transaction"
                        >
                          {archivingTransactionId === transaction.id ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <Archive size={16} />
                          )}
                        </button>
                      )}

                      {transaction.status === "draft" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onDeleteDraft(transaction)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
                          aria-label="Delete draft"
                        >
                          {deletingTransactionId === transaction.id ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
