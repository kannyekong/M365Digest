import {
  Banknote,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Mail,
  ReceiptText,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import type { Receipt } from "../../../../types/receipt";
import ReceiptActionPanel from "./ReceiptActionPanel";
import ReceiptStatusActions from "./ReceiptStatusActions";

interface ReceiptDetailsModalProps {
  receipt: Receipt | null;

  open: boolean;

  onClose: () => void;
  onReceiptUpdated?: (receipt: Receipt) => void;

  onViewInvoice?: (invoiceId: string) => void;

  onViewRevenue?: (revenueTransactionId: string) => void;
}

/**
 * Format one Receipt currency value.
 */
function formatReceiptCurrency(amount: number, currency = "NGN") {
  return `${currency.toUpperCase()} ${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/**
 * Format one Receipt date-time.
 */
function formatReceiptDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * Convert underscore-separated values into readable labels.
 */
function formatReceiptLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return theme-aware classes for one Receipt status.
 */
function getReceiptStatusClasses(status: Receipt["status"]) {
  switch (status) {
    case "issued":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "refunded":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

    case "voided":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/**
 * Render one labeled Receipt detail row.
 */
function ReceiptDetailRow({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>

      <dd className="break-all text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </dd>
    </div>
  );
}

/**
 * Render one professional Receipt details modal.
 */
export default function ReceiptDetailsModal({
  receipt,
  open,
  onClose,
  onViewInvoice,
  onViewRevenue,
  onReceiptUpdated
}: ReceiptDetailsModalProps) {
  if (!open || !receipt) {
    return null;
  }

  /**
   * Open the linked Invoice when the parent supplied a handler.
   */
  function handleViewInvoice() {
    if (!onViewInvoice) {
      toast.info("Invoice navigation is not connected on this page yet.");

      return;
    }

    onViewInvoice(receipt!.invoice_id);
  }

  /**
   * Open the linked Revenue transaction when the parent supplied a handler.
   */
  function handleViewRevenue() {
    if (!onViewRevenue) {
      toast.info("Revenue navigation is not connected on this page yet.");

      return;
    }

    onViewRevenue(receipt!.revenue_transaction_id);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <ReceiptText size={21} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                Payment Receipt
              </p>

              <h2
                id="receipt-details-title"
                className="mt-1 truncate text-xl font-bold text-slate-950 dark:text-white sm:text-2xl"
              >
                {receipt.receipt_number}
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Linked to Invoice {receipt.invoice_number}
              </p>
            </div>
          </div>

          <button
            type="button"
            title="Close Receipt"
            aria-label="Close Receipt"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <div className="max-h-[calc(92vh-82px)] overflow-y-auto">
          <div className="space-y-6 p-5 sm:p-6">
            <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-center dark:border-blue-950/60 dark:bg-blue-950/20 sm:p-7">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Amount received
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">
                {formatReceiptCurrency(receipt.amount, receipt.currency)}
              </p>

              <span
                className={`mt-4 inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getReceiptStatusClasses(
                  receipt.status
                )}`}
              >
                {formatReceiptLabel(receipt.status)}
              </span>
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <UserRound
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Customer
                </p>

                <p className="mt-2 font-semibold text-slate-950 dark:text-white">
                  {receipt.customer_name}
                </p>

                <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                  {receipt.customer_email}
                </p>

                {receipt.customer_phone && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {receipt.customer_phone}
                  </p>
                )}
              </article>

              <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <FileText
                  size={18}
                  className="text-violet-600 dark:text-violet-400"
                />

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Invoice
                </p>

                <p className="mt-2 font-semibold text-slate-950 dark:text-white">
                  {receipt.invoice_number}
                </p>

                <button
                  type="button"
                  onClick={handleViewInvoice}
                  className="mt-3 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  View linked Invoice
                </button>
              </article>

              <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <CircleDollarSign
                  size={18}
                  className="text-emerald-600 dark:text-emerald-400"
                />

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Revenue
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                  Linked transaction
                </p>

                <button
                  type="button"
                  onClick={handleViewRevenue}
                  className="mt-3 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  View Revenue record
                </button>
              </article>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Payment details
                  </h3>
                </div>

                <dl className="divide-y divide-slate-100 px-4 dark:divide-slate-900">
                  <ReceiptDetailRow
                    label="Payment reference"
                    value={receipt.payment_reference}
                  />

                  <ReceiptDetailRow
                    label="Provider"
                    value={formatReceiptLabel(receipt.payment_provider)}
                  />

                  <ReceiptDetailRow
                    label="Payment method"
                    value={
                      receipt.payment_method
                        ? formatReceiptLabel(receipt.payment_method)
                        : "Not available"
                    }
                  />

                  <ReceiptDetailRow
                    label="Gateway response"
                    value={receipt.gateway_response ?? "Not available"}
                  />

                  <ReceiptDetailRow
                    label="Provider transaction ID"
                    value={
                      receipt.provider_transaction_id
                        ? String(receipt.provider_transaction_id)
                        : "Not available"
                    }
                  />

                  <ReceiptDetailRow
                    label="Paid at"
                    value={formatReceiptDate(receipt.paid_at)}
                  />

                  <ReceiptDetailRow
                    label="Issued at"
                    value={formatReceiptDate(receipt.issued_at)}
                  />
                </dl>
              </section>

              <section className="space-y-4">
                <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <CalendarDays
                    size={18}
                    className="text-amber-600 dark:text-amber-400"
                  />

                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Timeline
                  </p>

                  <div className="mt-4 space-y-4">
                    <div className="relative pl-5">
                      <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />

                      <p className="text-sm font-semibold text-slate-950 dark:text-white">
                        Payment received
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatReceiptDate(receipt.paid_at)}
                      </p>
                    </div>

                    <div className="relative pl-5">
                      <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />

                      <p className="text-sm font-semibold text-slate-950 dark:text-white">
                        Receipt issued
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatReceiptDate(receipt.issued_at)}
                      </p>
                    </div>

                    {receipt.refunded_at && (
                      <div className="relative pl-5">
                        <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-amber-500" />

                        <p className="text-sm font-semibold text-slate-950 dark:text-white">
                          Receipt refunded
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatReceiptDate(receipt.refunded_at)}
                        </p>
                      </div>
                    )}

                    {receipt.voided_at && (
                      <div className="relative pl-5">
                        <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />

                        <p className="text-sm font-semibold text-slate-950 dark:text-white">
                          Receipt voided
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatReceiptDate(receipt.voided_at)}
                        </p>
                      </div>
                    )}
                  </div>
                </article>

                {receipt.notes && (
                  <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Notes
                    </p>

                    <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {receipt.notes}
                    </p>
                  </article>
                )}
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Banknote
                  size={18}
                  className="text-emerald-600 dark:text-emerald-400"
                />

                <h3 className="font-semibold text-slate-950 dark:text-white">
                  Receipt actions
                </h3>
              </div>

              <ReceiptActionPanel receipt={receipt} />

              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="mb-3 text-sm font-semibold text-slate-950 dark:text-white">
                  Status controls
                </p>

                <ReceiptStatusActions
                  receipt={receipt}
                  onUpdated={(updatedReceipt) => {
                    onReceiptUpdated?.(updatedReceipt);
                  }}
                />
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <Mail size={14} className="mt-0.5 shrink-0" />

                <p>
                  Email delivery is not connected yet. Download and print
                  actions are fully available.
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
