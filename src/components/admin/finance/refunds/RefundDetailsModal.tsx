import {
  Ban,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CircleX,
  Clock3,
  LoaderCircle,
  Play,
  ReceiptText,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";
import type {
  FinanceRefundListItem,
  RefundStatus,
} from "../../../../types/refund";
import type { RefundActionType } from "./RefundActionModall";

interface RefundDetailsModalProps {
  open: boolean;
  refund: FinanceRefundListItem | null;
  processing: boolean;
  onClose: () => void;
  onAction: (action: RefundActionType, refund: FinanceRefundListItem) => void;
}

/**
 * Format a monetary value using its ISO currency code.
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
 * Format a Refund date and time for display.
 */
function formatRefundDateTime(value: string | null) {
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Convert an internal Refund value into a readable label.
 */
function formatRefundLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return theme-aware styles for a Refund status.
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
 * Render one Refund summary metric.
 */
function RefundMetric({
  label,
  value,
  helperText,
  icon: Icon,
  iconClasses,
}: {
  label: string;
  value: string;
  helperText: string;
  icon: typeof CircleDollarSign;
  iconClasses: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClasses}`}
      >
        <Icon size={18} />
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-lg font-bold text-slate-950 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {helperText}
      </p>
    </article>
  );
}

/**
 * Render one labeled Refund detail row.
 */
function RefundDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>

      <dd className="break-words text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </dd>
    </div>
  );
}

/**
 * Render one event in the Refund timeline.
 */
function RefundTimelineItem({
  title,
  date,
  userId,
  active,
}: {
  title: string;
  date: string | null;
  userId?: string | null;
  active: boolean;
}) {
  if (!active) {
    return null;
  }

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <div className="relative flex w-5 shrink-0 justify-center">
        <span className="absolute top-5 h-full w-px bg-slate-200 last:hidden dark:bg-slate-800" />

        <span className="relative mt-1 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-blue-100 dark:bg-blue-400 dark:ring-blue-950" />
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {formatRefundDateTime(date)}
        </p>

        {userId && (
          <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
            User: {userId}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Render the complete Refund details modal.
 */
export default function RefundDetailsModal({
  open,
  refund,
  processing,
  onClose,
  onAction,
}: RefundDetailsModalProps) {
  if (!open || !refund) {
    return null;
  }

  const selectedRefund = refund;

  const approvedAmount = selectedRefund.approved_amount ?? 0;

  const remainingAmount = Math.max(
    selectedRefund.requested_amount - selectedRefund.refunded_amount,
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) {
          onClose();
        }
      }}
    >
      <section className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
              <RotateCcw size={20} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                Finance Refund
              </p>

              <h2
                id="refund-details-title"
                className="mt-1 break-all text-xl font-bold text-slate-950 dark:text-white sm:text-2xl"
              >
                {selectedRefund.refund_reference}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getRefundStatusClasses(
                    selectedRefund.status
                  )}`}
                >
                  {formatRefundLabel(selectedRefund.status)}
                </span>

                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Requested {formatRefundDateTime(selectedRefund.requested_at)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            title="Close Refund Details"
            aria-label="Close Refund Details"
            disabled={processing}
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <div className="max-h-[calc(94vh-82px)] overflow-y-auto">
          <div className="space-y-6 p-4 sm:p-6">
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <RefundMetric
                label="Requested"
                value={formatRefundCurrency(
                  selectedRefund.requested_amount,
                  selectedRefund.currency
                )}
                helperText="Amount initially requested"
                icon={RotateCcw}
                iconClasses="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
              />

              <RefundMetric
                label="Approved"
                value={formatRefundCurrency(
                  approvedAmount,
                  selectedRefund.currency
                )}
                helperText={
                  selectedRefund.approved_amount === null
                    ? "Awaiting approval"
                    : "Approved for processing"
                }
                icon={CheckCircle2}
                iconClasses="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
              />

              <RefundMetric
                label="Refunded"
                value={formatRefundCurrency(
                  selectedRefund.refunded_amount,
                  selectedRefund.currency
                )}
                helperText="Successfully returned"
                icon={CircleDollarSign}
                iconClasses="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              />

              <RefundMetric
                label="Remaining"
                value={formatRefundCurrency(
                  remainingAmount,
                  selectedRefund.currency
                )}
                helperText="Requested amount outstanding"
                icon={Clock3}
                iconClasses="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              />
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <ReceiptText
                    size={17}
                    className="text-blue-600 dark:text-blue-400"
                  />

                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Original transaction
                  </h3>
                </div>

                <dl className="divide-y divide-slate-100 px-4 dark:divide-slate-900">
                  <RefundDetailRow
                    label="Internal reference"
                    value={
                      selectedRefund.transaction_reference ?? "Not available"
                    }
                  />

                  <RefundDetailRow
                    label="Transaction ID"
                    value={selectedRefund.original_transaction_id}
                  />

                  <RefundDetailRow
                    label="Original amount"
                    value={formatRefundCurrency(
                      selectedRefund.original_amount,
                      selectedRefund.currency
                    )}
                  />

                  <RefundDetailRow
                    label="Previously refunded"
                    value={formatRefundCurrency(
                      selectedRefund.previous_refunded_amount,
                      selectedRefund.currency
                    )}
                  />

                  <RefundDetailRow
                    label="Available balance"
                    value={formatRefundCurrency(
                      selectedRefund.available_refund_amount,
                      selectedRefund.currency
                    )}
                  />

                  <RefundDetailRow
                    label="Customer"
                    value={selectedRefund.customer_name ?? "Not available"}
                  />

                  <RefundDetailRow
                    label="Customer email"
                    value={selectedRefund.customer_email ?? "Not available"}
                  />

                  <RefundDetailRow
                    label="Description"
                    value={
                      selectedRefund.transaction_description ?? "Not available"
                    }
                  />
                </dl>
              </section>

              <section className="space-y-4">
                <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <UserRound
                    size={18}
                    className="text-blue-600 dark:text-blue-400"
                  />

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Provider
                  </p>

                  <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                    {formatRefundLabel(selectedRefund.provider)}
                  </p>

                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {selectedRefund.payment_method
                      ? formatRefundLabel(selectedRefund.payment_method)
                      : "Payment method not specified"}
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <CalendarDays
                    size={18}
                    className="text-blue-600 dark:text-blue-400"
                  />

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Provider refund reference
                  </p>

                  <p className="mt-1 break-all font-semibold text-slate-950 dark:text-white">
                    {selectedRefund.provider_refund_reference ??
                      "Not available"}
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Currency
                  </p>

                  <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                    {selectedRefund.currency}
                  </p>
                </article>
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  Refund reason
                </h3>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {selectedRefund.reason}
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  Internal notes
                </h3>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {selectedRefund.internal_notes ??
                    "No internal notes have been added."}
                </p>
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  Refund timeline
                </h3>

                <ol className="mt-5">
                  <RefundTimelineItem
                    title="Refund requested"
                    date={selectedRefund.requested_at}
                    userId={selectedRefund.requested_by}
                    active={true}
                  />

                  <RefundTimelineItem
                    title="Refund approved"
                    date={selectedRefund.approved_at}
                    userId={selectedRefund.approved_by}
                    active={Boolean(selectedRefund.approved_at)}
                  />

                  <RefundTimelineItem
                    title="Refund processed successfully"
                    date={selectedRefund.processed_at}
                    userId={selectedRefund.processed_by}
                    active={
                      selectedRefund.status === "successful" &&
                      Boolean(selectedRefund.processed_at)
                    }
                  />

                  <RefundTimelineItem
                    title="Refund failed"
                    date={selectedRefund.failed_at}
                    active={Boolean(selectedRefund.failed_at)}
                  />

                  <RefundTimelineItem
                    title="Refund rejected"
                    date={selectedRefund.rejected_at}
                    userId={selectedRefund.rejected_by}
                    active={Boolean(selectedRefund.rejected_at)}
                  />

                  <RefundTimelineItem
                    title="Refund cancelled"
                    date={selectedRefund.cancelled_at}
                    active={Boolean(selectedRefund.cancelled_at)}
                  />
                </ol>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Audit information
                  </h3>
                </div>

                <dl className="divide-y divide-slate-100 px-4 dark:divide-slate-900">
                  <RefundDetailRow
                    label="Created"
                    value={formatRefundDateTime(selectedRefund.created_at)}
                  />

                  <RefundDetailRow
                    label="Updated"
                    value={formatRefundDateTime(selectedRefund.updated_at)}
                  />

                  <RefundDetailRow
                    label="Requested by"
                    value={selectedRefund.requested_by ?? "Not available"}
                  />

                  <RefundDetailRow
                    label="Approved by"
                    value={selectedRefund.approved_by ?? "Not available"}
                  />

                  <RefundDetailRow
                    label="Processed by"
                    value={selectedRefund.processed_by ?? "Not available"}
                  />

                  <RefundDetailRow
                    label="Rejected by"
                    value={selectedRefund.rejected_by ?? "Not available"}
                  />

                  <RefundDetailRow
                    label="Archived"
                    value={formatRefundDateTime(selectedRefund.archived_at)}
                  />
                </dl>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Refund actions
              </h3>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {selectedRefund.status === "requested" && (
                  <>
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => onAction("approve", selectedRefund)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {processing ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Approve
                    </button>

                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => onAction("reject", selectedRefund)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      <CircleX size={16} />
                      Reject
                    </button>
                  </>
                )}

                {["approved", "processing", "failed"].includes(
                  selectedRefund.status
                ) && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => onAction("process", selectedRefund)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {processing ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Play size={16} />
                    )}

                    {selectedRefund.status === "failed" ? "Retry" : "Process"}
                  </button>
                )}

                {["requested", "approved", "failed"].includes(
                  selectedRefund.status
                ) && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => onAction("cancel", selectedRefund)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <Ban size={16} />
                    Cancel
                  </button>
                )}

                <button
                  type="button"
                  disabled={processing}
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  <CheckCircle2 size={16} />
                  Close
                </button>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
