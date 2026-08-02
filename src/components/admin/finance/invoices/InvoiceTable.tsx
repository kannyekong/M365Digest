import {
  Archive,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  LoaderCircle,
  Mail,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import type {
  Invoice,
  InvoiceSortField,
  InvoiceStatus,
} from "../../../../types/invoice";
import type { InvoiceSortDirection } from "../../../../lib/invoice";
import { formatInvoiceCurrency } from "../../../../utils/invoice";

interface InvoiceTableProps {
  invoices: Invoice[];

  loading: boolean;

  sortBy: InvoiceSortField;

  sortDirection: InvoiceSortDirection;

  busyInvoiceId: string | null;

  onSort: (field: InvoiceSortField) => void;

  onView: (invoice: Invoice) => void;

  onMarkSent: (invoice: Invoice) => void;

  onCancel: (invoice: Invoice) => void;

  onArchive: (invoice: Invoice) => void;

  onRestore: (invoice: Invoice) => void;

  onDeleteDraft: (invoice: Invoice) => void;
}

/**
 * Convert an underscore-separated value into a readable label.
 */
function formatInvoiceLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Format one stored invoice date.
 */
function formatInvoiceDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Return theme-aware classes for one invoice status.
 */
function getInvoiceStatusClasses(status: InvoiceStatus) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "sent":
    case "viewed":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

    case "partially_paid":
      return "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300";

    case "overdue":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    case "cancelled":
    case "refunded":
      return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

    case "draft":
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }
}

/**
 * Display the Invoice transaction table and row-level actions.
 */
export default function InvoiceTable({
  invoices,
  loading,
  sortBy,
  sortDirection,
  busyInvoiceId,
  onSort,
  onView,
  onMarkSent,
  onCancel,
  onArchive,
  onRestore,
  onDeleteDraft,
}: InvoiceTableProps) {
  /**
   * Return the active sort icon for one sortable heading.
   */
  function renderSortIcon(field: InvoiceSortField) {
    if (sortBy !== field) {
      return <ArrowDown size={14} className="opacity-35" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUp size={14} />
    ) : (
      <ArrowDown size={14} />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-900/70">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={() => onSort("invoice_number")}
                  className="inline-flex items-center gap-1.5 transition hover:text-slate-900 dark:hover:text-white"
                >
                  Invoice
                  {renderSortIcon("invoice_number")}
                </button>
              </th>

              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={() => onSort("customer_name")}
                  className="inline-flex items-center gap-1.5 transition hover:text-slate-900 dark:hover:text-white"
                >
                  Customer
                  {renderSortIcon("customer_name")}
                </button>
              </th>

              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={() => onSort("issue_date")}
                  className="inline-flex items-center gap-1.5 transition hover:text-slate-900 dark:hover:text-white"
                >
                  Issued
                  {renderSortIcon("issue_date")}
                </button>
              </th>

              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={() => onSort("due_date")}
                  className="inline-flex items-center gap-1.5 transition hover:text-slate-900 dark:hover:text-white"
                >
                  Due
                  {renderSortIcon("due_date")}
                </button>
              </th>

              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Status
              </th>

              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={() => onSort("total_amount")}
                  className="ml-auto inline-flex items-center gap-1.5 transition hover:text-slate-900 dark:hover:text-white"
                >
                  Total
                  {renderSortIcon("total_amount")}
                </button>
              </th>

              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={() => onSort("amount_due")}
                  className="ml-auto inline-flex items-center gap-1.5 transition hover:text-slate-900 dark:hover:text-white"
                >
                  Due amount
                  {renderSortIcon("amount_due")}
                </button>
              </th>

              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, index) => (
                <tr
                  key={index}
                  className="border-b border-slate-100 last:border-b-0 dark:border-slate-900"
                >
                  {Array.from({ length: 8 }).map((__, cellIndex) => (
                    <td key={cellIndex} className="px-5 py-5">
                      <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && invoices.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    <MoreHorizontal size={22} />
                  </div>

                  <p className="mt-4 font-semibold text-slate-900 dark:text-white">
                    No invoices found
                  </p>

                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Create your first invoice or adjust the active filters.
                  </p>
                </td>
              </tr>
            )}

            {!loading &&
              invoices.map((invoice) => {
                const busy = busyInvoiceId === invoice.id;

                return (
                  <tr
                    key={invoice.id}
                    className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/50"
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => onView(invoice)}
                        className="font-semibold text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {invoice.invoice_number}
                      </button>

                      {invoice.purchase_order_number && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          PO {invoice.purchase_order_number}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {invoice.customer_name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {invoice.customer_company || invoice.customer_email}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {formatInvoiceDate(invoice.issue_date)}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {formatInvoiceDate(invoice.due_date)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getInvoiceStatusClasses(
                          invoice.status
                        )}`}
                      >
                        {formatInvoiceLabel(invoice.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                      {formatInvoiceCurrency(
                        invoice.total_amount,
                        invoice.currency
                      )}
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                      {formatInvoiceCurrency(
                        invoice.amount_due,
                        invoice.currency
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="View"
                          onClick={() => onView(invoice)}
                          disabled={busy}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                          aria-label={`View ${invoice.invoice_number}`}
                        >
                          <Eye size={16} />
                        </button>

                        {invoice.status === "draft" && !invoice.archived_at && (
                          <button
                            type="button"
                            title="Mark as sent"
                            onClick={() => onMarkSent(invoice)}
                            disabled={busy}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
                            aria-label={`Mark ${invoice.invoice_number} as sent`}
                          >
                            <Mail size={16} />
                          </button>
                        )}

                        {!invoice.archived_at &&
                          invoice.amount_paid === 0 &&
                          invoice.status !== "cancelled" && (
                            <button
                              type="button"
                              title="Cancel"
                              onClick={() => onCancel(invoice)}
                              disabled={busy}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                              aria-label={`Cancel ${invoice.invoice_number}`}
                            >
                              <XCircle size={16} />
                            </button>
                          )}

                        {invoice.archived_at ? (
                          <button
                            type="button"
                            title="restore"
                            onClick={() => onRestore(invoice)}
                            disabled={busy}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                            aria-label={`Restore ${invoice.invoice_number}`}
                          >
                            {busy ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <RotateCcw size={16} />
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onArchive(invoice)}
                            title="Archive"
                            disabled={busy}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                            aria-label={`Archive ${invoice.invoice_number}`}
                          >
                            {busy ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Archive size={16} />
                            )}
                          </button>
                        )}

                        {invoice.status === "draft" && (
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => onDeleteDraft(invoice)}
                            disabled={busy}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                            aria-label={`Delete ${invoice.invoice_number}`}
                          >
                            <Trash2 size={16} />
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
    </div>
  );
}
