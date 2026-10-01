import {
  ArrowRight,
  Cable,
  CalendarDays,
  ChevronDown,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import ConfirmModal from "../../../islands/ConfirmModal";
import type {
  CreateProcurementOpportunityInput,
  ProcurementClientOption,
  ProcurementContactOption,
  ProcurementOpportunityListItem,
  ProcurementOpportunityStage,
  ProcurementOpportunityStatus,
  ProcurementStaffOption,
  UpdateProcurementOpportunityInput,
} from "../../../types/procurement";

interface OpportunityForm {
  client_id: string;
  primary_contact_id: string;
  name: string;
  description: string;
  stage: ProcurementOpportunityStage;
  status: ProcurementOpportunityStatus;
  service_type: string;
  source: string;
  estimated_value: string;
  currency: string;
  probability: string;
  expected_close_date: string;
  vendor_registration_required: boolean;
  rfq_required: boolean;
  assigned_to: string;
  notes: string;
}

interface OpportunitiesResponse {
  success: boolean;
  data?: ProcurementOpportunityListItem[];
  total?: number;
  error?: string;
}

interface OpportunityFormOptions {
  clients: ProcurementClientOption[];
  contacts: ProcurementContactOption[];
  staff: ProcurementStaffOption[];
}

interface OpportunityResponse {
  success: boolean;
  data?: ProcurementOpportunityListItem;
  error?: string;
}

interface PipelineColumn {
  stage: ProcurementOpportunityStage;
  label: string;
}

const PIPELINE_COLUMNS: PipelineColumn[] = [
  { stage: "qualified", label: "Qualified" },
  { stage: "assessment", label: "Assessment" },
  { stage: "vendor_registration", label: "Vendor Registration" },
  { stage: "opportunity", label: "Opportunity" },
  { stage: "rfq_rfp", label: "RFQ / RFP" },
  { stage: "proposal", label: "Proposal" },
  { stage: "negotiation", label: "Negotiation" },
  { stage: "won", label: "Won" },
];

const OPPORTUNITY_STATUSES: Array<{
  value: ProcurementOpportunityStatus;
  label: string;
}> = [
  { value: "open", label: "Open" },
  { value: "on_hold", label: "On Hold" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "cancelled", label: "Cancelled" },
];

/**
 * Creates the default procurement opportunity form state.
 */
function createInitialOpportunityForm(): OpportunityForm {
  return {
    client_id: "",
    primary_contact_id: "",
    name: "",
    description: "",
    stage: "qualified",
    status: "open",
    service_type: "",
    source: "",
    estimated_value: "",
    currency: "NGN",
    probability: "20",
    expected_close_date: "",
    vendor_registration_required: false,
    rfq_required: false,
    assigned_to: "",
    notes: "",
  };
}

/**
 * Formats a technical opportunity stage into a readable label.
 */
function formatStage(stage: string): string {
  return stage
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Formats a monetary value using the opportunity currency.
 */
function formatCurrency(value: number | null, currency = "NGN"): string {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Number(value).toLocaleString("en-NG")}`;
  }
}

/**
 * Formats an opportunity date for the pipeline card.
 */
function formatDate(value: string | null): string {
  if (!value) {
    return "No close date";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Opens the follow-up workspace with the current procurement record attached as context.
 */
function openFollowUp(context: string): void {
  window.location.href = `/admin/procurement/follow-ups?${context}`;
}

/**
 * Returns visual classes for an opportunity stage.
 */
function getStageClasses(stage: ProcurementOpportunityStage): string {
  switch (stage) {
    case "won":
      return "border-emerald-200 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-400/5";
    case "negotiation":
      return "border-violet-200 bg-violet-50/70 dark:border-violet-400/20 dark:bg-violet-400/5";
    case "proposal":
      return "border-blue-200 bg-blue-50/70 dark:border-blue-400/20 dark:bg-blue-400/5";
    case "rfq_rfp":
      return "border-cyan-200 bg-cyan-50/70 dark:border-cyan-400/20 dark:bg-cyan-400/5";
    default:
      return "border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]";
  }
}

/**
 * Renders the procurement opportunity pipeline and manages opportunity creation,
 * editing, stage changes and destructive actions.
 */
export default function ProcurementOpportunitiesWorkspace() {
  const [opportunities, setOpportunities] = useState<
    ProcurementOpportunityListItem[]
  >([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] =
    useState<ProcurementOpportunityListItem | null>(null);
  const [options, setOptions] = useState<OpportunityFormOptions>({
    clients: [],
    contacts: [],
    staff: [],
  });
  const [opportunityForm, setOpportunityForm] = useState<OpportunityForm>(
    createInitialOpportunityForm()
  );
  const [saving, setSaving] = useState(false);
  const [confirmLostOpportunity, setConfirmLostOpportunity] =
    useState<ProcurementOpportunityListItem | null>(null);
  const [confirmStageChange, setConfirmStageChange] = useState<{
    opportunity: ProcurementOpportunityListItem;
    stage: ProcurementOpportunityStage;
  } | null>(null);

  const availableContacts = useMemo(
    () =>
      options.contacts.filter(
        (contact) =>
          !opportunityForm.client_id ||
          contact.client_id === opportunityForm.client_id
      ),
    [options.contacts, opportunityForm.client_id]
  );

  /**
   * Loads the complete active opportunity pipeline.
   */
  async function loadOpportunities(): Promise<void> {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("page_size", "100");

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (status) {
        params.set("status", status);
      }

      const response = await fetch(
        `/api/admin/procurement/opportunities?${params.toString()}`,
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      const result = (await response.json()) as OpportunitiesResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Procurement opportunities could not be loaded."
        );
      }

      setOpportunities(result.data ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Procurement opportunities could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * Loads the organisation, contact and staff options used by the opportunity form.
   */
  async function loadOpportunityOptions(): Promise<void> {
    try {
      const response = await fetch("/api/admin/procurement/options", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const result = (await response.json()) as {
        success: boolean;
        data?: OpportunityFormOptions;
        error?: string;
      };

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.error || "Unable to load procurement form options."
        );
      }

      setOptions({
        clients: result.data.clients ?? [],
        contacts: result.data.contacts ?? [],
        staff: result.data.staff ?? [],
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load procurement form options."
      );
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOpportunities();
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search, status]);

  useEffect(() => {
    void loadOpportunityOptions();
  }, []);

  /**
   * Groups opportunities into their corresponding pipeline stages.
   */
  const groupedOpportunities = useMemo(() => {
    return PIPELINE_COLUMNS.reduce(
      (groups, column) => {
        groups[column.stage] = opportunities.filter(
          (opportunity) => opportunity.stage === column.stage
        );

        return groups;
      },
      {} as Record<
        ProcurementOpportunityStage,
        ProcurementOpportunityListItem[]
      >
    );
  }, [opportunities]);

  /**
   * Calculates the total monetary value represented by a pipeline column.
   */
  function getColumnValue(stage: ProcurementOpportunityStage): number {
    return groupedOpportunities[stage].reduce(
      (total, opportunity) => total + Number(opportunity.estimated_value ?? 0),
      0
    );
  }

  /**
   * Opens a clean form for creating a new procurement opportunity.
   */
  function openCreateOpportunityModal(): void {
    setEditingOpportunity(null);
    setOpportunityForm(createInitialOpportunityForm());
    setModalOpen(true);
  }

  /**
   * Opens an existing opportunity in the full edit form.
   */
  function openEditOpportunityModal(
    opportunity: ProcurementOpportunityListItem
  ): void {
    setEditingOpportunity(opportunity);
    setOpportunityForm({
      client_id: opportunity.client_id,
      primary_contact_id: opportunity.primary_contact_id ?? "",
      name: opportunity.name ?? "",
      description: opportunity.description ?? "",
      stage: opportunity.stage,
      status: opportunity.status,
      service_type: opportunity.service_type ?? "",
      source: opportunity.source ?? "",
      estimated_value:
        opportunity.estimated_value !== null &&
        opportunity.estimated_value !== undefined
          ? String(opportunity.estimated_value)
          : "",
      currency: opportunity.currency ?? "NGN",
      probability:
        opportunity.probability !== null &&
        opportunity.probability !== undefined
          ? String(opportunity.probability)
          : "20",
      expected_close_date: opportunity.expected_close_date ?? "",
      vendor_registration_required:
        opportunity.vendor_registration_required ?? false,
      rfq_required: opportunity.rfq_required ?? false,
      assigned_to: opportunity.assigned_to ?? "",
      notes: opportunity.notes ?? "",
    });
    setModalOpen(true);
  }

  /**
   * Saves a new opportunity or updates the selected opportunity.
   */
  async function handleOpportunitySubmit(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (!opportunityForm.client_id) {
      toast.error("Please select an organisation.");
      return;
    }

    if (!opportunityForm.name.trim()) {
      toast.error("Please enter an opportunity name.");
      return;
    }

    const probability = Math.min(
      Math.max(Number(opportunityForm.probability || 0), 0),
      100
    );

    const payload: CreateProcurementOpportunityInput = {
      client_id: opportunityForm.client_id,
      primary_contact_id: opportunityForm.primary_contact_id || null,
      lead_id: null,
      assigned_to: opportunityForm.assigned_to || null,
      name: opportunityForm.name.trim(),
      description: opportunityForm.description.trim() || null,
      stage: opportunityForm.stage,
      status: opportunityForm.status,
      service_type: opportunityForm.service_type.trim() || null,
      source: opportunityForm.source.trim() || null,
      estimated_value: opportunityForm.estimated_value
        ? Number(opportunityForm.estimated_value)
        : null,
      currency: opportunityForm.currency.trim().toUpperCase() || "NGN",
      probability,
      expected_close_date: opportunityForm.expected_close_date || null,
      vendor_registration_required:
        opportunityForm.vendor_registration_required,
      rfq_required: opportunityForm.rfq_required,
      notes: opportunityForm.notes.trim() || null,
      metadata: {},
    };

    try {
      setSaving(true);

      const body = editingOpportunity
        ? ({
            ...payload,
            id: editingOpportunity.id,
          } satisfies UpdateProcurementOpportunityInput)
        : payload;

      const response = await fetch(
        editingOpportunity
          ? `/api/admin/procurement/opportunities/${editingOpportunity.id}`
          : "/api/admin/procurement/opportunities",
        {
          method: editingOpportunity ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const result = (await response.json()) as OpportunityResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to save procurement opportunity."
        );
      }

      toast.success(
        editingOpportunity
          ? "Opportunity updated successfully."
          : "Opportunity created successfully."
      );

      setModalOpen(false);
      setEditingOpportunity(null);
      setOpportunityForm(createInitialOpportunityForm());
      await loadOpportunities();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save procurement opportunity."
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * Applies a confirmed pipeline stage change to an opportunity.
   */
  async function moveOpportunity(
    opportunity: ProcurementOpportunityListItem,
    stage: ProcurementOpportunityStage
  ): Promise<void> {
    if (opportunity.stage === stage) {
      return;
    }

    setProcessingId(opportunity.id);

    try {
      const nextStatus: ProcurementOpportunityStatus =
        stage === "won" ? "won" : "open";

      const response = await fetch(
        `/api/admin/procurement/opportunities/${opportunity.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            stage,
            status: nextStatus,
          }),
        }
      );

      const result = (await response.json()) as OpportunityResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to update opportunity stage.");
      }

      toast.success(
        `${opportunity.opportunity_code} moved to ${formatStage(stage)}.`
      );

      await loadOpportunities();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update opportunity stage."
      );
    } finally {
      setProcessingId(null);
      setConfirmStageChange(null);
    }
  }

  /**
   * Requests confirmation before moving an opportunity to another stage.
   */
  function requestStageChange(
    opportunity: ProcurementOpportunityListItem,
    stage: ProcurementOpportunityStage
  ): void {
    if (opportunity.stage === stage) {
      return;
    }

    setConfirmStageChange({ opportunity, stage });
  }

  /**
   * Marks an opportunity as lost after explicit confirmation.
   */
  async function markOpportunityLost(
    opportunity: ProcurementOpportunityListItem
  ): Promise<void> {
    setProcessingId(opportunity.id);

    try {
      const response = await fetch(
        `/api/admin/procurement/opportunities/${opportunity.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            stage: "lost",
            status: "lost",
          }),
        }
      );

      const result = (await response.json()) as OpportunityResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to mark opportunity as lost.");
      }

      toast.success("Opportunity marked as lost.");
      await loadOpportunities();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update opportunity."
      );
    } finally {
      setProcessingId(null);
      setConfirmLostOpportunity(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Opportunity Pipeline
          </h1>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Track every qualified procurement opportunity from assessment to
            close.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadOpportunities()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateOpportunityModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add Opportunity
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row dark:border-white/10 dark:bg-white/5">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search opportunities..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
          />
        </div>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none dark:border-white/10 dark:bg-black/20 dark:text-slate-200"
        >
          <option value="">All statuses</option>
          {OPPORTUNITY_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="pb-2">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PIPELINE_COLUMNS.map((column) => {
            const columnOpportunities = groupedOpportunities[column.stage];

            return (
              <section
                key={column.stage}
                className={`min-w-0 rounded-xl border p-2.5 ${getStageClasses(
                  column.stage
                )}`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {column.label}
                    </h2>

                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {columnOpportunities.length}{" "}
                      {columnOpportunities.length === 1
                        ? "opportunity"
                        : "opportunities"}
                    </p>
                  </div>

                  <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-black/20 dark:text-slate-300">
                    {formatCurrency(getColumnValue(column.stage))}
                  </span>
                </div>

                <div className="space-y-2">
                  {loading ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-3 py-5 text-center text-[11px] text-slate-500 dark:border-white/10 dark:bg-black/10 dark:text-slate-400">
                      Loading...
                    </div>
                  ) : columnOpportunities.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white/40 px-3 py-5 text-center dark:border-white/10 dark:bg-black/10">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        No opportunities here
                      </p>
                    </div>
                  ) : (
                    columnOpportunities.map((opportunity) => (
                      <article
                        key={opportunity.id}
                        className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-950"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                              {opportunity.opportunity_code}
                            </p>

                            <h3 className="mt-0.5 line-clamp-2 text-xs font-bold text-slate-900 dark:text-white">
                              {opportunity.name}
                            </h3>
                          </div>

                          <button
                            type="button"
                            title="Edit opportunity"
                            onClick={() =>
                              openEditOpportunityModal(opportunity)
                            }
                            className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-2.5 space-y-2">
                          <div>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              Organisation
                            </p>

                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {opportunity.client_name ??
                                "Unknown organisation"}
                            </p>
                          </div>

                          {opportunity.contact_name && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <UserRound className="h-3 w-3" />
                              <span className="truncate">
                                {opportunity.contact_name}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Value
                              </p>

                              <p className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white">
                                {formatCurrency(
                                  opportunity.estimated_value,
                                  opportunity.currency
                                )}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Probability
                              </p>

                              <p className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white">
                                {opportunity.probability}%
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-white/5 dark:text-slate-400">
                            <CalendarDays className="h-3 w-3" />
                            <span>
                              {formatDate(opportunity.expected_close_date)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 flex items-center gap-1.5">
                          <div className="relative min-w-0 flex-1">
                            <select
                              value={opportunity.stage}
                              disabled={processingId === opportunity.id}
                              onChange={(event) =>
                                requestStageChange(
                                  opportunity,
                                  event.target
                                    .value as ProcurementOpportunityStage
                                )
                              }
                              className="w-full appearance-none rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 pr-7 text-[11px] font-semibold text-slate-700 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                            >
                              {PIPELINE_COLUMNS.map((item) => (
                                <option key={item.stage} value={item.stage}>
                                  {item.label}
                                </option>
                              ))}
                            </select>

                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                          </div>

                          {opportunity.status !== "won" &&
                            opportunity.status !== "lost" && (
                              <button
                                type="button"
                                title="Mark opportunity as lost"
                                disabled={processingId === opportunity.id}
                                onClick={() =>
                                  setConfirmLostOpportunity(opportunity)
                                }
                                className="rounded-md border border-slate-200 p-1.5 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:border-white/10 dark:hover:border-rose-400/20 dark:hover:bg-rose-400/10 dark:hover:text-rose-300"
                              >
                                <ArrowRight className="h-4 w-4 rotate-45" />
                              </button>
                            )}

                          <button
                            type="button"
                            title="Create follow-up"
                            onClick={() =>
                              openFollowUp(`opportunity=${opportunity.id}`)
                            }
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-green-500 transition hover:border-green-400 hover:text-green-600 dark:border-white/10"
                          >
                            <Cable className="h-4 w-4" />
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {editingOpportunity ? "Edit Opportunity" : "Add Opportunity"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {editingOpportunity
                    ? "Update the procurement opportunity details."
                    : "Create a new procurement opportunity."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!saving) {
                    setModalOpen(false);
                  }
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleOpportunitySubmit}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <div className="grid gap-5 p-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Organisation *
                  </label>
                  <select
                    value={opportunityForm.client_id}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        client_id: event.target.value,
                        primary_contact_id: "",
                      }))
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  >
                    <option value="">Select organisation</option>
                    {options.clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Primary Contact
                  </label>
                  <select
                    value={opportunityForm.primary_contact_id}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        primary_contact_id: event.target.value,
                      }))
                    }
                    disabled={!opportunityForm.client_id}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 disabled:opacity-50 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  >
                    <option value="">
                      {opportunityForm.client_id
                        ? "Select contact"
                        : "Select organisation first"}
                    </option>
                    {availableContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                        {contact.job_title ? ` — ${contact.job_title}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Opportunity Name *
                  </label>
                  <input
                    type="text"
                    value={opportunityForm.name}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                    placeholder="e.g. Microsoft 365 Enterprise Deployment"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Description
                  </label>
                  <textarea
                    value={opportunityForm.description}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Describe the opportunity, requirement or business need..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Service Type
                  </label>
                  <input
                    type="text"
                    value={opportunityForm.service_type}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        service_type: event.target.value,
                      }))
                    }
                    placeholder="e.g. Cloud Services"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Source
                  </label>
                  <input
                    type="text"
                    value={opportunityForm.source}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        source: event.target.value,
                      }))
                    }
                    placeholder="e.g. Tender, Referral, LinkedIn"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Estimated Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={opportunityForm.estimated_value}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        estimated_value: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={opportunityForm.currency}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        currency: event.target.value.toUpperCase(),
                      }))
                    }
                    maxLength={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm uppercase text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Probability (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={opportunityForm.probability}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        probability: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Expected Close Date
                  </label>
                  <input
                    type="date"
                    value={opportunityForm.expected_close_date}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        expected_close_date: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Stage
                  </label>
                  <select
                    value={opportunityForm.stage}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        stage: event.target
                          .value as ProcurementOpportunityStage,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  >
                    {PIPELINE_COLUMNS.map((item) => (
                      <option key={item.stage} value={item.stage}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Status
                  </label>
                  <select
                    value={opportunityForm.status}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        status: event.target
                          .value as ProcurementOpportunityStatus,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  >
                    {OPPORTUNITY_STATUSES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Assigned To
                  </label>
                  <select
                    value={opportunityForm.assigned_to}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        assigned_to: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {options.staff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-6 md:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={opportunityForm.vendor_registration_required}
                      onChange={(event) =>
                        setOpportunityForm((current) => ({
                          ...current,
                          vendor_registration_required: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Vendor registration required
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={opportunityForm.rfq_required}
                      onChange={(event) =>
                        setOpportunityForm((current) => ({
                          ...current,
                          rfq_required: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    RFQ / RFP required
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Notes
                  </label>
                  <textarea
                    value={opportunityForm.notes}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Internal notes..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingOpportunity
                      ? "Update Opportunity"
                      : "Create Opportunity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmStageChange)}
        title="Change opportunity stage?"
        message={
          confirmStageChange
            ? `Move ${confirmStageChange.opportunity.opportunity_code} to ${formatStage(confirmStageChange.stage)}?`
            : "Confirm this opportunity stage change."
        }
        confirmText="Move Opportunity"
        cancelText="Cancel"
        loading={processingId === confirmStageChange?.opportunity.id}
        onCancel={() => {
          if (!processingId) {
            setConfirmStageChange(null);
          }
        }}
        onConfirm={() => {
          if (confirmStageChange) {
            void moveOpportunity(
              confirmStageChange.opportunity,
              confirmStageChange.stage
            );
          }
        }}
      />

      <ConfirmModal
        open={Boolean(confirmLostOpportunity)}
        title="Mark opportunity as lost?"
        message={
          confirmLostOpportunity
            ? `This will mark ${confirmLostOpportunity.opportunity_code} as lost. You can still review its historical record afterward.`
            : "Confirm marking this opportunity as lost."
        }
        confirmText="Mark as Lost"
        cancelText="Cancel"
        variant="danger"
        loading={processingId === confirmLostOpportunity?.id}
        onCancel={() => {
          if (!processingId) {
            setConfirmLostOpportunity(null);
          }
        }}
        onConfirm={() => {
          if (confirmLostOpportunity) {
            void markOpportunityLost(confirmLostOpportunity);
          }
        }}
      />
    </div>
  );
}
