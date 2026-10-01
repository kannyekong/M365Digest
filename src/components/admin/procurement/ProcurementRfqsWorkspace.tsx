import {
  AlertCircle,
  Archive,
  Cable,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  CreateProcurementRfqInput,
  ProcurementClientOption,
  ProcurementContactOption,
  ProcurementOpportunityOption,
  ProcurementPortalListItem,
  ProcurementRfqListItem,
  ProcurementRfqPriority,
  ProcurementRfqRequirement,
  ProcurementRfqStatus,
  ProcurementRfqType,
  ProcurementStaffOption,
} from "../../../types/procurement";
import { toast } from "react-toastify";
import { SummaryCard } from "../../../islands/AdminSummaryCard";

interface ProcurementRfqFormOptions {
  clients: ProcurementClientOption[];
  contacts: ProcurementContactOption[];
  staff: ProcurementStaffOption[];
  portals: ProcurementPortalListItem[];
  opportunities: ProcurementOpportunityOption[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
}

type RfqFormState = {
  client_id: string;
  opportunity_id: string;
  contact_id: string;
  portal_id: string;
  assigned_to: string;
  request_type: ProcurementRfqType;
  title: string;
  description: string;
  status: ProcurementRfqStatus;
  priority: ProcurementRfqPriority;
  estimated_value: string;
  currency: string;
  issue_date: string;
  clarification_deadline: string;
  submission_deadline: string;
  evaluation_date: string;
  award_date: string;
  source: string;
  source_reference: string;
  submission_instructions: string;
  notes: string;
  requirements: ProcurementRfqRequirement[];
};

const DEFAULT_REQUIREMENTS: ProcurementRfqRequirement[] = [
  {
    name: "Company profile",
    required: true,
    completed: false,
  },
  {
    name: "Technical proposal",
    required: true,
    completed: false,
  },
  {
    name: "Financial proposal",
    required: true,
    completed: false,
  },
  {
    name: "Tax clearance",
    required: true,
    completed: false,
  },
  {
    name: "Relevant certifications",
    required: false,
    completed: false,
  },
];

const STATUS_OPTIONS: Array<{
  value: ProcurementRfqStatus;
  label: string;
}> = [
  { value: "received", label: "Received" },
  { value: "reviewing", label: "Reviewing" },
  { value: "qualification", label: "Qualification" },
  { value: "preparing", label: "Preparing" },
  { value: "submitted", label: "Submitted" },
  { value: "under_evaluation", label: "Under Evaluation" },
  { value: "clarification", label: "Clarification" },
  { value: "awarded", label: "Awarded" },
  { value: "not_awarded", label: "Not Awarded" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

const TYPE_OPTIONS: Array<{
  value: ProcurementRfqType;
  label: string;
}> = [
  { value: "rfq", label: "RFQ" },
  { value: "rfp", label: "RFP" },
  { value: "tender", label: "Tender" },
];

const PRIORITY_OPTIONS: Array<{
  value: ProcurementRfqPriority;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

// Creates the initial form state for a new RFQ/RFP.
function createInitialForm(): RfqFormState {
  return {
    client_id: "",
    opportunity_id: "",
    contact_id: "",
    portal_id: "",
    assigned_to: "",
    request_type: "rfq",
    title: "",
    description: "",
    status: "received",
    priority: "medium",
    estimated_value: "",
    currency: "NGN",
    issue_date: "",
    clarification_deadline: "",
    submission_deadline: "",
    evaluation_date: "",
    award_date: "",
    source: "",
    source_reference: "",
    submission_instructions: "",
    notes: "",
    requirements: DEFAULT_REQUIREMENTS.map((item) => ({
      ...item,
    })),
  };
}

// Formats a date for display in the workspace.
function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Determines whether an RFQ/RFP deadline has passed.
function isOverdue(item: ProcurementRfqListItem): boolean {
  if (
    !item.submission_deadline ||
    ["awarded", "not_awarded", "cancelled", "expired"].includes(item.status)
  ) {
    return false;
  }

  const deadline = new Date(`${item.submission_deadline}T23:59:59`);

  return deadline.getTime() < Date.now();
}

// Returns the number of calendar days until the submission deadline.
function daysUntilDeadline(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const today = new Date();
  const deadline = new Date(`${value}T23:59:59`);

  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  return Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);
}

// Converts an RFQ/RFP into the API input shape.
function buildPayload(form: RfqFormState): CreateProcurementRfqInput {
  return {
    client_id: form.client_id,
    opportunity_id: form.opportunity_id || null,
    contact_id: form.contact_id || null,
    portal_id: form.portal_id || null,
    assigned_to: form.assigned_to || null,
    request_type: form.request_type,
    title: form.title.trim(),
    description: form.description.trim() || null,
    status: form.status,
    priority: form.priority,
    estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
    currency: form.currency.trim() || "NGN",
    issue_date: form.issue_date || null,
    clarification_deadline: form.clarification_deadline || null,
    submission_deadline: form.submission_deadline || null,
    evaluation_date: form.evaluation_date || null,
    award_date: form.award_date || null,
    source: form.source.trim() || null,
    source_reference: form.source_reference.trim() || null,
    requirements: form.requirements,
    submission_instructions: form.submission_instructions.trim() || null,
    notes: form.notes.trim() || null,
  };
}

export default function ProcurementRfqsWorkspace() {
  const [rfqs, setRfqs] = useState<ProcurementRfqListItem[]>([]);
  const [options, setOptions] = useState<ProcurementRfqFormOptions>({
    clients: [],
    contacts: [],
    staff: [],
    portals: [],
    opportunities: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [creatingProposalId, setCreatingProposalId] = useState<string | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRfq, setEditingRfq] = useState<ProcurementRfqListItem | null>(
    null
  );
  const [form, setForm] = useState<RfqFormState>(createInitialForm());

  const pageSize = 15;

  const totalPages = Math.max(Math.ceil(count / pageSize), 1);

  const selectedClient = form.client_id;

  const availableContacts = useMemo(
    () =>
      options.contacts.filter(
        (contact) => contact.client_id === selectedClient
      ),
    [options.contacts, selectedClient]
  );

  const availableOpportunities = useMemo(
    () =>
      options.opportunities.filter(
        (opportunity) =>
          !selectedClient || opportunity.client_id === selectedClient
      ),
    [options.opportunities, selectedClient]
  );

  const statistics = useMemo(() => {
    const active = rfqs.filter(
      (item) =>
        !["awarded", "not_awarded", "cancelled", "expired"].includes(
          item.status
        )
    );

    return {
      total: count,
      active: active.length,
      overdue: rfqs.filter(isOverdue).length,
      awarded: rfqs.filter((item) => item.status === "awarded").length,
    };
  }, [count, rfqs]);

  /**
   * Creates or retrieves the proposal associated with an RFQ
   * and opens that proposal in the proposal workspace.
   */
  async function handleCreateProposal(
    rfq: ProcurementRfqListItem
  ): Promise<void> {
    try {
      setCreatingProposalId(rfq.id);

      const response = await fetch(
        `/api/admin/procurement/rfqs/${rfq.id}/create-proposal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.data?.id) {
        throw new Error(
          result.error ?? "Unable to create the procurement proposal."
        );
      }

      window.location.href = `/admin/procurement/proposals?proposal=${result.data.id}`;
    } catch (error) {
      console.error("Failed to create RFQ proposal:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to create the procurement proposal."
      );
    } finally {
      setCreatingProposalId(null);
    }
  }

  // Loads RFQ/RFP records from the API.
  async function loadRfqs() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (typeFilter) {
        params.set("request_type", typeFilter);
      }

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (priorityFilter) {
        params.set("priority", priorityFilter);
      }

      const response = await fetch(
        `/api/admin/procurement/rfqs?${params.toString()}`
      );

      const result: ApiResponse<ProcurementRfqListItem[]> =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to load RFQs.");
      }

      setRfqs(result.data ?? []);
      setCount(result.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load RFQs.");
    } finally {
      setLoading(false);
    }
  }

  // Loads clients, contacts, staff, portals and opportunities for forms.
  async function loadOptions() {
    try {
      const response = await fetch("/api/admin/procurement/options");

      const result: ApiResponse<ProcurementRfqFormOptions> =
        await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error ?? "Unable to load procurement options.");
      }

      setOptions({
        clients: result.data.clients ?? [],
        contacts: result.data.contacts ?? [],
        staff: result.data.staff ?? [],
        portals: result.data.portals ?? [],
        opportunities: result.data.opportunities ?? [],
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load procurement options."
      );
    }
  }

  useEffect(() => {
    void loadOptions();
  }, []);

  useEffect(() => {
    void loadRfqs();
  }, [page, search, typeFilter, statusFilter, priorityFilter]);

  // Opens the create RFQ/RFP modal.
  function openCreateModal() {
    setEditingRfq(null);
    setForm(createInitialForm());
    setModalOpen(true);
  }

  // Opens the edit RFQ/RFP modal.
  function openEditModal(item: ProcurementRfqListItem) {
    setEditingRfq(item);

    setForm({
      client_id: item.client_id,
      opportunity_id: item.opportunity_id ?? "",
      contact_id: item.contact_id ?? "",
      portal_id: item.portal_id ?? "",
      assigned_to: item.assigned_to ?? "",
      request_type: item.request_type,
      title: item.title,
      description: item.description ?? "",
      status: item.status,
      priority: item.priority,
      estimated_value:
        item.estimated_value !== null ? String(item.estimated_value) : "",
      currency: item.currency,
      issue_date: item.issue_date ?? "",
      clarification_deadline: item.clarification_deadline ?? "",
      submission_deadline: item.submission_deadline ?? "",
      evaluation_date: item.evaluation_date ?? "",
      award_date: item.award_date ?? "",
      source: item.source ?? "",
      source_reference: item.source_reference ?? "",
      submission_instructions: item.submission_instructions ?? "",
      notes: item.notes ?? "",
      requirements:
        item.requirements?.map((requirement) => ({
          ...requirement,
        })) ?? [],
    });

    setModalOpen(true);
  }

  /**
   * Opens the follow-up workspace with the current procurement record
   * attached as context.
   */
  function openFollowUp(context: string): void {
    window.location.href = `/admin/procurement/follow-ups?${context}`;
  }

  // Saves a new or existing RFQ/RFP.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.client_id || !form.title.trim()) {
      setError("Organisation and title are required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = buildPayload(form);

      const response = await fetch(
        editingRfq
          ? `/api/admin/procurement/rfqs/${editingRfq.id}`
          : "/api/admin/procurement/rfqs",
        {
          method: editingRfq ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result: ApiResponse<ProcurementRfqListItem> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to save RFQ.");
      }

      setModalOpen(false);
      await loadRfqs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save RFQ.");
    } finally {
      setSaving(false);
    }
  }

  // Archives an RFQ/RFP.
  async function archiveRfq(id: string) {
    if (
      !window.confirm(
        "Archive this RFQ/RFP? It will be removed from the active procurement list."
      )
    ) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(`/api/admin/procurement/rfqs/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "archive",
        }),
      });

      const result: ApiResponse<unknown> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to archive RFQ.");
      }

      await loadRfqs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive RFQ.");
    }
  }

  // Changes the operational status of an RFQ/RFP.
  async function changeStatus(id: string, status: ProcurementRfqStatus) {
    try {
      const response = await fetch(`/api/admin/procurement/rfqs/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "status",
          status,
        }),
      });

      const result: ApiResponse<unknown> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to update RFQ status.");
      }

      await loadRfqs();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update RFQ status."
      );
    }
  }

  // Adds a custom requirement to the RFQ/RFP checklist.
  function addRequirement() {
    setForm((current) => ({
      ...current,
      requirements: [
        ...current.requirements,
        {
          name: "",
          required: true,
          completed: false,
        },
      ],
    }));
  }

  // Removes a requirement from the checklist.
  function removeRequirement(index: number) {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  // Updates one requirement in the checklist.
  function updateRequirement(
    index: number,
    changes: Partial<ProcurementRfqRequirement>
  ) {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.map((requirement, itemIndex) =>
        itemIndex === index ? { ...requirement, ...changes } : requirement
      ),
    }));
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded-lg p-1 hover:bg-red-500/10"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={FileText}
          label="Total RFQs / RFPs"
          value={statistics.total}
          iconBackgroundColor="bg-green-50"
          iconColor="text-green-500"
        />

        <SummaryCard
          icon={Clock3}
          label="Active"
          value={statistics.active}
          iconBackgroundColor="bg-blue-50"
          iconColor="text-blue-500"
        />

        <SummaryCard
          icon={AlertCircle}
          label="Overdue"
          value={statistics.overdue}
          description={statistics.overdue > 0}
          iconBackgroundColor="bg-red-50"
          iconColor="text-red-500"
        />

        <SummaryCard
          icon={Trophy}
          label="Awarded"
          value={statistics.awarded}
          iconBackgroundColor="bg-green-50"
          iconColor="text-green-500"
        />
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
        <div className="border-b border-slate-200 p-4 dark:border-white/10">
          <div className="flex w-full items-center gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40 dark:text-white/40" />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search RFQ, RFP or reference..."
                className="h-[42px] w-full rounded-xl border border-slate-200 bg-transparent pl-10 pr-3 text-sm outline-none transition focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
              className="h-[42px] w-[140px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-neutral-900"
            >
              <option value="">All Types</option>
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="h-[42px] w-[170px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-neutral-900"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => {
                setPriorityFilter(event.target.value);
                setPage(1);
              }}
              className="h-[42px] w-[150px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-neutral-900"
            >
              <option value="">All Priorities</option>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void loadRfqs()}
              className="inline-flex h-[42px] shrink-0 items-center justify-center rounded-xl border border-slate-200 px-3 transition hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/[0.06]"
              title="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-[42px] shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
            >
              <Plus className="h-4 w-4" />
              Add RFQ / RFP
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-black/50 dark:border-white/10 dark:text-white/40">
              <tr>
                <th className="px-5 py-4">Request</th>
                <th className="px-5 py-4">Organisation</th>
                <th className="px-5 py-4">Opportunity</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Deadline</th>
                <th className="px-5 py-4">Assigned To</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/10 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-16 text-center text-sm text-black/50 dark:text-white/40"
                  >
                    Loading RFQs and RFPs...
                  </td>
                </tr>
              ) : rfqs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <FileText className="mx-auto mb-3 h-8 w-8 text-black/20 dark:text-white/20" />
                    <p className="text-sm font-medium">No RFQs or RFPs found</p>
                    <p className="mt-1 text-sm text-black/50 dark:text-white/40">
                      Add your first procurement request to start tracking
                      submissions.
                    </p>
                  </td>
                </tr>
              ) : (
                rfqs.map((item) => {
                  const overdue = isOverdue(item);
                  const days = daysUntilDeadline(item.submission_deadline);

                  return (
                    <tr
                      key={item.id}
                      className="group transition hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold uppercase dark:border-white/10">
                              {item.request_type}
                            </span>

                            <span className="text-xs text-black/50 dark:text-white/40">
                              {item.reference_code}
                            </span>
                          </div>

                          <div className="mt-1 max-w-[260px] truncate text-sm font-semibold">
                            {item.title}
                          </div>

                          <div className="mt-1 max-w-[260px] truncate text-sm font-semibold">
                            <PriorityBadge priority={item.priority} />
                          </div>
                        </button>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {item.client_name ?? "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-black/60 dark:text-white/50">
                        {item.opportunity_name ?? "—"}
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={item.status}
                          onChange={(event) =>
                            void changeStatus(
                              item.id,
                              event.target.value as ProcurementRfqStatus
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-xs font-medium dark:border-white/10"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                              className="bg-white text-black dark:bg-neutral-900 dark:text-white"
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <div
                          className={`flex items-center gap-2 text-sm ${
                            overdue
                              ? "font-semibold text-red-600 dark:text-red-400"
                              : ""
                          }`}
                        >
                          <CalendarDays className="h-4 w-4 shrink-0" />

                          <div>
                            <div>{formatDate(item.submission_deadline)}</div>

                            {days !== null && (
                              <div className="text-[11px] text-black/50 dark:text-white/40">
                                {overdue
                                  ? `${Math.abs(days)} day${
                                      Math.abs(days) === 1 ? "" : "s"
                                    } overdue`
                                  : days === 0
                                    ? "Due today"
                                    : `${days} day${
                                        days === 1 ? "" : "s"
                                      } remaining`}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {item.assigned_to_name ?? "Unassigned"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1 opacity-70 transition group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="inline-flex h-8 items-center rounded-lg border text-blue-500 border-blue-100 px-2 text-xs font-medium transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => void archiveRfq(item.id)}
                            className="inline-flex h-8 items-center rounded-lg border text-orange-500 border-orange-100 px-2 text-xs font-medium transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCreateProposal(item)}
                            disabled={creatingProposalId === item.id}
                            className="inline-flex h-8 items-center rounded-lg border border-black/10 px-2 text-xs font-medium transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
                            title="Create proposal"
                          >
                            {creatingProposalId === item.id ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <FileText className="w-4 h-4" />
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            title="Create follow-up"
                            onClick={() => openFollowUp(`lead=${item.id}`)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-green-500 transition hover:border-green-400 hover:text-green-600"
                          >
                            <Cable className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-white/10">
          <p className="text-sm text-black/50 dark:text-white/40">
            {count === 0
              ? "No records"
              : `Showing ${(page - 1) * pageSize + 1}–${Math.min(
                  page * pageSize,
                  count
                )} of ${count}`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="rounded-lg border border-slate-200 p-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-2 text-sm">
              {page} / {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(current + 1, totalPages))
              }
              className="rounded-lg border border-slate-200 p-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-white/10">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingRfq ? "Edit RFQ / RFP" : "Add RFQ / RFP"}
                </h2>

                <p className="mt-1 text-sm text-black/50 dark:text-white/40">
                  Track the procurement request through qualification,
                  preparation and submission.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-2 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <div className="grid gap-6 p-6 lg:grid-cols-2">
                <div className="space-y-5">
                  <Field label="Organisation" required>
                    <select
                      required
                      value={form.client_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          client_id: event.target.value,
                          contact_id: "",
                          opportunity_id: "",
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="">Select organisation</option>

                      {options.clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.display_name ??
                            client.company_name ??
                            "Unnamed organisation"}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Request Type" required>
                      <select
                        value={form.request_type}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            request_type: event.target
                              .value as ProcurementRfqType,
                          }))
                        }
                        className={inputClass}
                      >
                        {TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Priority">
                      <select
                        value={form.priority}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            priority: event.target
                              .value as ProcurementRfqPriority,
                          }))
                        }
                        className={inputClass}
                      >
                        {PRIORITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Title" required>
                    <input
                      required
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="e.g. Microsoft 365 Managed Services"
                    />
                  </Field>

                  <Field label="Opportunity">
                    <select
                      value={form.opportunity_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          opportunity_id: event.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="">Select opportunity</option>

                      {availableOpportunities.map((opportunity) => (
                        <option key={opportunity.id} value={opportunity.id}>
                          {opportunity.opportunity_code} — {opportunity.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Primary Contact">
                    <select
                      value={form.contact_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          contact_id: event.target.value,
                        }))
                      }
                      className={inputClass}
                      disabled={!form.client_id}
                    >
                      <option value="">Select contact</option>

                      {availableContacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {[contact.first_name, contact.last_name]
                            .filter(Boolean)
                            .join(" ")}
                          {contact.job_title ? ` — ${contact.job_title}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Portal">
                      <select
                        value={form.portal_id}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            portal_id: event.target.value,
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="">Select portal</option>

                        {options.portals.map((portal) => (
                          <option key={portal.id} value={portal.id}>
                            {portal.name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Assigned To">
                      <select
                        value={form.assigned_to}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            assigned_to: event.target.value,
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="">Unassigned</option>

                        {options.staff.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {[staff.first_name, staff.last_name]
                              .filter(Boolean)
                              .join(" ")}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Description">
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      rows={4}
                      className={textareaClass}
                      placeholder="Describe the procurement requirement..."
                    />
                  </Field>
                </div>

                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Estimated Value">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.estimated_value}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            estimated_value: event.target.value,
                          }))
                        }
                        className={inputClass}
                        placeholder="0.00"
                      />
                    </Field>

                    <Field label="Currency">
                      <input
                        value={form.currency}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            currency: event.target.value,
                          }))
                        }
                        className={inputClass}
                        placeholder="NGN"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Issue Date">
                      <input
                        type="date"
                        value={form.issue_date}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            issue_date: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Submission Deadline">
                      <input
                        type="date"
                        value={form.submission_deadline}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            submission_deadline: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Clarification Deadline">
                      <input
                        type="date"
                        value={form.clarification_deadline}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            clarification_deadline: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Evaluation Date">
                      <input
                        type="date"
                        value={form.evaluation_date}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            evaluation_date: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <Field label="Source">
                    <input
                      value={form.source}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          source: event.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="Procurement portal, referral, direct email..."
                    />
                  </Field>

                  <Field label="Source Reference">
                    <input
                      value={form.source_reference}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          source_reference: event.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="Tender number, portal reference, email reference..."
                    />
                  </Field>

                  <Field label="Submission Instructions">
                    <textarea
                      value={form.submission_instructions}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          submission_instructions: event.target.value,
                        }))
                      }
                      rows={3}
                      className={textareaClass}
                      placeholder="Submission process, portal instructions, document naming..."
                    />
                  </Field>
                </div>
              </div>

              <div className="border-t border-slate-200 px-6 py-6 dark:border-white/10">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Submission Requirements
                    </h3>

                    <p className="mt-1 text-xs text-black/50 dark:text-white/40">
                      Track the documents and requirements needed before
                      submission.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addRequirement}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/[0.06]"
                  >
                    <Plus className="h-4 w-4" />
                    Add Requirement
                  </button>
                </div>

                <div className="space-y-2">
                  {form.requirements.map((requirement, index) => (
                    <div
                      key={`${index}-${requirement.name}`}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-white/10"
                    >
                      <input
                        type="checkbox"
                        checked={requirement.completed}
                        onChange={(event) =>
                          updateRequirement(index, {
                            completed: event.target.checked,
                            completed_at: event.target.checked
                              ? new Date().toISOString()
                              : null,
                          })
                        }
                        className="h-4 w-4"
                      />

                      <input
                        value={requirement.name}
                        onChange={(event) =>
                          updateRequirement(index, {
                            name: event.target.value,
                          })
                        }
                        placeholder="Requirement name"
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none dark:border-white/10"
                      />

                      <label className="flex items-center gap-2 whitespace-nowrap text-xs text-black/60 dark:text-white/50">
                        <input
                          type="checkbox"
                          checked={requirement.required}
                          onChange={(event) =>
                            updateRequirement(index, {
                              required: event.target.checked,
                            })
                          }
                        />
                        Required
                      </label>

                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        className="rounded-lg p-2 text-black/40 hover:bg-red-500/10 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400"
                        title="Remove requirement"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 px-6 py-6 dark:border-white/10">
                <Field label="Notes">
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={3}
                    className={textareaClass}
                    placeholder="Internal procurement notes..."
                  />
                </Field>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/[0.06]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  {saving
                    ? "Saving..."
                    : editingRfq
                      ? "Save Changes"
                      : "Create RFQ / RFP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm outline-none transition focus:border-black/30 dark:border-white/10 dark:focus:border-white/30";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-transparent px-3 py-3 text-sm outline-none transition focus:border-black/30 dark:border-white/10 dark:focus:border-white/30";

// Renders a labelled form field.
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-black/60 dark:text-white/50">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      {children}
    </label>
  );
}

// Renders the RFQ/RFP priority badge.
function PriorityBadge({ priority }: { priority: ProcurementRfqPriority }) {
  const label = priority.charAt(0).toUpperCase() + priority.slice(1);

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        priority === "urgent"
          ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
          : priority === "high"
            ? "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400"
            : priority === "medium"
              ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "border-slate-200 bg-black/[0.03] text-black/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/50"
      }`}
    >
      {label}
    </span>
  );
}
