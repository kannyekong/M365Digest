import { Archive, Download, Plus, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  archiveBudget,
  getBudgetById,
  getBudgetStatistics,
  listBudgets,
  restoreBudget,
} from "../../../../lib/budget";
import type {
  BudgetDetails,
  BudgetFilters,
  BudgetListItem,
  BudgetStatistics,
  BudgetStatus,
  BudgetType,
} from "../../../../types/budget";
import FinanceStatePanel from "../FinanceStatePanel";
import BudgetCard from "./BudgetCard";
import BudgetDetailsModal from "./BudgetDetailsModal";
import BudgetFormModal from "./BudgetFormModal";
import BudgetTable from "./BudgetTable";

const EMPTY_STATISTICS: BudgetStatistics = {
  totalBudgeted: 0,
  totalAllocated: 0,
  totalUsed: 0,
  totalRemaining: 0,
  activeBudgets: 0,
  draftBudgets: 0,
  warningBudgets: 0,
  exceededBudgets: 0,
  averageUsagePercentage: 0,
  currency: "NGN",
};

const BUDGET_TYPES: Array<{
  value: BudgetType;
  label: string;
}> = [
  {
    value: "monthly",
    label: "Monthly",
  },
  {
    value: "quarterly",
    label: "Quarterly",
  },
  {
    value: "annual",
    label: "Annual",
  },
  {
    value: "custom",
    label: "Custom",
  },
];

const BUDGET_STATUSES: Array<{
  value: BudgetStatus;
  label: string;
}> = [
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "active",
    label: "Active",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

/**
 * Escape one value for safe CSV output.
 */
function escapeCsvCell(value: unknown) {
  const normalizedValue = String(value ?? "");

  if (
    normalizedValue.includes(",") ||
    normalizedValue.includes('"') ||
    normalizedValue.includes("\n")
  ) {
    return `"${normalizedValue.replace(/"/g, '""')}"`;
  }

  return normalizedValue;
}

/**
 * Export the currently loaded Budgets to CSV.
 */
function exportBudgetsCsv(budgets: BudgetListItem[]) {
  const rows = [
    [
      "Name",
      "Type",
      "Department",
      "Project Code",
      "Start Date",
      "End Date",
      "Status",
      "Currency",
      "Total Budget",
      "Allocated",
      "Used",
      "Remaining",
      "Usage Percentage",
      "Health",
      "Allocations",
    ],

    ...budgets.map((budget) => [
      budget.name,
      budget.budget_type,
      budget.department ?? "",
      budget.project_code ?? "",
      budget.start_date,
      budget.end_date,
      budget.status,
      budget.currency,
      budget.total_amount,
      budget.allocated_amount,
      budget.used_amount,
      budget.remaining_amount,
      budget.usage_percentage,
      budget.health_status,
      budget.allocations_count,
    ]),
  ];

  const csvContent = rows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const downloadUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = downloadUrl;

  anchor.download = `budgets-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(anchor);

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(downloadUrl);
}

/**
 * Render the complete Budget management dashboard.
 */
export default function BudgetDashboard() {
  const [budgets, setBudgets] = useState<BudgetListItem[]>([]);

  const [statistics, setStatistics] =
    useState<BudgetStatistics>(EMPTY_STATISTICS);

  const [filters, setFilters] = useState<BudgetFilters>({
    search: "",
    budgetType: "all",
    status: "all",
    currency: "NGN",
    department: "",
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

  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

  const [selectedBudget, setSelectedBudget] = useState<BudgetDetails | null>(
    null
  );

  const [processingBudgetId, setProcessingBudgetId] = useState<string | null>(
    null
  );

  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);

  /**
   * Load paginated Budgets and Budget statistics together.
   */
  const loadBudgetDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [budgetResult, statisticsResult] = await Promise.all([
        listBudgets({
          page,
          pageSize,
          filters,
          sortBy: "start_date",
          sortDirection: "desc",
        }),

        getBudgetStatistics(),
      ]);

      setBudgets(budgetResult.budgets);

      setTotal(budgetResult.total);

      setTotalPages(budgetResult.totalPages);

      setStatistics(statisticsResult);
    } catch (error) {
      console.error("Failed to load Budget dashboard:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The Budget dashboard could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBudgetDashboard();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadBudgetDashboard]);

  /**
   * Open the Budget form for a new Budget.
   */
  function handleCreateBudget() {
    setEditingBudgetId(null);
    setFormOpen(true);
  }

  /**
   * Open the Budget form for an existing Budget.
   */
  function handleEditBudget(budget: BudgetListItem | BudgetDetails) {
    setEditingBudgetId(budget.id);

    setDetailsOpen(false);
    setFormOpen(true);
  }

  /**
   * Load one complete Budget and open its details modal.
   */
  async function handleViewBudget(budget: BudgetListItem) {
    setLoadingDetailsId(budget.id);

    try {
      const budgetDetails = await getBudgetById(budget.id);

      setSelectedBudget(budgetDetails);

      setDetailsOpen(true);
    } catch (error) {
      console.error("Failed to load Budget details:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Budget details could not be loaded."
      );
    } finally {
      setLoadingDetailsId(null);
    }
  }

  /**
   * Refresh the dashboard after one Budget is saved.
   */
  async function handleBudgetSaved(budget: BudgetDetails) {
    setSelectedBudget(budget);

    setEditingBudgetId(null);
    setFormOpen(false);

    await loadBudgetDashboard();
  }

  /**
   * Archive one Budget after user confirmation.
   */
  async function handleArchiveBudget(budget: BudgetListItem | BudgetDetails) {
    const confirmed = window.confirm(`Archive "${budget.name}"?`);

    if (!confirmed) {
      return;
    }

    setProcessingBudgetId(budget.id);

    try {
      await archiveBudget(budget.id);

      toast.success("Budget archived successfully.");

      setDetailsOpen(false);
      setSelectedBudget(null);

      await loadBudgetDashboard();
    } catch (error) {
      console.error("Failed to archive Budget:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Budget could not be archived."
      );
    } finally {
      setProcessingBudgetId(null);
    }
  }

  /**
   * Restore one archived Budget after user confirmation.
   */
  async function handleRestoreBudget(budget: BudgetListItem | BudgetDetails) {
    const confirmed = window.confirm(`Restore "${budget.name}"?`);

    if (!confirmed) {
      return;
    }

    setProcessingBudgetId(budget.id);

    try {
      await restoreBudget(budget.id);

      toast.success("Budget restored successfully.");

      setDetailsOpen(false);
      setSelectedBudget(null);

      await loadBudgetDashboard();
    } catch (error) {
      console.error("Failed to restore Budget:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Budget could not be restored."
      );
    } finally {
      setProcessingBudgetId(null);
    }
  }

  /**
   * Update one Budget filter and reset pagination.
   */
  function updateFilter<Key extends keyof BudgetFilters>(
    key: Key,
    value: BudgetFilters[Key]
  ) {
    setPage(1);

    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  /**
   * Reset all Budget filters.
   */
  function resetFilters() {
    setPage(1);

    setFilters({
      search: "",
      budgetType: "all",
      status: "all",
      currency: "NGN",
      department: "",
      dateFrom: "",
      dateTo: "",
      archived: false,
    });
  }

  /**
   * Export the currently visible Budget records.
   */
  function handleExportBudgets() {
    if (budgets.length === 0) {
      toast.info("There are no Budgets to export.");

      return;
    }

    exportBudgetsCsv(budgets);
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.search?.trim()) {
      count += 1;
    }

    if (filters.budgetType && filters.budgetType !== "all") {
      count += 1;
    }

    if (filters.status && filters.status !== "all") {
      count += 1;
    }

    if (filters.department?.trim()) {
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
            Budgets
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Plan spending, allocate funds across Expense categories and compare
            Budget usage with actual paid Expenses.
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={handleExportBudgets}
            disabled={loading || budgets.length === 0}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <Download size={14} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => void loadBudgetDashboard()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleCreateBudget}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-primary px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Plus size={14} />
            Create Budget
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BudgetCard
          title="Total Budgeted"
          amount={statistics.totalBudgeted}
          currency={statistics.currency}
          helperText={`${statistics.activeBudgets} active Budget${
            statistics.activeBudgets === 1 ? "" : "s"
          }`}
          variant="budgeted"
        />

        <BudgetCard
          title="Total Used"
          amount={statistics.totalUsed}
          currency={statistics.currency}
          helperText={`${statistics.averageUsagePercentage}% average usage`}
          variant="used"
        />

        <BudgetCard
          title="Total Remaining"
          amount={statistics.totalRemaining}
          currency={statistics.currency}
          helperText="Remaining across allocated categories"
          variant="remaining"
        />

        <BudgetCard
          title="Budget Alerts"
          value={statistics.warningBudgets + statistics.exceededBudgets}
          helperText={`${statistics.warningBudgets} warning · ${statistics.exceededBudgets} exceeded`}
          variant="warning"
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
              placeholder="Search name, description, department or project code"
              className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:text-white"
            />
          </label>

          <select
            value={filters.budgetType ?? "all"}
            onChange={(event) =>
              updateFilter(
                "budgetType",
                event.target.value as BudgetType | "all"
              )
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All Budget types</option>

            {BUDGET_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={filters.status ?? "all"}
            onChange={(event) =>
              updateFilter("status", event.target.value as BudgetStatus | "all")
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All statuses</option>

            {BUDGET_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <input
            value={filters.department ?? ""}
            onChange={(event) => updateFilter("department", event.target.value)}
            placeholder="Department"
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:text-white"
          />

          <input
            type="date"
            value={filters.dateFrom ?? ""}
            max={filters.dateTo || undefined}
            onChange={(event) => updateFilter("dateFrom", event.target.value)}
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:text-white"
          />

          <input
            type="date"
            value={filters.dateTo ?? ""}
            min={filters.dateFrom || undefined}
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
          onRetry={() => void loadBudgetDashboard()}
        />
      ) : budgets.length === 0 ? (
        <FinanceStatePanel
          type="empty"
          title={
            filters.archived ? "No archived Budgets" : "No Budgets created"
          }
          message={
            filters.archived
              ? "Archived Budgets will appear here."
              : 'Select "Create Budget" to establish your first Finance Budget.'
          }
        />
      ) : (
        <BudgetTable
          budgets={budgets}
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          archivedView={Boolean(filters.archived)}
          processingBudgetId={processingBudgetId ?? loadingDetailsId}
          onView={handleViewBudget}
          onEdit={handleEditBudget}
          onArchive={handleArchiveBudget}
          onRestore={handleRestoreBudget}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPage(1);
            setPageSize(nextPageSize);
          }}
        />
      )}

      <BudgetFormModal
        open={formOpen}
        budgetId={editingBudgetId}
        onClose={() => {
          setFormOpen(false);
          setEditingBudgetId(null);
        }}
        onSaved={handleBudgetSaved}
      />

      <BudgetDetailsModal
        open={detailsOpen}
        budget={selectedBudget}
        processing={processingBudgetId === selectedBudget?.id}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedBudget(null);
        }}
        onEdit={handleEditBudget}
        onArchive={handleArchiveBudget}
        onRestore={handleRestoreBudget}
      />
    </section>
  );
}
