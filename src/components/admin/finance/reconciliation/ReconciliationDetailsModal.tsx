import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  History,
  LoaderCircle,
  ReceiptText,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";
import type {
  ReconciliationDetails,
  ReconciliationHistoryItem,
  ReconciliationStatus,
  ReconciliationTransaction,
} from "../../../../types/reconciliation";
import type { ReconciliationActionType } from "./ReconciliationActionModal";

interface ReconciliationDetailsModalProps {
  open: boolean;

  details: ReconciliationDetails | null;

  processing: boolean;

  onClose: () => void;

  onAction: (
    action: ReconciliationActionType,
    transaction: ReconciliationTransaction
  ) => void;
}

/**
 * Format one monetary value using its ISO currency code.
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
 * Format one date or timestamp for display.
 */
function formatReconciliationDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const normalizedValue = value.includes("T")
    ? value
    : `${value}T00:00:00.000Z`;

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const hasTime = value.includes("T");

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(hasTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {
          timeZone: "UTC",
        }),
  }).format(date);
}

/**
 * Convert an internal reconciliation value into a readable label.
 */
function formatReconciliationLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return theme-aware classes for one reconciliation status.
 */
function getReconciliationStatusClasses(status: ReconciliationStatus) {
  switch (status) {
    case "reconciled":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

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
 * Render one reconciliation summary metric.
 */
function ReconciliationMetric({
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
 * Render one labeled reconciliation detail row.
 */
function ReconciliationDetailRow({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[165px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>

      <dd className="break-words text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </dd>
    </div>
  );
}

/**
 * Render one reconciliation history record.
 */
function ReconciliationHistoryRecord({
  item,
  currency,
}: {
  item: ReconciliationHistoryItem;

  currency: string;
}) {
  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      <div className="relative flex w-5 shrink-0 justify-center">
        <span className="absolute top-5 h-full w-px bg-slate-200 last:hidden dark:bg-slate-800" />

        <span className="relative mt-1 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-blue-100 dark:bg-blue-400 dark:ring-blue-950" />
      </div>

      <article className="min-w-0 flex-1 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">
              {formatReconciliationLabel(item.action)}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatReconciliationDateTime(item.performed_at)}
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getReconciliationStatusClasses(
              item.new_status
            )}`}
          >
            {formatReconciliationLabel(item.new_status)}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Internal
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
              {formatReconciliationCurrency(item.internal_amount, currency)}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              External
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
              {item.external_amount === null
                ? "Not recorded"
                : formatReconciliationCurrency(item.external_amount, currency)}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Difference
            </p>

            <p
              className={`mt-1 text-sm font-semibold ${
                item.amount_difference === null || item.amount_difference === 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {item.amount_difference === null
                ? "Not available"
                : `${item.amount_difference > 0 ? "+" : ""}${formatReconciliationCurrency(
                    item.amount_difference,
                    currency
                  )}`}
            </p>
          </div>
        </div>

        {(item.external_reference || item.settlement_date || item.provider) && (
          <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-200 pt-2 dark:divide-slate-900 dark:border-slate-800">
            <ReconciliationDetailRow
              label="External reference"
              value={item.external_reference ?? "Not available"}
            />

            <ReconciliationDetailRow
              label="Provider"
              value={
                item.provider
                  ? formatReconciliationLabel(item.provider)
                  : "Not available"
              }
            />

            <ReconciliationDetailRow
              label="Settlement date"
              value={formatReconciliationDateTime(item.settlement_date)}
            />
          </dl>
        )}

        {item.dispute_reason && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
              Dispute reason
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-800 dark:text-red-200">
              {item.dispute_reason}
            </p>
          </div>
        )}

        {item.notes && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Notes
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
              {item.notes}
            </p>
          </div>
        )}

        {item.evidence_url && (
          <a
            href={item.evidence_url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            <ExternalLink size={15} />
            View evidence
          </a>
        )}

        {item.performed_by && (
          <p className="mt-4 break-all text-xs text-slate-500 dark:text-slate-400">
            Performed by: {item.performed_by}
          </p>
        )}
      </article>
    </li>
  );
}

/**
 * Render the complete reconciliation details modal.
 */
export default function ReconciliationDetailsModal({
  open,
  details,
  processing,
  onClose,
  onAction,
}: ReconciliationDetailsModalProps) {
  if (!open || !details) {
    return null;
  }

  const selectedTransaction = details;

  const amountDifference = selectedTransaction.amount_difference;

  const netAmount = Math.max(
    selectedTransaction.amount -
      selectedTransaction.refunded_amount -
      selectedTransaction.fee_amount -
      selectedTransaction.tax_amount,
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reconciliation-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) {
          onClose();
        }
      }}
    >
      <section className="max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <ReceiptText size={20} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                Finance Reconciliation
              </p>

              <h2
                id="reconciliation-details-title"
                className="mt-1 break-all text-xl font-bold text-slate-950 dark:text-white sm:text-2xl"
              >
                {selectedTransaction.internal_reference}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getReconciliationStatusClasses(
                    selectedTransaction.reconciliation_status
                  )}`}
                >
                  {formatReconciliationLabel(
                    selectedTransaction.reconciliation_status
                  )}
                </span>

                <span
                  className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getTransactionTypeClasses(
                    selectedTransaction.transaction_type
                  )}`}
                >
                  {formatReconciliationLabel(
                    selectedTransaction.transaction_type
                  )}
                </span>

                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatReconciliationDateTime(
                    selectedTransaction.transaction_date
                  )}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            title="Close Reconciliation Details"
            aria-label="Close Reconciliation Details"
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
              <ReconciliationMetric
                label="Internal Amount"
                value={formatReconciliationCurrency(
                  selectedTransaction.amount,
                  selectedTransaction.currency
                )}
                helperText="Amount recorded internally"
                icon={CircleDollarSign}
                iconClasses="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
              />

              <ReconciliationMetric
                label="External Amount"
                value={
                  selectedTransaction.external_amount === null
                    ? "Not recorded"
                    : formatReconciliationCurrency(
                        selectedTransaction.external_amount,
                        selectedTransaction.currency
                      )
                }
                helperText="Amount confirmed externally"
                icon={CheckCircle2}
                iconClasses="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              />

              <ReconciliationMetric
                label="Difference"
                value={
                  amountDifference === null
                    ? "Not available"
                    : `${amountDifference > 0 ? "+" : ""}${formatReconciliationCurrency(
                        amountDifference,
                        selectedTransaction.currency
                      )}`
                }
                helperText="External minus internal"
                icon={AlertTriangle}
                iconClasses={
                  amountDifference === null || amountDifference === 0
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                }
              />

              <ReconciliationMetric
                label="Calculated Net"
                value={formatReconciliationCurrency(
                  netAmount,
                  selectedTransaction.currency
                )}
                helperText="After refunds, fees and tax"
                icon={Clock3}
                iconClasses="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
              />
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <ReceiptText
                    size={17}
                    className="text-blue-600 dark:text-blue-400"
                  />

                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Transaction information
                  </h3>
                </div>

                <dl className="divide-y divide-slate-100 px-4 dark:divide-slate-900">
                  <ReconciliationDetailRow
                    label="Description"
                    value={selectedTransaction.description || "Not available"}
                  />

                  <ReconciliationDetailRow
                    label="Category"
                    value={formatReconciliationLabel(
                      selectedTransaction.transaction_category
                    )}
                  />

                  <ReconciliationDetailRow
                    label="Transaction status"
                    value={formatReconciliationLabel(
                      selectedTransaction.status
                    )}
                  />

                  <ReconciliationDetailRow
                    label="Internal reference"
                    value={selectedTransaction.internal_reference}
                  />

                  <ReconciliationDetailRow
                    label="Provider reference"
                    value={
                      selectedTransaction.provider_reference ?? "Not available"
                    }
                  />

                  <ReconciliationDetailRow
                    label="Invoice number"
                    value={
                      selectedTransaction.invoice_number ?? "Not available"
                    }
                  />

                  <ReconciliationDetailRow
                    label="Receipt number"
                    value={
                      selectedTransaction.receipt_number ?? "Not available"
                    }
                  />

                  <ReconciliationDetailRow
                    label="Source table"
                    value={selectedTransaction.source_table ?? "Not available"}
                  />

                  <ReconciliationDetailRow
                    label="Source ID"
                    value={selectedTransaction.source_id ?? "Not available"}
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
                    Customer
                  </p>

                  <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                    {selectedTransaction.customer_name ?? "Not available"}
                  </p>

                  <p className="mt-2 break-all text-sm text-slate-500 dark:text-slate-400">
                    {selectedTransaction.customer_email ?? "No email"}
                  </p>

                  {selectedTransaction.customer_phone && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {selectedTransaction.customer_phone}
                    </p>
                  )}
                </article>

                <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <CalendarDays
                    size={18}
                    className="text-blue-600 dark:text-blue-400"
                  />

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Provider
                  </p>

                  <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                    {formatReconciliationLabel(selectedTransaction.provider)}
                  </p>

                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {selectedTransaction.payment_method
                      ? formatReconciliationLabel(
                          selectedTransaction.payment_method
                        )
                      : "Payment method not specified"}
                  </p>

                  <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">
                    {selectedTransaction.bank_account ?? "No bank account"}
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Base currency
                  </p>

                  <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                    {selectedTransaction.base_currency}
                  </p>

                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Exchange rate: {selectedTransaction.exchange_rate}
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Base amount:{" "}
                    {formatReconciliationCurrency(
                      selectedTransaction.base_amount,
                      selectedTransaction.base_currency
                    )}
                  </p>
                </article>
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Reconciliation information
                  </h3>
                </div>

                <dl className="divide-y divide-slate-100 px-4 dark:divide-slate-900">
                  <ReconciliationDetailRow
                    label="External reference"
                    value={
                      selectedTransaction.reconciliation_reference ??
                      "Not available"
                    }
                  />

                  <ReconciliationDetailRow
                    label="External amount"
                    value={
                      selectedTransaction.external_amount === null
                        ? "Not recorded"
                        : formatReconciliationCurrency(
                            selectedTransaction.external_amount,
                            selectedTransaction.currency
                          )
                    }
                  />

                  <ReconciliationDetailRow
                    label="Settlement date"
                    value={formatReconciliationDateTime(
                      selectedTransaction.settlement_date
                    )}
                  />

                  <ReconciliationDetailRow
                    label="Reconciled at"
                    value={formatReconciliationDateTime(
                      selectedTransaction.reconciled_at
                    )}
                  />

                  <ReconciliationDetailRow
                    label="Reconciled by"
                    value={selectedTransaction.reconciled_by ?? "Not available"}
                  />
                </dl>
              </section>

              <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  Amount breakdown
                </h3>

                <dl className="mt-3 divide-y divide-slate-100 dark:divide-slate-900">
                  <ReconciliationDetailRow
                    label="Gross amount"
                    value={formatReconciliationCurrency(
                      selectedTransaction.amount,
                      selectedTransaction.currency
                    )}
                  />

                  <ReconciliationDetailRow
                    label="Fee amount"
                    value={formatReconciliationCurrency(
                      selectedTransaction.fee_amount,
                      selectedTransaction.currency
                    )}
                  />

                  <ReconciliationDetailRow
                    label="Tax amount"
                    value={formatReconciliationCurrency(
                      selectedTransaction.tax_amount,
                      selectedTransaction.currency
                    )}
                  />

                  <ReconciliationDetailRow
                    label="Refunded amount"
                    value={formatReconciliationCurrency(
                      selectedTransaction.refunded_amount,
                      selectedTransaction.currency
                    )}
                  />

                  <ReconciliationDetailRow
                    label="Calculated net"
                    value={formatReconciliationCurrency(
                      netAmount,
                      selectedTransaction.currency
                    )}
                  />
                </dl>
              </section>
            </div>

            {(selectedTransaction.reconciliation_notes ||
              selectedTransaction.dispute_reason) && (
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Reconciliation notes
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {selectedTransaction.reconciliation_notes ??
                      "No reconciliation notes have been added."}
                  </p>
                </section>

                <section className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20 sm:p-5">
                  <h3 className="font-semibold text-red-800 dark:text-red-200">
                    Dispute reason
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-red-700 dark:text-red-300">
                    {selectedTransaction.dispute_reason ??
                      "This transaction is not currently disputed."}
                  </p>
                </section>
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <div className="flex items-center gap-2">
                <History
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />

                <h3 className="font-semibold text-slate-950 dark:text-white">
                  Reconciliation history
                </h3>
              </div>

              {selectedTransaction.history.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  No reconciliation actions have been recorded for this
                  transaction.
                </p>
              ) : (
                <ol className="mt-5">
                  {selectedTransaction.history.map((item) => (
                    <ReconciliationHistoryRecord
                      key={item.id}
                      item={item}
                      currency={selectedTransaction.currency}
                    />
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Reconciliation actions
              </h3>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {selectedTransaction.reconciliation_status !== "reconciled" && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => onAction("reconcile", selectedTransaction)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {processing ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    Reconcile
                  </button>
                )}

                {selectedTransaction.reconciliation_status !== "disputed" && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => onAction("dispute", selectedTransaction)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    <AlertTriangle size={16} />
                    Dispute
                  </button>
                )}

                {selectedTransaction.reconciliation_status !==
                  "unreconciled" && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => onAction("undo", selectedTransaction)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
                  >
                    <RotateCcw size={16} />
                    Undo
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
