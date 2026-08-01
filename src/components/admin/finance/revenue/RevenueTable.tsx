import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CircleDollarSign,
  Download,
  Landmark,
  LoaderCircle,
  Minus,
  Plus,
  RefreshCw,
  WalletCards,
  ReceiptText,
  BadgeDollarSign,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  archiveRevenueTransaction,
  createRevenueTransaction,
  deleteDraftRevenueTransaction,
  exportRevenueTransactions,
  getRevenueStatistics,
  listRevenueTransactions,
  restoreRevenueTransaction,
  updateRevenueTransaction,
} from "../../../../lib/revenue";
import type {
  CreateRevenueTransactionInput,
  RevenueCategory,
  RevenueFilters,
  RevenueSortField,
  RevenueStatistics,
  RevenueTransaction,
} from "../../../../types/revenue";

import {
  DEFAULT_FILTERS,
  DEFAULT_REVENUE_FORM,
  PAGE_SIZE,
} from "../../../../config/revenueTable";

import { RevenueMetricCard } from "./RevenueTableParts";
import RevenueFilterPanel from "./RevenueFilterPanel";
import RevenuePagination from "./RevenuePagination";
import RevenueDataTable from "./RevenueDataTable";
import RevenueCreateModal from "./RevenueCreateModal";
import RevenueDetailsModal from "./RevenueDetailsModal";
import RevenueAnalytics from "./RevenueAnalytics";
import type {
  RevenueFilterState,
  RevenueFormState,
  RevenueMetric,
  SortDirection,
} from "../../../../types/revenuetable";
import {
  downloadRevenueCsv,
  formatCompactCurrency,
  formatPercentage,
  generateRevenueReference,
  parseFinancialNumber,
  revenueTransactionToForm,
  toIsoDateTime,
} from "../../../../utils/revenueTable";

/**
 * Display and manage company Revenue transactions.
 */
export default function RevenueTable() {
  // Store the current page of Revenue transactions.
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);

  // Store Revenue dashboard statistics.
  const [statistics, setStatistics] = useState<RevenueStatistics | null>(null);

  // Store the active Revenue filters.
  const [filters, setFilters] = useState<RevenueFilterState>(DEFAULT_FILTERS);

  // Store pagination and sorting values.
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<RevenueSortField>("transaction_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Track interface loading and errors.
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Store modal and form state.
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<RevenueTransaction | null>(null);
  const [createForm, setCreateForm] =
    useState<RevenueFormState>(DEFAULT_REVENUE_FORM);
  const [editForm, setEditForm] =
    useState<RevenueFormState>(DEFAULT_REVENUE_FORM);

  // Track Revenue mutations.
  const [creatingTransaction, setCreatingTransaction] = useState(false);
  const [updatingTransactionId, setUpdatingTransactionId] = useState<
    string | null
  >(null);
  const [archivingTransactionId, setArchivingTransactionId] = useState<
    string | null
  >(null);
  const [restoringTransactionId, setRestoringTransactionId] = useState<
    string | null
  >(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<
    string | null
  >(null);

  /**
   * Convert component filters into the Revenue service shape.
   */
  const serviceFilters = useMemo<RevenueFilters>(
    () => ({
      search: filters.search.trim() || undefined,
      category: filters.category,
      provider: filters.provider,
      status: filters.status,
      reconciliationStatus: filters.reconciliationStatus,
      currency: filters.currency.trim() || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      includeArchived: filters.includeArchived,
    }),
    [filters]
  );

  /**
   * Load the current Revenue page and dashboard statistics.
   */
  const loadRevenue = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [revenueResult, statisticsResult] = await Promise.all([
        listRevenueTransactions({
          page,
          pageSize: PAGE_SIZE,
          filters: serviceFilters,
          sortBy,
          sortDirection,
        }),
        getRevenueStatistics(),
      ]);

      setTransactions(revenueResult.transactions);
      setTotal(revenueResult.total);
      setTotalPages(Math.max(revenueResult.totalPages, 1));
      setStatistics(statisticsResult);

      if (page > Math.max(revenueResult.totalPages, 1)) {
        setPage(Math.max(revenueResult.totalPages, 1));
      }
    } catch (error) {
      console.error("Failed to load Revenue records:", error);
      setErrorMessage("Revenue records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, serviceFilters, sortBy, sortDirection]);

  // Reload Revenue whenever pagination, filters, or sorting changes.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRevenue();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [loadRevenue]);

  // Synchronize the edit form with the selected transaction.
  useEffect(() => {
    setEditForm(
      selectedTransaction
        ? revenueTransactionToForm(selectedTransaction)
        : DEFAULT_REVENUE_FORM
    );
  }, [selectedTransaction]);

  /**
   * Update one active Revenue filter and reset pagination.
   */
  function updateFilter<Key extends keyof RevenueFilterState>(
    field: Key,
    value: RevenueFilterState[Key]
  ) {
    setFilters((currentFilters) => ({ ...currentFilters, [field]: value }));
    setPage(1);
  }

  /**
   * Clear every active Revenue filter.
   */
  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  /**
   * Update one Revenue creation form field.
   */
  function updateCreateForm<Key extends keyof RevenueFormState>(
    field: Key,
    value: RevenueFormState[Key]
  ) {
    setCreateForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  /**
   * Update one Revenue edit form field.
   */
  function updateEditForm<Key extends keyof RevenueFormState>(
    field: Key,
    value: RevenueFormState[Key]
  ) {
    setEditForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  /**
   * Convert form state into the Revenue API input shape.
   */
  function buildRevenueInput(
    form: RevenueFormState
  ): CreateRevenueTransactionInput {
    return {
      transaction_category: form.transactionCategory,
      provider: form.provider,
      payment_method: form.paymentMethod.trim() || null,
      source_table: form.sourceTable.trim() || null,
      source_id: form.sourceId.trim() || null,
      customer_name: form.customerName.trim() || null,
      customer_email: form.customerEmail.trim() || null,
      customer_phone: form.customerPhone.trim() || null,
      description: form.description.trim(),
      internal_notes: form.internalNotes.trim() || null,
      internal_reference: form.internalReference.trim(),
      provider_reference: form.providerReference.trim() || null,
      invoice_number: form.invoiceNumber.trim() || null,
      receipt_number: form.receiptNumber.trim() || null,
      bank_account: form.bankAccount.trim() || null,
      amount: parseFinancialNumber(form.amount),
      fee_amount: parseFinancialNumber(form.feeAmount),
      tax_amount: parseFinancialNumber(form.taxAmount),
      refunded_amount: parseFinancialNumber(form.refundedAmount),
      currency: form.currency.trim().toUpperCase(),
      base_currency: form.baseCurrency.trim().toUpperCase(),
      exchange_rate: parseFinancialNumber(form.exchangeRate, 1),
      status: form.status,
      reconciliation_status: form.reconciliationStatus,
      transaction_date: form.transactionDate,
      paid_at: toIsoDateTime(form.paidAt),
      reconciled_at: toIsoDateTime(form.reconciledAt),
    };
  }

  /**
   * Validate the required Revenue form values.
   */
  function validateRevenueForm(form: RevenueFormState) {
    if (!form.description.trim()) {
      toast.error("Enter a transaction description.");
      return false;
    }

    if (!form.internalReference.trim()) {
      toast.error("Enter an internal reference.");
      return false;
    }

    if (parseFinancialNumber(form.amount) <= 0) {
      toast.error("Amount must be greater than zero.");
      return false;
    }

    if (!form.currency.trim() || !form.baseCurrency.trim()) {
      toast.error("Currency and base currency are required.");
      return false;
    }

    if (!form.transactionDate) {
      toast.error("Select a transaction date.");
      return false;
    }

    return true;
  }

  /**
   * Open the Revenue creation modal with fresh values.
   */
  function openCreateModal() {
    setCreateForm({
      ...DEFAULT_REVENUE_FORM,
      transactionDate: new Date().toISOString().slice(0, 10),
      internalReference: generateRevenueReference(
        DEFAULT_REVENUE_FORM.transactionCategory
      ),
    });
    setCreateModalOpen(true);
  }

  /**
   * Close the Revenue creation modal.
   */
  function closeCreateModal() {
    if (creatingTransaction) return;
    setCreateModalOpen(false);
    setCreateForm(DEFAULT_REVENUE_FORM);
  }

  /**
   * Update the creation category and generate a matching reference.
   */
  function handleCreateCategoryChange(category: RevenueCategory) {
    setCreateForm((currentForm) => ({
      ...currentForm,
      transactionCategory: category,
      internalReference: generateRevenueReference(category),
    }));
  }

  /**
   * Replace one Revenue transaction in local state.
   */
  function replaceTransaction(updatedTransaction: RevenueTransaction) {
    setTransactions((currentTransactions) =>
      currentTransactions.map((transaction) =>
        transaction.id === updatedTransaction.id
          ? updatedTransaction
          : transaction
      )
    );

    setSelectedTransaction((currentTransaction) =>
      currentTransaction?.id === updatedTransaction.id
        ? updatedTransaction
        : currentTransaction
    );
  }

  /**
   * Create one manual Revenue transaction.
   */
  async function handleCreateTransaction() {
    if (!validateRevenueForm(createForm)) return;

    setCreatingTransaction(true);

    try {
      const createdTransaction = await createRevenueTransaction(
        buildRevenueInput(createForm)
      );
      toast.success("Revenue transaction created.");
      setCreateModalOpen(false);
      setCreateForm(DEFAULT_REVENUE_FORM);
      setPage(1);
      await loadRevenue();
      setSelectedTransaction(createdTransaction);
    } catch (error) {
      console.error("Failed to create Revenue transaction:", error);
      toast.error("Revenue transaction could not be created.");
    } finally {
      setCreatingTransaction(false);
    }
  }

  /**
   * Update the selected Revenue transaction.
   */
  async function handleUpdateTransaction() {
    if (!selectedTransaction || !validateRevenueForm(editForm)) return;

    setUpdatingTransactionId(selectedTransaction.id);

    try {
      const updatedTransaction = await updateRevenueTransaction(
        selectedTransaction.id,
        buildRevenueInput(editForm)
      );
      replaceTransaction(updatedTransaction);
      toast.success("Revenue transaction updated.");
      await loadRevenue();
    } catch (error) {
      console.error("Failed to update Revenue transaction:", error);
      toast.error("Revenue transaction could not be updated.");
    } finally {
      setUpdatingTransactionId(null);
    }
  }

  /**
   * Archive one Revenue transaction.
   */
  async function handleArchiveTransaction(transaction: RevenueTransaction) {
    if (!window.confirm(`Archive ${transaction.internal_reference}?`)) return;

    setArchivingTransactionId(transaction.id);

    try {
      const archivedTransaction = await archiveRevenueTransaction(
        transaction.id
      );
      replaceTransaction(archivedTransaction);
      toast.success("Revenue transaction archived.");
      await loadRevenue();
    } catch (error) {
      console.error("Failed to archive Revenue transaction:", error);
      toast.error("Revenue transaction could not be archived.");
    } finally {
      setArchivingTransactionId(null);
    }
  }

  /**
   * Restore one archived Revenue transaction.
   */
  async function handleRestoreTransaction(transaction: RevenueTransaction) {
    setRestoringTransactionId(transaction.id);

    try {
      const restoredTransaction = await restoreRevenueTransaction(
        transaction.id
      );
      replaceTransaction(restoredTransaction);
      toast.success("Revenue transaction restored.");
      await loadRevenue();
    } catch (error) {
      console.error("Failed to restore Revenue transaction:", error);
      toast.error("Revenue transaction could not be restored.");
    } finally {
      setRestoringTransactionId(null);
    }
  }

  /**
   * Permanently delete one draft Revenue transaction.
   */
  async function handleDeleteDraftTransaction(transaction: RevenueTransaction) {
    if (transaction.status !== "draft") {
      toast.error("Only draft Revenue transactions can be deleted.");
      return;
    }

    if (
      !window.confirm(`Permanently delete ${transaction.internal_reference}?`)
    )
      return;

    setDeletingTransactionId(transaction.id);

    try {
      await deleteDraftRevenueTransaction(transaction);
      setTransactions((currentTransactions) =>
        currentTransactions.filter((item) => item.id !== transaction.id)
      );
      setSelectedTransaction(null);
      toast.success("Draft Revenue transaction deleted.");
      await loadRevenue();
    } catch (error) {
      console.error("Failed to delete Revenue transaction:", error);
      toast.error("Draft Revenue transaction could not be deleted.");
    } finally {
      setDeletingTransactionId(null);
    }
  }

  /**
   * Export all Revenue transactions matching the active filters.
   */
  async function handleExportTransactions() {
    setExporting(true);

    try {
      const exportedTransactions =
        await exportRevenueTransactions(serviceFilters);
      downloadRevenueCsv(exportedTransactions);
      toast.success(
        `${exportedTransactions.length.toLocaleString("en-NG")} Revenue records exported.`
      );
    } catch (error) {
      console.error("Failed to export Revenue transactions:", error);
      toast.error("Revenue records could not be exported.");
    } finally {
      setExporting(false);
    }
  }

  /**
   * Change the active table sort field or direction.
   */
  function handleSort(field: RevenueSortField) {
    if (sortBy === field) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc"
      );
    } else {
      setSortBy(field);
      setSortDirection("desc");
    }
    setPage(1);
  }

  // Count all active Revenue filters.
  const activeFilterCount = useMemo(
    () =>
      [
        filters.search,
        filters.category !== "all" ? filters.category : "",
        filters.provider !== "all" ? filters.provider : "",
        filters.status !== "all" ? filters.status : "",
        filters.reconciliationStatus !== "all"
          ? filters.reconciliationStatus
          : "",
        filters.currency,
        filters.dateFrom,
        filters.dateTo,
        filters.includeArchived ? "archived" : "",
      ].filter(Boolean).length,
    [filters]
  );

  // Build the Revenue dashboard metric cards.
  const metrics = useMemo<RevenueMetric[]>(() => {
    if (!statistics) return [];

    const growthDescription =
      statistics.growthPercentage === 0
        ? "No month-over-month change"
        : `${formatPercentage(statistics.growthPercentage)} from the previous month`;

    return [
      {
        label: "Revenue This Month",
        value: formatCompactCurrency(
          statistics.currentMonthRevenue,
          statistics.currency
        ),
        description: growthDescription,
        icon:
          statistics.growthPercentage > 0
            ? ArrowUpRight
            : statistics.growthPercentage < 0
              ? ArrowDownRight
              : Minus,
        iconClasses:
          statistics.growthPercentage > 0
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            : statistics.growthPercentage < 0
              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      },
      {
        label: "Total Revenue",
        value: formatCompactCurrency(
          statistics.totalRevenue,
          statistics.currency
        ),
        description: `${statistics.paidTransactions.toLocaleString("en-NG")} paid transactions`,
        icon: BadgeDollarSign,
        iconClasses:
          "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
      },
      {
        label: "Pending Revenue",
        value: formatCompactCurrency(
          statistics.pendingRevenue,
          statistics.currency
        ),
        description: `${statistics.pendingTransactions.toLocaleString("en-NG")} pending or processing`,
        icon: ReceiptText,
        iconClasses:
          "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
      },
      {
        label: "Net Revenue",
        value: formatCompactCurrency(
          statistics.netRevenue,
          statistics.currency
        ),
        description: `${formatCompactCurrency(statistics.refundedRevenue, statistics.currency)} refunded`,
        icon: CircleDollarSign,
        iconClasses:
          "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
      },
    ];
  }, [statistics]);

  // Build the Revenue provider breakdown.
  const providerBreakdown = useMemo(() => {
    if (!statistics) return [];

    return [
      {
        label: "Paystack",
        value: statistics.paystackRevenue,
        icon: WalletCards,
        classes:
          "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
      },
      {
        label: "Providus Bank",
        value: statistics.providusRevenue,
        icon: Landmark,
        classes:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      },
      {
        label: "Manual and Bank",
        value: statistics.manualRevenue,
        icon: Banknote,
        classes:
          "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
      },
      {
        label: "Other Providers",
        value: statistics.otherProviderRevenue,
        icon: Building2,
        classes:
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      },
    ];
  }, [statistics]);

  const firstVisibleRecord = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastVisibleRecord = Math.min(page * PAGE_SIZE, total);

  /**
   * Render a shared form control style.
   */
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            Financial operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
            Revenue
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Review, reconcile, export, and manage company Revenue from every
            payment source.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadRevenue()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleExportTransactions()}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            {exporting ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}{" "}
            Export CSV
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={16} /> Add Revenue
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !statistics
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
              />
            ))
          : metrics.map((metric) => (
              <RevenueMetricCard key={metric.label} metric={metric} />
            ))}
      </div>

      {statistics && (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Revenue by provider
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Paid Revenue grouped by collection channel.
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {statistics.currency}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {providerBreakdown.map((provider) => {
              const Icon = provider.icon;
              return (
                <div
                  key={provider.label}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${provider.classes}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {provider.label}
                    </p>
                    <p className="mt-1 truncate font-bold text-slate-950 dark:text-white">
                      {formatCompactCurrency(
                        provider.value,
                        statistics.currency
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      )}

      <RevenueAnalytics
        filters={serviceFilters}
        refreshKey={`${statistics?.totalRevenue ?? 0}-${statistics?.pendingRevenue ?? 0}-${statistics?.refundedRevenue ?? 0}-${total}`}
      />

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <RevenueFilterPanel
          filters={filters}
          visible={filtersVisible}
          activeFilterCount={activeFilterCount}
          onToggleVisibility={() =>
            setFiltersVisible((currentVisibility) => !currentVisibility)
          }
          onClear={clearFilters}
          onChange={updateFilter}
        />

        {errorMessage ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <XCircle size={34} className="text-red-500" />
            <p className="font-semibold text-slate-900 dark:text-white">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => void loadRevenue()}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : (
          <RevenueDataTable
            transactions={transactions}
            loading={loading}
            sortBy={sortBy}
            sortDirection={sortDirection}
            updatingTransactionId={updatingTransactionId}
            archivingTransactionId={archivingTransactionId}
            restoringTransactionId={restoringTransactionId}
            deletingTransactionId={deletingTransactionId}
            onSort={handleSort}
            onView={setSelectedTransaction}
            onArchive={(transaction) =>
              void handleArchiveTransaction(transaction)
            }
            onRestore={(transaction) =>
              void handleRestoreTransaction(transaction)
            }
            onDeleteDraft={(transaction) =>
              void handleDeleteDraftTransaction(transaction)
            }
          />
        )}

        <RevenuePagination
          page={page}
          totalPages={totalPages}
          total={total}
          firstVisibleRecord={firstVisibleRecord}
          lastVisibleRecord={lastVisibleRecord}
          loading={loading}
          onPageChange={setPage}
        />
      </article>

      <RevenueCreateModal
        open={createModalOpen}
        form={createForm}
        submitting={creatingTransaction}
        onClose={closeCreateModal}
        onSubmit={() => void handleCreateTransaction()}
        onCategoryChange={handleCreateCategoryChange}
        onChange={updateCreateForm}
      />

      <RevenueDetailsModal
        transaction={selectedTransaction}
        form={editForm}
        updatingTransactionId={updatingTransactionId}
        archivingTransactionId={archivingTransactionId}
        restoringTransactionId={restoringTransactionId}
        deletingTransactionId={deletingTransactionId}
        onClose={() => setSelectedTransaction(null)}
        onChange={updateEditForm}
        onUpdate={() => void handleUpdateTransaction()}
        onArchive={(transaction) => void handleArchiveTransaction(transaction)}
        onRestore={(transaction) => void handleRestoreTransaction(transaction)}
        onDeleteDraft={(transaction) =>
          void handleDeleteDraftTransaction(transaction)
        }
      />
    </section>
  );
}
