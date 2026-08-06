import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  archiveInvoice,
  cancelInvoice,
  createInvoice,
  deleteDraftInvoice,
  getInvoiceStatistics,
  listInvoices,
  markInvoiceSent,
  restoreInvoice,
} from "../../../../lib/invoice";
import type {
  CreateInvoiceInput,
  Invoice,
  InvoiceFilters,
  InvoiceSortField,
  InvoiceStatistics,
  InvoiceStatus,
} from "../../../../types/invoice";
import type { InvoiceSortDirection } from "../../../../lib/invoice";
import {
  INVOICE_PAGE_SIZE,
  INVOICE_STATUSES,
} from "../../../../config/invoice";
import { formatInvoiceCurrency } from "../../../../utils/invoice";
import InvoiceBuilder from "./InvoiceBuilder";
import InvoiceTable from "./InvoiceTable";
import { getInvoiceById, updateDraftInvoice } from "../../../../lib/invoice";

import InvoiceDetailsModal from "./InvoiceDetailsModal";

interface InvoiceFilterState {
  search: string;

  status: InvoiceStatus | "all";

  currency: string;

  issueDateFrom: string;

  issueDateTo: string;

  includeArchived: boolean;
}

const DEFAULT_FILTERS: InvoiceFilterState = {
  search: "",
  status: "all",
  currency: "",
  issueDateFrom: "",
  issueDateTo: "",
  includeArchived: false,
};

/**
 * Display the complete Invoice dashboard and coordinate its data operations.
 */
export default function InvoiceDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statistics, setStatistics] = useState<InvoiceStatistics | null>(null);
  const [filters, setFilters] = useState<InvoiceFilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<InvoiceSortField>("created_at");
  const [sortDirection, setSortDirection] =
    useState<InvoiceSortDirection>("desc");
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [busyInvoiceId, setBusyInvoiceId] = useState<string | null>(null);

  // Store the Invoice currently shown in the details modal.
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Track loading of one complete Invoice record.
  const [loadingSelectedInvoice, setLoadingSelectedInvoice] = useState(false);

  // Store the draft Invoice currently being edited.
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  /**
   * Convert local filters into the service-layer filter shape.
   */
  const serviceFilters = useMemo<InvoiceFilters>(
    () => ({
      search: filters.search.trim() || undefined,
      status: filters.status,
      currency: filters.currency.trim() || undefined,
      issueDateFrom: filters.issueDateFrom || undefined,
      issueDateTo: filters.issueDateTo || undefined,
      includeArchived: filters.includeArchived,
    }),
    [filters]
  );

  /**
   * Load invoice records and dashboard statistics.
   */
  const loadInvoices = useCallback(async () => {
    setLoading(true);

    try {
      const [invoiceResult, statisticsResult] = await Promise.all([
        listInvoices({
          page,
          pageSize: INVOICE_PAGE_SIZE,
          filters: serviceFilters,
          sortBy,
          sortDirection,
        }),
        getInvoiceStatistics(),
      ]);

      setInvoices(invoiceResult.invoices);
      setTotal(invoiceResult.total);
      setTotalPages(invoiceResult.totalPages);
      setStatistics(statisticsResult);

      if (page > invoiceResult.totalPages) {
        setPage(invoiceResult.totalPages);
      }
    } catch (error) {
      console.error("Failed to load invoices:", error);

      toast.error(
        error instanceof Error ? error.message : "Invoices could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [page, serviceFilters, sortBy, sortDirection]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInvoices();
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadInvoices]);

  /**
   * Update one active filter and return to the first page.
   */
  function updateFilter<Key extends keyof InvoiceFilterState>(
    field: Key,
    value: InvoiceFilterState[Key]
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));

    setPage(1);
  }

  /**
   * Toggle one sortable field or reverse its current direction.
   */
  function handleSort(field: InvoiceSortField) {
    if (sortBy === field) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc"
      );

      return;
    }

    setSortBy(field);
    setSortDirection("desc");
  }

  /**
   * Create one invoice and reload dashboard data.
   */
  async function handleCreateInvoice(input: CreateInvoiceInput) {
    setCreatingInvoice(true);

    try {
      const invoice = await createInvoice(input);

      toast.success(`${invoice.invoice_number} created successfully.`);
      setBuilderOpen(false);
      setPage(1);
      await loadInvoices();
    } catch (error) {
      console.error("Failed to create invoice:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The invoice could not be created."
      );

      throw error;
    } finally {
      setCreatingInvoice(false);
    }
  }

  /**
   * Mark one draft invoice as sent.
   */
  async function handleMarkSent(invoice: Invoice) {
    setBusyInvoiceId(invoice.id);

    try {
      await markInvoiceSent(invoice.id);
      toast.success(`${invoice.invoice_number} marked as sent.`);
      await loadInvoices();
    } catch (error) {
      console.error("Failed to mark invoice as sent:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The invoice could not be marked as sent."
      );
    } finally {
      setBusyInvoiceId(null);
    }
  }

  /**
   * Cancel one unpaid invoice after confirmation.
   */
  async function handleCancel(invoice: Invoice) {
    const confirmed = window.confirm(
      `Cancel ${invoice.invoice_number}? The invoice will remain in the audit trail.`
    );

    if (!confirmed) {
      return;
    }

    setBusyInvoiceId(invoice.id);

    try {
      await cancelInvoice(invoice.id);
      toast.success(`${invoice.invoice_number} cancelled.`);
      await loadInvoices();
    } catch (error) {
      console.error("Failed to cancel invoice:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The invoice could not be cancelled."
      );
    } finally {
      setBusyInvoiceId(null);
    }
  }

  /**
   * Archive one invoice after confirmation.
   */
  async function handleArchive(invoice: Invoice) {
    const confirmed = window.confirm(`Archive ${invoice.invoice_number}?`);

    if (!confirmed) {
      return;
    }

    setBusyInvoiceId(invoice.id);

    try {
      await archiveInvoice(invoice.id);
      toast.success(`${invoice.invoice_number} archived.`);
      await loadInvoices();
    } catch (error) {
      console.error("Failed to archive invoice:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The invoice could not be archived."
      );
    } finally {
      setBusyInvoiceId(null);
    }
  }

  /**
   * Restore one archived invoice.
   */
  async function handleRestore(invoice: Invoice) {
    setBusyInvoiceId(invoice.id);

    try {
      await restoreInvoice(invoice.id);
      toast.success(`${invoice.invoice_number} restored.`);
      await loadInvoices();
    } catch (error) {
      console.error("Failed to restore invoice:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The invoice could not be restored."
      );
    } finally {
      setBusyInvoiceId(null);
    }
  }

  /**
   * Permanently delete one draft invoice after confirmation.
   */
  async function handleDeleteDraft(invoice: Invoice) {
    const confirmed = window.confirm(
      `Permanently delete ${invoice.invoice_number}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setBusyInvoiceId(invoice.id);

    try {
      await deleteDraftInvoice(invoice);
      toast.success(`${invoice.invoice_number} deleted.`);
      await loadInvoices();
    } catch (error) {
      console.error("Failed to delete invoice:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The invoice could not be deleted."
      );
    } finally {
      setBusyInvoiceId(null);
    }
  }

  /**
   * Open one draft invoice inside the Invoice builder.
   */
  async function handleEditInvoice(invoice: Invoice) {
    setLoadingSelectedInvoice(true);

    try {
      const completeInvoice = await getInvoiceById(invoice.id);

      // Close the details modal.
      setSelectedInvoice(null);

      // Populate the builder with the existing invoice.
      setEditingInvoice(completeInvoice);

      // Open the builder.
      setBuilderOpen(true);
    } catch (error) {
      console.error("Failed to prepare invoice editing:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The invoice could not be opened for editing."
      );
    } finally {
      setLoadingSelectedInvoice(false);
    }
  }
  /**
   * Open the selected invoice placeholder until the details module is added.
   */
  /**
   * Retrieve and display one complete Invoice with its line items.
   */
  async function handleView(invoice: Invoice) {
    setLoadingSelectedInvoice(true);

    setSelectedInvoice(invoice);

    try {
      const completeInvoice = await getInvoiceById(invoice.id);

      setSelectedInvoice(completeInvoice);
    } catch (error) {
      console.error("Failed to load Invoice details:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Invoice details could not be loaded."
      );

      setSelectedInvoice(null);
    } finally {
      setLoadingSelectedInvoice(false);
    }
  }

  const firstVisibleRecord =
    total === 0 ? 0 : (page - 1) * INVOICE_PAGE_SIZE + 1;

  const lastVisibleRecord = Math.min(page * INVOICE_PAGE_SIZE, total);

  const metrics = statistics
    ? [
        {
          label: "Invoice Value",
          value: formatInvoiceCurrency(
            statistics.totalInvoiceValue,
            statistics.currency
          ),
          description: `${statistics.totalInvoices.toLocaleString(
            "en-NG"
          )} total invoices`,
          icon: FileText,
          classes:
            "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
        },
        {
          label: "Outstanding",
          value: formatInvoiceCurrency(
            statistics.outstandingValue,
            statistics.currency
          ),
          description: `${statistics.sentInvoices.toLocaleString(
            "en-NG"
          )} active invoices`,
          icon: Clock3,
          classes:
            "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        },
        {
          label: "Paid",
          value: formatInvoiceCurrency(
            statistics.paidValue,
            statistics.currency
          ),
          description: `${statistics.paidInvoices.toLocaleString(
            "en-NG"
          )} completed invoices`,
          icon: CheckCircle2,
          classes:
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        },
        {
          label: "Overdue",
          value: formatInvoiceCurrency(
            statistics.overdueValue,
            statistics.currency
          ),
          description: `${statistics.overdueInvoices.toLocaleString(
            "en-NG"
          )} overdue invoices`,
          icon: AlertTriangle,
          classes:
            "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
        },
      ]
    : [];

  return (
    <>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
              Invoice Management
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Create, issue, track, and manage customer invoices.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadInvoices()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setBuilderOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <Plus size={17} />
              Create invoice
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <article
                key={metric.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${metric.classes}`}
                >
                  <Icon size={21} />
                </div>

                <p className="mt-4 text-xl font-bold text-slate-950 dark:text-white">
                  {metric.value}
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {metric.label}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {metric.description}
                </p>
              </article>
            );
          })}

          {loading &&
            metrics.length === 0 &&
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              />
            ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_130px_150px_150px_auto]">
            <label className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Search invoice, customer, email, or PO..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <select
              value={filters.status}
              onChange={(event) =>
                updateFilter(
                  "status",
                  event.target.value as InvoiceStatus | "all"
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All statuses</option>

              {INVOICE_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              maxLength={3}
              value={filters.currency}
              onChange={(event) =>
                updateFilter("currency", event.target.value.toUpperCase())
              }
              placeholder="Currency"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />

            <div className="flex w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
              <input
                type="date"
                value={filters.issueDateFrom}
                onChange={(event) =>
                  updateFilter("issueDateFrom", event.target.value)
                }
                className="block w-full min-w-0 border-0 bg-transparent p-0 text-sm text-slate-700 outline-none dark:text-slate-200"
                aria-label="Issue date from"
              />
            </div>

            <div className="flex w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
              <input
                type="date"
                value={filters.issueDateTo}
                onChange={(event) =>
                  updateFilter("issueDateTo", event.target.value)
                }
                className="block w-full min-w-0 border-0 bg-transparent p-0 text-sm text-slate-700 outline-none dark:text-slate-200"
                aria-label="Issue date to"
              />
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
              <input
                type="checkbox"
                checked={filters.includeArchived}
                onChange={(event) =>
                  updateFilter("includeArchived", event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              Archived
            </label>
          </div>
        </div>

        <InvoiceTable
          invoices={invoices}
          loading={loading}
          sortBy={sortBy}
          sortDirection={sortDirection}
          busyInvoiceId={busyInvoiceId}
          onSort={handleSort}
          onView={(invoice) => void handleView(invoice)}
          onMarkSent={(invoice) => void handleMarkSent(invoice)}
          onCancel={(invoice) => void handleCancel(invoice)}
          onArchive={(invoice) => void handleArchive(invoice)}
          onRestore={(invoice) => void handleRestore(invoice)}
          onDeleteDraft={(invoice) => void handleDeleteDraft(invoice)}
        />

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {firstVisibleRecord}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {lastVisibleRecord}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {total}
            </span>{" "}
            invoices
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((currentPage) => currentPage - 1)}
              disabled={loading || page <= 1}
              className="rounded-xl border border-slate-200 px-2 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-2 font-semibold text-slate-700 dark:text-slate-200">
              {page} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={loading || page >= totalPages}
              className="rounded-xl border border-slate-200 px-2 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <InvoiceBuilder
        open={builderOpen}
        submitting={creatingInvoice}
        onClose={() => setBuilderOpen(false)}
        onSubmit={handleCreateInvoice}
      />

      <InvoiceDetailsModal
        invoice={selectedInvoice}
        loading={loadingSelectedInvoice}
        busyInvoiceId={busyInvoiceId}
        onClose={() => setSelectedInvoice(null)}
        onEdit={(invoice) => void handleEditInvoice(invoice)}
        onMarkSent={(invoice) => void handleMarkSent(invoice)}
        onCancel={(invoice) => void handleCancel(invoice)}
        onArchive={(invoice) => void handleArchive(invoice)}
        onRestore={(invoice) => void handleRestore(invoice)}
        onDeleteDraft={(invoice) => void handleDeleteDraft(invoice)}
      />
    </>
  );
}
