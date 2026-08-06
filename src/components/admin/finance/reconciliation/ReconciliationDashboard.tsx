import { Download, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  getReconciliationDetails,
  getReconciliationStatistics,
  listReconciliationTransactions,
} from "../../../../lib/reconciliation";
import type {
  ReconciliationDetails,
  ReconciliationFilters,
  ReconciliationStatistics,
  ReconciliationStatus,
  ReconciliationTransaction,
} from "../../../../types/reconciliation";
import FinanceStatePanel from "../FinanceStatePanel";
import ReconciliationActionModal, {
  type ReconciliationActionType,
} from "./ReconciliationActionModal";
import ReconciliationCard from "./ReconciliationCard";
import ReconciliationDetailsModal from "./ReconciliationDetailsModal";
import ReconciliationTable from "./ReconciliationTable";

const EMPTY_STATISTICS: ReconciliationStatistics = {
  totalTransactions: 0,
  unreconciledCount: 0,
  reconciledCount: 0,
  disputedCount: 0,
  unreconciledAmount: 0,
  reconciledAmount: 0,
  disputedAmount: 0,
  totalDifference: 0,
  reconciliationRate: 0,
  currency: "NGN",
};

const RECONCILIATION_STATUSES: Array<{
  value: ReconciliationStatus;
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

const TRANSACTION_TYPES = [
  {
    value: "income",
    label: "Income",
  },
  {
    value: "expense",
    label: "Expense",
  },
  {
    value: "refund",
    label: "Refund",
  },
];

const TRANSACTION_STATUSES = [
  {
    value: "pending",
    label: "Pending",
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

const PROVIDERS = [
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
 * Escape one value for safe CSV output.
 */
function escapeCsvValue(value: unknown) {
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
 * Export the currently visible reconciliation transactions to CSV.
 */
function exportReconciliationCsv(transactions: ReconciliationTransaction[]) {
  const rows = [
    [
      "Internal Reference",
      "Provider Reference",
      "Reconciliation Reference",
      "Type",
      "Category",
      "Description",
      "Customer",
      "Customer Email",
      "Provider",
      "Payment Method",
      "Internal Amount",
      "External Amount",
      "Difference",
      "Currency",
      "Transaction Status",
      "Reconciliation Status",
      "Transaction Date",
      "Settlement Date",
      "Reconciled At",
      "Dispute Reason",
    ],

    ...transactions.map((transaction) => [
      transaction.internal_reference,
      transaction.provider_reference ?? "",
      transaction.reconciliation_reference ?? "",
      transaction.transaction_type,
      transaction.transaction_category,
      transaction.description,
      transaction.customer_name ?? "",
      transaction.customer_email ?? "",
      transaction.provider,
      transaction.payment_method ?? "",
      transaction.amount,
      transaction.external_amount ?? "",
      transaction.amount_difference ?? "",
      transaction.currency,
      transaction.status,
      transaction.reconciliation_status,
      transaction.transaction_date,
      transaction.settlement_date ?? "",
      transaction.reconciled_at ?? "",
      transaction.dispute_reason ?? "",
    ]),
  ];

  const csvContent = rows
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const downloadUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = downloadUrl;
  anchor.download = `reconciliation-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(anchor);

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(downloadUrl);
}

/**
 * Merge an updated transaction into the existing details record.
 */
function mergeUpdatedDetails(
  currentDetails: ReconciliationDetails | null,
  updatedTransaction: ReconciliationTransaction
): ReconciliationDetails | null {
  if (!currentDetails) {
    return null;
  }

  return {
    ...currentDetails,
    ...updatedTransaction,
  };
}

/**
 * Render the complete reconciliation dashboard.
 */
export default function ReconciliationDashboard() {
  const [transactions, setTransactions] = useState<ReconciliationTransaction[]>(
    []
  );

  const [statistics, setStatistics] =
    useState<ReconciliationStatistics>(EMPTY_STATISTICS);

  const [filters, setFilters] = useState<ReconciliationFilters>({
    search: "",
    reconciliationStatus: "all",
    transactionType: "all",
    transactionStatus: "all",
    provider: "all",
    currency: "NGN",
    dateFrom: "",
    dateTo: "",
  });

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);

  const [detailsLoading, setDetailsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);

  const [actionOpen, setActionOpen] = useState(false);

  const [selectedTransaction, setSelectedTransaction] =
    useState<ReconciliationTransaction | null>(null);

  const [selectedDetails, setSelectedDetails] =
    useState<ReconciliationDetails | null>(null);

  const [selectedAction, setSelectedAction] =
    useState<ReconciliationActionType | null>(null);

  const [processingTransactionId, setProcessingTransactionId] = useState<
    string | null
  >(null);

  /**
   * Load paginated transactions and reconciliation statistics.
   */
  const loadReconciliationDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [transactionResult, statisticsResult] = await Promise.all([
        listReconciliationTransactions({
          page,
          pageSize,
          filters,
          sortBy: "transaction_date",
          sortDirection: "desc",
        }),

        getReconciliationStatistics(),
      ]);

      setTransactions(transactionResult.transactions);
      setTotal(transactionResult.total);
      setTotalPages(transactionResult.totalPages);
      setStatistics(statisticsResult);
    } catch (error) {
      console.error("Failed to load Reconciliation dashboard:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The Reconciliation dashboard could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReconciliationDashboard();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadReconciliationDashboard]);

  /**
   * Update one reconciliation filter and reset pagination.
   */
  function updateFilter<Key extends keyof ReconciliationFilters>(
    key: Key,
    value: ReconciliationFilters[Key]
  ) {
    setPage(1);

    setFilters((currentFilters: ReconciliationFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  /**
   * Reset all reconciliation filters.
   */
  function resetFilters() {
    setPage(1);

    setFilters({
      search: "",
      reconciliationStatus: "all",
      transactionType: "all",
      transactionStatus: "all",
      provider: "all",
      currency: "NGN",
      dateFrom: "",
      dateTo: "",
    });
  }

  /**
   * Load and open the details modal for one transaction.
   */
  async function handleViewTransaction(transaction: ReconciliationTransaction) {
    setSelectedTransaction(transaction);
    setDetailsOpen(true);
    setDetailsLoading(true);

    try {
      const details = await getReconciliationDetails(transaction.id);

      setSelectedDetails(details);
    } catch (error) {
      console.error("Failed to load Reconciliation details:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The transaction details could not be loaded."
      );

      setDetailsOpen(false);
      setSelectedTransaction(null);
      setSelectedDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  /**
   * Open the action modal for one transaction.
   */
  function handleReconciliationAction(
    action: ReconciliationActionType,
    transaction: ReconciliationTransaction
  ) {
    setSelectedTransaction(transaction);
    setSelectedAction(action);
    setDetailsOpen(false);
    setActionOpen(true);
  }

  /**
   * Refresh the table, statistics and selected details after an action.
   */
  async function handleActionCompleted(transaction: ReconciliationTransaction) {
    setProcessingTransactionId(transaction.id);

    try {
      setSelectedTransaction(transaction);

      setSelectedDetails((currentDetails: ReconciliationDetails | null) =>
        mergeUpdatedDetails(currentDetails, transaction)
      );

      setActionOpen(false);
      setSelectedAction(null);

      await loadReconciliationDashboard();

      const details = await getReconciliationDetails(transaction.id);

      setSelectedDetails(details);
      setDetailsOpen(true);
    } catch (error) {
      console.error("Failed to refresh Reconciliation details:", error);
    } finally {
      setProcessingTransactionId(null);
    }
  }

  /**
   * Export the currently visible reconciliation transactions.
   */
  function handleExport() {
    if (transactions.length === 0) {
      toast.info("There are no reconciliation records to export.");

      return;
    }

    exportReconciliationCsv(transactions);
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.search?.trim()) {
      count += 1;
    }

    if (
      filters.reconciliationStatus &&
      filters.reconciliationStatus !== "all"
    ) {
      count += 1;
    }

    if (filters.transactionType && filters.transactionType !== "all") {
      count += 1;
    }

    if (filters.transactionStatus && filters.transactionStatus !== "all") {
      count += 1;
    }

    if (filters.provider && filters.provider !== "all") {
      count += 1;
    }

    if (filters.dateFrom) {
      count += 1;
    }

    if (filters.dateTo) {
      count += 1;
    }

    return count;
  }, [filters]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
            Reconciliation
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Compare internal transactions with bank, provider and settlement
            records, resolve mismatches and maintain a complete audit history.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || transactions.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => void loadReconciliationDashboard()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReconciliationCard
          title="Unreconciled"
          amount={statistics.unreconciledAmount}
          currency={statistics.currency}
          helperText={`${statistics.unreconciledCount} transaction${
            statistics.unreconciledCount === 1 ? "" : "s"
          } awaiting review`}
          variant="unreconciled"
        />

        <ReconciliationCard
          title="Reconciled"
          amount={statistics.reconciledAmount}
          currency={statistics.currency}
          helperText={`${statistics.reconciledCount} transaction${
            statistics.reconciledCount === 1 ? "" : "s"
          } confirmed`}
          variant="reconciled"
        />

        <ReconciliationCard
          title="Disputed"
          amount={statistics.disputedAmount}
          currency={statistics.currency}
          helperText={`${statistics.disputedCount} transaction${
            statistics.disputedCount === 1 ? "" : "s"
          } requiring resolution`}
          variant="disputed"
        />

        <ReconciliationCard
          title="Reconciliation Rate"
          percentage={statistics.reconciliationRate}
          helperText={`${statistics.reconciledCount} of ${statistics.totalTransactions} transactions reconciled`}
          variant="rate"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block md:col-span-2">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={filters.search ?? ""}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search references, customer, invoice, receipt, phone or bank account"
              className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:text-white"
            />
          </label>

          <select
            value={filters.reconciliationStatus ?? "all"}
            onChange={(event) =>
              updateFilter(
                "reconciliationStatus",
                event.target.value as ReconciliationStatus | "all"
              )
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All reconciliation statuses</option>

            {RECONCILIATION_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <select
            value={filters.transactionType ?? "all"}
            onChange={(event) =>
              updateFilter("transactionType", event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All transaction types</option>

            {TRANSACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={filters.transactionStatus ?? "all"}
            onChange={(event) =>
              updateFilter("transactionStatus", event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All transaction statuses</option>

            {TRANSACTION_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <select
            value={filters.provider ?? "all"}
            onChange={(event) => updateFilter("provider", event.target.value)}
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All providers</option>

            {PROVIDERS.map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>

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
          onRetry={() => void loadReconciliationDashboard()}
        />
      ) : transactions.length === 0 ? (
        <FinanceStatePanel
          type="empty"
          title="No reconciliation transactions"
          message="Financial transactions will appear here when they are available for reconciliation."
        />
      ) : (
        <ReconciliationTable
          transactions={transactions}
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          processingTransactionId={processingTransactionId}
          onView={(transaction) => void handleViewTransaction(transaction)}
          onReconcile={(transaction) =>
            handleReconciliationAction("reconcile", transaction)
          }
          onDispute={(transaction) =>
            handleReconciliationAction("dispute", transaction)
          }
          onUndo={(transaction) =>
            handleReconciliationAction("undo", transaction)
          }
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPage(1);
            setPageSize(nextPageSize);
          }}
        />
      )}

      <ReconciliationDetailsModal
        open={detailsOpen && !detailsLoading}
        details={selectedDetails}
        processing={processingTransactionId === selectedTransaction?.id}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedTransaction(null);
          setSelectedDetails(null);
        }}
        onAction={handleReconciliationAction}
      />

      <ReconciliationActionModal
        open={actionOpen}
        action={selectedAction}
        transaction={selectedTransaction}
        onClose={() => {
          setActionOpen(false);
          setSelectedAction(null);
        }}
        onCompleted={handleActionCompleted}
      />
    </section>
  );
}
