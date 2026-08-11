import {
  Archive,
  Building2,
  CircleDollarSign,
  Download,
  Plus,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  archiveClient,
  getClientStatistics,
  listClients,
  restoreClient,
} from "../../../lib/client";
import type {
  Client,
  ClientFilters,
  ClientListItem,
  ClientStatistics,
  ClientStatus,
  ClientType,
} from "../../../types/client";
import ClientDetailsModal from "./ClientDetailsModal";
import ClientFormModal from "./ClientFormModal";
import ClientStatisticsCard from "./ClientStatisticsCard";
import ClientTable from "./ClientTable";

const EMPTY_STATISTICS: ClientStatistics = {
  totalClients: 0,
  activeClients: 0,
  leads: 0,
  prospects: 0,
  inactiveClients: 0,
  suspendedClients: 0,
  totalInvoiced: 0,
  totalPaid: 0,
  totalOutstanding: 0,
  lifetimeRevenue: 0,
  currency: "NGN",
};

const CLIENT_STATUSES: Array<{
  value: ClientStatus;
  label: string;
}> = [
  {
    value: "lead",
    label: "Lead",
  },
  {
    value: "prospect",
    label: "Prospect",
  },
  {
    value: "active",
    label: "Active",
  },
  {
    value: "inactive",
    label: "Inactive",
  },
  {
    value: "suspended",
    label: "Suspended",
  },
];

const CLIENT_TYPES: Array<{
  value: ClientType;
  label: string;
}> = [
  {
    value: "organisation",
    label: "Organisation",
  },
  {
    value: "individual",
    label: "Individual",
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
 * Export the currently visible Client records to CSV.
 */
function exportClientsCsv(clients: ClientListItem[]) {
  const rows = [
    [
      "Client Code",
      "Display Name",
      "Company Name",
      "Client Type",
      "Status",
      "Email",
      "Phone",
      "Industry",
      "Country",
      "Projects",
      "Active Projects",
      "Invoices",
      "Total Invoiced",
      "Total Paid",
      "Outstanding",
      "Lifetime Revenue",
      "Currency",
      "Created At",
    ],

    ...clients.map((client) => [
      client.client_code,
      client.display_name,
      client.company_name ?? "",
      client.client_type,
      client.status,
      client.email ?? "",
      client.phone ?? "",
      client.industry ?? "",
      client.country,
      client.projects_count,
      client.active_projects_count,
      client.invoices_count,
      client.total_invoiced,
      client.total_paid,
      client.outstanding_amount,
      client.lifetime_revenue,
      client.currency,
      client.created_at,
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
  anchor.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(anchor);

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(downloadUrl);
}

/**
 * Merge one saved Client record into the currently selected list item.
 */
function mergeSavedClient(
  currentClient: ClientListItem | null,
  savedClient: Client
): ClientListItem | null {
  if (!currentClient) {
    return null;
  }

  return {
    ...currentClient,
    ...savedClient,
  };
}

/**
 * Render the complete Client and CRM dashboard.
 */
export default function ClientDashboard() {
  const [clients, setClients] = useState<ClientListItem[]>([]);

  const [statistics, setStatistics] =
    useState<ClientStatistics>(EMPTY_STATISTICS);

  const [filters, setFilters] = useState<ClientFilters>({
    search: "",
    clientType: "all",
    status: "all",
    accountManagerId: "all",
    country: "",
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

  const [selectedClient, setSelectedClient] = useState<ClientListItem | null>(
    null
  );

  const [editingClient, setEditingClient] = useState<ClientListItem | null>(
    null
  );

  const [processingClientId, setProcessingClientId] = useState<string | null>(
    null
  );

  /**
   * Load paginated Client records and dashboard statistics.
   */
  const loadClientDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [clientResult, statisticsResult] = await Promise.all([
        listClients({
          page,
          pageSize,
          filters,
          sortBy: "created_at",
          sortDirection: "desc",
        }),

        getClientStatistics(),
      ]);

      setClients(clientResult.clients);
      setTotal(clientResult.total);
      setTotalPages(clientResult.totalPages);
      setStatistics(statisticsResult);
    } catch (error) {
      console.error("Failed to load Client dashboard:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The Client dashboard could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  /**
   * Debounce searches and filter changes before loading the dashboard.
   */
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadClientDashboard();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadClientDashboard]);

  /**
   * Update one Client filter and reset pagination.
   */
  function updateFilter<Key extends keyof ClientFilters>(
    key: Key,
    value: ClientFilters[Key]
  ) {
    setPage(1);

    setFilters((currentFilters: ClientFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  /**
   * Reset all Client filters.
   */
  function resetFilters() {
    setPage(1);

    setFilters({
      search: "",
      clientType: "all",
      status: "all",
      accountManagerId: "all",
      country: "",
      archived: false,
    });
  }

  /**
   * Open the create Client form.
   */
  function handleCreateClient() {
    setEditingClient(null);
    setFormOpen(true);
  }

  /**
   * Open the Client edit form.
   */
  function handleEditClient(client: ClientListItem) {
    setEditingClient(client);
    setDetailsOpen(false);
    setFormOpen(true);
  }

  /**
   * Open one Client in the details modal.
   */
  function handleViewClient(client: ClientListItem) {
    setSelectedClient(client);
    setDetailsOpen(true);
  }

  /**
   * Refresh the dashboard after creating or editing a Client.
   */
  async function handleClientSaved(client: Client) {
    setSelectedClient((currentClient: ClientListItem | null) =>
      mergeSavedClient(currentClient, client)
    );

    setFormOpen(false);
    setEditingClient(null);

    await loadClientDashboard();
  }

  /**
   * Archive one Client after user confirmation.
   */
  async function handleArchiveClient(client: ClientListItem) {
    const confirmed = window.confirm(
      `Archive ${client.display_name}? Related projects, invoices and financial records will be preserved.`
    );

    if (!confirmed) {
      return;
    }

    setProcessingClientId(client.id);

    try {
      await archiveClient(client.id);

      toast.success("Client archived successfully.");

      setDetailsOpen(false);
      setSelectedClient(null);

      await loadClientDashboard();
    } catch (error) {
      console.error("Failed to archive Client:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Client could not be archived."
      );
    } finally {
      setProcessingClientId(null);
    }
  }

  /**
   * Restore one archived Client after user confirmation.
   */
  async function handleRestoreClient(client: ClientListItem) {
    const confirmed = window.confirm(
      `Restore ${client.display_name} to the active Client directory?`
    );

    if (!confirmed) {
      return;
    }

    setProcessingClientId(client.id);

    try {
      await restoreClient(client.id);

      toast.success("Client restored successfully.");

      setDetailsOpen(false);
      setSelectedClient(null);

      await loadClientDashboard();
    } catch (error) {
      console.error("Failed to restore Client:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Client could not be restored."
      );
    } finally {
      setProcessingClientId(null);
    }
  }

  /**
   * Export the currently loaded Client records.
   */
  function handleExportClients() {
    if (clients.length === 0) {
      toast.info("There are no Clients to export.");

      return;
    }

    exportClientsCsv(clients);
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.search?.trim()) {
      count += 1;
    }

    if (filters.clientType && filters.clientType !== "all") {
      count += 1;
    }

    if (filters.status && filters.status !== "all") {
      count += 1;
    }

    if (filters.accountManagerId && filters.accountManagerId !== "all") {
      count += 1;
    }

    if (filters.country?.trim()) {
      count += 1;
    }

    if (filters.archived) {
      count += 1;
    }

    return count;
  }, [filters]);

  const pipelineClients = statistics.leads + statistics.prospects;

  return (
    <section className="min-w-0 space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
            Clients
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Manage permanent Client profiles and connect them to projects,
            invoices, payments, receipts and financial activity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportClients}
            disabled={loading || clients.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => void loadClientDashboard()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleCreateClient}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Plus size={16} />
            Add Client
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ClientStatisticsCard
          title="Total Clients"
          value={statistics.totalClients}
          helperText={`${statistics.activeClients} active Client${
            statistics.activeClients === 1 ? "" : "s"
          }`}
          icon={UserRound}
          iconClasses="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
        />

        <ClientStatisticsCard
          title="Sales Pipeline"
          value={pipelineClients}
          helperText={`${statistics.leads} leads · ${statistics.prospects} prospects`}
          icon={Building2}
          iconClasses="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
        />

        <ClientStatisticsCard
          title="Lifetime Revenue"
          amount={statistics.lifetimeRevenue}
          currency={statistics.currency}
          helperText={`${statistics.totalPaid.toLocaleString("en-NG")} received from invoices`}
          icon={CircleDollarSign}
          iconClasses="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        />

        <ClientStatisticsCard
          title="Outstanding"
          amount={statistics.totalOutstanding}
          currency={statistics.currency}
          helperText={`${statistics.totalInvoiced.toLocaleString("en-NG")} total invoiced`}
          icon={Archive}
          iconClasses="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
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
              placeholder="Search Client code, name, email, phone or industry"
              className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:text-white"
            />
          </label>

          <select
            value={filters.clientType ?? "all"}
            onChange={(event) =>
              updateFilter(
                "clientType",
                event.target.value as ClientType | "all"
              )
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All Client types</option>

            {CLIENT_TYPES.map((clientType) => (
              <option key={clientType.value} value={clientType.value}>
                {clientType.label}
              </option>
            ))}
          </select>

          <select
            value={filters.status ?? "all"}
            onChange={(event) =>
              updateFilter("status", event.target.value as ClientStatus | "all")
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All statuses</option>

            {CLIENT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <input
            value={filters.country ?? ""}
            onChange={(event) => updateFilter("country", event.target.value)}
            placeholder="Filter by country"
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
            Archived Clients
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
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <RefreshCw
            size={28}
            className="animate-spin text-blue-600 dark:text-blue-400"
          />
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-10 text-center dark:border-red-900 dark:bg-red-950/20">
          <p className="font-semibold text-red-700 dark:text-red-300">
            Clients could not be loaded
          </p>

          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => void loadClientDashboard()}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center dark:border-slate-800 dark:bg-slate-950">
          <UserRound size={36} className="mx-auto text-slate-400" />

          <p className="mt-4 font-semibold text-slate-950 dark:text-white">
            {filters.archived ? "No archived Clients" : "No Clients found"}
          </p>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            {filters.archived
              ? "Archived Client profiles will appear here."
              : "Create the first Client profile or adjust the current filters."}
          </p>

          {!filters.archived && (
            <button
              type="button"
              onClick={handleCreateClient}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <Plus size={16} />
              Add Client
            </button>
          )}
        </div>
      ) : (
        <ClientTable
          clients={clients}
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          processingClientId={processingClientId}
          archivedView={Boolean(filters.archived)}
          onView={handleViewClient}
          onEdit={handleEditClient}
          onArchive={(client) => void handleArchiveClient(client)}
          onRestore={(client) => void handleRestoreClient(client)}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPage(1);
            setPageSize(nextPageSize);
          }}
        />
      )}

      <ClientFormModal
        open={formOpen}
        client={editingClient}
        onClose={() => {
          setFormOpen(false);
          setEditingClient(null);
        }}
        onSaved={handleClientSaved}
      />

      <ClientDetailsModal
        open={detailsOpen}
        client={selectedClient}
        processing={processingClientId === selectedClient?.id}
        archivedView={Boolean(filters.archived)}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedClient(null);
        }}
        onEdit={handleEditClient}
        onArchive={(client) => void handleArchiveClient(client)}
        onRestore={(client) => void handleRestoreClient(client)}
      />
    </section>
  );
}
