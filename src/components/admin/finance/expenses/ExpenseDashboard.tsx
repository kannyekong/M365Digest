import { Download, Plus, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  archiveExpense,
  exportExpensesCsv,
  getExpenseStatistics,
  listExpenses,
  reconcileExpense,
  restoreExpense,
} from "../../../../lib/expense";
import type {
  ExpenseCategory,
  ExpenseFilters,
  ExpenseStatistics,
  ExpenseStatus,
  ExpenseTransaction,
} from "../../../../types/expense";
import FinanceModuleNav from "../FinanceModuleNav";
import FinanceStatePanel from "../FinanceStatePanel";
import ExpenseCard from "./ExpenseCard";
import ExpenseDetailsModal from "./ExpenseDetailsModal";
import ExpenseFormModal from "./ExpenseFormModal";
import ExpenseTable from "./ExpenseTable";

const EMPTY_STATISTICS: ExpenseStatistics = {
  totalExpenses: 0,
  currentMonthExpenses: 0,
  previousMonthExpenses: 0,
  percentageChange: 0,
  pendingExpenses: 0,
  paidExpenses: 0,
  unreconciledExpenses: 0,
  refundedExpenses: 0,
  currency: "NGN",
};

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

/**
 * Return today's date in YYYY-MM-DD format.
 */
function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Render the complete Expense management dashboard.
 */
export default function ExpenseDashboard() {
  const [expenses, setExpenses] = useState<ExpenseTransaction[]>([]);

  const [statistics, setStatistics] =
    useState<ExpenseStatistics>(EMPTY_STATISTICS);

  const [filters, setFilters] = useState<ExpenseFilters>({
    search: "",
    category: "all",
    provider: "all",
    status: "all",
    reconciliationStatus: "all",
    currency: "NGN",
    dateFrom: "",
    dateTo: "",
    archived: false,
  });

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);

  const [selectedExpense, setSelectedExpense] =
    useState<ExpenseTransaction | null>(null);

  const [editingExpense, setEditingExpense] =
    useState<ExpenseTransaction | null>(null);

  const [processingExpenseId, setProcessingExpenseId] = useState<string | null>(
    null
  );

  /**
   * Load paginated Expenses and current statistics together.
   */
  const loadExpenseDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [expenseResult, statisticsResult] = await Promise.all([
        listExpenses({
          page,
          pageSize,
          filters,
          sortBy: "transaction_date",
          sortDirection: "desc",
        }),

        getExpenseStatistics(),
      ]);

      setExpenses(expenseResult.expenses);

      setTotal(expenseResult.total);

      setTotalPages(expenseResult.totalPages);

      setStatistics(statisticsResult);
    } catch (error) {
      console.error("Failed to load Expense dashboard:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The Expense dashboard could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadExpenseDashboard();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadExpenseDashboard]);

  /**
   * Open the form for a new Expense.
   */
  function handleCreateExpense() {
    setEditingExpense(null);
    setFormOpen(true);
  }

  /**
   * Open the form with one Expense selected for editing.
   */
  function handleEditExpense(expense: ExpenseTransaction) {
    setEditingExpense(expense);
    setDetailsOpen(false);
    setFormOpen(true);
  }

  /**
   * Open the Expense details modal.
   */
  function handleViewExpense(expense: ExpenseTransaction) {
    setSelectedExpense(expense);
    setDetailsOpen(true);
  }

  /**
   * Refresh the dashboard after an Expense mutation.
   */
  async function handleExpenseSaved(expense: ExpenseTransaction) {
    setSelectedExpense(expense);
    setFormOpen(false);
    setEditingExpense(null);

    await loadExpenseDashboard();
  }

  /**
   * Archive one active Expense after confirmation.
   */
  async function handleArchiveExpense(expense: ExpenseTransaction) {
    const confirmed = window.confirm(`Archive ${expense.internal_reference}?`);

    if (!confirmed) {
      return;
    }

    setProcessingExpenseId(expense.id);

    try {
      await archiveExpense(expense.id);

      toast.success("Expense archived successfully.");

      setDetailsOpen(false);
      setSelectedExpense(null);

      await loadExpenseDashboard();
    } catch (error) {
      console.error("Failed to archive Expense:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Expense could not be archived."
      );
    } finally {
      setProcessingExpenseId(null);
    }
  }

  /**
   * Restore one archived Expense after confirmation.
   */
  async function handleRestoreExpense(expense: ExpenseTransaction) {
    const confirmed = window.confirm(`Restore ${expense.internal_reference}?`);

    if (!confirmed) {
      return;
    }

    setProcessingExpenseId(expense.id);

    try {
      await restoreExpense(expense.id);

      toast.success("Expense restored successfully.");

      setDetailsOpen(false);
      setSelectedExpense(null);

      await loadExpenseDashboard();
    } catch (error) {
      console.error("Failed to restore Expense:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Expense could not be restored."
      );
    } finally {
      setProcessingExpenseId(null);
    }
  }

  /**
   * Mark one Expense as reconciled.
   */
  async function handleReconcileExpense(expense: ExpenseTransaction) {
    const confirmed = window.confirm(
      `Mark ${expense.internal_reference} as reconciled?`
    );

    if (!confirmed) {
      return;
    }

    setProcessingExpenseId(expense.id);

    try {
      const updatedExpense = await reconcileExpense(expense.id);

      toast.success("Expense reconciled successfully.");

      setSelectedExpense(updatedExpense);

      await loadExpenseDashboard();
    } catch (error) {
      console.error("Failed to reconcile Expense:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Expense could not be reconciled."
      );
    } finally {
      setProcessingExpenseId(null);
    }
  }

  /**
   * Update one filter and reset pagination.
   */
  function updateFilter<Key extends keyof ExpenseFilters>(
    key: Key,
    value: ExpenseFilters[Key]
  ) {
    setPage(1);

    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  /**
   * Reset all Expense filters.
   */
  function resetFilters() {
    setPage(1);

    setFilters({
      search: "",
      category: "all",
      provider: "all",
      status: "all",
      reconciliationStatus: "all",
      currency: "NGN",
      dateFrom: "",
      dateTo: "",
      archived: false,
    });
  }

  /**
   * Export the currently loaded Expense records.
   */
  function handleExportExpenses() {
    if (expenses.length === 0) {
      toast.info("There are no Expenses to export.");

      return;
    }

    exportExpensesCsv(expenses);
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.search?.trim()) {
      count += 1;
    }

    if (filters.category && filters.category !== "all") {
      count += 1;
    }

    if (filters.provider && filters.provider !== "all") {
      count += 1;
    }

    if (filters.status && filters.status !== "all") {
      count += 1;
    }

    if (
      filters.reconciliationStatus &&
      filters.reconciliationStatus !== "all"
    ) {
      count += 1;
    }

    if (filters.dateFrom) {
      count += 1;
    }

    if (filters.dateTo) {
      count += 1;
    }

    if (filters.archived) {
      count += 1;
    }

    return count;
  }, [filters]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
            Expenses
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Record, reconcile and monitor business spending across categories
            and payment providers.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportExpenses}
            disabled={loading || expenses.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => void loadExpenseDashboard()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleCreateExpense}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-2 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Plus size={16} />
            Add Expense
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ExpenseCard
          title="Total Expenses"
          amount={statistics.totalExpenses}
          currency={statistics.currency}
          helperText="All settled Expenses"
          trend={statistics.percentageChange}
          trendLabel="vs previous month"
          variant="total"
        />

        <ExpenseCard
          title="Expenses This Month"
          amount={statistics.currentMonthExpenses}
          currency={statistics.currency}
          helperText={`Previous month: ${statistics.previousMonthExpenses}`}
          trend={statistics.percentageChange}
          trendLabel="monthly change"
          variant="monthly"
        />

        <ExpenseCard
          title="Pending Expenses"
          amount={statistics.pendingExpenses}
          currency={statistics.currency}
          helperText="Awaiting settlement"
          variant="pending"
        />

        <ExpenseCard
          title="Unreconciled"
          amount={statistics.unreconciledExpenses}
          currency={statistics.currency}
          helperText="Needs Finance review"
          variant="unreconciled"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block xl:col-span-2">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={filters.search ?? ""}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search description, reference, provider or receipt"
              className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:text-white"
            />
          </label>

          <select
            value={filters.category ?? "all"}
            onChange={(event) =>
              updateFilter(
                "category",
                event.target.value as ExpenseCategory | "all"
              )
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All categories</option>

            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            value={filters.status ?? "all"}
            onChange={(event) =>
              updateFilter(
                "status",
                event.target.value as ExpenseStatus | "all"
              )
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All statuses</option>

            {EXPENSE_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <select
            value={filters.reconciliationStatus ?? "all"}
            onChange={(event) =>
              updateFilter(
                "reconciliationStatus",
                event.target.value as ExpenseFilters["reconciliationStatus"]
              )
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All reconciliation</option>

            <option value="unreconciled">Unreconciled</option>

            <option value="reconciled">Reconciled</option>

            <option value="disputed">Disputed</option>
          </select>

          <input
            type="date"
            value={filters.dateFrom ?? ""}
            max={filters.dateTo || getTodayDate()}
            onChange={(event) => updateFilter("dateFrom", event.target.value)}
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:text-white"
          />

          <input
            type="date"
            value={filters.dateTo ?? ""}
            min={filters.dateFrom || undefined}
            max={getTodayDate()}
            onChange={(event) => updateFilter("dateTo", event.target.value)}
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:text-white"
          />

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={Boolean(filters.archived)}
              onChange={(event) =>
                updateFilter("archived", event.target.checked)
              }
            />
            Archived only
          </label>
        </div>

        {activeFilterCount > 0 && (
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeFilterCount} active filter
              {activeFilterCount === 1 ? "" : "s"}
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {loading ? (
        <FinanceStatePanel type="loading" />
      ) : errorMessage ? (
        <FinanceStatePanel
          type="error"
          message={errorMessage}
          onRetry={() => void loadExpenseDashboard()}
        />
      ) : expenses.length === 0 ? (
        <FinanceStatePanel
          type="empty"
          title={
            filters.archived ? "No archived Expenses" : "No Expenses recorded"
          }
          message={
            filters.archived
              ? "Archived Expenses will appear here."
              : 'Select "Add Expense" to record your first business Expense.'
          }
        />
      ) : (
        <ExpenseTable
          expenses={expenses}
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          loadingExpenseId={processingExpenseId}
          archivedView={Boolean(filters.archived)}
          onView={handleViewExpense}
          onEdit={handleEditExpense}
          onArchive={handleArchiveExpense}
          onRestore={handleRestoreExpense}
          onReconcile={handleReconcileExpense}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPage(1);
            setPageSize(nextPageSize);
          }}
        />
      )}

      <ExpenseFormModal
        open={formOpen}
        expense={editingExpense}
        onClose={() => {
          setFormOpen(false);
          setEditingExpense(null);
        }}
        onSaved={handleExpenseSaved}
      />

      <ExpenseDetailsModal
        open={detailsOpen}
        expense={selectedExpense}
        processing={processingExpenseId === selectedExpense?.id}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedExpense(null);
        }}
        onEdit={handleEditExpense}
        onArchive={handleArchiveExpense}
        onRestore={handleRestoreExpense}
        onReconcile={handleReconcileExpense}
      />
    </section>
  );
}
