import { LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  createExpense,
  updateExpense,
} from "../../../../lib/expense";
import type {
  CreateExpenseInput,
  ExpenseCategory,
  ExpenseReconciliationStatus,
  ExpenseStatus,
  ExpenseTransaction,
} from "../../../../types/expense";

interface ExpenseFormModalProps {
  open: boolean;
  expense: ExpenseTransaction | null;
  onClose: () => void;
  onSaved: (
    expense: ExpenseTransaction
  ) => void | Promise<void>;
}

interface ExpenseFormState {
  transaction_category: ExpenseCategory;
  provider: string;
  payment_method: string;
  description: string;
  internal_notes: string;
  provider_reference: string;
  receipt_number: string;
  bank_account: string;
  amount: string;
  fee_amount: string;
  tax_amount: string;
  currency: string;
  status: ExpenseStatus;
  reconciliation_status:
    ExpenseReconciliationStatus;
  transaction_date: string;
}

const EXPENSE_CATEGORIES: Array<{
  value: ExpenseCategory;
  label: string;
}> = [
  {
    value: "operations",
    label: "Operations",
  },
  {
    value: "marketing",
    label: "Marketing",
  },
  {
    value: "salary",
    label: "Salary",
  },
  {
    value: "tax",
    label: "Tax",
  },
  {
    value: "equipment",
    label: "Equipment",
  },
  {
    value: "reimbursement",
    label: "Reimbursement",
  },
  {
    value: "other",
    label: "Other",
  },
];

const EXPENSE_STATUSES: Array<{
  value: ExpenseStatus;
  label: string;
}> = [
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "processing",
    label: "Processing",
  },
  {
    value: "paid",
    label: "Paid",
  },
  {
    value: "failed",
    label: "Failed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
  {
    value: "refunded",
    label: "Refunded",
  },
];

const RECONCILIATION_STATUSES: Array<{
  value: ExpenseReconciliationStatus;
  label: string;
}> = [
  {
    value: "unreconciled",
    label: "Unreconciled",
  },
  {
    value: "reconciled",
    label: "Reconciled",
  },
  {
    value: "disputed",
    label: "Disputed",
  },
];

/**
 * Return today's date in YYYY-MM-DD format.
 */
function getTodayDate() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

/**
 * Return the default Expense form values.
 */
function getEmptyExpenseForm(): ExpenseFormState {
  return {
    transaction_category:
      "operations",

    provider: "manual",

    payment_method: "",

    description: "",

    internal_notes: "",

    provider_reference: "",

    receipt_number: "",

    bank_account: "",

    amount: "",

    fee_amount: "0",

    tax_amount: "0",

    currency: "NGN",

    status: "pending",

    reconciliation_status:
      "unreconciled",

    transaction_date:
      getTodayDate(),
  };
}

/**
 * Convert one existing Expense into editable form values.
 */
function getExpenseFormFromTransaction(
  expense: ExpenseTransaction
): ExpenseFormState {
  return {
    transaction_category:
      expense.transaction_category,

    provider:
      expense.provider,

    payment_method:
      expense.payment_method ?? "",

    description:
      expense.description,

    internal_notes:
      expense.internal_notes ?? "",

    provider_reference:
      expense.provider_reference ?? "",

    receipt_number:
      expense.receipt_number ?? "",

    bank_account:
      expense.bank_account ?? "",

    amount:
      String(expense.amount),

    fee_amount:
      String(expense.fee_amount),

    tax_amount:
      String(expense.tax_amount),

    currency:
      expense.currency,

    status:
      expense.status,

    reconciliation_status:
      expense.reconciliation_status,

    transaction_date:
      expense.transaction_date,
  };
}

/**
 * Render one labeled Expense form field.
 */
function ExpenseField({
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

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

/**
 * Render the Create and Edit Expense modal.
 */
export default function ExpenseFormModal({
  open,
  expense,
  onClose,
  onSaved,
}: ExpenseFormModalProps) {
  const [form, setForm] =
    useState<ExpenseFormState>(
      getEmptyExpenseForm()
    );

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(
      expense
        ? getExpenseFormFromTransaction(
            expense
          )
        : getEmptyExpenseForm()
    );
  }, [expense, open]);

  if (!open) {
    return null;
  }

  const inputClasses =
    "w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white";

  /**
   * Update one controlled Expense form field.
   */
  function updateField<
    Key extends keyof ExpenseFormState,
  >(
    key: Key,
    value: ExpenseFormState[Key]
  ) {
    setForm(
      (currentForm) => ({
        ...currentForm,
        [key]: value,
      })
    );
  }

  /**
   * Validate and save the Expense.
   */
  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const amount =
      Number(form.amount);

    const feeAmount =
      Number(form.fee_amount || 0);

    const taxAmount =
      Number(form.tax_amount || 0);

    if (
      !form.description.trim()
    ) {
      toast.error(
        "Expense description is required."
      );

      return;
    }

    if (
      !form.provider.trim()
    ) {
      toast.error(
        "Expense provider is required."
      );

      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      toast.error(
        "Expense amount must be greater than zero."
      );

      return;
    }

    if (
      !Number.isFinite(feeAmount) ||
      feeAmount < 0
    ) {
      toast.error(
        "Fee amount cannot be negative."
      );

      return;
    }

    if (
      !Number.isFinite(taxAmount) ||
      taxAmount < 0
    ) {
      toast.error(
        "Tax amount cannot be negative."
      );

      return;
    }

    const currency =
      form.currency
        .trim()
        .toUpperCase();

    if (currency.length !== 3) {
      toast.error(
        "Currency must be a three-letter ISO code."
      );

      return;
    }

    if (
      !form.transaction_date
    ) {
      toast.error(
        "Transaction date is required."
      );

      return;
    }

    setSaving(true);

    try {
      const input: CreateExpenseInput = {
        transaction_category:
          form.transaction_category,

        provider:
          form.provider.trim(),

        payment_method:
          form.payment_method.trim() ||
          null,

        description:
          form.description.trim(),

        internal_notes:
          form.internal_notes.trim() ||
          null,

        provider_reference:
          form.provider_reference.trim() ||
          null,

        receipt_number:
          form.receipt_number.trim() ||
          null,

        bank_account:
          form.bank_account.trim() ||
          null,

        amount,

        fee_amount:
          feeAmount,

        tax_amount:
          taxAmount,

        currency,

        status:
          form.status,

        reconciliation_status:
          form.reconciliation_status,

        transaction_date:
          form.transaction_date,

        paid_at:
          form.status === "paid"
            ? expense?.paid_at ??
              new Date().toISOString()
            : null,
      };

      const savedExpense =
        expense
          ? await updateExpense(
              expense.id,
              input
            )
          : await createExpense(
              input
            );

      toast.success(
        expense
          ? "Expense updated successfully."
          : "Expense created successfully."
      );

      await onSaved(
        savedExpense
      );
    } catch (error) {
      console.error(
        "Failed to save Expense:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "The Expense could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-form-title"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={
          handleSubmit
        }
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              Finance
            </p>

            <h2
              id="expense-form-title"
              className="mt-1 text-xl font-bold text-slate-950 dark:text-white sm:text-2xl"
            >
              {expense
                ? "Edit Expense"
                : "Add Expense"}
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {expense
                ? "Update the selected business Expense."
                : "Record a new business Expense."}
            </p>
          </div>

          <button
            type="button"
            title="Close Expense Form"
            aria-label="Close Expense Form"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            <X size={18} />
          </button>
        </header>

        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <ExpenseField
            label="Category"
            required
          >
            <select
              value={
                form.transaction_category
              }
              onChange={(event) =>
                updateField(
                  "transaction_category",
                  event.target
                    .value as ExpenseCategory
                )
              }
              className={
                inputClasses
              }
            >
              {EXPENSE_CATEGORIES.map(
                (category) => (
                  <option
                    key={
                      category.value
                    }
                    value={
                      category.value
                    }
                  >
                    {
                      category.label
                    }
                  </option>
                )
              )}
            </select>
          </ExpenseField>

          <ExpenseField
            label="Provider"
            required
          >
            <input
              value={
                form.provider
              }
              onChange={(event) =>
                updateField(
                  "provider",
                  event.target.value
                )
              }
              placeholder="manual"
              className={
                inputClasses
              }
            />
          </ExpenseField>

          <div className="sm:col-span-2">
            <ExpenseField
              label="Description"
              required
            >
              <input
                value={
                  form.description
                }
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value
                  )
                }
                placeholder="Describe the business Expense"
                className={
                  inputClasses
                }
              />
            </ExpenseField>
          </div>

          <ExpenseField
            label="Amount"
            required
          >
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={
                form.amount
              }
              onChange={(event) =>
                updateField(
                  "amount",
                  event.target.value
                )
              }
              placeholder="0.00"
              className={
                inputClasses
              }
            />
          </ExpenseField>

          <ExpenseField
            label="Currency"
            required
          >
            <input
              value={
                form.currency
              }
              maxLength={3}
              onChange={(event) =>
                updateField(
                  "currency",
                  event.target.value.toUpperCase()
                )
              }
              placeholder="NGN"
              className={
                inputClasses
              }
            />
          </ExpenseField>

          <ExpenseField label="Fee Amount">
            <input
              type="number"
              min="0"
              step="0.01"
              value={
                form.fee_amount
              }
              onChange={(event) =>
                updateField(
                  "fee_amount",
                  event.target.value
                )
              }
              className={
                inputClasses
              }
            />
          </ExpenseField>

          <ExpenseField label="Tax Amount">
            <input
              type="number"
              min="0"
              step="0.01"
              value={
                form.tax_amount
              }
              onChange={(event) =>
                updateField(
                  "tax_amount",
                  event.target.value
                )
              }
              className={
                inputClasses
              }
            />
          </ExpenseField>

          <ExpenseField
            label="Transaction Date"
            required
          >
            <input
              type="date"
              value={
                form.transaction_date
              }
              max={
                getTodayDate()
              }
              onChange={(event) =>
                updateField(
                  "transaction_date",
                  event.target.value
                )
              }
              className={
                inputClasses
              }
            />
          </ExpenseField>

          <ExpenseField label="Status">
            <select
              value={
                form.status
              }
              onChange={(event) =>
                updateField(
                  "status",
                  event.target
                    .value as ExpenseStatus
                )
              }
              className={
                inputClasses
              }
            >
              {EXPENSE_STATUSES.map(
                (status) => (
                  <option
                    key={
                      status.value
                    }
                    value={
                      status.value
                    }
                  >
                    {
                      status.label
                    }
                  </option>
                )
              )}
            </select>
          </ExpenseField>

          <ExpenseField label="Reconciliation">
            <select
              value={
                form.reconciliation_status
              }
              onChange={(event) =>
                updateField(
                  "reconciliation_status",
                  event.target
                    .value as ExpenseReconciliationStatus
                )
              }
              className={
                inputClasses
              }
            >
              {RECONCILIATION_STATUSES.map(
                (status) => (
                  <option
                    key={
                      status.value
                    }
                    value={
                      status.value
                    }
                  >
                    {
                      status.label
                    }
                  </option>
                )
              )}
            </select>
          </ExpenseField>

          <ExpenseField label="Payment Method">
            <input
              value={
                form.payment_method
              }
              onChange={(event) =>
                updateField(
                  "payment_method",
                  event.target.value
                )
              }
              placeholder="Bank transfer, cash, card..."
              className={
                inputClasses
              }
            />
          </ExpenseField>

          <ExpenseField label="Provider Reference">
            <input
              value={
                form.provider_reference
              }
              onChange={(event) =>
                updateField(
                  "provider_reference",
                  event.target.value
                )
              }
              placeholder="External payment reference"
              className={
                inputClasses
              }
            />
          </ExpenseField>

          <ExpenseField label="Receipt Number">
            <input
              value={
                form.receipt_number
              }
              onChange={(event) =>
                updateField(
                  "receipt_number",
                  event.target.value
                )
              }
              placeholder="Vendor receipt number"
              className={
                inputClasses
              }
            />
          </ExpenseField>

          <ExpenseField label="Bank Account">
            <input
              value={
                form.bank_account
              }
              onChange={(event) =>
                updateField(
                  "bank_account",
                  event.target.value
                )
              }
              placeholder="Account or wallet used"
              className={
                inputClasses
              }
            />
          </ExpenseField>

          <div className="sm:col-span-2">
            <ExpenseField label="Internal Notes">
              <textarea
                rows={4}
                value={
                  form.internal_notes
                }
                onChange={(event) =>
                  updateField(
                    "internal_notes",
                    event.target.value
                  )
                }
                placeholder="Optional internal Finance notes"
                className={
                  inputClasses
                }
              />
            </ExpenseField>
          </div>
        </div>

        <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:justify-end sm:px-6">
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
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {saving && (
              <LoaderCircle
                size={16}
                className="animate-spin"
              />
            )}

            {saving
              ? "Saving..."
              : expense
                ? "Save Changes"
                : "Create Expense"}
          </button>
        </footer>
      </form>
    </div>
  );
}