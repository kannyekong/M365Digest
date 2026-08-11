import {
  Archive,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  Pencil,
  RotateCcw,
  UserRound,
} from "lucide-react";
import type { ClientListItem, ClientStatus } from "../../../types/client";

interface ClientTableProps {
  clients: ClientListItem[];

  page: number;

  pageSize: number;

  total: number;

  totalPages: number;

  processingClientId: string | null;

  archivedView: boolean;

  onView: (client: ClientListItem) => void;

  onEdit: (client: ClientListItem) => void;

  onArchive: (client: ClientListItem) => void;

  onRestore: (client: ClientListItem) => void;

  onPageChange: (page: number) => void;

  onPageSizeChange: (pageSize: number) => void;
}

/**
 * Format one Client monetary value.
 */
function formatClientCurrency(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Convert one internal value into a readable label.
 */
function formatClientLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return theme-aware classes for one Client status.
 */
function getClientStatusClasses(status: ClientStatus) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "lead":
      return "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300";

    case "prospect":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

    case "inactive":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

    case "suspended":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/**
 * Render the paginated Client table.
 */
export default function ClientTable({
  clients,
  page,
  pageSize,
  total,
  totalPages,
  processingClientId,
  archivedView,
  onView,
  onEdit,
  onArchive,
  onRestore,
  onPageChange,
  onPageSizeChange,
}: ClientTableProps) {
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;

  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[900px] table-fixed">
          <thead className="bg-slate-50 dark:bg-slate-900/70">
            <tr className="divide-x divide-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:divide-slate-800 dark:text-slate-400">
              <th className="w-[28%] px-3 py-3">Client</th>

              <th className="w-[20%] px-3 py-3">Contact</th>

              <th className="w-[18%] px-3 py-3">Projects</th>

              <th className="w-[22%] px-3 py-3">Financials</th>

              <th className="w-[12%] px-2 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
            {clients.map((client) => {
              const processing = processingClientId === client.id;

              const ClientIcon =
                client.client_type === "organisation" ? Building2 : UserRound;

              return (
                <tr
                  key={client.id}
                  className="divide-x divide-slate-200 text-sm text-slate-700 transition hover:bg-slate-50 dark:divide-slate-800 dark:text-slate-200 dark:hover:bg-slate-900/50"
                >
                  <td className="min-w-0 overflow-hidden px-3 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        <ClientIcon size={18} />
                      </div>

                      <div className="min-w-0">
                        <p
                          title={client.display_name}
                          className="truncate font-semibold text-slate-950 dark:text-white"
                        >
                          {client.display_name}
                        </p>

                        <p
                          title={client.client_code}
                          className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400"
                        >
                          {client.client_code}
                        </p>

                        {client.company_name &&
                          client.company_name !== client.display_name && (
                            <p
                              title={client.company_name}
                              className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400"
                            >
                              {client.company_name}
                            </p>
                          )}

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span
                            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getClientStatusClasses(
                              client.status
                            )}`}
                          >
                            {formatClientLabel(client.status)}
                          </span>

                          <span className="inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {formatClientLabel(client.client_type)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="min-w-0 overflow-hidden px-3 py-4">
                    <p
                      title={client.email ?? undefined}
                      className="truncate font-medium text-slate-900 dark:text-white"
                    >
                      {client.email ?? "No email"}
                    </p>

                    <p
                      title={client.phone ?? undefined}
                      className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400"
                    >
                      {client.phone ?? "No phone number"}
                    </p>

                    {client.industry && (
                      <p
                        title={client.industry}
                        className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400"
                      >
                        {client.industry}
                      </p>
                    )}

                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {[client.city, client.state, client.country]
                        .filter(Boolean)
                        .join(", ") || "Location not provided"}
                    </p>
                  </td>

                  <td className="px-3 py-4">
                    <p className="font-semibold text-slate-950 dark:text-white">
                      {client.active_projects_count} active
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {client.projects_count} total project
                      {client.projects_count === 1 ? "" : "s"}
                    </p>

                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {client.invoices_count} invoice
                      {client.invoices_count === 1 ? "" : "s"}
                    </p>
                  </td>

                  <td className="px-3 py-4">
                    <div className="grid gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Revenue
                        </p>

                        <p className="mt-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
                          {formatClientCurrency(
                            client.lifetime_revenue,
                            client.currency
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Invoiced
                          </p>

                          <p
                            title={formatClientCurrency(
                              client.total_invoiced,
                              client.currency
                            )}
                            className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200"
                          >
                            {formatClientCurrency(
                              client.total_invoiced,
                              client.currency
                            )}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Outstanding
                          </p>

                          <p
                            title={formatClientCurrency(
                              client.outstanding_amount,
                              client.currency
                            )}
                            className="truncate text-xs font-semibold text-amber-700 dark:text-amber-300"
                          >
                            {formatClientCurrency(
                              client.outstanding_amount,
                              client.currency
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-2 py-4 align-top">
                    <div className="flex flex-wrap justify-center gap-1">
                      <button
                        type="button"
                        title="View Client"
                        aria-label="View Client"
                        onClick={() => onView(client)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                      >
                        <Eye size={15} />
                      </button>

                      {!archivedView && (
                        <button
                          type="button"
                          title="Edit Client"
                          aria-label="Edit Client"
                          disabled={processing}
                          onClick={() => onEdit(client)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-950/30"
                        >
                          <Pencil size={15} />
                        </button>
                      )}

                      {archivedView ? (
                        <button
                          type="button"
                          title="Restore Client"
                          aria-label="Restore Client"
                          disabled={processing}
                          onClick={() => onRestore(client)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        >
                          {processing ? (
                            <LoaderCircle size={15} className="animate-spin" />
                          ) : (
                            <RotateCcw size={15} />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Archive Client"
                          aria-label="Archive Client"
                          disabled={processing}
                          onClick={() => onArchive(client)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          {processing ? (
                            <LoaderCircle size={15} className="animate-spin" />
                          ) : (
                            <Archive size={15} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing {rangeStart}–{rangeEnd} of {total}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-slate-200 bg-transparent px-2.5 py-2 text-sm text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>

          <button
            type="button"
            title="Previous Page"
            aria-label="Previous Page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {page} / {totalPages}
          </span>

          <button
            type="button"
            title="Next Page"
            aria-label="Next Page"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </footer>
    </section>
  );
}
