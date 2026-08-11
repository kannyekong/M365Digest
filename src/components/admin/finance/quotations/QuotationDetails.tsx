import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Send,
  X,
  Printer,
  XCircle,
} from "lucide-react";
import type { Quotation } from "../../../../types/quotation";
import { formatQuotationCurrency } from "../../../../utils/quotation";

interface QuotationDetailsProps {
  open: boolean;

  quotation: Quotation | null;

  processing?: boolean;

  onClose: () => void;

  onSend?: (quotation: Quotation) => void;

  onAccept?: (quotation: Quotation) => void;

  onReject?: (quotation: Quotation) => void;

  onConvertToInvoice?: (quotation: Quotation) => void;
}

/* Formats one quotation date for display. */
function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

/* Converts one internal value into a readable label. */
function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/* Returns theme-aware quotation status styles. */
function getStatusClasses(status: Quotation["status"]) {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

    case "sent":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

    case "accepted":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "rejected":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    case "expired":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

    case "cancelled":
      return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/* Displays one complete quotation with customer, pricing and workflow actions. */
export default function QuotationDetails({
  open,
  quotation,
  processing = false,
  onClose,
  onSend,
  onAccept,
  onReject,
  onConvertToInvoice,
}: QuotationDetailsProps) {
  if (!open || !quotation) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/65 px-3 py-6 backdrop-blur-sm sm:px-4 sm:py-8">
      <section className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 dark:border-slate-800 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <FileText size={22} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                  Quotation
                </p>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                    quotation.status
                  )}`}
                >
                  {formatLabel(quotation.status)}
                </span>
              </div>

              <h2 className="mt-1 break-words text-xl font-bold text-slate-950 dark:text-white">
                {quotation.quotation_number}
              </h2>

              <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">
                {quotation.subject}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            aria-label="Close quotation details"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <X size={19} />
          </button>
        </header>

        <div className="max-h-[calc(95vh-90px)] overflow-y-auto">
          <div className="space-y-6 p-4 sm:p-6">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Client
                </p>

                <p className="mt-2 font-semibold text-slate-950 dark:text-white">
                  {quotation.customer_name}
                </p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {quotation.customer_company ||
                    quotation.customer_email ||
                    "No company"}
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Issue date
                </p>

                <p className="mt-2 font-semibold text-slate-950 dark:text-white">
                  {formatDate(quotation.issue_date)}
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Valid until
                </p>

                <p className="mt-2 font-semibold text-slate-950 dark:text-white">
                  {formatDate(quotation.valid_until)}
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Total
                </p>

                <p className="mt-2 break-words text-lg font-bold text-slate-950 dark:text-white">
                  {formatQuotationCurrency(
                    Number(quotation.total_amount),
                    quotation.currency
                  )}
                </p>
              </article>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Customer information
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Email
                  </p>

                  <p className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
                    {quotation.customer_email || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Phone
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {quotation.customer_phone || "Not provided"}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Billing address
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-900 dark:text-slate-100">
                    {quotation.billing_address || "Not provided"}
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  Quotation items
                </h3>
              </div>

              {quotation.items && quotation.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/60">
                      <tr>
                        <th className="border-r border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          Description
                        </th>

                        <th className="border-r border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          Qty
                        </th>

                        <th className="border-r border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          Unit Price
                        </th>

                        <th className="border-r border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          VAT
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {quotation.items.map((item) => (
                        <tr key={item.id}>
                          <td className="border-r border-slate-200 px-4 py-4 align-top dark:border-slate-800">
                            <p className="max-w-[360px] text-sm font-medium text-slate-950 dark:text-white">
                              {item.description}
                            </p>
                          </td>

                          <td className="border-r border-slate-200 px-4 py-4 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
                            {item.quantity}
                          </td>

                          <td className="border-r border-slate-200 px-4 py-4 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
                            {formatQuotationCurrency(
                              Number(item.unit_price),
                              quotation.currency
                            )}
                          </td>

                          <td className="border-r border-slate-200 px-4 py-4 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
                            {item.tax_rate}%
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-slate-950 dark:text-white">
                            {formatQuotationCurrency(
                              Number(item.line_total),
                              quotation.currency
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
                  No quotation items were found.
                </p>
              )}
            </section>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  Notes & terms
                </h3>

                <div className="mt-4 space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Customer note
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {quotation.notes || "No customer note."}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Terms
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {quotation.terms || "No quotation terms."}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Internal note
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {quotation.internal_notes || "No internal note."}
                    </p>
                  </div>
                </div>
              </article>

              <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:p-5">
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  Summary
                </h3>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Subtotal
                    </span>

                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatQuotationCurrency(
                        Number(quotation.subtotal_amount),
                        quotation.currency
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Discount
                    </span>

                    <span className="font-semibold text-slate-900 dark:text-white">
                      -
                      {formatQuotationCurrency(
                        Number(quotation.discount_amount),
                        quotation.currency
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Tax
                    </span>

                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatQuotationCurrency(
                        Number(quotation.tax_amount),
                        quotation.currency
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Total
                  </p>

                  <p className="mt-1 break-words text-2xl font-bold text-slate-950 dark:text-white">
                    {formatQuotationCurrency(
                      Number(quotation.total_amount),
                      quotation.currency
                    )}
                  </p>
                </div>
              </aside>
            </section>
          </div>

          <footer className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-6">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <a
                href={`/admin/finance/quotations/${quotation.id}/print`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <Printer size={16} />
                Print / PDF
              </a>

              {quotation.status === "draft" && onSend && (
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => onSend(quotation)}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-500/15 disabled:opacity-50 dark:text-blue-300"
                >
                  <Send size={16} />
                  Mark Sent
                </button>
              )}

              {quotation.status === "sent" && (
                <>
                  {onReject && (
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => onReject(quotation)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-500/15 disabled:opacity-50 dark:text-red-300"
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  )}

                  {onAccept && (
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => onAccept(quotation)}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/15 disabled:opacity-50 dark:text-emerald-300"
                    >
                      <CheckCircle2 size={16} />
                      Accept
                    </button>
                  )}
                </>
              )}

              {quotation.status === "accepted" &&
                !quotation.converted_invoice_id &&
                onConvertToInvoice && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => onConvertToInvoice(quotation)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    Convert to Invoice
                    <ArrowRight size={16} />
                  </button>
                )}

              <button
                type="button"
                onClick={onClose}
                disabled={processing}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
