import { LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { createRefund, listRefundableTransactions } from "../../../../lib/refund";
import type {
  CreateRefundInput,
  FinanceRefund,
  RefundProvider,
  RefundableTransaction,
} from "../../../../types/refund";

interface RefundFormModalProps {
  open: boolean;

  onClose: () => void;

  onSaved: (refund: FinanceRefund) => void | Promise<void>;
}

interface RefundFormState {
  original_transaction_id: string;

  requested_amount: string;

  reason: string;

  provider: RefundProvider;

  payment_method: string;

  internal_notes: string;
}

const REFUND_PROVIDERS: Array<{
  value: RefundProvider;
  label: string;
}> = [
  {
    value: "manual",
    label: "Manual",
  },
  {
    value: "paystack",
    label: "Paystack",
  },
  {
    value: "bank_transfer",
    label: "Bank Transfer",
  },
  {
    value: "cash",
    label: "Cash",
  },
  {
    value: "other",
    label: "Other",
  },
];

/**
 * Return the default Refund form values.
 */
function getEmptyRefundForm(): RefundFormState {
  return {
    original_transaction_id: "",

    requested_amount: "",

    reason: "",

    provider: "manual",

    payment_method: "",

    internal_notes: "",
  };
}

/**
 * Format one Refund monetary value.
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
 * Format one transaction date.
 */
function formatTransactionDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Convert one internal value into a readable label.
 */
function formatRefundLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Render one reusable Refund form field.
 */
function RefundField({
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
 * Render the Create Refund modal.
 */
export default function RefundFormModal({
  open,
  onClose,
  onSaved,
}: RefundFormModalProps) {
  const [form, setForm] = useState<RefundFormState>(getEmptyRefundForm());

  const [refundableTransactions, setRefundableTransactions] = useState<
    RefundableTransaction[]
  >([]);

  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  /**
   * Load all currently refundable income transactions.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(getEmptyRefundForm());

    setSearch("");

    async function loadTransactions() {
      setLoadingTransactions(true);

      try {
        const transactions = await listRefundableTransactions();

        setRefundableTransactions(transactions);
      } catch (error) {
        console.error("Failed to load refundable transactions:", error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Refundable transactions could not be loaded."
        );

        setRefundableTransactions([]);
      } finally {
        setLoadingTransactions(false);
      }
    }

    void loadTransactions();
  }, [open]);

  const inputClasses =
    "w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white";

  const selectedTransaction = useMemo(
    () =>
      refundableTransactions.find(
        (transaction) =>
          transaction.transaction_id === form.original_transaction_id
      ) ?? null,
    [form.original_transaction_id, refundableTransactions]
  );

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return refundableTransactions;
    }

    return refundableTransactions.filter((transaction) =>
      [
        transaction.internal_reference,
        transaction.provider_reference,
        transaction.invoice_number,
        transaction.customer_name,
        transaction.customer_email,
        transaction.description,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [refundableTransactions, search]);

  const requestedAmount = Number(form.requested_amount || 0);

  if (!open) {
    return null;
  }

  /**
   * Update one controlled Refund field.
   */
  function updateField<Key extends keyof RefundFormState>(
    key: Key,
    value: RefundFormState[Key]
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  /**
   * Apply the selected transaction's provider defaults.
   */
  function handleTransactionChange(transactionId: string) {
    const transaction = refundableTransactions.find(
      (item) => item.transaction_id === transactionId
    );

    setForm((currentForm) => ({
      ...currentForm,

      original_transaction_id: transactionId,

      requested_amount: "",

      provider: REFUND_PROVIDERS.some(
        (provider) => provider.value === transaction?.provider
      )
        ? (transaction?.provider as RefundProvider)
        : "manual",

      payment_method: transaction?.payment_method ?? "",
    }));
  }

  /**
   * Validate and submit one Refund request.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTransaction) {
      toast.error("Select the transaction you want to refund.");

      return;
    }

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      toast.error("Refund amount must be greater than zero.");

      return;
    }

    if (requestedAmount > selectedTransaction.refundable_amount) {
      toast.error(
        `Refund amount cannot exceed ${formatRefundCurrency(
          selectedTransaction.refundable_amount,
          selectedTransaction.currency
        )}.`
      );

      return;
    }

    const reason = form.reason.trim();

    if (!reason) {
      toast.error("A Refund reason is required.");

      return;
    }

    setSaving(true);

    try {
      const input: CreateRefundInput = {
        original_transaction_id: selectedTransaction.transaction_id,

        requested_amount: Number(requestedAmount.toFixed(2)),

        reason,

        provider: form.provider,

        payment_method: form.payment_method.trim() || null,

        invoice_id: null,

        receipt_id: null,

        internal_notes: form.internal_notes.trim() || null,

        metadata: {
          original_internal_reference: selectedTransaction.internal_reference,

          original_provider_reference: selectedTransaction.provider_reference,

          original_invoice_number: selectedTransaction.invoice_number,

          original_receipt_number: selectedTransaction.receipt_number,

          original_amount: selectedTransaction.amount,

          refundable_amount_at_request: selectedTransaction.refundable_amount,

          customer_name: selectedTransaction.customer_name,

          customer_email: selectedTransaction.customer_email,
        },
      };

      const refund = await createRefund(input);

      toast.success("Refund request created successfully.");

      await onSaved(refund);
    } catch (error) {
      console.error("Failed to create Refund request:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Refund request could not be created."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-form-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl"
      >
        <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-6 sm:py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              Finance
            </p>

            <h2
              id="refund-form-title"
              className="mt-1 text-xl font-bold text-slate-950 dark:text-white sm:text-2xl"
            >
              Request Refund
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Select a paid income transaction and enter the amount to refund.
            </p>
          </div>

          <button
            type="button"
            title="Close Refund Form"
            aria-label="Close Refund Form"
            disabled={saving}
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
            <div>
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Original transaction
              </h3>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Only paid income transactions with a remaining refundable
                balance appear here.
              </p>
            </div>

            <label className="relative mt-4 block">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reference, invoice, customer or description"
                className={`${inputClasses} pl-10`}
              />
            </label>

            <div className="mt-4">
              <RefundField label="Refundable Transaction" required>
                <select
                  value={form.original_transaction_id}
                  onChange={(event) =>
                    handleTransactionChange(event.target.value)
                  }
                  disabled={loadingTransactions}
                  className={inputClasses}
                >
                  <option value="">
                    {loadingTransactions
                      ? "Loading transactions..."
                      : filteredTransactions.length === 0
                        ? "No refundable transactions found"
                        : "Select a transaction"}
                  </option>

                  {filteredTransactions.map((transaction) => (
                    <option
                      key={transaction.transaction_id}
                      value={transaction.transaction_id}
                    >
                      {transaction.internal_reference} —{" "}
                      {transaction.customer_name ?? "Unknown customer"} —{" "}
                      {formatRefundCurrency(
                        transaction.refundable_amount,
                        transaction.currency
                      )}{" "}
                      available
                    </option>
                  ))}
                </select>
              </RefundField>
            </div>
          </section>

          {selectedTransaction && (
            <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Original amount
                  </p>

                  <p className="mt-1 font-bold text-slate-950 dark:text-white">
                    {formatRefundCurrency(
                      selectedTransaction.amount,
                      selectedTransaction.currency
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Already refunded
                  </p>

                  <p className="mt-1 font-bold text-slate-950 dark:text-white">
                    {formatRefundCurrency(
                      selectedTransaction.refunded_amount,
                      selectedTransaction.currency
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Available
                  </p>

                  <p className="mt-1 font-bold text-emerald-700 dark:text-emerald-300">
                    {formatRefundCurrency(
                      selectedTransaction.refundable_amount,
                      selectedTransaction.currency
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Transaction date
                  </p>

                  <p className="mt-1 font-bold text-slate-950 dark:text-white">
                    {formatTransactionDate(
                      selectedTransaction.transaction_date
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-blue-200 pt-4 dark:border-blue-900">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  {selectedTransaction.description}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {selectedTransaction.customer_name ?? "Unknown customer"}

                  {selectedTransaction.customer_email
                    ? ` • ${selectedTransaction.customer_email}`
                    : ""}

                  {selectedTransaction.invoice_number
                    ? ` • ${selectedTransaction.invoice_number}`
                    : ""}
                </p>
              </div>
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2">
            <RefundField label="Refund Amount" required>
              <input
                type="number"
                min="0.01"
                max={selectedTransaction?.refundable_amount}
                step="0.01"
                value={form.requested_amount}
                onChange={(event) =>
                  updateField("requested_amount", event.target.value)
                }
                placeholder="0.00"
                disabled={!selectedTransaction}
                className={inputClasses}
              />
            </RefundField>

            <RefundField label="Provider" required>
              <select
                value={form.provider}
                onChange={(event) =>
                  updateField("provider", event.target.value as RefundProvider)
                }
                className={inputClasses}
              >
                {REFUND_PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </RefundField>

            <RefundField label="Payment Method">
              <input
                value={form.payment_method}
                onChange={(event) =>
                  updateField("payment_method", event.target.value)
                }
                placeholder="Bank transfer, card, cash..."
                className={inputClasses}
              />
            </RefundField>

            <div className="sm:col-span-2">
              <RefundField label="Refund Reason" required>
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={(event) =>
                    updateField("reason", event.target.value)
                  }
                  placeholder="Explain why this Refund is being requested"
                  className={inputClasses}
                />
              </RefundField>
            </div>

            <div className="sm:col-span-2">
              <RefundField label="Internal Notes">
                <textarea
                  rows={3}
                  value={form.internal_notes}
                  onChange={(event) =>
                    updateField("internal_notes", event.target.value)
                  }
                  placeholder="Optional notes visible only to Finance staff"
                  className={inputClasses}
                />
              </RefundField>
            </div>
          </section>

          {selectedTransaction && requestedAmount > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Requested Refund
                  </p>

                  <p className="mt-1 font-bold text-slate-950 dark:text-white">
                    {formatRefundCurrency(
                      requestedAmount,
                      selectedTransaction.currency
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Balance After Refund
                  </p>

                  <p className="mt-1 font-bold text-emerald-700 dark:text-emerald-300">
                    {formatRefundCurrency(
                      Math.max(
                        selectedTransaction.refundable_amount - requestedAmount,
                        0
                      ),
                      selectedTransaction.currency
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Refund Type
                  </p>

                  <p className="mt-1 font-bold text-slate-950 dark:text-white">
                    {requestedAmount >= selectedTransaction.refundable_amount
                      ? "Full Refund"
                      : "Partial Refund"}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        <footer className="sticky bottom-0 z-20 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || loadingTransactions || !selectedTransaction}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {saving && <LoaderCircle size={16} className="animate-spin" />}

            {saving ? "Creating Request..." : "Create Refund Request"}
          </button>
        </footer>
      </form>
    </div>
  );
}
