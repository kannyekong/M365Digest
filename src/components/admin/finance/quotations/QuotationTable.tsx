import {
  Archive,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  Pencil,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import type { Quotation, QuotationStatus } from "../../../../types/quotation";
import { formatQuotationCurrency } from "../../../../utils/quotation";

interface QuotationTableProps {
  quotations: Quotation[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  archivedView: boolean;
  processingQuotationId: string | null;

  onView: (quotation: Quotation) => void;
  onEdit: (quotation: Quotation) => void;
  onSend: (quotation: Quotation) => void;
  onAccept: (quotation: Quotation) => void;
  onReject: (quotation: Quotation) => void;
  onArchive: (quotation: Quotation) => void;
  onRestore: (quotation: Quotation) => void;

  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

/* Converts one quotation value into a readable label. */
function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/* Formats one quotation date for display. */
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

/* Returns theme-aware styling for one quotation status. */
function getStatusClasses(status: QuotationStatus) {
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

/* Displays the paginated quotation table. */
export default function QuotationTable({
  quotations,
  page,
  pageSize,
  total,
  totalPages,
  archivedView,
  processingQuotationId,
  onView,
  onEdit,
  onSend,
  onAccept,
  onReject,
  onArchive,
  onRestore,
  onPageChange,
  onPageSizeChange,
}: QuotationTableProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;

  const end = Math.min(page * pageSize, total);

  return (
    <section className="overflow-hidden rounded-2xl border border-box-border bg-box-bg/70 shadow-sm backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="border-b border-box-border bg-body/60">
            <tr>
              <th className="border-r border-box-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Quotation
              </th>

              <th className="border-r border-box-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Client
              </th>

              <th className="border-r border-box-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Dates
              </th>

              <th className="border-r border-box-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Amount
              </th>

              <th className="border-r border-box-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Status
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-box-border">
            {quotations.map((quotation) => {
              const processing = processingQuotationId === quotation.id;

              return (
                <tr key={quotation.id} className="transition hover:bg-body/40">
                  <td className="border-r border-box-border px-4 py-4 align-top">
                    <p className="font-semibold text-heading">
                      {quotation.quotation_number}
                    </p>

                    <p className="mt-1 max-w-[260px] truncate text-sm text-text-muted">
                      {quotation.subject}
                    </p>
                  </td>

                  <td className="border-r border-box-border px-4 py-4 align-top">
                    <p className="font-semibold text-heading">
                      {quotation.customer_name}
                    </p>

                    <p className="mt-1 text-xs text-text-muted">
                      {quotation.customer_company ||
                        quotation.customer_email ||
                        "No company"}
                    </p>
                  </td>

                  <td className="border-r border-box-border px-4 py-4 align-top">
                    <p className="text-sm text-heading">
                      {formatDate(quotation.issue_date)}
                    </p>

                    <p className="mt-1 text-xs text-text-muted">
                      Valid until {formatDate(quotation.valid_until)}
                    </p>
                  </td>

                  <td className="border-r border-box-border px-4 py-4 align-top">
                    <p className="font-semibold text-heading">
                      {formatQuotationCurrency(
                        Number(quotation.total_amount),
                        quotation.currency
                      )}
                    </p>
                  </td>

                  <td className="border-r border-box-border px-4 py-4 align-top">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                        quotation.status
                      )}`}
                    >
                      {formatLabel(quotation.status)}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        title="View quotation"
                        onClick={() => onView(quotation)}
                        className="p-2 text-text-muted transition text-primary"
                      >
                        <Eye size={15} />
                      </button>

                      {quotation.status === "draft" && !archivedView && (
                        <button
                          type="button"
                          title="Edit quotation"
                          onClick={() => onEdit(quotation)}
                          className="text-text-muted transition text-yellow-700 p-2"
                        >
                          <Pencil size={15} />
                        </button>
                      )}

                      {quotation.status === "draft" && !archivedView && (
                        <button
                          type="button"
                          title="Mark as sent"
                          disabled={processing}
                          onClick={() => onSend(quotation)}
                          className="text-text-muted transition p-2 text-green-600 disabled:opacity-50"
                        >
                          <Send size={15} />
                        </button>
                      )}

                      {quotation.status === "sent" && !archivedView && (
                        <>
                          <button
                            type="button"
                            title="Accept quotation"
                            disabled={processing}
                            onClick={() => onAccept(quotation)}
                            className="text-text-muted transition p-2 hover:text-emerald-600 disabled:opacity-50"
                          >
                            <CheckCircle2 size={15} />
                          </button>

                          <button
                            type="button"
                            title="Reject quotation"
                            disabled={processing}
                            onClick={() => onReject(quotation)}
                            className="text-text-muted transition p-2 text-red-600 disabled:opacity-50"
                          >
                            <XCircle size={15} />
                          </button>
                        </>
                      )}

                      {archivedView ? (
                        <button
                          type="button"
                          title="Restore quotation"
                          disabled={processing}
                          onClick={() => onRestore(quotation)}
                          className="p-2 text-text-muted transition text-emerald-600 disabled:opacity-50"
                        >
                          <RotateCcw size={15} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Archive quotation"
                          disabled={processing}
                          onClick={() => onArchive(quotation)}
                          className="p-2 text-text-muted transition text-red-600 disabled:opacity-50"
                        >
                          <Archive size={15} />
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

      <div className="flex flex-col gap-4 border-t border-box-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-text-muted">
          Showing {start}–{end} of {total} quotations
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-box-border bg-body px-3 py-2 text-xs text-heading"
          >
            <option value={10}>10 per page</option>

            <option value={25}>25 per page</option>

            <option value={50}>50 per page</option>
          </select>

          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-lg border border-box-border px-2 py-2 text-xs font-semibold text-heading disabled:opacity-40"
          >
            <ArrowLeft size={18} />
          </button>

          <span className="px-2 text-xs text-text-muted">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-lg border border-box-border px-2 py-2 text-xs font-semibold text-heading disabled:opacity-40"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
