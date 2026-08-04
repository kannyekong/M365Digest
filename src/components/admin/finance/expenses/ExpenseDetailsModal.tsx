import {
  Archive,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  LoaderCircle,
  Pencil,
  RotateCcw,
  X,
} from "lucide-react";
import type { ExpenseTransaction } from "../../../../types/expense";

interface ExpenseDetailsModalProps {
  open: boolean;
  expense: ExpenseTransaction | null;
  processing: boolean;

  onClose: () => void;

  onEdit: (expense: ExpenseTransaction) => void;

  onArchive: (expense: ExpenseTransaction) => void;

  onRestore: (expense: ExpenseTransaction) => void;

  onReconcile: (expense: ExpenseTransaction) => void;
}

/**
 * Format one Expense amount using its ISO currency code.
 */
function formatExpenseCurrency(amount: number, currency = "NGN") {
  return `${currency.toUpperCase()} ${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/**
 * Format one Expense date-time value.
 */
function formatExpenseDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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
function formatExpenseLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return theme-aware classes for one Expense status.
 */
function getExpenseStatusClasses(status: ExpenseTransaction["status"]) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

    case "processing":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

    case "failed":
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    case "refunded":
      return "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/**
 * Return theme-aware classes for one reconciliation status.
 */
function getReconciliationClasses(
  status: ExpenseTransaction["reconciliation_status"]
) {
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
 * Render one labeled Expense detail row.
 */
function ExpenseDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>

      <dd className="break-all text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </dd>
    </div>
  );
}

/**
 * Render one professional Expense details modal.
 */
export default function ExpenseDetailsModal({
  open,
  expense,
  processing,
  onClose,
  onEdit,
  onArchive,
  onRestore,
  onReconcile,
}: ExpenseDetailsModalProps) {
  if (!open || !expense) {
    return null;
  }

  const currentExpense = expense;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) {
          onClose();
        }
      }}
    >
      <section className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <CircleDollarSign size={21} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                Expense
              </p>

              <h2
                id="expense-details-title"
                className="mt-1 truncate text-xl font-bold text-slate-950 dark:text-white sm:text-2xl"
              >
                {currentExpense.internal_reference}
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {currentExpense.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            title="Close Expense Details"
            aria-label="Close Expense Details"
            onClick={onClose}
            disabled={processing}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <div className="max-h-[calc(92vh-82px)] overflow-y-auto">
          <div className="space-y-6 p-5 sm:p-6">
            <section className="rounded-3xl border border-red-100 bg-red-50 p-5 text-center dark:border-red-950/60 dark:bg-red-950/20 sm:p-7">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Expense amount
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">
                {formatExpenseCurrency(
                  currentExpense.amount,
                  currentExpense.currency
                )}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getExpenseStatusClasses(
                    currentExpense.status
                  )}`}
                >
                  {formatExpenseLabel(currentExpense.status)}
                </span>

                <span
                  className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getReconciliationClasses(
                    currentExpense.reconciliation_status
                  )}`}
                >
                  {formatExpenseLabel(currentExpense.reconciliation_status)}
                </span>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <FileText
                  size={18}
                  className="text-violet-600 dark:text-violet-400"
                />

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Category
                </p>

                <p className="mt-2 font-semibold text-slate-950 dark:text-white">
                  {formatExpenseLabel(currentExpense.transaction_category)}
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <CircleDollarSign
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Provider
                </p>

                <p className="mt-2 font-semibold text-slate-950 dark:text-white">
                  {formatExpenseLabel(currentExpense.provider)}
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <CheckCircle2
                  size={18}
                  className="text-emerald-600 dark:text-emerald-400"
                />

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Payment method
                </p>

                <p className="mt-2 font-semibold text-slate-950 dark:text-white">
                  {currentExpense.payment_method
                    ? formatExpenseLabel(currentExpense.payment_method)
                    : "Not available"}
                </p>
              </article>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Expense details
                  </h3>
                </div>

                <dl className="divide-y divide-slate-100 px-4 dark:divide-slate-900">
                  <ExpenseDetailRow
                    label="Internal reference"
                    value={currentExpense.internal_reference}
                  />

                  <ExpenseDetailRow
                    label="Description"
                    value={currentExpense.description}
                  />

                  <ExpenseDetailRow
                    label="Transaction date"
                    value={currentExpense.transaction_date}
                  />

                  <ExpenseDetailRow
                    label="Provider reference"
                    value={currentExpense.provider_reference ?? "Not available"}
                  />

                  <ExpenseDetailRow
                    label="Receipt number"
                    value={currentExpense.receipt_number ?? "Not available"}
                  />

                  <ExpenseDetailRow
                    label="Bank account"
                    value={currentExpense.bank_account ?? "Not available"}
                  />

                  <ExpenseDetailRow
                    label="Fee amount"
                    value={formatExpenseCurrency(
                      currentExpense.fee_amount,
                      currentExpense.currency
                    )}
                  />

                  <ExpenseDetailRow
                    label="Tax amount"
                    value={formatExpenseCurrency(
                      currentExpense.tax_amount,
                      currentExpense.currency
                    )}
                  />

                  <ExpenseDetailRow
                    label="Refunded amount"
                    value={formatExpenseCurrency(
                      currentExpense.refunded_amount,
                      currentExpense.currency
                    )}
                  />

                  <ExpenseDetailRow
                    label="Paid at"
                    value={formatExpenseDate(currentExpense.paid_at)}
                  />

                  <ExpenseDetailRow
                    label="Reconciled at"
                    value={formatExpenseDate(currentExpense.reconciled_at)}
                  />
                </dl>
              </section>

              <section className="space-y-4">
                <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Audit trail
                  </p>

                  <dl className="mt-3 divide-y divide-slate-100 dark:divide-slate-900">
                    <ExpenseDetailRow
                      label="Created"
                      value={formatExpenseDate(currentExpense.created_at)}
                    />

                    <ExpenseDetailRow
                      label="Updated"
                      value={formatExpenseDate(currentExpense.updated_at)}
                    />

                    <ExpenseDetailRow
                      label="Archived"
                      value={formatExpenseDate(currentExpense.archived_at)}
                    />
                  </dl>
                </article>

                {currentExpense.internal_notes && (
                  <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Internal notes
                    </p>

                    <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {currentExpense.internal_notes}
                    </p>
                  </article>
                )}
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <h3 className="mb-4 font-semibold text-slate-950 dark:text-white">
                Expense actions
              </h3>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {!currentExpense.archived_at && (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit(currentExpense)}
                      disabled={processing}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>

                    {currentExpense.reconciliation_status !== "reconciled" && (
                      <button
                        type="button"
                        onClick={() => onReconcile(currentExpense)}
                        disabled={processing}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                      >
                        {processing ? (
                          <LoaderCircle size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        Reconcile
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onArchive(currentExpense)}
                      disabled={processing}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      {processing ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Archive size={16} />
                      )}
                      Archive
                    </button>
                  </>
                )}

                {currentExpense.archived_at && (
                  <button
                    type="button"
                    onClick={() => onRestore(currentExpense)}
                    disabled={processing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
                  >
                    {processing ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <RotateCcw size={16} />
                    )}
                    Restore
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  disabled={processing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
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
