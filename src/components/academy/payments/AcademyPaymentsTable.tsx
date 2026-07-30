import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  Eye,
  Filter,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { toast } from "react-toastify";
import {
  exportAcademyPayments,
  getAcademyPaymentStatistics,
  listAcademyPaymentProviders,
  listAcademyPayments,
  listAcademyProgramsForPaymentFilters,
  markAcademyPaymentCancelled,
  markAcademyPaymentFailed,
  markAcademyPaymentPaid,
  markAcademyPaymentRefunded,
  updateAcademyPayment,
  type AcademyPaymentFilters,
  type AcademyPaymentRecord,
  type AcademyPaymentSortField,
  type AcademyPaymentStatistics,
} from "../../../lib/academyPayments";
import type { AcademyPaymentStatus } from "../../../types/academy";

interface AcademyProgramFilterOption {
  id: string;
  title: string;
  slug: string;
  code: string | null;
  status: string;
}

interface AcademyPaymentFilterState {
  search: string;
  programId: string;
  paymentStatus: AcademyPaymentStatus | "all";
  paymentProvider: string;
  dateFrom: string;
  dateTo: string;
}

interface PaymentMetric {
  label: string;
  value: string;
  description: string;
  icon: ComponentType<{
    size?: number;
    className?: string;
  }>;
  iconClasses: string;
}

type SortDirection = "asc" | "desc";

const PAGE_SIZE = 10;

const DEFAULT_FILTERS: AcademyPaymentFilterState = {
  search: "",
  programId: "",
  paymentStatus: "all",
  paymentProvider: "",
  dateFrom: "",
  dateTo: "",
};

/**
 * Format a monetary value using the supplied currency.
 */
function formatCurrency(amount: number | null, currency = "NGN") {
  if (amount === null || !Number.isFinite(Number(amount))) {
    return "Not available";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toLocaleString("en-US")}`;
  }
}

/**
 * Format a database date for compact display.
 */
function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Format a database date with its time.
 */
function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * Convert an underscore-separated value into a readable label.
 */
function formatStatus(value: string) {
  return value
    .split("_")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Return the payment amount best suited for display.
 */
function getEffectivePaymentAmount(payment: AcademyPaymentRecord) {
  return payment.amount_paid ?? payment.amount_expected ?? null;
}

/**
 * Return the visual classes for a payment status badge.
 */
function getPaymentStatusClasses(status: AcademyPaymentStatus) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700";

    case "processing":
      return "bg-blue-100 text-blue-700";

    case "failed":
      return "bg-red-100 text-red-700";

    case "refunded":
      return "bg-purple-100 text-purple-700";

    case "cancelled":
      return "bg-slate-200 text-slate-700";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

/**
 * Escape a value before placing it into a CSV file.
 */
function escapeCsvCell(value: unknown) {
  const normalizedValue =
    value === null || value === undefined ? "" : String(value);

  return `"${normalizedValue.replace(/"/g, '""')}"`;
}

/**
 * Download Academy payment records as a CSV file.
 */
function downloadPaymentsCsv(payments: AcademyPaymentRecord[]) {
  const headers = [
    "Registration ID",
    "Learner",
    "Email",
    "Phone",
    "Program",
    "Program Code",
    "Payment Status",
    "Amount Expected",
    "Amount Paid",
    "Currency",
    "Payment Provider",
    "Payment Reference",
    "Registration Status",
    "Paid At",
    "Created At",
    "Updated At",
  ];

  const rows = payments.map((payment) => [
    payment.id,
    `${payment.first_name} ${payment.last_name}`,
    payment.email,
    payment.phone,
    payment.program?.title,
    payment.program?.code,
    payment.payment_status,
    payment.amount_expected,
    payment.amount_paid,
    payment.currency,
    payment.payment_provider,
    payment.payment_reference,
    payment.registration_status,
    payment.paid_at,
    payment.created_at,
    payment.updated_at,
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = `academy-payments-${
    new Date().toISOString().split("T")[0]
  }.csv`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(objectUrl);
}

/**
 * Display one payment summary metric.
 */
function PaymentMetricCard({ metric }: { metric: PaymentMetric }) {
  const Icon = metric.icon;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${metric.iconClasses}`}
      >
        <Icon size={21} />
      </div>

      <p className="mt-4 text-2xl font-bold text-slate-950">{metric.value}</p>

      <p className="mt-1 text-sm font-semibold text-slate-700">
        {metric.label}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {metric.description}
      </p>
    </article>
  );
}

/**
 * Display one reusable details row inside the payment modal.
 */
function PaymentDetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-200 py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <span className="text-sm text-slate-500">{label}</span>

      <span className="max-w-md break-words text-sm font-semibold text-slate-900 sm:text-right">
        {value || "Not available"}
      </span>
    </div>
  );
}

/**
 * Display and manage Academy payment transactions.
 */
export default function AcademyPaymentsTable() {
  const [payments, setPayments] = useState<AcademyPaymentRecord[]>([]);

  const [statistics, setStatistics] = useState<AcademyPaymentStatistics | null>(
    null
  );

  const [programOptions, setProgramOptions] = useState<
    AcademyProgramFilterOption[]
  >([]);

  const [providerOptions, setProviderOptions] = useState<string[]>([]);

  const [filters, setFilters] =
    useState<AcademyPaymentFilterState>(DEFAULT_FILTERS);

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  const [sortBy, setSortBy] = useState<AcademyPaymentSortField>("created_at");

  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [loading, setLoading] = useState(true);

  const [exporting, setExporting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [filtersVisible, setFiltersVisible] = useState(false);

  const [selectedPayment, setSelectedPayment] =
    useState<AcademyPaymentRecord | null>(null);

  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(
    null
  );

  const [manualAmountPaid, setManualAmountPaid] = useState("");

  const [manualReference, setManualReference] = useState("");

  const [manualProvider, setManualProvider] = useState("");

  /**
   * Convert the component filter state into the service filter shape.
   */
  const serviceFilters = useMemo<AcademyPaymentFilters>(
    () => ({
      search: filters.search.trim() || undefined,

      programId: filters.programId || undefined,

      paymentStatus: filters.paymentStatus,

      paymentProvider: filters.paymentProvider || undefined,

      dateFrom: filters.dateFrom || undefined,

      dateTo: filters.dateTo || undefined,
    }),
    [filters]
  );

  /**
   * Load the current page of payments and its statistics.
   */
  const loadPayments = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [paymentResult, statisticResult] = await Promise.all([
        listAcademyPayments({
          page,
          pageSize: PAGE_SIZE,
          filters: serviceFilters,
          sortBy,
          sortDirection,
        }),

        getAcademyPaymentStatistics(serviceFilters),
      ]);

      setPayments(paymentResult.payments);
      setTotal(paymentResult.total);
      setTotalPages(paymentResult.totalPages);
      setStatistics(statisticResult);

      if (page > paymentResult.totalPages) {
        setPage(paymentResult.totalPages);
      }
    } catch (error) {
      console.error("Failed to load Academy payments:", error);

      setErrorMessage("The Academy payments could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, serviceFilters, sortBy, sortDirection]);

  /**
   * Load filter dropdown options.
   */
  const loadFilterOptions = useCallback(async () => {
    try {
      const [programs, providers] = await Promise.all([
        listAcademyProgramsForPaymentFilters(),
        listAcademyPaymentProviders(),
      ]);

      setProgramOptions(programs as AcademyProgramFilterOption[]);

      setProviderOptions(providers);
    } catch (error) {
      console.error("Failed to load payment filters:", error);

      toast.error("Some payment filters could not be loaded.");
    }
  }, []);

  useEffect(() => {
    void loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPayments();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadPayments]);

  /**
   * Synchronize editable modal fields with the selected payment.
   */
  useEffect(() => {
    if (!selectedPayment) {
      setManualAmountPaid("");
      setManualReference("");
      setManualProvider("");
      return;
    }

    setManualAmountPaid(selectedPayment.amount_paid?.toString() ?? "");

    setManualReference(selectedPayment.payment_reference ?? "");

    setManualProvider(selectedPayment.payment_provider ?? "");
  }, [selectedPayment]);

  /**
   * Update one payment filter and reset pagination.
   */
  function updateFilter<Key extends keyof AcademyPaymentFilterState>(
    field: Key,
    value: AcademyPaymentFilterState[Key]
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));

    setPage(1);
  }

  /**
   * Reset every active payment filter.
   */
  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  /**
   * Change the active payment sorting field.
   */
  function handleSort(field: AcademyPaymentSortField) {
    if (sortBy === field) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc"
      );

      return;
    }

    setSortBy(field);
    setSortDirection("asc");
    setPage(1);
  }

  /**
   * Return the icon for one sortable column.
   */
  function getSortIcon(field: AcademyPaymentSortField) {
    if (sortBy !== field) {
      return <ChevronDown className="h-3.5 w-3.5 text-slate-300" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-primary" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-primary" />
    );
  }

  /**
   * Replace an updated payment in table and modal state.
   */
  function replacePayment(updatedPayment: AcademyPaymentRecord) {
    setPayments((currentPayments) =>
      currentPayments.map((payment) =>
        payment.id === updatedPayment.id ? updatedPayment : payment
      )
    );

    setSelectedPayment((currentPayment) =>
      currentPayment?.id === updatedPayment.id ? updatedPayment : currentPayment
    );
  }

  /**
   * Mark a transaction with a new payment status.
   */
  async function handlePaymentStatusAction(
    payment: AcademyPaymentRecord,
    status: "paid" | "failed" | "refunded" | "cancelled"
  ) {
    if (updatingPaymentId) {
      return;
    }

    if (status === "refunded" && payment.payment_status !== "paid") {
      toast.error("Only paid transactions can be marked as refunded.");

      return;
    }

    if (status === "refunded") {
      const confirmed = window.confirm(
        "This only records the refund status in CloudTweak. Confirm that the actual refund has already been completed in Paystack."
      );

      if (!confirmed) {
        return;
      }
    }

    setUpdatingPaymentId(payment.id);

    try {
      let updatedPayment: AcademyPaymentRecord;

      switch (status) {
        case "paid":
          updatedPayment = await markAcademyPaymentPaid(payment);
          break;

        case "failed":
          updatedPayment = await markAcademyPaymentFailed(payment.id);
          break;

        case "refunded":
          updatedPayment = await markAcademyPaymentRefunded(payment.id);
          break;

        case "cancelled":
          updatedPayment = await markAcademyPaymentCancelled(payment.id);
          break;
      }

      replacePayment(updatedPayment);

      toast.success(`Payment status updated to ${formatStatus(status)}.`);

      await loadPayments();
    } catch (error) {
      console.error("Failed to update Academy payment:", error);

      toast.error("The payment status could not be updated.");
    } finally {
      setUpdatingPaymentId(null);
    }
  }

  /**
   * Save editable manual payment details.
   */
  async function handleSavePaymentDetails() {
    if (!selectedPayment || updatingPaymentId) {
      return;
    }

    const normalizedAmount = manualAmountPaid.trim()
      ? Number(manualAmountPaid)
      : null;

    if (
      normalizedAmount !== null &&
      (!Number.isFinite(normalizedAmount) || normalizedAmount < 0)
    ) {
      toast.error("Enter a valid amount paid.");

      return;
    }

    setUpdatingPaymentId(selectedPayment.id);

    try {
      const updatedPayment = await updateAcademyPayment(selectedPayment.id, {
        amount_paid: normalizedAmount,

        payment_reference: manualReference.trim() || null,

        payment_provider: manualProvider.trim() || null,
      });

      replacePayment(updatedPayment);

      toast.success("Payment details updated.");

      await loadPayments();
    } catch (error) {
      console.error("Failed to save payment details:", error);

      toast.error("The payment details could not be saved.");
    } finally {
      setUpdatingPaymentId(null);
    }
  }

  /**
   * Export payment records matching the current filters.
   */
  async function handleExport() {
    if (exporting) {
      return;
    }

    setExporting(true);

    try {
      const exportedPayments = await exportAcademyPayments(serviceFilters);

      if (exportedPayments.length === 0) {
        toast.info("There are no matching payments to export.");

        return;
      }

      downloadPaymentsCsv(exportedPayments);

      toast.success(`${exportedPayments.length} payments exported.`);
    } catch (error) {
      console.error("Failed to export Academy payments:", error);

      toast.error("The payment export could not be created.");
    } finally {
      setExporting(false);
    }
  }

  const activeFilterCount = useMemo(() => {
    return [
      filters.search,
      filters.programId,
      filters.paymentStatus !== "all" ? filters.paymentStatus : "",
      filters.paymentProvider,
      filters.dateFrom,
      filters.dateTo,
    ].filter(Boolean).length;
  }, [filters]);

  const metrics = useMemo<PaymentMetric[]>(() => {
    if (!statistics) {
      return [];
    }

    return [
      {
        label: "Total Revenue",
        value: formatCurrency(statistics.totalRevenue, statistics.currency),
        description: `${statistics.paidPayments} successful payments`,
        icon: CircleDollarSign,
        iconClasses: "bg-emerald-100 text-emerald-700",
      },
      {
        label: "Pending Value",
        value: formatCurrency(statistics.pendingValue, statistics.currency),
        description: `${statistics.pendingPayments} pending or processing`,
        icon: WalletCards,
        iconClasses: "bg-amber-100 text-amber-700",
      },
      {
        label: "Failed Payments",
        value: statistics.failedPayments.toLocaleString(),
        description: "Transactions requiring review",
        icon: XCircle,
        iconClasses: "bg-red-100 text-red-700",
      },
      {
        label: "Refunded Value",
        value: formatCurrency(statistics.refundedValue, statistics.currency),
        description: `${statistics.refundedPayments} refunded transactions`,
        icon: RotateCcw,
        iconClasses: "bg-purple-100 text-purple-700",
      },
    ];
  }, [statistics]);

  const firstVisibleRecord = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const lastVisibleRecord = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <a
            href="/admin/academy"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Academy dashboard
          </a>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Financial Management
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Academy Payments
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Monitor transactions, review payment references, export records and
            manage administrative payment statuses.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void loadPayments();
            }}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              void handleExport();
            }}
            disabled={exporting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}

            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <PaymentMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={filters.search}
              onChange={(event) => {
                updateFilter("search", event.target.value);
              }}
              placeholder="Search learner, email, phone or payment reference..."
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setFiltersVisible((currentValue) => !currentValue);
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          ) : null}
        </div>

        {filtersVisible ? (
          <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <label
                htmlFor="payment-program-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Program
              </label>

              <select
                id="payment-program-filter"
                value={filters.programId}
                onChange={(event) => {
                  updateFilter("programId", event.target.value);
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="">All programs</option>

                {programOptions.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="payment-status-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Payment status
              </label>

              <select
                id="payment-status-filter"
                value={filters.paymentStatus}
                onChange={(event) => {
                  updateFilter(
                    "paymentStatus",
                    event.target.value as AcademyPaymentStatus | "all"
                  );
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="payment-provider-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Provider
              </label>

              <select
                id="payment-provider-filter"
                value={filters.paymentProvider}
                onChange={(event) => {
                  updateFilter("paymentProvider", event.target.value);
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="">All providers</option>

                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {formatStatus(provider)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="payment-date-from"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Date from
              </label>

              <input
                id="payment-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(event) => {
                  updateFilter("dateFrom", event.target.value);
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div>
              <label
                htmlFor="payment-date-to"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Date to
              </label>

              <input
                id="payment-date-to"
                type="date"
                value={filters.dateTo}
                onChange={(event) => {
                  updateFilter("dateTo", event.target.value);
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {errorMessage ? (
          <div className="border-b border-red-200 bg-red-50 px-6 py-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      handleSort("first_name");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Learner
                    {getSortIcon("first_name")}
                  </button>
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Program
                </th>

                <th className="px-5 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      handleSort("amount_paid");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Amount
                    {getSortIcon("amount_paid")}
                  </button>
                </th>

                <th className="px-5 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      handleSort("payment_status");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Status
                    {getSortIcon("payment_status")}
                  </button>
                </th>

                <th className="px-5 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      handleSort("paid_at");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Paid
                    {getSortIcon("paid_at")}
                  </button>
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-primary" />

                    <p className="mt-3 text-sm text-slate-500">
                      Loading payments...
                    </p>
                  </td>
                </tr>
              ) : payments.length > 0 ? (
                payments.map((payment) => (
                  <tr key={payment.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {payment.first_name} {payment.last_name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {payment.email}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[240px] font-medium text-slate-800">
                        {payment.program?.title ?? "Unknown program"}
                      </p>

                      {payment.program?.code ? (
                        <p className="mt-1 text-xs text-slate-400">
                          {payment.program.code}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(
                          getEffectivePaymentAmount(payment),
                          payment.currency
                        )}
                      </p>

                      <p className="mt-1 max-w-[190px] truncate text-xs text-slate-400">
                        {payment.payment_reference ?? "No reference"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentStatusClasses(
                          payment.payment_status
                        )}`}
                      >
                        {formatStatus(payment.payment_status)}
                      </span>

                      <p className="mt-2 text-xs capitalize text-slate-500">
                        {payment.payment_provider ?? "No provider"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {payment.paid_at
                        ? formatDate(payment.paid_at)
                        : "Not paid"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPayment(payment);
                          }}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-50 hover:text-primary"
                          aria-label={`View payment for ${payment.first_name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <WalletCards className="mx-auto h-8 w-8 text-slate-400" />

                    <h2 className="mt-4 text-lg font-bold text-slate-800">
                      No payments found
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      Adjust the filters or wait for new Academy transactions.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {firstVisibleRecord}–{lastVisibleRecord} of{" "}
            {total.toLocaleString()}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPage((currentPage) => Math.max(1, currentPage - 1));
              }}
              disabled={page <= 1 || loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <span className="min-w-24 text-center text-sm font-semibold text-slate-700">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => {
                setPage((currentPage) => Math.min(totalPages, currentPage + 1));
              }}
              disabled={page >= totalPages || loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </section>

      {selectedPayment ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  Payment Details
                </p>

                <h2
                  id="payment-modal-title"
                  className="mt-2 text-2xl font-bold text-slate-950"
                >
                  {selectedPayment.first_name} {selectedPayment.last_name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedPayment.program?.title ?? "Unknown Academy program"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPayment(null);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close payment details"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid gap-6 p-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900">Transaction</h3>

                <div className="mt-3">
                  <PaymentDetailRow
                    label="Payment status"
                    value={
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentStatusClasses(
                          selectedPayment.payment_status
                        )}`}
                      >
                        {formatStatus(selectedPayment.payment_status)}
                      </span>
                    }
                  />

                  <PaymentDetailRow
                    label="Amount expected"
                    value={formatCurrency(
                      selectedPayment.amount_expected,
                      selectedPayment.currency
                    )}
                  />

                  <PaymentDetailRow
                    label="Amount paid"
                    value={formatCurrency(
                      selectedPayment.amount_paid,
                      selectedPayment.currency
                    )}
                  />

                  <PaymentDetailRow
                    label="Currency"
                    value={selectedPayment.currency}
                  />

                  <PaymentDetailRow
                    label="Reference"
                    value={selectedPayment.payment_reference}
                  />

                  <PaymentDetailRow
                    label="Provider"
                    value={selectedPayment.payment_provider}
                  />

                  <PaymentDetailRow
                    label="Paid at"
                    value={formatDateTime(selectedPayment.paid_at)}
                  />

                  <PaymentDetailRow
                    label="Created"
                    value={formatDateTime(selectedPayment.created_at)}
                  />

                  <PaymentDetailRow
                    label="Last updated"
                    value={formatDateTime(selectedPayment.updated_at)}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900">
                  Learner and Program
                </h3>

                <div className="mt-3">
                  <PaymentDetailRow
                    label="Learner"
                    value={`${selectedPayment.first_name} ${selectedPayment.last_name}`}
                  />

                  <PaymentDetailRow
                    label="Email"
                    value={selectedPayment.email}
                  />

                  <PaymentDetailRow
                    label="Phone"
                    value={selectedPayment.phone}
                  />

                  <PaymentDetailRow
                    label="Program"
                    value={selectedPayment.program?.title}
                  />

                  <PaymentDetailRow
                    label="Program code"
                    value={selectedPayment.program?.code}
                  />

                  <PaymentDetailRow
                    label="Registration status"
                    value={formatStatus(selectedPayment.registration_status)}
                  />

                  <PaymentDetailRow
                    label="Registration ID"
                    value={selectedPayment.id}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5 lg:col-span-2">
                <h3 className="font-bold text-slate-900">
                  Edit Payment Details
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Use this only to correct administrative records. Paystack
                  remains the source of truth for online payment transactions.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div>
                    <label
                      htmlFor="manual-amount-paid"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Amount paid
                    </label>

                    <input
                      id="manual-amount-paid"
                      type="number"
                      min="0"
                      step="0.01"
                      value={manualAmountPaid}
                      onChange={(event) => {
                        setManualAmountPaid(event.target.value);
                      }}
                      disabled={updatingPaymentId === selectedPayment.id}
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="manual-payment-reference"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Payment reference
                    </label>

                    <input
                      id="manual-payment-reference"
                      type="text"
                      value={manualReference}
                      onChange={(event) => {
                        setManualReference(event.target.value);
                      }}
                      disabled={updatingPaymentId === selectedPayment.id}
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="manual-payment-provider"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Payment provider
                    </label>

                    <input
                      id="manual-payment-provider"
                      type="text"
                      value={manualProvider}
                      onChange={(event) => {
                        setManualProvider(event.target.value);
                      }}
                      disabled={updatingPaymentId === selectedPayment.id}
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void handleSavePaymentDetails();
                  }}
                  disabled={updatingPaymentId === selectedPayment.id}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingPaymentId === selectedPayment.id ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ReceiptText className="h-4 w-4" />
                  )}
                  Save payment details
                </button>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5 lg:col-span-2">
                <h3 className="font-bold text-slate-900">
                  Payment Status Actions
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Marking a payment as paid will also activate the Academy
                  payment notification trigger.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => {
                      void handlePaymentStatusAction(selectedPayment, "paid");
                    }}
                    disabled={
                      updatingPaymentId === selectedPayment.id ||
                      selectedPayment.payment_status === "paid"
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark paid
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void handlePaymentStatusAction(selectedPayment, "failed");
                    }}
                    disabled={
                      updatingPaymentId === selectedPayment.id ||
                      selectedPayment.payment_status === "failed"
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Mark failed
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void handlePaymentStatusAction(
                        selectedPayment,
                        "refunded"
                      );
                    }}
                    disabled={
                      updatingPaymentId === selectedPayment.id ||
                      selectedPayment.payment_status !== "paid"
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Mark refunded
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void handlePaymentStatusAction(
                        selectedPayment,
                        "cancelled"
                      );
                    }}
                    disabled={
                      updatingPaymentId === selectedPayment.id ||
                      selectedPayment.payment_status === "cancelled"
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel payment
                  </button>
                </div>

                {updatingPaymentId === selectedPayment.id ? (
                  <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Updating payment...
                  </div>
                ) : null}
              </section>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <a
                href={`/admin/academy/registrations?registration=${selectedPayment.id}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-primary transition hover:bg-primary/5 sm:px-4"
              >
                View full registration
                <ArrowRight className="h-4 w-4" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setSelectedPayment(null);
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
