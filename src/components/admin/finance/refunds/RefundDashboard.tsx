import { Download, Plus, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getRefundStatistics, listRefunds } from "../../../../lib/refund";
import type {
  FinanceRefund,
  FinanceRefundListItem,
  RefundFilters,
  RefundProvider,
  RefundStatistics,
  RefundStatus,
} from "../../../../types/refund";
import FinanceModuleNav from "../FinanceModuleNav";
import FinanceStatePanel from "../FinanceStatePanel";
import RefundActionModal, { type RefundActionType } from "./RefundActionModall";
import RefundCard from "./RefundCard";
import RefundDetailsModal from "./RefundDetailsModal";
import RefundFormModal from "./RefundFormModal";
import RefundTable from "./RefundTable";

const EMPTY_STATISTICS: RefundStatistics = {
  totalRequested: 0,
  totalApproved: 0,
  totalRefunded: 0,
  requestedCount: 0,
  approvedCount: 0,
  processingCount: 0,
  successfulCount: 0,
  failedCount: 0,
  rejectedCount: 0,
  cancelledCount: 0,
  currency: "NGN",
};

const REFUND_STATUSES: Array<{
  value: RefundStatus;
  label: string;
}> = [
  {
    value: "requested",
    label: "Requested",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "processing",
    label: "Processing",
  },
  {
    value: "successful",
    label: "Successful",
  },
  {
    value: "failed",
    label: "Failed",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

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
 * Export the currently loaded Refund records to CSV.
 */
function exportRefundsCsv(refunds: FinanceRefundListItem[]) {
  const rows = [
    [
      "Refund Reference",
      "Original Transaction",
      "Customer",
      "Customer Email",
      "Provider",
      "Payment Method",
      "Requested Amount",
      "Approved Amount",
      "Refunded Amount",
      "Currency",
      "Status",
      "Reason",
      "Requested At",
      "Processed At",
      "Provider Refund Reference",
    ],

    ...refunds.map((refund) => [
      refund.refund_reference,
      refund.transaction_reference ?? "",
      refund.customer_name ?? "",
      refund.customer_email ?? "",
      refund.provider,
      refund.payment_method ?? "",
      refund.requested_amount,
      refund.approved_amount ?? "",
      refund.refunded_amount,
      refund.currency,
      refund.status,
      refund.reason,
      refund.requested_at,
      refund.processed_at ?? "",
      refund.provider_refund_reference ?? "",
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

  anchor.download = `refunds-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(anchor);

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(downloadUrl);
}

/**
 * Convert a FinanceRefund response into the current table item shape.
 */
function mergeUpdatedRefund(
  currentRefund: FinanceRefundListItem | null,
  updatedRefund: FinanceRefund
): FinanceRefundListItem | null {
  if (!currentRefund) {
    return null;
  }

  return {
    ...currentRefund,
    ...updatedRefund,
  };
}

/**
 * Render the complete Refund management dashboard.
 */
export default function RefundDashboard() {
  const [refunds, setRefunds] = useState<FinanceRefundListItem[]>([]);

  const [statistics, setStatistics] =
    useState<RefundStatistics>(EMPTY_STATISTICS);

  const [filters, setFilters] = useState<RefundFilters>({
    search: "",
    status: "all",
    provider: "all",
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

  const [actionOpen, setActionOpen] = useState(false);

  const [selectedRefund, setSelectedRefund] =
    useState<FinanceRefundListItem | null>(null);

  const [selectedAction, setSelectedAction] = useState<RefundActionType | null>(
    null
  );

  const [processingRefundId, setProcessingRefundId] = useState<string | null>(
    null
  );

  /**
   * Load paginated Refund records and dashboard statistics.
   */
  const loadRefundDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [refundResult, statisticsResult] = await Promise.all([
        listRefunds({
          page,
          pageSize,
          filters,
          sortBy: "requested_at",
          sortDirection: "desc",
        }),

        getRefundStatistics(),
      ]);

      setRefunds(refundResult.refunds);

      setTotal(refundResult.total);

      setTotalPages(refundResult.totalPages);

      setStatistics(statisticsResult);
    } catch (error) {
      console.error("Failed to load Refund dashboard:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The Refund dashboard could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRefundDashboard();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadRefundDashboard]);

  /**
   * Update one Refund filter and reset pagination.
   */
  function updateFilter<Key extends keyof RefundFilters>(
    key: Key,
    value: RefundFilters[Key]
  ) {
    setPage(1);

    setFilters((currentFilters: RefundFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  /**
   * Reset all Refund filters.
   */
  function resetFilters() {
    setPage(1);

    setFilters({
      search: "",
      status: "all",
      provider: "all",
      currency: "NGN",
      dateFrom: "",
      dateTo: "",
      archived: false,
    });
  }

  /**
   * Open the Refund request form.
   */
  function handleCreateRefund() {
    setFormOpen(true);
  }

  /**
   * Open one Refund in the details modal.
   */
  function handleViewRefund(refund: FinanceRefundListItem) {
    setSelectedRefund(refund);
    setDetailsOpen(true);
  }

  /**
   * Open the reusable action modal for a Refund.
   */
  function handleRefundAction(
    action: RefundActionType,
    refund: FinanceRefundListItem
  ) {
    setSelectedRefund(refund);
    setSelectedAction(action);
    setDetailsOpen(false);
    setActionOpen(true);
  }

  /**
   * Refresh the dashboard after one Refund request is created.
   */
  async function handleRefundCreated(refund: FinanceRefund) {
    setFormOpen(false);

    toast.success(`${refund.refund_reference} is ready for review.`);

    await loadRefundDashboard();
  }

  /**
   * Refresh the dashboard and local selection after an action completes.
   */
  async function handleActionCompleted(refund: FinanceRefund) {
    setProcessingRefundId(refund.id);

    try {
      setSelectedRefund((currentRefund: FinanceRefundListItem | null) =>
        mergeUpdatedRefund(currentRefund, refund)
      );

      setActionOpen(false);
      setSelectedAction(null);

      await loadRefundDashboard();
    } finally {
      setProcessingRefundId(null);
    }
  }

  /**
   * Export the currently visible Refund records.
   */
  function handleExportRefunds() {
    if (refunds.length === 0) {
      toast.info("There are no Refunds to export.");

      return;
    }

    exportRefundsCsv(refunds);
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.search?.trim()) {
      count += 1;
    }

    if (filters.status && filters.status !== "all") {
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

    if (filters.archived) {
      count += 1;
    }

    return count;
  }, [filters]);

  const pendingRefundCount =
    statistics.requestedCount +
    statistics.approvedCount +
    statistics.processingCount;

  const failedRefundCount =
    statistics.failedCount +
    statistics.rejectedCount +
    statistics.cancelledCount;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white sm:text-3xl">
            Refunds
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Request, approve and process full or partial Refunds against
            existing paid income transactions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportRefunds}
            disabled={loading || refunds.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => void loadRefundDashboard()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleCreateRefund}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Plus size={16} />
            Request Refund
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RefundCard
          title="Total Requested"
          amount={statistics.totalRequested}
          currency={statistics.currency}
          helperText={`${statistics.requestedCount} awaiting approval`}
          variant="requested"
        />

        <RefundCard
          title="Pending Refunds"
          value={pendingRefundCount}
          helperText={`${statistics.approvedCount} approved · ${statistics.processingCount} processing`}
          variant="pending"
        />

        <RefundCard
          title="Total Refunded"
          amount={statistics.totalRefunded}
          currency={statistics.currency}
          helperText={`${statistics.successfulCount} successful Refund${
            statistics.successfulCount === 1 ? "" : "s"
          }`}
          variant="successful"
        />

        <RefundCard
          title="Failed or Closed"
          value={failedRefundCount}
          helperText={`${statistics.failedCount} failed · ${statistics.rejectedCount} rejected · ${statistics.cancelledCount} cancelled`}
          variant="failed"
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
              placeholder="Search refund reference, provider reference, reason or notes"
              className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:text-white"
            />
          </label>

          <select
            value={filters.status ?? "all"}
            onChange={(event) =>
              updateFilter("status", event.target.value as RefundStatus | "all")
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All statuses</option>

            {REFUND_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <select
            value={filters.provider ?? "all"}
            onChange={(event) =>
              updateFilter(
                "provider",
                event.target.value as RefundProvider | "all"
              )
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All providers</option>

            {REFUND_PROVIDERS.map((provider) => (
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
          onRetry={() => void loadRefundDashboard()}
        />
      ) : refunds.length === 0 ? (
        <FinanceStatePanel
          type="empty"
          title={
            filters.archived ? "No archived Refunds" : "No Refund requests"
          }
          message={
            filters.archived
              ? "Archived Refund records will appear here."
              : 'Select "Request Refund" to create the first Refund request.'
          }
        />
      ) : (
        <RefundTable
          refunds={refunds}
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          processingRefundId={processingRefundId}
          onView={handleViewRefund}
          onApprove={(refund) => handleRefundAction("approve", refund)}
          onReject={(refund) => handleRefundAction("reject", refund)}
          onProcess={(refund) => handleRefundAction("process", refund)}
          onCancel={(refund) => handleRefundAction("cancel", refund)}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPage(1);
            setPageSize(nextPageSize);
          }}
        />
      )}

      <RefundFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleRefundCreated}
      />

      <RefundDetailsModal
        open={detailsOpen}
        refund={selectedRefund}
        processing={processingRefundId === selectedRefund?.id}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedRefund(null);
        }}
        onAction={handleRefundAction}
      />

      <RefundActionModal
        open={actionOpen}
        action={selectedAction}
        refund={selectedRefund}
        onClose={() => {
          setActionOpen(false);
          setSelectedAction(null);
        }}
        onCompleted={handleActionCompleted}
      />
    </section>
  );
}
