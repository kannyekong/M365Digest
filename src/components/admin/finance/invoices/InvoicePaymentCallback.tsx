import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface InvoicePaymentCallbackProps {
  reference: string;
}

interface PaymentStatusResponse {
  success: boolean;
  message?: string;
  attempt?: {
    reference: string;
    amount: number;
    currency: string;
    status:
      | "initialized"
      | "pending"
      | "successful"
      | "failed"
      | "cancelled"
      | "expired";
  };
  invoice?: {
    id: string;
    invoice_number: string;
    amount_paid: number;
    amount_due: number;
    currency: string;
    status: string;
  };
}

/**
 * Format one currency value using its ISO code.
 */
function formatCallbackCurrency(
  amount: number,
  currency: string
) {
  return `${currency.toUpperCase()} ${new Intl.NumberFormat(
    "en-NG",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(amount)}`;
}

/**
 * Display the webhook-confirmed status of one Paystack Invoice payment.
 */
export default function InvoicePaymentCallback({
  reference,
}: InvoicePaymentCallbackProps) {
  const [result, setResult] =
    useState<PaymentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Retrieve the latest payment status from the server.
   */
  const loadStatus = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/paystack/invoices/status?reference=${encodeURIComponent(
          reference
        )}`
      );

      setResult(
        (await response.json()) as PaymentStatusResponse
      );
    } catch (error) {
      console.error(
        "Failed to retrieve payment callback status:",
        error
      );

      setResult({
        success: false,
        message: "Payment status could not be retrieved.",
      });
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const successful =
    result?.attempt?.status === "successful";

  const terminalFailure = [
    "failed",
    "cancelled",
    "expired",
  ].includes(result?.attempt?.status ?? "");

  return (
    <main className="mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      {loading ? (
        <>
          <LoaderCircle size={34} className="mx-auto animate-spin text-blue-600 dark:text-blue-400" />

          <h1 className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">
            Confirming payment
          </h1>
        </>
      ) : successful ? (
        <>
          <CheckCircle2 size={34} className="mx-auto text-emerald-600" />

          <h1 className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">
            Payment confirmed
          </h1>
        </>
      ) : terminalFailure ? (
        <>
          <XCircle size={34} className="mx-auto text-red-600" />

          <h1 className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">
            Payment not completed
          </h1>
        </>
      ) : (
        <>
          <Clock3 size={34} className="mx-auto text-amber-600" />

          <h1 className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">
            Awaiting webhook confirmation
          </h1>
        </>
      )}

      {result?.invoice && (
        <section className="mt-6 rounded-2xl bg-slate-50 p-4 text-left dark:bg-slate-950">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Invoice
            </span>

            <span className="font-semibold text-slate-950 dark:text-white">
              {result.invoice.invoice_number}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Paid
            </span>

            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              {formatCallbackCurrency(
                result.invoice.amount_paid,
                result.invoice.currency
              )}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Outstanding
            </span>

            <span className="font-semibold text-slate-950 dark:text-white">
              {formatCallbackCurrency(
                result.invoice.amount_due,
                result.invoice.currency
              )}
            </span>
          </div>
        </section>
      )}

      <p className="mt-5 break-all rounded-xl bg-slate-100 px-4 py-3 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Reference: {reference}
      </p>

      <button
        type="button"
        onClick={() => void loadStatus()}
        disabled={loading}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <RefreshCw size={16} />
        Check again
      </button>
    </main>
  );
}
