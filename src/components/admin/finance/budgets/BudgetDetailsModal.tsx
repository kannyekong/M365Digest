import {
  AlertTriangle,
  Archive,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  LoaderCircle,
  Pencil,
  RotateCcw,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import type {
  BudgetAllocationSummary,
  BudgetDetails,
  BudgetHealthStatus,
  BudgetStatus,
} from "../../../../types/budget";

interface BudgetDetailsModalProps {
  open: boolean;

  budget: BudgetDetails | null;

  processing: boolean;

  onClose: () => void;

  onEdit: (budget: BudgetDetails) => void;

  onArchive: (budget: BudgetDetails) => void;

  onRestore: (budget: BudgetDetails) => void;
}

/**
 * Format one Budget monetary value.
 */
function formatBudgetCurrency(amount: number, currency = "NGN") {
  return `${currency.toUpperCase()} ${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/**
 * Format one Budget date.
 */
function formatBudgetDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value.includes("T") ? value : `${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: value.includes("T") ? undefined : "UTC",
  }).format(date);
}

/**
 * Convert one internal Budget label into readable text.
 */
function formatBudgetLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return theme-aware classes for one Budget status.
 */
function getBudgetStatusClasses(status: BudgetStatus) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "draft":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

    case "completed":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/**
 * Return theme-aware classes for one Budget health status.
 */
function getBudgetHealthClasses(status: BudgetHealthStatus) {
  switch (status) {
    case "healthy":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "warning":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

    case "exceeded":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/**
 * Return the progress-bar class for one Budget health status.
 */
function getBudgetProgressClasses(status: BudgetHealthStatus) {
  switch (status) {
    case "healthy":
      return "bg-emerald-500";

    case "warning":
      return "bg-amber-500";

    case "exceeded":
      return "bg-red-500";

    default:
      return "bg-blue-500";
  }
}

/**
 * Render one Budget summary metric.
 */
function BudgetMetric({
  title,
  value,
  helperText,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: string;
  helperText?: string;
  icon: typeof WalletCards;
  iconClassName: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClassName}`}
      >
        <Icon size={18} />
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
        {value}
      </p>

      {helperText && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      )}
    </article>
  );
}

/**
 * Render one labeled Budget detail row.
 */
function BudgetDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>

      <dd className="break-words text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </dd>
    </div>
  );
}

/**
 * Render one Budget category allocation.
 */
function BudgetAllocationCard({
  allocation,
}: {
  allocation: BudgetAllocationSummary;
}) {
  const progressWidth = Math.min(allocation.usage_percentage, 100);

  return (
    <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-slate-950 dark:text-white">
            {formatBudgetLabel(allocation.transaction_category)}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {allocation.usage_percentage}% used
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getBudgetHealthClasses(
            allocation.health_status
          )}`}
        >
          {formatBudgetLabel(allocation.health_status)}
        </span>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBudgetProgressClasses(
            allocation.health_status
          )}`}
          style={{
            width: `${progressWidth}%`,
          }}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Allocated
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
            {formatBudgetCurrency(
              allocation.allocated_amount,
              allocation.currency
            )}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Used</p>

          <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
            {formatBudgetCurrency(allocation.used_amount, allocation.currency)}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Remaining
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
            {formatBudgetCurrency(
              allocation.remaining_amount,
              allocation.currency
            )}
          </p>
        </div>
      </div>
    </article>
  );
}

/**
 * Render the complete Budget details modal.
 */
export default function BudgetDetailsModal({
  open,
  budget,
  processing,
  onClose,
  onEdit,
  onArchive,
  onRestore,
}: BudgetDetailsModalProps) {
  if (!open || !budget) {
    return null;
  }

  const currentBudget = budget;

  const progressWidth = Math.min(currentBudget.usage_percentage, 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) {
          onClose();
        }
      }}
    >
      <section className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
              <WalletCards size={20} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                Finance Budget
              </p>

              <h2
                id="budget-details-title"
                className="mt-1 truncate text-xl font-bold text-slate-950 dark:text-white sm:text-2xl"
              >
                {currentBudget.name}
              </h2>

              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getBudgetStatusClasses(
                    currentBudget.status
                  )}`}
                >
                  {formatBudgetLabel(currentBudget.status)}
                </span>

                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getBudgetHealthClasses(
                    currentBudget.health_status
                  )}`}
                >
                  {formatBudgetLabel(currentBudget.health_status)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            title="Close Budget Details"
            aria-label="Close Budget Details"
            onClick={onClose}
            disabled={processing}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <div className="max-h-[calc(94vh-82px)] overflow-y-auto">
          <div className="space-y-6 p-4 sm:p-6">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Overall Budget usage
                  </p>

                  <p className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
                    {currentBudget.usage_percentage}%
                  </p>
                </div>

                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {formatBudgetCurrency(
                    currentBudget.used_amount,
                    currentBudget.currency
                  )}{" "}
                  of{" "}
                  {formatBudgetCurrency(
                    currentBudget.total_amount,
                    currentBudget.currency
                  )}
                </p>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBudgetProgressClasses(
                    currentBudget.health_status
                  )}`}
                  style={{
                    width: `${progressWidth}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Warning begins at {currentBudget.warning_threshold}% usage.
              </p>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <BudgetMetric
                title="Total Budget"
                value={formatBudgetCurrency(
                  currentBudget.total_amount,
                  currentBudget.currency
                )}
                helperText="Approved spending limit"
                icon={WalletCards}
                iconClassName="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
              />

              <BudgetMetric
                title="Allocated"
                value={formatBudgetCurrency(
                  currentBudget.allocated_amount,
                  currentBudget.currency
                )}
                helperText={`${currentBudget.allocations.length} category allocation${
                  currentBudget.allocations.length === 1 ? "" : "s"
                }`}
                icon={CircleDollarSign}
                iconClassName="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
              />

              <BudgetMetric
                title="Used"
                value={formatBudgetCurrency(
                  currentBudget.used_amount,
                  currentBudget.currency
                )}
                helperText={`${currentBudget.usage_percentage}% consumed`}
                icon={AlertTriangle}
                iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              />

              <BudgetMetric
                title="Remaining"
                value={formatBudgetCurrency(
                  currentBudget.remaining_amount,
                  currentBudget.currency
                )}
                helperText="Available allocation balance"
                icon={ShieldCheck}
                iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Budget details
                  </h3>
                </div>

                <dl className="divide-y divide-slate-100 px-4 dark:divide-slate-900">
                  <BudgetDetailRow
                    label="Budget type"
                    value={formatBudgetLabel(currentBudget.budget_type)}
                  />

                  <BudgetDetailRow
                    label="Department"
                    value={currentBudget.department ?? "Not specified"}
                  />

                  <BudgetDetailRow
                    label="Project code"
                    value={currentBudget.project_code ?? "Not specified"}
                  />

                  <BudgetDetailRow
                    label="Currency"
                    value={currentBudget.currency}
                  />

                  <BudgetDetailRow
                    label="Start date"
                    value={formatBudgetDate(currentBudget.start_date)}
                  />

                  <BudgetDetailRow
                    label="End date"
                    value={formatBudgetDate(currentBudget.end_date)}
                  />

                  <BudgetDetailRow
                    label="Created"
                    value={formatBudgetDate(currentBudget.created_at)}
                  />

                  <BudgetDetailRow
                    label="Updated"
                    value={formatBudgetDate(currentBudget.updated_at)}
                  />

                  <BudgetDetailRow
                    label="Archived"
                    value={formatBudgetDate(currentBudget.archived_at)}
                  />
                </dl>
              </section>

              <section className="space-y-4">
                <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <CalendarDays
                    size={18}
                    className="text-blue-600 dark:text-blue-400"
                  />

                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Budget period
                  </p>

                  <p className="mt-2 font-semibold text-slate-950 dark:text-white">
                    {formatBudgetDate(currentBudget.start_date)}
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    to {formatBudgetDate(currentBudget.end_date)}
                  </p>
                </article>

                {currentBudget.description && (
                  <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Description
                    </p>

                    <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {currentBudget.description}
                    </p>
                  </article>
                )}
              </section>
            </div>

            <section>
              <div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Category allocations
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Actual paid Expenses are compared against each allocated
                  category.
                </p>
              </div>

              {currentBudget.allocations.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    No allocations found
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Edit this Budget to add category allocations.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {currentBudget.allocations.map((allocation) => (
                    <BudgetAllocationCard
                      key={allocation.allocation_id}
                      allocation={allocation}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <h3 className="mb-4 font-semibold text-slate-950 dark:text-white">
                Budget actions
              </h3>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {!currentBudget.archived_at && (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit(currentBudget)}
                      disabled={processing}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => onArchive(currentBudget)}
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

                {currentBudget.archived_at && (
                  <button
                    type="button"
                    onClick={() => onRestore(currentBudget)}
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
