import { AlertTriangle, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { supabase } from "../../../lib/superbase";

interface PaystackRefundModalProps {
  open: boolean;
  transactionId: string;
  customerName: string;
  description: string;
  currency: string;
  amount: number;
  refundedAmount?: number;
  onClose: () => void;
  onRefundSubmitted?: () => void;
}

/* Formats one Finance amount using the supplied currency. */
function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
  }).format(value);
}

/* Displays and submits a Paystack refund request for one Finance transaction. */
export default function PaystackRefundModal({
  open,
  transactionId,
  customerName,
  description,
  currency,
  amount,
  refundedAmount = 0,
  onClose,
  onRefundSubmitted,
}: PaystackRefundModalProps) {
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [reason, setReason] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* Calculates the amount that has not yet been refunded. */
  const refundableBalance = useMemo(() => {
    return Math.max(0, Number((amount - refundedAmount).toFixed(2)));
  }, [amount, refundedAmount]);

  /* Resolves the amount that will be submitted to the refund API. */
  const refundAmount =
    refundType === "full" ? refundableBalance : Number(partialAmount || 0);

  /* Resets the refund form to its initial state. */
  function resetForm() {
    setRefundType("full");
    setPartialAmount("");
    setReason("");
    setInternalNotes("");
  }

  /* Closes the refund modal and clears any unsaved form values. */
  function handleClose() {
    if (submitting) {
      return;
    }

    resetForm();
    onClose();
  }

  /* Validates and submits the Paystack refund request through the server API. */
  async function handleRefund() {
    if (submitting) {
      return;
    }

    if (!reason.trim()) {
      toast.error("Enter a reason for the refund.");
      return;
    }

    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      toast.error("Enter a valid refund amount.");
      return;
    }

    if (refundAmount > refundableBalance) {
      toast.error(
        `The refund cannot exceed ${formatCurrency(
          refundableBalance,
          currency
        )}.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Your admin session has expired.");
      }

      const response = await fetch("/api/admin/finance/refunds/paystack", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId,
          amount: refundAmount,
          reason: reason.trim(),
          internalNotes: internalNotes.trim() || undefined,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        refundReference?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "The refund could not be submitted.");
      }

      toast.success(
        result.message || "The refund has been submitted to Paystack."
      );

      resetForm();
      onClose();
      onRefundSubmitted?.();
    } catch (error) {
      console.error("Failed to submit Paystack refund:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The refund could not be submitted."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-red-500">
              Payment Refund
            </p>

            <h2
              id="refund-modal-title"
              className="mt-2 text-2xl font-bold text-slate-950 dark:text-white"
            >
              Refund Paystack Payment
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Submit a full or partial refund for this transaction.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Close refund modal"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6 p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-950 dark:text-white">
              {customerName}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Original amount
                </p>

                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(amount, currency)}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Refundable balance
                </p>

                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(refundableBalance, currency)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Refund type
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRefundType("full")}
                className={`rounded-2xl border p-4 text-left transition ${
                  refundType === "full"
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                }`}
              >
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  Full refund
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Refund the entire remaining balance.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRefundType("partial")}
                className={`rounded-2xl border p-4 text-left transition ${
                  refundType === "partial"
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                }`}
              >
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  Partial refund
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Refund only part of the payment.
                </p>
              </button>
            </div>
          </div>

          {refundType === "partial" ? (
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Refund amount
              <input
                type="number"
                min="0.01"
                max={refundableBalance}
                step="0.01"
                value={partialAmount}
                onChange={(event) => setPartialAmount(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
          ) : null}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                  Refund amount
                </p>

                <p className="mt-1 text-lg font-bold text-amber-950 dark:text-amber-200">
                  {formatCurrency(refundAmount || 0, currency)}
                </p>

                <p className="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-400">
                  Paystack will process the refund asynchronously. Finance
                  revenue will only change after the refund is confirmed.
                </p>
              </div>
            </div>
          </div>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Refund reason
            <textarea
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is this payment being refunded?"
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Internal notes
            <textarea
              rows={3}
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
              placeholder="Optional internal Finance notes..."
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
        </div>

        <footer className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              void handleRefund();
            }}
            disabled={submitting || refundableBalance <= 0 || refundAmount <= 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}

            {submitting ? "Submitting..." : "Process Refund"}
          </button>
        </footer>
      </div>
    </div>
  );
}
