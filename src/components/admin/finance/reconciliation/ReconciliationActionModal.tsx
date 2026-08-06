import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  disputeTransaction,
  reconcileTransaction,
  undoReconciliation,
} from "../../../../lib/reconciliation";
import type {
  ReconciliationTransaction,
  ReconcileTransactionInput,
} from "../../../../types/reconciliation";

export type ReconciliationActionType = "reconcile" | "dispute" | "undo";

interface ReconciliationActionModalProps {
  open: boolean;

  action: ReconciliationActionType | null;

  transaction: ReconciliationTransaction | null;

  onClose: () => void;

  onCompleted: (transaction: ReconciliationTransaction) => void | Promise<void>;
}

interface ReconciliationActionForm {
  external_reference: string;

  external_amount: string;

  settlement_date: string;

  dispute_reason: string;

  evidence_url: string;

  notes: string;
}

/**
 * Return today's date in YYYY-MM-DD format.
 */
function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Return the initial form values for one transaction.
 */
function getInitialForm(
  transaction: ReconciliationTransaction | null
): ReconciliationActionForm {
  return {
    external_reference:
      transaction?.reconciliation_reference ??
      transaction?.provider_reference ??
      "",

    external_amount:
      transaction?.external_amount !== null &&
      transaction?.external_amount !== undefined
        ? String(transaction.external_amount)
        : transaction
          ? String(transaction.amount)
          : "",

    settlement_date:
      transaction?.settlement_date ??
      transaction?.transaction_date ??
      getTodayDate(),

    dispute_reason: transaction?.dispute_reason ?? "",

    evidence_url: "",

    notes: transaction?.reconciliation_notes ?? "",
  };
}

/**
 * Format one monetary value using its currency code.
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
 * Convert an internal value into a readable label.
 */
function formatReconciliationLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return the presentation configuration for one reconciliation action.
 */
function getActionConfiguration(action: ReconciliationActionType | null) {
  switch (action) {
    case "reconcile":
      return {
        title: "Reconcile Transaction",

        description:
          "Match this internal transaction with the corresponding external payment or settlement record.",

        submitLabel: "Mark as Reconciled",

        submittingLabel: "Reconciling...",

        icon: CheckCircle2,

        iconClasses:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",

        buttonClasses: "bg-emerald-600 text-white hover:bg-emerald-700",
      };

    case "dispute":
      return {
        title: "Dispute Transaction",

        description:
          "Record the mismatch or issue preventing this transaction from being reconciled.",

        submitLabel: "Mark as Disputed",

        submittingLabel: "Disputing...",

        icon: AlertTriangle,

        iconClasses:
          "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",

        buttonClasses: "bg-red-600 text-white hover:bg-red-700",
      };

    case "undo":
      return {
        title: "Undo Reconciliation",

        description:
          "Return this transaction to unreconciled status while preserving its reconciliation history.",

        submitLabel: "Undo Reconciliation",

        submittingLabel: "Undoing...",

        icon: RotateCcw,

        iconClasses:
          "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",

        buttonClasses: "bg-blue-600 text-white hover:bg-blue-700",
      };

    default:
      return {
        title: "Reconciliation Action",

        description: "Complete the selected reconciliation action.",

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
 * Render one reusable reconciliation action field.
 */
function ReconciliationActionField({
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
 * Render the reusable reconcile, dispute and undo modal.
 */
export default function ReconciliationActionModal({
  open,
  action,
  transaction,
  onClose,
  onCompleted,
}: ReconciliationActionModalProps) {
  const [form, setForm] = useState<ReconciliationActionForm>(
    getInitialForm(transaction)
  );

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(getInitialForm(transaction));
  }, [action, open, transaction]);

  const configuration = useMemo(() => getActionConfiguration(action), [action]);

  const inputClasses =
    "w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-white";

  if (!open || !action || !transaction) {
    return null;
  }

  const selectedTransaction = transaction;

  const Icon = configuration.icon;

  const externalAmount = Number(form.external_amount || 0);

  const amountDifference = Number.isFinite(externalAmount)
    ? Number((externalAmount - selectedTransaction.amount).toFixed(2))
    : 0;

  /**
   * Update one controlled action field.
   */
  function updateField<Key extends keyof ReconciliationActionForm>(
    key: Key,
    value: ReconciliationActionForm[Key]
  ) {
    setForm((currentForm: ReconciliationActionForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  /**
   * Validate and execute the selected reconciliation action.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (action === "reconcile" || action === "dispute") {
      if (!Number.isFinite(externalAmount) || externalAmount < 0) {
        toast.error("External amount must be zero or greater.");

        return;
      }
    }

    if (action === "reconcile" && !form.external_reference.trim()) {
      toast.error("An external reconciliation reference is required.");

      return;
    }

    if (action === "reconcile" && !form.settlement_date) {
      toast.error("A settlement date is required.");

      return;
    }

    if (action === "dispute" && !form.dispute_reason.trim()) {
      toast.error("A dispute reason is required.");

      return;
    }

    if (form.evidence_url.trim()) {
      try {
        new URL(form.evidence_url.trim());
      } catch {
        toast.error("Enter a valid evidence URL, including https://.");

        return;
      }
    }

    setSubmitting(true);

    try {
      let updatedTransaction: ReconciliationTransaction;

      switch (action) {
        case "reconcile": {
          const input: ReconcileTransactionInput = {
            external_reference: form.external_reference.trim(),

            external_amount: Number(externalAmount.toFixed(2)),

            settlement_date: form.settlement_date,

            notes: form.notes.trim() || null,

            evidence_url: form.evidence_url.trim() || null,

            metadata: {
              previous_reconciliation_status:
                selectedTransaction.reconciliation_status,

              internal_amount: selectedTransaction.amount,

              amount_difference: amountDifference,

              provider: selectedTransaction.provider,

              provider_reference: selectedTransaction.provider_reference,
            },
          };

          updatedTransaction = await reconcileTransaction(
            selectedTransaction.id,
            input
          );

          toast.success("Transaction reconciled successfully.");

          break;
        }

        case "dispute":
          updatedTransaction = await disputeTransaction(
            selectedTransaction.id,
            {
              dispute_reason: form.dispute_reason.trim(),

              external_reference: form.external_reference.trim() || null,

              external_amount: Number(externalAmount.toFixed(2)),

              settlement_date: form.settlement_date || null,

              notes: form.notes.trim() || null,

              evidence_url: form.evidence_url.trim() || null,

              metadata: {
                previous_reconciliation_status:
                  selectedTransaction.reconciliation_status,

                internal_amount: selectedTransaction.amount,

                amount_difference: amountDifference,

                provider: selectedTransaction.provider,

                provider_reference: selectedTransaction.provider_reference,
              },
            }
          );

          toast.success("Transaction marked as disputed.");

          break;

        case "undo":
          updatedTransaction = await undoReconciliation(
            selectedTransaction.id,
            {
              notes: form.notes.trim() || null,

              metadata: {
                previous_reconciliation_status:
                  selectedTransaction.reconciliation_status,

                previous_reconciliation_reference:
                  selectedTransaction.reconciliation_reference,

                previous_external_amount: selectedTransaction.external_amount,

                previous_settlement_date: selectedTransaction.settlement_date,
              },
            }
          );

          toast.success("Reconciliation undone successfully.");

          break;

        default:
          throw new Error("A valid reconciliation action is required.");
      }

      await onCompleted(updatedTransaction);
    } catch (error) {
      console.error(`Failed to ${action} transaction:`, error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The reconciliation action could not be completed."
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
      aria-labelledby="reconciliation-action-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${configuration.iconClasses}`}
            >
              <Icon size={20} />
            </div>

            <div className="min-w-0">
              <h2
                id="reconciliation-action-title"
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
            title="Close Reconciliation Action"
            aria-label="Close Reconciliation Action"
            disabled={submitting}
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Internal Reference
                </p>

                <p className="mt-1 break-all text-sm font-semibold text-slate-950 dark:text-white">
                  {selectedTransaction.internal_reference}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Current Status
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                  {formatReconciliationLabel(
                    selectedTransaction.reconciliation_status
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Internal Amount
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                  {formatReconciliationCurrency(
                    selectedTransaction.amount,
                    selectedTransaction.currency
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Provider
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                  {formatReconciliationLabel(selectedTransaction.provider)}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Description
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {selectedTransaction.description}
              </p>
            </div>
          </section>

          {(action === "reconcile" || action === "dispute") && (
            <section className="grid gap-4 sm:grid-cols-2">
              <ReconciliationActionField
                label="External Reference"
                required={action === "reconcile"}
              >
                <input
                  value={form.external_reference}
                  onChange={(event) =>
                    updateField("external_reference", event.target.value)
                  }
                  placeholder="Bank or provider reference"
                  className={inputClasses}
                />
              </ReconciliationActionField>

              <ReconciliationActionField label="External Amount" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.external_amount}
                  onChange={(event) =>
                    updateField("external_amount", event.target.value)
                  }
                  className={inputClasses}
                />
              </ReconciliationActionField>

              <ReconciliationActionField
                label="Settlement Date"
                required={action === "reconcile"}
              >
                <input
                  type="date"
                  value={form.settlement_date}
                  onChange={(event) =>
                    updateField("settlement_date", event.target.value)
                  }
                  className={inputClasses}
                />
              </ReconciliationActionField>

              <ReconciliationActionField label="Evidence URL">
                <input
                  type="url"
                  value={form.evidence_url}
                  onChange={(event) =>
                    updateField("evidence_url", event.target.value)
                  }
                  placeholder="https://..."
                  className={inputClasses}
                />
              </ReconciliationActionField>
            </section>
          )}

          {(action === "reconcile" || action === "dispute") && (
            <section className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Internal
                </p>

                <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                  {formatReconciliationCurrency(
                    selectedTransaction.amount,
                    selectedTransaction.currency
                  )}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  External
                </p>

                <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                  {formatReconciliationCurrency(
                    Number.isFinite(externalAmount) ? externalAmount : 0,
                    selectedTransaction.currency
                  )}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Difference
                </p>

                <p
                  className={`mt-1 text-sm font-bold ${
                    amountDifference === 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {amountDifference > 0 ? "+" : ""}

                  {formatReconciliationCurrency(
                    amountDifference,
                    selectedTransaction.currency
                  )}
                </p>
              </div>
            </section>
          )}

          {action === "dispute" && (
            <ReconciliationActionField label="Dispute Reason" required>
              <textarea
                rows={3}
                value={form.dispute_reason}
                onChange={(event) =>
                  updateField("dispute_reason", event.target.value)
                }
                placeholder="Explain the amount, reference, status or settlement mismatch"
                className={inputClasses}
              />
            </ReconciliationActionField>
          )}

          <ReconciliationActionField
            label={action === "undo" ? "Reason for Undoing" : "Internal Notes"}
          >
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder={
                action === "undo"
                  ? "Explain why this reconciliation should be undone"
                  : "Optional notes visible to Finance staff"
              }
              className={inputClasses}
            />
          </ReconciliationActionField>

          {action === "reconcile" && amountDifference !== 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
              The external amount differs from the internal amount. You can
              still reconcile it, but the difference will be recorded in the
              audit history.
            </div>
          )}

          {action === "undo" && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300">
              This will clear the current external reference, amount, settlement
              date and dispute details from the transaction. The previous values
              will remain available in reconciliation history.
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
