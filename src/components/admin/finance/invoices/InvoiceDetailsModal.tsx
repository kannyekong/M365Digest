import {
  Archive,
  FileText,
  LoaderCircle,
  Mail,
  Pencil,
  RotateCcw,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import type { Invoice } from "../../../../types/invoice";
import { formatInvoiceCurrency } from "../../../../utils/invoice";
import InvoicePdfDownloadButton from "./InvoicePdfDownloadButton";
import InvoicePaymentHistory from "./InvoicePaymentHistory";
import InvoicePaymentButton from "./InvoicePaymentButton";

interface InvoiceDetailsModalProps {
  invoice: Invoice | null;
  loading: boolean;
  busyInvoiceId: string | null;
  onClose: () => void;
  onEdit: (invoice: Invoice) => void;
  onMarkSent: (invoice: Invoice) => void;
  onCancel: (invoice: Invoice) => void;
  onArchive: (invoice: Invoice) => void;
  onRestore: (invoice: Invoice) => void;
  onDeleteDraft: (invoice: Invoice) => void;
}

/**
 * Format one stored invoice date.
 */
function formatInvoiceDate(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Convert one underscore-separated value into a readable label.
 */
function formatInvoiceLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return theme-aware classes for one invoice status.
 */
function getInvoiceStatusClasses(status: Invoice["status"]) {
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
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }
}

/**
 * Display one invoice and its line items.
 */
export default function InvoiceDetailsModal({
  invoice,
  loading,
  busyInvoiceId,
  onClose,
  onEdit,
  onMarkSent,
  onCancel,
  onArchive,
  onRestore,
  onDeleteDraft,
}: InvoiceDetailsModalProps) {
  if (!invoice && !loading) return null;

  const busy = invoice ? busyInvoiceId === invoice.id : false;
  const items = invoice?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/65 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <FileText size={22} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                Invoice
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                {invoice?.invoice_number ?? "Loading invoice..."}
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Review customer, line-item, payment, and audit details.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Close invoice details"
          >
            <X size={19} />
          </button>
        </header>

        {loading || !invoice ? (
          <div className="flex min-h-80 items-center justify-center">
            <LoaderCircle
              size={30}
              className="animate-spin text-blue-600 dark:text-blue-400"
            />
          </div>
        ) : (
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Bill to
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                      {invoice.customer_name}
                    </h3>

                    {invoice.customer_company && (
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {invoice.customer_company}
                      </p>
                    )}

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {invoice.customer_email}
                    </p>

                    {invoice.customer_phone && (
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {invoice.customer_phone}
                      </p>
                    )}
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${getInvoiceStatusClasses(invoice.status)}`}
                  >
                    {formatInvoiceLabel(invoice.status)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Issue date
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {formatInvoiceDate(invoice.issue_date)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Due date
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {formatInvoiceDate(invoice.due_date)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Currency
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {invoice.currency}
                    </p>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Invoice items
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead className="bg-slate-50 dark:bg-slate-900/70">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Description
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Qty
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Unit price
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Tax
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                          >
                            No line items were returned.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t border-slate-100 dark:border-slate-900"
                          >
                            <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-white">
                              {item.description}
                            </td>
                            <td className="px-5 py-4 text-right text-sm text-slate-600 dark:text-slate-300">
                              {item.quantity}
                            </td>
                            <td className="px-5 py-4 text-right text-sm text-slate-600 dark:text-slate-300">
                              {formatInvoiceCurrency(
                                item.unit_price,
                                invoice.currency
                              )}
                            </td>
                            <td className="px-5 py-4 text-right text-sm text-slate-600 dark:text-slate-300">
                              {formatInvoiceCurrency(
                                item.tax_amount,
                                invoice.currency
                              )}
                            </td>
                            <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                              {formatInvoiceCurrency(
                                item.line_total,
                                invoice.currency
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <InvoicePaymentHistory
                invoice={invoice}
                refreshKey={`${invoice.amount_paid}-${invoice.amount_due}-${invoice.status}`}
              />

              {(invoice.notes || invoice.terms || invoice.internal_notes) && (
                <section className="grid gap-4 sm:grid-cols-2">
                  {invoice.notes && (
                    <article className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                      <h3 className="font-semibold text-slate-950 dark:text-white">
                        Customer note
                      </h3>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {invoice.notes}
                      </p>
                    </article>
                  )}

                  {invoice.terms && (
                    <article className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                      <h3 className="font-semibold text-slate-950 dark:text-white">
                        Payment terms
                      </h3>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {invoice.terms}
                      </p>
                    </article>
                  )}

                  {invoice.internal_notes && (
                    <article className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800 sm:col-span-2">
                      <h3 className="font-semibold text-slate-950 dark:text-white">
                        Internal note
                      </h3>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {invoice.internal_notes}
                      </p>
                    </article>
                  )}
                </section>
              )}
            </div>

            <aside className="h-fit space-y-4 lg:sticky lg:top-6">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Invoice total
                </p>

                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {formatInvoiceCurrency(
                    invoice.total_amount,
                    invoice.currency
                  )}
                </p>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Paid
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatInvoiceCurrency(
                        invoice.amount_paid,
                        invoice.currency
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Outstanding
                    </span>
                    <span className="font-semibold text-red-700 dark:text-red-300">
                      {formatInvoiceCurrency(
                        invoice.amount_due,
                        invoice.currency
                      )}
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="grid gap-2">
                  <InvoicePaymentButton invoice={invoice} />
                  <InvoicePdfDownloadButton
                    invoice={invoice}
                    company={{
                      name: "CloudTweak Technologies Limited",
                      email: "support@cloudtweak.net",
                      website: "cloudtweak.net",
                    }}
                  />
                  {invoice.status === "draft" && !invoice.archived_at && (
                    <button
                      type="button"
                      onClick={() => onEdit(invoice)}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                    >
                      <Pencil size={16} />
                      Edit draft
                    </button>
                  )}

                  {invoice.status === "draft" && !invoice.archived_at && (
                    <button
                      type="button"
                      onClick={() => onMarkSent(invoice)}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
                    >
                      <Mail size={16} />
                      Mark as sent
                    </button>
                  )}

                  {!invoice.archived_at &&
                    invoice.amount_paid === 0 &&
                    invoice.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => onCancel(invoice)}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                      >
                        <XCircle size={16} />
                        Cancel invoice
                      </button>
                    )}

                  {invoice.archived_at ? (
                    <button
                      type="button"
                      onClick={() => onRestore(invoice)}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                    >
                      {busy ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <RotateCcw size={16} />
                      )}
                      Restore invoice
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onArchive(invoice)}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      {busy ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Archive size={16} />
                      )}
                      Archive invoice
                    </button>
                  )}

                  {invoice.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => onDeleteDraft(invoice)}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      <Trash2 size={16} />
                      Delete draft
                    </button>
                  )}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
