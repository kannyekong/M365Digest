import {
  Archive,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ReceiptText,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";
import type { ClientListItem, ClientStatus } from "../../../types/client";

interface ClientDetailsModalProps {
  open: boolean;

  client: ClientListItem | null;

  processing: boolean;

  archivedView: boolean;

  onClose: () => void;

  onEdit: (client: ClientListItem) => void;

  onArchive: (client: ClientListItem) => void;

  onRestore: (client: ClientListItem) => void;
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
 * Format one Client date and time.
 */
function formatClientDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Convert one internal Client value into a readable label.
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
 * Render one Client summary metric.
 */
function ClientMetric({
  label,
  value,
  helperText,
  icon: Icon,
  iconClasses,
}: {
  label: string;

  value: string;

  helperText: string;

  icon: typeof CircleDollarSign;

  iconClasses: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClasses}`}
      >
        <Icon size={18} />
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-lg font-bold text-slate-950 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {helperText}
      </p>
    </article>
  );
}

/**
 * Render one labeled Client detail row.
 */
function ClientDetailRow({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>

      <dd className="break-words text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </dd>
    </div>
  );
}

/**
 * Render the complete Client details modal.
 */
export default function ClientDetailsModal({
  open,
  client,
  processing,
  archivedView,
  onClose,
  onEdit,
  onArchive,
  onRestore,
}: ClientDetailsModalProps) {
  if (!open || !client) {
    return null;
  }

  const selectedClient = client;

  const ClientIcon =
    selectedClient.client_type === "organisation" ? Building2 : UserRound;

  const location = [
    selectedClient.billing_address,
    selectedClient.city,
    selectedClient.state,
    selectedClient.country,
    selectedClient.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  const hasContactInformation = Boolean(
    selectedClient.email ||
    selectedClient.phone ||
    selectedClient.alternative_phone ||
    selectedClient.website
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) {
          onClose();
        }
      }}
    >
      <section className="h-[96vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:h-[95vh] sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <ClientIcon size={20} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                Clients and CRM
              </p>

              <h2
                id="client-details-title"
                className="mt-1 break-words text-xl font-bold text-slate-950 dark:text-white sm:text-2xl"
              >
                {selectedClient.display_name}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getClientStatusClasses(
                    selectedClient.status
                  )}`}
                >
                  {formatClientLabel(selectedClient.status)}
                </span>

                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {formatClientLabel(selectedClient.client_type)}
                </span>

                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedClient.client_code}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            title="Close Client Details"
            aria-label="Close Client Details"
            disabled={processing}
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <div className="h-[calc(96vh-82px)] overflow-y-auto pb-6 sm:h-[calc(95vh-82px)]">
          <div className="space-y-6 p-4 pb-10 sm:p-6 sm:pb-12">
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <ClientMetric
                label="Lifetime Revenue"
                value={formatClientCurrency(
                  selectedClient.lifetime_revenue,
                  selectedClient.currency
                )}
                helperText="Net revenue after refunds"
                icon={CircleDollarSign}
                iconClasses="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              />

              <ClientMetric
                label="Total Invoiced"
                value={formatClientCurrency(
                  selectedClient.total_invoiced,
                  selectedClient.currency
                )}
                helperText={`${selectedClient.invoices_count} invoice${
                  selectedClient.invoices_count === 1 ? "" : "s"
                }`}
                icon={FileText}
                iconClasses="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
              />

              <ClientMetric
                label="Outstanding"
                value={formatClientCurrency(
                  selectedClient.outstanding_amount,
                  selectedClient.currency
                )}
                helperText="Amount still unpaid"
                icon={ReceiptText}
                iconClasses="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              />

              <ClientMetric
                label="Active Projects"
                value={String(selectedClient.active_projects_count)}
                helperText={`${selectedClient.projects_count} total project${
                  selectedClient.projects_count === 1 ? "" : "s"
                }`}
                icon={Building2}
                iconClasses="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
              />
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <ClientIcon
                    size={17}
                    className="text-blue-600 dark:text-blue-400"
                  />

                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Client information
                  </h3>
                </div>

                <dl className="divide-y divide-slate-100 px-4 dark:divide-slate-900">
                  <ClientDetailRow
                    label="Display name"
                    value={selectedClient.display_name}
                  />

                  <ClientDetailRow
                    label="Company name"
                    value={selectedClient.company_name ?? "Not available"}
                  />

                  <ClientDetailRow
                    label="First name"
                    value={selectedClient.first_name ?? "Not available"}
                  />

                  <ClientDetailRow
                    label="Last name"
                    value={selectedClient.last_name ?? "Not available"}
                  />

                  <ClientDetailRow
                    label="Industry"
                    value={selectedClient.industry ?? "Not available"}
                  />

                  <ClientDetailRow
                    label="Tax identification"
                    value={
                      selectedClient.tax_identification_number ??
                      "Not available"
                    }
                  />

                  <ClientDetailRow
                    label="Source"
                    value={
                      selectedClient.source
                        ? formatClientLabel(selectedClient.source)
                        : "Not available"
                    }
                  />

                  <ClientDetailRow
                    label="Account manager"
                    value={selectedClient.account_manager_id ?? "Not assigned"}
                  />
                </dl>
              </section>

              <section className="space-y-4">
                <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <Mail
                    size={18}
                    className="text-blue-600 dark:text-blue-400"
                  />

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Primary contact
                  </p>

                  <p className="mt-1 break-all font-semibold text-slate-950 dark:text-white">
                    {selectedClient.email ?? "No email address"}
                  </p>

                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {selectedClient.phone ?? "No phone number"}
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <MapPin
                    size={18}
                    className="text-blue-600 dark:text-blue-400"
                  />

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Location
                  </p>

                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-950 dark:text-white">
                    {location || "No billing address provided"}
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <CalendarDays
                    size={18}
                    className="text-blue-600 dark:text-blue-400"
                  />

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Created
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    {formatClientDateTime(selectedClient.created_at)}
                  </p>

                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Updated {formatClientDateTime(selectedClient.updated_at)}
                  </p>
                </article>
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Contact details
                  </h3>
                </div>

                {hasContactInformation ? (
                  <dl className="divide-y divide-slate-100 px-4 dark:divide-slate-900">
                    <ClientDetailRow
                      label="Email"
                      value={selectedClient.email ?? "Not available"}
                    />

                    <ClientDetailRow
                      label="Phone"
                      value={selectedClient.phone ?? "Not available"}
                    />

                    <ClientDetailRow
                      label="Alternative phone"
                      value={
                        selectedClient.alternative_phone ?? "Not available"
                      }
                    />

                    <ClientDetailRow
                      label="Website"
                      value={selectedClient.website ?? "Not available"}
                    />
                  </dl>
                ) : (
                  <p className="px-4 py-8 text-sm text-slate-500 dark:text-slate-400">
                    No contact details have been added.
                  </p>
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Financial summary
                  </h3>
                </div>

                <dl className="divide-y divide-slate-100 px-4 dark:divide-slate-900">
                  <ClientDetailRow
                    label="Total invoiced"
                    value={formatClientCurrency(
                      selectedClient.total_invoiced,
                      selectedClient.currency
                    )}
                  />

                  <ClientDetailRow
                    label="Total paid"
                    value={formatClientCurrency(
                      selectedClient.total_paid,
                      selectedClient.currency
                    )}
                  />

                  <ClientDetailRow
                    label="Outstanding"
                    value={formatClientCurrency(
                      selectedClient.outstanding_amount,
                      selectedClient.currency
                    )}
                  />

                  <ClientDetailRow
                    label="Refunded"
                    value={formatClientCurrency(
                      selectedClient.refunded_amount,
                      selectedClient.currency
                    )}
                  />

                  <ClientDetailRow
                    label="Lifetime revenue"
                    value={formatClientCurrency(
                      selectedClient.lifetime_revenue,
                      selectedClient.currency
                    )}
                  />
                </dl>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Internal notes
              </h3>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                {selectedClient.notes ?? "No internal notes have been added."}
              </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <a
                href={`/admin/projects?client=${encodeURIComponent(
                  selectedClient.id
                )}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <Building2 size={16} />
                View Projects
              </a>

              <a
                href={`/admin/finance/invoices?client=${encodeURIComponent(
                  selectedClient.id
                )}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <FileText size={16} />
                View Invoices
              </a>

              <a
                href={`/admin/finance/revenue?client=${encodeURIComponent(
                  selectedClient.id
                )}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <CircleDollarSign size={16} />
                View Revenue
              </a>

              {selectedClient.website && (
                <a
                  href={selectedClient.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <ExternalLink size={16} />
                  Open Website
                </a>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Client actions
              </h3>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {!archivedView && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => onEdit(selectedClient)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Pencil size={16} />
                    Edit Client
                  </button>
                )}

                {archivedView ? (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => onRestore(selectedClient)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <RotateCcw size={16} />
                    Restore Client
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => onArchive(selectedClient)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    <Archive size={16} />
                    Archive Client
                  </button>
                )}

                {selectedClient.email && (
                  <a
                    href={`mailto:${selectedClient.email}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <Mail size={16} />
                    Email Client
                  </a>
                )}

                {selectedClient.phone && (
                  <a
                    href={`tel:${selectedClient.phone}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <Phone size={16} />
                    Call Client
                  </a>
                )}

                <button
                  type="button"
                  disabled={processing}
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
