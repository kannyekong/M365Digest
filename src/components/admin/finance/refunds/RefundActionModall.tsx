import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleX,
  LoaderCircle,
  Play,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  approveRefund,
  cancelRefund,
  processRefund,
  rejectRefund,
} from "../../../../lib/refund";
import type {
  FinanceRefund,
  FinanceRefundListItem,
} from "../../../../types/refund";

export type RefundActionType = "approve" | "reject" | "process" | "cancel";

interface RefundActionModalProps {
  open: boolean;
  action: RefundActionType | null;
  refund: FinanceRefundListItem | FinanceRefund | null;
  onClose: () => void;
  onCompleted: (refund: FinanceRefund) => void | Promise<void>;
}

interface RefundActionForm {
  amount: string;
  provider_refund_reference: string;
  payment_method: string;
  reason: string;
  internal_notes: string;
}

/**
 * Return the default action form for the selected Refund.
 */
function getInitialForm(
  refund: FinanceRefundListItem | FinanceRefund | null
): RefundActionForm {
  const defaultAmount =
    refund?.approved_amount ?? refund?.requested_amount ?? 0;

  return {
    amount: defaultAmount > 0 ? String(defaultAmount) : "",

    provider_refund_reference: refund?.provider_refund_reference ?? "",

    payment_method: refund?.payment_method ?? "",

    reason: "",

    internal_notes: "",
  };
}

/**
 * Format one monetary Refund amount.
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
 * Convert an internal value into a readable label.
 */
function formatRefundLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return the title, description and visual treatment for one action.
 */
function getActionConfiguration(action: RefundActionType | null) {
  switch (action) {
    case "approve":
      return {
        title: "Approve Refund",
        description: "Confirm the amount Finance has approved for this Refund.",
        submitLabel: "Approve Refund",
        submittingLabel: "Approving...",
        icon: CheckCircle2,
        iconClasses:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        buttonClasses: "bg-emerald-600 text-white hover:bg-emerald-700",
      };

    case "reject":
      return {
        title: "Reject Refund",
        description:
          "Provide the reason this Refund request should not proceed.",
        submitLabel: "Reject Refund",
        submittingLabel: "Rejecting...",
        icon: CircleX,
        iconClasses:
          "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
        buttonClasses: "bg-red-600 text-white hover:bg-red-700",
      };

    case "process":
      return {
        title: "Process Refund",
        description:
          "Record the confirmed Refund amount and provider reference.",
        submitLabel: "Process Refund",
        submittingLabel: "Processing...",
        icon: Play,
        iconClasses:
          "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
        buttonClasses: "bg-blue-600 text-white hover:bg-blue-700",
      };

    case "cancel":
      return {
        title: "Cancel Refund",
        description: "Cancel this Refund request before it is completed.",
        submitLabel: "Cancel Refund",
        submittingLabel: "Cancelling...",
        icon: Ban,
        iconClasses:
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        buttonClasses:
          "bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-950 dark:hover:bg-white",
      };

    default:
      return {
        title: "Refund Action",
        description: "Complete the selected Refund action.",
        submitLabel: "Continue",
        submittingLabel: "Processing...",
        icon: AlertTriangle,
        iconClasses:
          "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        buttonClasses:
          "bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200",
      };
  }
}

/**
 * Render one reusable Refund action form field.
 */
function RefundActionField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      {children}
    </label>
  );
}

/**
 * Render the reusable Refund approval, rejection, processing and cancellation modal.
 */
export default function RefundActionModal({
  open,
  action,
  refund,
  onClose,
  onCompleted,
}: RefundActionModalProps) {
  const [form, setForm] = useState<RefundActionForm>(getInitialForm(refund));

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(getInitialForm(refund));
  }, [action, open, refund]);

  const configuration = useMemo(() => getActionConfiguration(action), [action]);

  const inputClasses =
    "w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-white";

  const actionAmount = Number(form.amount || 0);

  const maximumAmount = Number(
    refund?.approved_amount ?? refund?.requested_amount ?? 0
  );

  if (!open || !action || !refund) {
    return null;
  }

  const selectedRefund = refund;

  const Icon = configuration.icon;

  /**
   * Update one controlled action field.
   */
  function updateField<Key extends keyof RefundActionForm>(
    key: Key,
    value: RefundActionForm[Key]
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  /**
   * Validate and execute the selected Refund action.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (action === "approve" || action === "process") {
      if (!Number.isFinite(actionAmount) || actionAmount <= 0) {
        toast.error("Refund amount must be greater than zero.");

        return;
      }

      if (actionAmount > maximumAmount) {
        toast.error(
          `Refund amount cannot exceed ${formatRefundCurrency(
            maximumAmount,
            selectedRefund.currency
          )}.`
        );

        return;
      }
    }

    if (action === "reject" && !form.reason.trim()) {
      toast.error("A rejection reason is required.");

      return;
    }

    const requiresProviderReference =
      action === "process" &&
      !["manual", "cash"].includes(selectedRefund.provider);

    if (requiresProviderReference && !form.provider_refund_reference.trim()) {
      toast.error("A provider Refund reference is required.");

      return;
    }

    setSubmitting(true);

    try {
      let updatedRefund: FinanceRefund;

      switch (action) {
        case "approve":
          updatedRefund = await approveRefund(selectedRefund.id, {
            approved_amount: Number(actionAmount.toFixed(2)),

            internal_notes: form.internal_notes.trim() || null,
          });

          toast.success("Refund approved successfully.");

          break;

        case "reject":
          updatedRefund = await rejectRefund(selectedRefund.id, {
            reason: form.reason.trim(),

            internal_notes: form.internal_notes.trim() || null,
          });

          toast.success("Refund rejected successfully.");

          break;

        case "process":
          updatedRefund = await processRefund(selectedRefund.id, {
            refunded_amount: Number(actionAmount.toFixed(2)),

            provider_refund_reference:
              form.provider_refund_reference.trim() || null,

            payment_method: form.payment_method.trim() || null,

            provider_payload: {},

            internal_notes: form.internal_notes.trim() || null,
          });

          toast.success("Refund processed successfully.");

          break;

        case "cancel":
          updatedRefund = await cancelRefund(selectedRefund.id, {
            reason: form.reason.trim() || null,

            internal_notes: form.internal_notes.trim() || null,
          });

          toast.success("Refund cancelled successfully.");

          break;

        default:
          throw new Error("A valid Refund action is required.");
      }

      await onCompleted(updatedRefund);
    } catch (error) {
      console.error(`Failed to ${action} Refund:`, error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Refund action could not be completed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-action-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${configuration.iconClasses}`}
            >
              <Icon size={20} />
            </div>

            <div className="min-w-0">
              <h2
                id="refund-action-title"
                className="text-xl font-bold text-slate-950 dark:text-white"
              >
                {configuration.title}
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {configuration.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            title="Close Refund Action"
            aria-label="Close Refund Action"
            disabled={submitting}
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Refund Reference
                </p>

                <p className="mt-1 break-all text-sm font-semibold text-slate-950 dark:text-white">
                  {refund.refund_reference}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Current Status
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                  {formatRefundLabel(refund.status)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Requested Amount
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                  {formatRefundCurrency(
                    refund.requested_amount,
                    refund.currency
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Provider
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                  {formatRefundLabel(refund.provider)}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Reason
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {refund.reason}
              </p>
            </div>
          </section>

          {(action === "approve" || action === "process") && (
            <RefundActionField
              label={
                action === "approve" ? "Approved Amount" : "Refunded Amount"
              }
              required
            >
              <input
                type="number"
                min="0.01"
                max={maximumAmount}
                step="0.01"
                value={form.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                className={inputClasses}
              />

              <span className="text-xs text-slate-500 dark:text-slate-400">
                Maximum: {formatRefundCurrency(maximumAmount, refund.currency)}
              </span>
            </RefundActionField>
          )}

          {action === "process" && (
            <>
              <RefundActionField label="Payment Method">
                <input
                  value={form.payment_method}
                  onChange={(event) =>
                    updateField("payment_method", event.target.value)
                  }
                  placeholder="Bank transfer, card, cash..."
                  className={inputClasses}
                />
              </RefundActionField>

              <RefundActionField
                label="Provider Refund Reference"
                required={!["manual", "cash"].includes(refund.provider)}
              >
                <input
                  value={form.provider_refund_reference}
                  onChange={(event) =>
                    updateField("provider_refund_reference", event.target.value)
                  }
                  placeholder="Enter the external Refund reference"
                  className={inputClasses}
                />
              </RefundActionField>
            </>
          )}

          {(action === "reject" || action === "cancel") && (
            <RefundActionField
              label={
                action === "reject" ? "Rejection Reason" : "Cancellation Reason"
              }
              required={action === "reject"}
            >
              <textarea
                rows={3}
                value={form.reason}
                onChange={(event) => updateField("reason", event.target.value)}
                placeholder={
                  action === "reject"
                    ? "Explain why this Refund is being rejected"
                    : "Explain why this Refund is being cancelled"
                }
                className={inputClasses}
              />
            </RefundActionField>
          )}

          <RefundActionField label="Internal Notes">
            <textarea
              rows={3}
              value={form.internal_notes}
              onChange={(event) =>
                updateField("internal_notes", event.target.value)
              }
              placeholder="Optional notes visible only to Finance staff"
              className={inputClasses}
            />
          </RefundActionField>

          {action === "process" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
              Processing this action marks the Refund as successful and updates
              the original income transaction’s refunded amount.
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Go Back
          </button>

          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${configuration.buttonClasses}`}
          >
            {submitting && <LoaderCircle size={16} className="animate-spin" />}

            {submitting
              ? configuration.submittingLabel
              : configuration.submitLabel}
          </button>
        </footer>
      </form>
    </div>
  );
}
