import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  acceptQuotation,
  archiveQuotation,
  createQuotation,
  getQuotationById,
  getQuotationStatistics,
  listQuotations,
  markQuotationSent,
  rejectQuotation,
  restoreQuotation,
  updateDraftQuotation,
  convertQuotationToInvoice,
} from "../../../../lib/quotations";
import type {
  CreateQuotationInput,
  Quotation,
  QuotationFilters,
  QuotationStatistics,
  QuotationStatus,
} from "../../../../types/quotation";
import { formatQuotationCurrency } from "../../../../utils/quotation";
import QuotationBuilder from "./QuotationBuilder";
import QuotationTable from "./QuotationTable";
import QuotationDetails from "./QuotationDetails";

const EMPTY_STATISTICS: QuotationStatistics = {
  totalQuotations: 0,
  draftQuotations: 0,
  sentQuotations: 0,
  acceptedQuotations: 0,
  rejectedQuotations: 0,
  expiredQuotations: 0,
  totalQuotedValue: 0,
  acceptedValue: 0,
  pendingValue: 0,
  currency: "NGN",
};

/* Displays one quotation dashboard statistic. */
function StatisticCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: typeof FileText;
}) {
  return (
    <article className="rounded-2xl border border-box-border bg-box-bg/70 p-4 shadow-sm backdrop-blur-xl sm:p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon size={18} />
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </p>

      <p className="mt-1 break-words text-xl font-bold text-heading">{value}</p>

      <p className="mt-1 text-xs text-text-muted">{helper}</p>
    </article>
  );
}

/* Displays and manages the Quotation dashboard. */
export default function QuotationDashboard() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  const [statistics, setStatistics] =
    useState<QuotationStatistics>(EMPTY_STATISTICS);

  const [filters, setFilters] = useState<QuotationFilters>({
    search: "",
    status: "all",
    currency: "NGN",
    includeArchived: false,
  });

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [processingQuotationId, setProcessingQuotationId] = useState<
    string | null
  >(null);

  const [builderOpen, setBuilderOpen] = useState(false);

  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(
    null
  );

  const [errorMessage, setErrorMessage] = useState("");

  const [detailsQuotation, setDetailsQuotation] = useState<Quotation | null>(
    null
  );

  const [detailsOpen, setDetailsOpen] = useState(false);

  /* Loads quotations and dashboard statistics. */
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [listResult, statisticsResult] = await Promise.all([
        listQuotations({
          page,
          pageSize,
          filters,
        }),

        getQuotationStatistics(filters.currency || "NGN"),
      ]);

      setQuotations(listResult.quotations);

      setTotal(listResult.total);

      setTotalPages(listResult.totalPages);

      setStatistics(statisticsResult);
    } catch (error) {
      console.error("Failed to load quotations:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Quotations could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  /* Reloads dashboard data after filters or pagination change. */
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDashboard]);

  /* Updates one quotation filter and returns to page one. */
  function updateFilter<Key extends keyof QuotationFilters>(
    key: Key,
    value: QuotationFilters[Key]
  ) {
    setPage(1);

    setFilters((currentFilters: QuotationFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  /* Opens a fresh quotation Builder. */
  function handleCreateQuotation() {
    setSelectedQuotation(null);

    setBuilderOpen(true);
  }

  /* Converts one accepted quotation into a draft invoice. */
  async function handleConvertQuotationToInvoice(quotation: Quotation) {
    const confirmed = window.confirm(
      `Convert ${quotation.quotation_number} to a draft invoice?`
    );

    if (!confirmed) {
      return;
    }

    setProcessingQuotationId(quotation.id);

    try {
      const invoice = await convertQuotationToInvoice(quotation.id);

      toast.success(
        `${quotation.quotation_number} converted to ${invoice.invoice_number}.`
      );

      setDetailsOpen(false);

      setDetailsQuotation(null);

      await loadDashboard();

      window.location.href = "/admin/finance/invoices";
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Quotation could not be converted to an invoice."
      );
    } finally {
      setProcessingQuotationId(null);
    }
  }

  /* Loads a complete draft quotation before opening the Builder. */
  async function handleEditQuotation(quotation: Quotation) {
    try {
      setProcessingQuotationId(quotation.id);

      const fullQuotation = await getQuotationById(quotation.id);

      setSelectedQuotation(fullQuotation);

      setBuilderOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Quotation could not be opened."
      );
    } finally {
      setProcessingQuotationId(null);
    }
  }

  /* Handles both quotation creation and draft replacement. */
  async function handleSubmitQuotation(input: CreateQuotationInput) {
    setSubmitting(true);

    try {
      if (selectedQuotation) {
        await updateDraftQuotation(selectedQuotation.id, input);

        toast.success("Quotation updated successfully.");
      } else {
        await createQuotation(input);

        toast.success("Quotation created successfully.");
      }

      setBuilderOpen(false);

      setSelectedQuotation(null);

      await loadDashboard();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Quotation could not be saved."
      );

      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  /* Marks one draft quotation as sent. */
  async function handleSendQuotation(quotation: Quotation) {
    setProcessingQuotationId(quotation.id);

    try {
      await markQuotationSent(quotation.id);

      toast.success("Quotation marked as sent.");

      await loadDashboard();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Quotation could not be marked as sent."
      );
    } finally {
      setProcessingQuotationId(null);
    }
  }

  /* Marks one quotation as accepted. */
  async function handleAcceptQuotation(quotation: Quotation) {
    const confirmed = window.confirm(
      `Mark ${quotation.quotation_number} as accepted?`
    );

    if (!confirmed) {
      return;
    }

    setProcessingQuotationId(quotation.id);

    try {
      await acceptQuotation(quotation.id);

      toast.success("Quotation accepted.");

      await loadDashboard();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Quotation could not be accepted."
      );
    } finally {
      setProcessingQuotationId(null);
    }
  }

  /* Marks one quotation as rejected. */
  async function handleRejectQuotation(quotation: Quotation) {
    const confirmed = window.confirm(
      `Mark ${quotation.quotation_number} as rejected?`
    );

    if (!confirmed) {
      return;
    }

    setProcessingQuotationId(quotation.id);

    try {
      await rejectQuotation(quotation.id);

      toast.success("Quotation rejected.");

      await loadDashboard();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Quotation could not be rejected."
      );
    } finally {
      setProcessingQuotationId(null);
    }
  }

  /* Archives one quotation after confirmation. */
  async function handleArchiveQuotation(quotation: Quotation) {
    const confirmed = window.confirm(`Archive ${quotation.quotation_number}?`);

    if (!confirmed) {
      return;
    }

    setProcessingQuotationId(quotation.id);

    try {
      await archiveQuotation(quotation.id);

      toast.success("Quotation archived.");

      await loadDashboard();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Quotation could not be archived."
      );
    } finally {
      setProcessingQuotationId(null);
    }
  }

  /* Restores one archived quotation. */
  async function handleRestoreQuotation(quotation: Quotation) {
    setProcessingQuotationId(quotation.id);

    try {
      await restoreQuotation(quotation.id);

      toast.success("Quotation restored.");

      await loadDashboard();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Quotation could not be restored."
      );
    } finally {
      setProcessingQuotationId(null);
    }
  }

  /* Loads the complete quotation and opens the details modal. */
  async function handleViewQuotation(quotation: Quotation) {
    try {
      setProcessingQuotationId(quotation.id);

      const fullQuotation = await getQuotationById(quotation.id);

      setDetailsQuotation(fullQuotation);

      setDetailsOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Quotation could not be opened."
      );
    } finally {
      setProcessingQuotationId(null);
    }
  }

  return (
    <section className="min-w-0 space-y-6 p-4 sm:p-3">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-heading">
            Quotations
          </h1>

          <p className="mt-2 max-w-lg text-xs leading-6 text-text-muted">
            Prepare commercial proposals, track their outcomes, and convert
            successful opportunities into billable work.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-box-border bg-body px-4 py-2.5 text-sm font-semibold text-heading transition hover:text-primary disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleCreateQuotation}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-2 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus size={16} />
            New Quotation
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard
          title="Total Quotations"
          value={String(statistics.totalQuotations)}
          helper={`${statistics.draftQuotations} drafts`}
          icon={FileText}
        />

        <StatisticCard
          title="Pending"
          value={formatQuotationCurrency(
            statistics.pendingValue,
            statistics.currency
          )}
          helper={`${statistics.sentQuotations} sent quotations`}
          icon={Clock3}
        />

        <StatisticCard
          title="Accepted"
          value={formatQuotationCurrency(
            statistics.acceptedValue,
            statistics.currency
          )}
          helper={`${statistics.acceptedQuotations} accepted`}
          icon={CheckCircle2}
        />

        <StatisticCard
          title="Total Quoted"
          value={formatQuotationCurrency(
            statistics.totalQuotedValue,
            statistics.currency
          )}
          helper="All active quotation value"
          icon={CircleDollarSign}
        />
      </div>

      <section className="rounded-2xl border border-box-border bg-box-bg/70 p-4 shadow-sm backdrop-blur-xl">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />

            <input
              type="search"
              value={filters.search ?? ""}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search quotation, Client, company or subject..."
              className="w-full rounded-xl border border-box-border bg-body py-2.5 pl-10 pr-4 text-sm text-heading outline-none transition focus:border-primary"
            />
          </label>

          <select
            value={filters.status ?? "all"}
            onChange={(event) =>
              updateFilter(
                "status",
                event.target.value as QuotationStatus | "all"
              )
            }
            className="rounded-xl border border-box-border bg-body px-3 py-2.5 text-sm text-heading outline-none focus:border-primary"
          >
            <option value="all">All statuses</option>

            <option value="draft">Draft</option>

            <option value="sent">Sent</option>

            <option value="accepted">Accepted</option>

            <option value="rejected">Rejected</option>

            <option value="expired">Expired</option>

            <option value="cancelled">Cancelled</option>
          </select>

          <label className="flex items-center gap-2 rounded-xl border border-box-border bg-body px-3 py-2.5 text-sm text-heading">
            <input
              type="checkbox"
              checked={Boolean(filters.includeArchived)}
              onChange={(event) =>
                updateFilter("includeArchived", event.target.checked)
              }
            />
            Archived
          </label>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-600 dark:text-red-300">
          {errorMessage}
        </div>
      ) : loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-box-border bg-box-bg/70">
          <RefreshCw className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : quotations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-box-border bg-box-bg/40 px-5 py-16 text-center">
          <FileText className="mx-auto h-9 w-9 text-text-muted" />

          <h2 className="mt-4 text-lg font-semibold text-heading">
            No quotations found
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
            Create your first commercial quotation or adjust the current
            filters.
          </p>

          <button
            type="button"
            onClick={handleCreateQuotation}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            New Quotation
          </button>
        </div>
      ) : (
        <QuotationTable
          quotations={quotations}
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          archivedView={Boolean(filters.includeArchived)}
          processingQuotationId={processingQuotationId}
          onView={handleViewQuotation}
          onEdit={(quotation) => void handleEditQuotation(quotation)}
          onSend={(quotation) => void handleSendQuotation(quotation)}
          onAccept={(quotation) => void handleAcceptQuotation(quotation)}
          onReject={(quotation) => void handleRejectQuotation(quotation)}
          onArchive={(quotation) => void handleArchiveQuotation(quotation)}
          onRestore={(quotation) => void handleRestoreQuotation(quotation)}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPage(1);

            setPageSize(nextPageSize);
          }}
        />
      )}

      <QuotationBuilder
        open={builderOpen}
        submitting={submitting}
        quotation={selectedQuotation}
        onClose={() => {
          setBuilderOpen(false);

          setSelectedQuotation(null);
        }}
        onSubmit={handleSubmitQuotation}
      />

      <QuotationDetails
        open={detailsOpen}
        quotation={detailsQuotation}
        processing={processingQuotationId === detailsQuotation?.id}
        onClose={() => {
          setDetailsOpen(false);

          setDetailsQuotation(null);
        }}
        onSend={(quotation) => void handleSendQuotation(quotation)}
        onAccept={(quotation) => void handleAcceptQuotation(quotation)}
        onReject={(quotation) => void handleRejectQuotation(quotation)}
        onConvertToInvoice={(quotation) =>
          void handleConvertQuotationToInvoice(quotation)
        }
      />
    </section>
  );
}
