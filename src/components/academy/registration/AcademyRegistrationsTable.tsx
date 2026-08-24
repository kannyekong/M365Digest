import {
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
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  cancelAcademyRegistration,
  completeAcademyRegistration,
  confirmAcademyRegistration,
  deleteAcademyRegistration,
  enrollAcademyRegistration,
  exportAcademyRegistrations,
  listAcademyProgramsForRegistrationFilters,
  listAcademyRegistrations,
  updateAcademyRegistration,
  type AcademyRegistrationFilters,
  type AcademyRegistrationRecord,
} from "../../../lib/academyRegistrations";
import type {
  AcademyPaymentStatus,
  AcademyRegistrationStatus,
} from "../../../types/academy";
import AcademyModuleNav from "../../admin/academy/AcademyModuleNav";

interface AcademyProgramFilterOption {
  id: string;
  title: string;
  slug: string;
  code: string | null;
  status: string;
}

type RegistrationSortField =
  | "created_at"
  | "first_name"
  | "last_name"
  | "amount_paid"
  | "payment_status"
  | "registration_status";

type SortDirection = "asc" | "desc";

interface RegistrationFilterState {
  search: string;
  programId: string;
  registrationStatus: AcademyRegistrationStatus | "all";
  paymentStatus: AcademyPaymentStatus | "all";
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: RegistrationFilterState = {
  search: "",
  programId: "",
  registrationStatus: "all",
  paymentStatus: "all",
  dateFrom: "",
  dateTo: "",
};

const PAGE_SIZE = 10;

/**
 * Format a database date for the registration table.
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
 * Format a database date and time for detailed registration information.
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
 * Format a monetary value using the registration currency.
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
 * Convert an underscore-separated status into a readable label.
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
 * Return the visual classes for a registration status.
 */
function getRegistrationStatusClasses(status: AcademyRegistrationStatus) {
  switch (status) {
    case "confirmed":
      return "bg-blue-100 text-blue-700";

    case "enrolled":
      return "bg-purple-100 text-purple-700";

    case "completed":
      return "bg-emerald-100 text-emerald-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

/**
 * Return the visual classes for a payment status.
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
 * Escape a CSV cell and preserve commas, quotes and line breaks.
 */
function escapeCsvCell(value: unknown) {
  const normalizedValue =
    value === null || value === undefined ? "" : String(value);

  return `"${normalizedValue.replace(/"/g, '""')}"`;
}

/**
 * Download registration records as a CSV file.
 */
function downloadRegistrationsCsv(registrations: AcademyRegistrationRecord[]) {
  const headers = [
    "Registration ID",
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Country",
    "State",
    "City",
    "Program",
    "Program Code",
    "Registration Status",
    "Payment Status",
    "Amount Expected",
    "Amount Paid",
    "Currency",
    "Payment Reference",
    "Payment Provider",
    "Referral Source",
    "Availability",
    "Learning Goal",
    "Created At",
    "Paid At",
    "Completed At",
  ];

  const rows = registrations.map((registration) => [
    registration.id,
    registration.first_name,
    registration.last_name,
    registration.email,
    registration.phone,
    registration.country,
    registration.state,
    registration.city,
    registration.program?.title,
    registration.program?.code,
    registration.registration_status,
    registration.payment_status,
    registration.amount_expected,
    registration.amount_paid,
    registration.currency,
    registration.payment_reference,
    registration.payment_provider,
    registration.referral_source,
    registration.availability,
    registration.learning_goal,
    registration.created_at,
    registration.paid_at,
    registration.completed_at,
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
  anchor.download = `academy-registrations-${
    new Date().toISOString().split("T")[0]
  }.csv`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(objectUrl);
}

/**
 * Display one reusable details row inside the registration modal.
 */
function RegistrationDetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-200 py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <span className="text-sm text-slate-500">{label}</span>

      <span className="max-w-md text-sm font-semibold text-slate-900 sm:text-right">
        {value || "Not available"}
      </span>
    </div>
  );
}

/**
 * Display the Academy registrations management interface.
 */
export default function AcademyRegistrationsTable() {
  // Store the current page of registration records.
  const [registrations, setRegistrations] = useState<
    AcademyRegistrationRecord[]
  >([]);

  // Store the programs available in the filter dropdown.
  const [programOptions, setProgramOptions] = useState<
    AcademyProgramFilterOption[]
  >([]);

  // Store the active registration filters.
  const [filters, setFilters] =
    useState<RegistrationFilterState>(DEFAULT_FILTERS);

  // Store the current pagination page.
  const [page, setPage] = useState(1);

  // Store the total number of matching registrations.
  const [total, setTotal] = useState(0);

  // Store the total number of pages.
  const [totalPages, setTotalPages] = useState(1);

  // Store the active sorting field.
  const [sortBy, setSortBy] = useState<RegistrationSortField>("created_at");

  // Store the active sorting direction.
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Track the main table loading state.
  const [loading, setLoading] = useState(true);

  // Track whether a CSV export is being prepared.
  const [exporting, setExporting] = useState(false);

  // Store a safe loading error for the interface.
  const [errorMessage, setErrorMessage] = useState("");

  // Store the registration currently displayed in the details modal.
  const [selectedRegistration, setSelectedRegistration] =
    useState<AcademyRegistrationRecord | null>(null);

  // Store the ID of the registration currently being updated.
  const [updatingRegistrationId, setUpdatingRegistrationId] = useState<
    string | null
  >(null);

  // Store the ID of the registration currently being deleted.
  const [deletingRegistrationId, setDeletingRegistrationId] = useState<
    string | null
  >(null);

  // Track whether the filter panel is visible on smaller screens.
  const [filtersVisible, setFiltersVisible] = useState(false);

  /**
   * Convert the component filter state into the service filter shape.
   */
  const serviceFilters = useMemo<AcademyRegistrationFilters>(
    () => ({
      search: filters.search.trim() || undefined,
      programId: filters.programId || undefined,
      registrationStatus: filters.registrationStatus,
      paymentStatus: filters.paymentStatus,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    }),
    [filters]
  );

  /**
   * Load the current page of registration records.
   */
  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await listAcademyRegistrations({
        page,
        pageSize: PAGE_SIZE,
        filters: serviceFilters,
        sortBy,
        sortDirection,
      });

      setRegistrations(result.registrations);
      setTotal(result.total);
      setTotalPages(result.totalPages);

      // Move back to the final available page when filters reduce the result count.
      if (page > result.totalPages) {
        setPage(result.totalPages);
      }
    } catch (error) {
      console.error("Failed to load Academy registrations:", error);

      setErrorMessage("The Academy registrations could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, serviceFilters, sortBy, sortDirection]);

  /**
   * Load programs used by the registration filter.
   */
  const loadProgramOptions = useCallback(async () => {
    try {
      const programs = await listAcademyProgramsForRegistrationFilters();

      setProgramOptions(programs as AcademyProgramFilterOption[]);
    } catch (error) {
      console.error("Failed to load Academy program filters:", error);

      toast.error("Program filters could not be loaded.");
    }
  }, []);

  // Load program filters once after hydration.
  useEffect(() => {
    void loadProgramOptions();
  }, [loadProgramOptions]);

  // Load registrations whenever pagination, sorting or filters change.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRegistrations();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadRegistrations]);

  /**
   * Update one active filter and reset pagination.
   */
  function updateFilter<Key extends keyof RegistrationFilterState>(
    field: Key,
    value: RegistrationFilterState[Key]
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));

    setPage(1);
  }

  /**
   * Reset every registration filter.
   */
  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  /**
   * Change the active sorting field or direction.
   */
  function handleSort(field: RegistrationSortField) {
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
   * Return the icon representing the active sort state.
   */
  function getSortIcon(field: RegistrationSortField) {
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
   * Replace an updated registration in local table and modal state.
   */
  function replaceRegistration(updatedRegistration: AcademyRegistrationRecord) {
    setRegistrations((currentRegistrations) =>
      currentRegistrations.map((registration) =>
        registration.id === updatedRegistration.id
          ? updatedRegistration
          : registration
      )
    );

    setSelectedRegistration((currentRegistration) =>
      currentRegistration?.id === updatedRegistration.id
        ? updatedRegistration
        : currentRegistration
    );
  }

  /* Determines whether a registration can move from its current status to the requested status. */
  /* Defines the actions that can be performed on an Academy registration. */
  type RegistrationAction = "confirm" | "enroll" | "complete" | "cancel";

  /* Determines whether the requested action is valid for the current registration status. */
  function isRegistrationActionAllowed(
    registrationStatus: AcademyRegistrationRecord["registration_status"],
    action: RegistrationAction
  ) {
    const allowedActions: Record<
      AcademyRegistrationRecord["registration_status"],
      RegistrationAction[]
    > = {
      pending: ["confirm", "cancel"],
      confirmed: ["enroll", "cancel"],
      enrolled: ["complete", "cancel"],
      completed: [],
      cancelled: [],
    };

    return allowedActions[registrationStatus].includes(action);
  }

  /**
   * Run a status update action and refresh the selected registration.
   */
  /* Executes a valid Academy registration lifecycle action. */
  /* Executes an Academy registration lifecycle action. */
  async function handleRegistrationAction(
    registration: AcademyRegistrationRecord,
    action: RegistrationAction
  ) {
    if (updatingRegistrationId) {
      return;
    }

    /* Prevent invalid lifecycle transitions before sending a database request. */
    if (
      !isRegistrationActionAllowed(registration.registration_status, action)
    ) {
      toast.error(
        `This registration cannot be ${action}ed while it is ${registration.registration_status}.`
      );

      return;
    }

    setUpdatingRegistrationId(registration.id);

    try {
      let updatedRegistration: AcademyRegistrationRecord;

      /* Execute the appropriate registration lifecycle operation. */
      switch (action) {
        case "confirm":
          updatedRegistration = await confirmAcademyRegistration(
            registration.id
          );
          break;

        case "enroll":
          updatedRegistration = await enrollAcademyRegistration(
            registration.id
          );
          break;

        case "complete":
          updatedRegistration = await completeAcademyRegistration(
            registration.id
          );
          break;

        case "cancel":
          updatedRegistration = await cancelAcademyRegistration(
            registration.id
          );
          break;
      }

      /* Replace the registration locally so both the table and modal receive the new status. */
      replaceRegistration(updatedRegistration);

      const successMessages = {
        confirm: `${registration.first_name}'s registration has been confirmed.`,
        enroll: `${registration.first_name} has been enrolled.`,
        complete: `${registration.first_name}'s registration has been completed.`,
        cancel: `${registration.first_name}'s registration has been cancelled.`,
      };

      toast.success(successMessages[action]);
    } catch (error) {
      console.error(`Failed to ${action} Academy registration:`, error);

      toast.error(`The registration could not be ${action}ed.`);
    } finally {
      setUpdatingRegistrationId(null);
    }
  }
  /**
   * Update the payment status from the registration details modal.
   */
  async function handlePaymentStatusUpdate(
    registration: AcademyRegistrationRecord,
    paymentStatus: AcademyPaymentStatus
  ) {
    if (updatingRegistrationId) {
      return;
    }

    setUpdatingRegistrationId(registration.id);

    try {
      const updates: Parameters<typeof updateAcademyRegistration>[1] = {
        payment_status: paymentStatus,
      };

      // Populate payment values when an administrator marks a payment paid.
      if (paymentStatus === "paid") {
        updates.amount_paid =
          registration.amount_paid ?? registration.amount_expected;

        updates.paid_at = registration.paid_at ?? new Date().toISOString();

        updates.registration_status =
          registration.registration_status === "pending"
            ? "confirmed"
            : registration.registration_status;
      }

      const updatedRegistration = await updateAcademyRegistration(
        registration.id,
        updates
      );

      replaceRegistration(updatedRegistration);

      toast.success("The payment status has been updated.");
    } catch (error) {
      console.error("Failed to update payment status:", error);

      toast.error("The payment status could not be updated.");
    } finally {
      setUpdatingRegistrationId(null);
    }
  }

  /**
   * Delete a registration created for testing or in error.
   */
  async function handleDeleteRegistration(
    registration: AcademyRegistrationRecord
  ) {
    if (deletingRegistrationId) {
      return;
    }

    if (registration.payment_status === "paid") {
      toast.error(
        "Paid registrations should be retained and cannot be deleted here."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete the registration for ${registration.first_name} ${registration.last_name}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingRegistrationId(registration.id);

    try {
      await deleteAcademyRegistration(registration.id);

      setRegistrations((currentRegistrations) =>
        currentRegistrations.filter(
          (currentRegistration) => currentRegistration.id !== registration.id
        )
      );

      setSelectedRegistration(null);
      setTotal((currentTotal) => Math.max(0, currentTotal - 1));

      toast.success("The registration has been deleted.");
    } catch (error) {
      console.error("Failed to delete Academy registration:", error);

      toast.error("The registration could not be deleted.");
    } finally {
      setDeletingRegistrationId(null);
    }
  }

  /**
   * Export registrations matching the current filter selection.
   */
  async function handleExport() {
    if (exporting) {
      return;
    }

    setExporting(true);

    try {
      const exportedRegistrations =
        await exportAcademyRegistrations(serviceFilters);

      if (exportedRegistrations.length === 0) {
        toast.info("There are no matching registrations to export.");
        return;
      }

      downloadRegistrationsCsv(exportedRegistrations);

      toast.success(`${exportedRegistrations.length} registrations exported.`);
    } catch (error) {
      console.error("Failed to export Academy registrations:", error);

      toast.error("The registration export could not be created.");
    } finally {
      setExporting(false);
    }
  }

  const activeFilterCount = useMemo(() => {
    return [
      filters.search,
      filters.programId,
      filters.registrationStatus !== "all" ? filters.registrationStatus : "",
      filters.paymentStatus !== "all" ? filters.paymentStatus : "",
      filters.dateFrom,
      filters.dateTo,
    ].filter(Boolean).length;
  }, [filters]);

  const firstVisibleRecord = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const lastVisibleRecord = Math.min(page * PAGE_SIZE, total);

  /* Determines which registration lifecycle actions are currently allowed. */
  const registrationStatus = selectedRegistration?.registration_status;

  const canConfirm = registrationStatus === "pending";

  const canEnroll = registrationStatus === "confirmed";

  const canComplete = registrationStatus === "enrolled";

  const canCancel =
    registrationStatus === "pending" ||
    registrationStatus === "confirmed" ||
    registrationStatus === "enrolled";

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mt-2 text-xl font-bold text-slate-950">
            Academy Registrations
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Search learners, review payments, update enrollment statuses and
            export registration records.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void loadRegistrations();
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

      <AcademyModuleNav current="Registrations" />

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
              placeholder="Search name, email, phone or payment reference..."
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
                htmlFor="registration-program-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Program
              </label>

              <select
                id="registration-program-filter"
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
                htmlFor="registration-status-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Registration status
              </label>

              <select
                id="registration-status-filter"
                value={filters.registrationStatus}
                onChange={(event) => {
                  updateFilter(
                    "registrationStatus",
                    event.target.value as AcademyRegistrationStatus | "all"
                  );
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="enrolled">Enrolled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
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
                htmlFor="registration-date-from"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Date from
              </label>

              <input
                id="registration-date-from"
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
                htmlFor="registration-date-to"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Date to
              </label>

              <input
                id="registration-date-to"
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
                      handleSort("registration_status");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Registration
                    {getSortIcon("registration_status")}
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
                    Payment
                    {getSortIcon("payment_status")}
                  </button>
                </th>

                <th className="px-5 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      handleSort("created_at");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Registered
                    {getSortIcon("created_at")}
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
                      Loading registrations...
                    </p>
                  </td>
                </tr>
              ) : registrations.length > 0 ? (
                registrations.map((registration) => (
                  <tr
                    key={registration.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {registration.first_name} {registration.last_name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {registration.email}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[240px] font-medium text-slate-800">
                        {registration.program?.title ?? "Unknown program"}
                      </p>

                      {registration.program?.code ? (
                        <p className="mt-1 text-xs text-slate-400">
                          {registration.program.code}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRegistrationStatusClasses(
                          registration.registration_status
                        )}`}
                      >
                        {formatStatus(registration.registration_status)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentStatusClasses(
                          registration.payment_status
                        )}`}
                      >
                        {formatStatus(registration.payment_status)}
                      </span>

                      <p className="mt-2 text-xs text-slate-500">
                        {formatCurrency(
                          registration.amount_paid ??
                            registration.amount_expected,
                          registration.currency
                        )}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {formatDate(registration.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRegistration(registration);
                          }}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-50 hover:text-primary"
                          aria-label={`View ${registration.first_name}'s registration`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteRegistration(registration);
                          }}
                          disabled={
                            registration.payment_status === "paid" ||
                            deletingRegistrationId === registration.id
                          }
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Delete ${registration.first_name}'s registration`}
                        >
                          {deletingRegistrationId === registration.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Users className="mx-auto h-8 w-8 text-slate-400" />

                    <h2 className="mt-4 text-lg font-bold text-slate-800">
                      No registrations found
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      Adjust the active filters or wait for new learner
                      registrations.
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

      {selectedRegistration ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="registration-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  Registration Details
                </p>

                <h2
                  id="registration-modal-title"
                  className="mt-2 text-2xl font-bold text-slate-950"
                >
                  {selectedRegistration.first_name}{" "}
                  {selectedRegistration.last_name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedRegistration.program?.title ??
                    "Unknown Academy program"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedRegistration(null);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close registration details"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid gap-6 p-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900">
                  Learner Information
                </h3>

                <div className="mt-3">
                  <RegistrationDetailRow
                    label="Email"
                    value={selectedRegistration.email}
                  />

                  <RegistrationDetailRow
                    label="Phone"
                    value={selectedRegistration.phone}
                  />

                  <RegistrationDetailRow
                    label="Country"
                    value={selectedRegistration.country}
                  />

                  <RegistrationDetailRow
                    label="State"
                    value={selectedRegistration.state}
                  />

                  <RegistrationDetailRow
                    label="City"
                    value={selectedRegistration.city}
                  />

                  <RegistrationDetailRow
                    label="Learning goal"
                    value={selectedRegistration.learning_goal}
                  />

                  <RegistrationDetailRow
                    label="Referral source"
                    value={selectedRegistration.referral_source}
                  />

                  <RegistrationDetailRow
                    label="Availability"
                    value={selectedRegistration.availability}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900">
                  Program and Registration
                </h3>

                <div className="mt-3">
                  <RegistrationDetailRow
                    label="Program"
                    value={selectedRegistration.program?.title}
                  />

                  <RegistrationDetailRow
                    label="Program code"
                    value={selectedRegistration.program?.code}
                  />

                  <RegistrationDetailRow
                    label="Registration status"
                    value={
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRegistrationStatusClasses(
                          selectedRegistration.registration_status
                        )}`}
                      >
                        {formatStatus(selectedRegistration.registration_status)}
                      </span>
                    }
                  />

                  <RegistrationDetailRow
                    label="Certificate status"
                    value={formatStatus(
                      selectedRegistration.certificate_status
                    )}
                  />

                  <RegistrationDetailRow
                    label="Registered"
                    value={formatDateTime(selectedRegistration.created_at)}
                  />

                  <RegistrationDetailRow
                    label="Completed"
                    value={formatDateTime(selectedRegistration.completed_at)}
                  />

                  <RegistrationDetailRow
                    label="Source"
                    value={selectedRegistration.source}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900">
                  Payment Information
                </h3>

                <div className="mt-3">
                  <RegistrationDetailRow
                    label="Payment status"
                    value={
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentStatusClasses(
                          selectedRegistration.payment_status
                        )}`}
                      >
                        {formatStatus(selectedRegistration.payment_status)}
                      </span>
                    }
                  />

                  <RegistrationDetailRow
                    label="Amount expected"
                    value={formatCurrency(
                      selectedRegistration.amount_expected,
                      selectedRegistration.currency
                    )}
                  />

                  <RegistrationDetailRow
                    label="Amount paid"
                    value={formatCurrency(
                      selectedRegistration.amount_paid,
                      selectedRegistration.currency
                    )}
                  />

                  <RegistrationDetailRow
                    label="Payment reference"
                    value={selectedRegistration.payment_reference}
                  />

                  <RegistrationDetailRow
                    label="Payment provider"
                    value={selectedRegistration.payment_provider}
                  />

                  <RegistrationDetailRow
                    label="Paid at"
                    value={formatDateTime(selectedRegistration.paid_at)}
                  />
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="modal-payment-status"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Update payment status
                  </label>

                  <select
                    id="modal-payment-status"
                    value={selectedRegistration.payment_status}
                    onChange={(event) => {
                      void handlePaymentStatusUpdate(
                        selectedRegistration,
                        event.target.value as AcademyPaymentStatus
                      );
                    }}
                    disabled={
                      updatingRegistrationId === selectedRegistration.id
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900">
                  Registration Actions
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Move the learner through the registration and enrollment
                  lifecycle.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleRegistrationAction(
                        selectedRegistration,
                        "confirm"
                      );
                    }}
                    disabled={
                      !canConfirm ||
                      updatingRegistrationId === selectedRegistration.id
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmed
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void handleRegistrationAction(
                        selectedRegistration,
                        "enroll"
                      );
                    }}
                    disabled={
                      !canEnroll ||
                      updatingRegistrationId === selectedRegistration.id
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <UserCheck className="h-4 w-4" />
                    Enroll
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void handleRegistrationAction(
                        selectedRegistration,
                        "complete"
                      );
                    }}
                    disabled={
                      !canComplete ||
                      updatingRegistrationId === selectedRegistration.id
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Complete
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void handleRegistrationAction(
                        selectedRegistration,
                        "cancel"
                      );
                    }}
                    disabled={
                      !canCancel ||
                      updatingRegistrationId === selectedRegistration.id
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>

                {updatingRegistrationId === selectedRegistration.id ? (
                  <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Updating registration...
                  </div>
                ) : null}
              </section>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedRegistration(null);
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
