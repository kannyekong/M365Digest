import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Eye,
  LoaderCircle,
  Play,
} from "lucide-react";
import type {
  FinanceRefundListItem,
  RefundStatus,
} from "../../../../types/refund";

interface RefundTableProps {
  refunds: FinanceRefundListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  processingRefundId: string | null;

  onView: (refund: FinanceRefundListItem) => void;

  onApprove: (refund: FinanceRefundListItem) => void;

  onReject: (refund: FinanceRefundListItem) => void;

  onProcess: (refund: FinanceRefundListItem) => void;

  onCancel: (refund: FinanceRefundListItem) => void;

  onPageChange: (page: number) => void;

  onPageSizeChange: (pageSize: number) => void;
}

/**
 * Format one Refund amount.
 */
function formatRefundCurrency(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format one Refund date.
 */
function formatRefundDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Convert an internal value into a readable label.
 */
function formatRefundLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return theme-aware classes for one Refund status.
 */
function getRefundStatusClasses(status: RefundStatus) {
  switch (status) {
    case "requested":
      return "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300";

    case "approved":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

    case "processing":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

    case "successful":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "failed":
    case "rejected":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    case "cancelled":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/**
 * Render the paginated Refund table.
 */
export default function RefundTable({
  refunds,
  page,
  pageSize,
  total,
  totalPages,
  processingRefundId,
  onView,
  onApprove,
  onReject,
  onProcess,
  onCancel,
  onPageChange,
  onPageSizeChange,
}: RefundTableProps) {
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;

  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px]">
          <thead className="bg-slate-50 dark:bg-slate-900/70">
            <tr className="divide-x divide-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:divide-slate-800 dark:text-slate-400">
              <th className="px-4 py-3">Original transaction</th>

              <th className="px-4 py-3">Customer</th>

              <th className="px-4 py-3 text-right">Requested</th>

              <th className="px-4 py-3 text-right">Refunded</th>

              <th className="px-4 py-3">Provider</th>

              <th className="px-4 py-3">Status</th>

              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
            {refunds.map((refund) => {
              const processing = processingRefundId === refund.id;

              return (
                <tr
                  key={refund.id}
                  className="divide-x divide-slate-200 text-sm text-slate-700 transition hover:bg-slate-50 dark:divide-slate-800 dark:text-slate-200 dark:hover:bg-slate-900/50"
                >
                  <td className="max-w-[220px] px-4 py-4">
                    <p
                      title={refund.transaction_reference ?? undefined}
                      className="truncate font-medium text-slate-900 dark:text-white"
                    >
                      {refund.transaction_reference ?? "Not available"}
                    </p>

                    <p
                      title={refund.transaction_description ?? undefined}
                      className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400"
                    >
                      {refund.transaction_description ?? "No description"}
                    </p>
                  </td>

                  <td className="max-w-[200px] px-4 py-4">
                    <p className="truncate font-medium text-slate-900 dark:text-white">
                      {refund.customer_name ?? "Not available"}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {refund.customer_email ?? "No email"}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-slate-950 dark:text-white">
                    {formatRefundCurrency(
                      refund.requested_amount,
                      refund.currency
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <p className="font-semibold text-slate-950 dark:text-white">
                      {formatRefundCurrency(
                        refund.refunded_amount,
                        refund.currency
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {formatRefundCurrency(
                        refund.available_refund_amount,
                        refund.currency
                      )}{" "}
                      available
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {formatRefundLabel(refund.provider)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {refund.payment_method
                        ? formatRefundLabel(refund.payment_method)
                        : "Not specified"}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getRefundStatusClasses(
                        refund.status
                      )}`}
                    >
                      {formatRefundLabel(refund.status)}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title="View Refund"
                        aria-label="View Refund"
                        onClick={() => onView(refund)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                      >
                        <Eye size={16} />
                      </button>

                      {refund.status === "requested" && (
                        <>
                          <button
                            type="button"
                            title="Approve Refund"
                            aria-label="Approve Refund"
                            disabled={processing}
                            onClick={() => onApprove(refund)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                          >
                            {processing ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                          </button>

                          <button
                            type="button"
                            title="Reject Refund"
                            aria-label="Reject Refund"
                            disabled={processing}
                            onClick={() => onReject(refund)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            <CircleX size={16} />
                          </button>
                        </>
                      )}

                      {["approved", "processing", "failed"].includes(
                        refund.status
                      ) && (
                        <button
                          type="button"
                          title="Process Refund"
                          aria-label="Process Refund"
                          disabled={processing}
                          onClick={() => onProcess(refund)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-950/30"
                        >
                          {processing ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <Play size={16} />
                          )}
                        </button>
                      )}

                      {["requested", "approved", "failed"].includes(
                        refund.status
                      ) && (
                        <button
                          type="button"
                          title="Cancel Refund"
                          aria-label="Cancel Refund"
                          disabled={processing}
                          onClick={() => onCancel(refund)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-900"
                        >
                          <Ban size={16} />
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
