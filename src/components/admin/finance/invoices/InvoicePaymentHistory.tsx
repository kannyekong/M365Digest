import {
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { Invoice } from "../../../../types/invoice";
import type {
  InvoicePaymentAttempt,
  InvoicePaymentAttemptStatus,
} from "../../../../types/invoice-payment";
import { getInvoicePaymentAttempts } from "../../../../lib/invoice-payment-history";
import { formatInvoiceCurrency } from "../../../../utils/invoice";

interface InvoicePaymentHistoryProps {
  invoice: Invoice;
  refreshKey?: string | number;
}

/**
 * Format one stored date-time for display.
 */
function formatPaymentDate(value: string | null) {
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
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * Convert one underscore-separated value into a readable label.
 */
function formatPaymentLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return theme-aware classes for one payment-attempt status.
 */
function getPaymentStatusClasses(
  status: InvoicePaymentAttemptStatus
) {
  switch (status) {
    case "successful":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "failed":
    case "cancelled":
    case "expired":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
    case "pending":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }
}

/**
 * Return the matching icon for one payment-attempt status.
 */
function PaymentStatusIcon({
  status,
}: {
  status: InvoicePaymentAttemptStatus;
}) {
  switch (status) {
    case "successful":
      return <CheckCircle2 size={16} />;
    case "failed":
    case "cancelled":
    case "expired":
      return <XCircle size={16} />;
    default:
      return <Clock3 size={16} />;
  }
}

/**
 * Display all Paystack attempts belonging to one Invoice.
 */
export default function InvoicePaymentHistory({
  invoice,
  refreshKey,
}: InvoicePaymentHistoryProps) {
  const [attempts, setAttempts] = useState<InvoicePaymentAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Load the complete payment-attempt history.
   */
  const loadAttempts = useCallback(async () => {
    setLoading(true);

    try {
      setAttempts(await getInvoicePaymentAttempts(invoice.id));
    } catch (error) {
      console.error("Failed to load Invoice payment history:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Invoice payment history could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [invoice.id]);

  useEffect(() => {
    void loadAttempts();
  }, [loadAttempts, refreshKey]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-950 dark:text-white">
            Payment history
          </h3>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Paystack attempts and confirmed payments for this Invoice.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAttempts()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center">
          <LoaderCircle size={26} className="animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      ) : attempts.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <CreditCard size={20} />
          </div>

          <p className="mt-4 font-semibold text-slate-900 dark:text-white">
            No payment attempts yet
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-900">
          {attempts.map((attempt) => (
            <article
              key={attempt.id}
              className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950 dark:text-white">
                    {formatInvoiceCurrency(
                      Number(attempt.amount),
                      attempt.currency
                    )}
                  </p>

                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentStatusClasses(attempt.status)}`}>
                    <PaymentStatusIcon status={attempt.status} />
                    {formatPaymentLabel(attempt.status)}
                  </span>
                </div>

                <p className="mt-2 break-all text-xs font-medium text-slate-500 dark:text-slate-400">
                  {attempt.reference}
                </p>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Created: {formatPaymentDate(attempt.created_at)}
                </p>
              </div>

              {attempt.authorization_url &&
                !["successful", "cancelled", "expired"].includes(
                  attempt.status
                ) && (
                  <a
                    href={attempt.authorization_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
                  >
                    <ExternalLink size={15} />
                    Resume payment
                  </a>
                )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
