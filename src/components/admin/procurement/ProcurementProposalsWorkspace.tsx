import {
  AlertCircle,
  Archive,
  Cable,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Edit3,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import ConfirmModal from "../../../islands/ConfirmModal";
import type {
  CreateProcurementProposalInput,
  ProcurementClientOption,
  ProcurementContactOption,
  ProcurementOpportunityOption,
  ProcurementProposalListItem,
  ProcurementProposalRequirement,
  ProcurementProposalStatus,
  ProcurementRfqOption,
  ProcurementStaffOption,
  ProcurementProposalOption,
} from "../../../types/procurement";
import { toast } from "react-toastify";
import { SummaryCard } from "../../../islands/AdminSummaryCard";

interface ProcurementProposalFormOptions {
  clients: ProcurementClientOption[];
  contacts: ProcurementContactOption[];
  staff: ProcurementStaffOption[];
  opportunities: ProcurementOpportunityOption[];
  rfqs: ProcurementRfqOption[];
  proposals: ProcurementProposalOption[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
}

type ProposalFormState = {
  client_id: string;
  opportunity_id: string;
  rfq_id: string;
  contact_id: string;
  assigned_to: string;
  title: string;
  status: ProcurementProposalStatus;
  quoted_value: string;
  currency: string;
  submission_date: string;
  valid_until: string;
  expected_decision_date: string;
  executive_summary: string;
  scope_summary: string;
  commercial_notes: string;
  submission_instructions: string;
  internal_notes: string;
  source_reference: string;
  requirements: ProcurementProposalRequirement[];
};

const STATUS_OPTIONS: Array<{
  value: ProcurementProposalStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "internal_review", label: "Internal Review" },
  { value: "approved", label: "Approved" },
  { value: "submitted", label: "Submitted" },
  { value: "under_evaluation", label: "Under Evaluation" },
  { value: "clarification", label: "Clarification" },
  { value: "negotiation", label: "Negotiation" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

const DEFAULT_REQUIREMENTS: ProcurementProposalRequirement[] = [
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
    name: "Company profile",
    required: true,
    completed: false,
  },
  {
    name: "Implementation plan",
    required: true,
    completed: false,
  },
  {
    name: "Relevant certifications",
    required: false,
    completed: false,
  },
];

// Creates the default proposal form state.
function createInitialForm(): ProposalFormState {
  return {
    client_id: "",
    opportunity_id: "",
    rfq_id: "",
    contact_id: "",
    assigned_to: "",
    title: "",
    status: "draft",
    quoted_value: "",
    currency: "NGN",
    submission_date: "",
    valid_until: "",
    expected_decision_date: "",
    executive_summary: "",
    scope_summary: "",
    commercial_notes: "",
    submission_instructions: "",
    internal_notes: "",
    source_reference: "",
    requirements: DEFAULT_REQUIREMENTS.map((item) => ({
      ...item,
    })),
  };
}

// Formats a date for display.
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

// Determines whether a proposal has passed its validity date.
function isExpired(item: ProcurementProposalListItem): boolean {
  if (
    !item.valid_until ||
    ["accepted", "rejected", "cancelled"].includes(item.status)
  ) {
    return false;
  }

  const date = new Date(`${item.valid_until}T23:59:59`);

  return date.getTime() < Date.now();
}

// Calculates days remaining before proposal expiry.
function daysUntilExpiry(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const today = new Date();
  const expiry = new Date(`${value}T23:59:59`);

  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  return Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
}

// Builds the API payload from form state.
function buildPayload(form: ProposalFormState): CreateProcurementProposalInput {
  return {
    client_id: form.client_id,
    opportunity_id: form.opportunity_id || null,
    rfq_id: form.rfq_id || null,
    contact_id: form.contact_id || null,
    assigned_to: form.assigned_to || null,
    title: form.title.trim(),
    status: form.status,
    quoted_value: form.quoted_value ? Number(form.quoted_value) : null,
    currency: form.currency.trim() || "NGN",
    submission_date: form.submission_date || null,
    valid_until: form.valid_until || null,
    expected_decision_date: form.expected_decision_date || null,
    executive_summary: form.executive_summary.trim() || null,
    scope_summary: form.scope_summary.trim() || null,
    commercial_notes: form.commercial_notes.trim() || null,
    submission_instructions: form.submission_instructions.trim() || null,
    internal_notes: form.internal_notes.trim() || null,
    source_reference: form.source_reference.trim() || null,
    requirements: form.requirements,
  };
}

export default function ProcurementProposalsWorkspace() {
  const [proposals, setProposals] = useState<ProcurementProposalListItem[]>([]);

  const [options, setOptions] = useState<ProcurementProposalFormOptions>({
    clients: [],
    contacts: [],
    staff: [],
    opportunities: [],
    rfqs: [],
    proposals: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Store the proposal that is waiting for version-creation confirmation.
  const [proposalVersionTarget, setProposalVersionTarget] =
    useState<ProcurementProposalListItem | null>(null);

  // Track whether proposal version creation is currently running.
  const [creatingVersionId, setCreatingVersionId] = useState<string | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] =
    useState<ProcurementProposalListItem | null>(null);

  const [form, setForm] = useState<ProposalFormState>(createInitialForm());

  const pageSize = 15;

  const totalPages = Math.max(Math.ceil(count / pageSize), 1);

  const availableContacts = useMemo(
    () =>
      options.contacts.filter(
        (contact) => !form.client_id || contact.client_id === form.client_id
      ),
    [options.contacts, form.client_id]
  );

  const availableOpportunities = useMemo(
    () =>
      options.opportunities.filter(
        (opportunity) =>
          !form.client_id || opportunity.client_id === form.client_id
      ),
    [options.opportunities, form.client_id]
  );

  const availableRfqs = useMemo(
    () =>
      options.rfqs.filter(
        (rfq) => !form.client_id || rfq.client_id === form.client_id
      ),
    [options.rfqs, form.client_id]
  );

  const statistics = useMemo(() => {
    const active = proposals.filter(
      (proposal) =>
        !["accepted", "rejected", "cancelled", "expired"].includes(
          proposal.status
        )
    );

    return {
      total: count,
      active: active.length,
      expiring: proposals.filter((proposal) => {
        const days = daysUntilExpiry(proposal.valid_until);

        return (
          days !== null &&
          days >= 0 &&
          days <= 14 &&
          !["accepted", "rejected", "cancelled"].includes(proposal.status)
        );
      }).length,
      accepted: proposals.filter((proposal) => proposal.status === "accepted")
        .length,
    };
  }, [count, proposals]);

  /**
   * Creates the next proposal version after the user confirms the action.
   */
  async function handleCreateProposalVersion(): Promise<void> {
    if (!proposalVersionTarget) {
      return;
    }

    const proposal = proposalVersionTarget;

    try {
      setCreatingVersionId(proposal.id);

      const response = await fetch(
        `/api/admin/procurement/proposals/${proposal.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "create_version",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.data?.id) {
        throw new Error(
          result.error ?? "Unable to create the proposal version."
        );
      }

      toast.success(
        `Proposal version ${result.data.version} created successfully.`
      );

      setProposalVersionTarget(null);

      /**
       * Open the newly created proposal version so the user can continue
       * working on the new draft immediately.
       */
      window.location.href = `/admin/procurement/proposals?proposal=${result.data.id}`;
    } catch (error) {
      console.error("Failed to create proposal version:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create the proposal version."
      );
    } finally {
      setCreatingVersionId(null);
    }
  }

  // Loads proposal records from the API.
  async function loadProposals() {
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

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      const response = await fetch(
        `/api/admin/procurement/proposals?${params.toString()}`
      );

      const result: ApiResponse<ProcurementProposalListItem[]> =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Unable to load procurement proposals."
        );
      }

      setProposals(result.data ?? []);
      setCount(result.count ?? 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load procurement proposals."
      );
    } finally {
      setLoading(false);
    }
  }

  // Loads proposal form options.
  async function loadOptions() {
    try {
      const response = await fetch("/api/admin/procurement/options");

      const result: ApiResponse<ProcurementProposalFormOptions> =
        await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error ?? "Unable to load procurement options.");
      }

      setOptions({
        clients: result.data.clients ?? [],
        contacts: result.data.contacts ?? [],
        staff: result.data.staff ?? [],
        opportunities: result.data.opportunities ?? [],
        rfqs: result.data.rfqs ?? [],
        proposals: result.data.proposals ?? [],
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
    void loadProposals();
  }, [page, search, statusFilter]);

  // Opens a blank proposal creation form.
  function openCreateModal() {
    setEditingProposal(null);
    setForm(createInitialForm());
    setModalOpen(true);
  }

  // Opens an existing proposal for editing.
  function openEditModal(proposal: ProcurementProposalListItem) {
    setEditingProposal(proposal);

    setForm({
      client_id: proposal.client_id,
      opportunity_id: proposal.opportunity_id ?? "",
      rfq_id: proposal.rfq_id ?? "",
      contact_id: proposal.contact_id ?? "",
      assigned_to: proposal.assigned_to ?? "",
      title: proposal.title,
      status: proposal.status,
      quoted_value:
        proposal.quoted_value !== null ? String(proposal.quoted_value) : "",
      currency: proposal.currency,
      submission_date: proposal.submission_date ?? "",
      valid_until: proposal.valid_until ?? "",
      expected_decision_date: proposal.expected_decision_date ?? "",
      executive_summary: proposal.executive_summary ?? "",
      scope_summary: proposal.scope_summary ?? "",
      commercial_notes: proposal.commercial_notes ?? "",
      submission_instructions: proposal.submission_instructions ?? "",
      internal_notes: proposal.internal_notes ?? "",
      source_reference: proposal.source_reference ?? "",
      requirements:
        proposal.requirements?.map((item) => ({
          ...item,
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

  // Saves a new or existing proposal.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.client_id || !form.title.trim()) {
      setError("Organisation and proposal title are required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = buildPayload(form);

      const response = await fetch(
        editingProposal
          ? `/api/admin/procurement/proposals/${editingProposal.id}`
          : "/api/admin/procurement/proposals",
        {
          method: editingProposal ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result: ApiResponse<unknown> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to save procurement proposal.");
      }

      setModalOpen(false);
      await loadProposals();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save procurement proposal."
      );
    } finally {
      setSaving(false);
    }
  }

  // Archives an existing proposal.
  async function archiveProposal(id: string) {
    if (
      !window.confirm(
        "Archive this proposal? It will be removed from the active proposal list."
      )
    ) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(`/api/admin/procurement/proposals/${id}`, {
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
        throw new Error(result.error ?? "Unable to archive proposal.");
      }

      await loadProposals();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to archive proposal."
      );
    }
  }

  // Changes the proposal lifecycle status.
  async function changeStatus(id: string, status: ProcurementProposalStatus) {
    try {
      const response = await fetch(`/api/admin/procurement/proposals/${id}`, {
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
        throw new Error(result.error ?? "Unable to update proposal status.");
      }

      await loadProposals();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update proposal status."
      );
    }
  }

  // Adds a proposal requirement.
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

  // Removes a proposal requirement.
  function removeRequirement(index: number) {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  // Updates one proposal requirement.
  function updateRequirement(
    index: number,
    changes: Partial<ProcurementProposalRequirement>
  ) {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.map((requirement, itemIndex) =>
        itemIndex === index
          ? {
              ...requirement,
              ...changes,
            }
          : requirement
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
          label="Total Proposals"
          value={statistics.total}
          iconBackgroundColor="bg-orange-50"
          iconColor="text-orange-500"
        />

        <SummaryCard
          icon={Clock3}
          label="Active"
          value={statistics.active}
          iconBackgroundColor="bg-blue-50"
          iconColor="text-blue-500"
        />

        <SummaryCard
          icon={CalendarDays}
          label="Expiring Soon"
          value={statistics.expiring}
          description={statistics.expiring > 0}
          iconBackgroundColor="bg-red-50"
          iconColor="text-red-500"
        />

        <SummaryCard
          icon={Trophy}
          label="Accepted"
          value={statistics.accepted}
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
                placeholder="Search proposal, title or reference..."
                className="h-[42px] w-full rounded-xl border border-slate-200 bg-transparent pl-10 pr-3 text-sm outline-none transition focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="h-[42px] w-[190px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-neutral-900"
            >
              <option value="">All Statuses</option>

              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void loadProposals()}
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
              Add Proposal
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-black/50 dark:border-white/10 dark:text-white/40">
              <tr>
                <th className="px-5 py-4">Proposal</th>
                <th className="px-5 py-4">Organisation</th>
                <th className="px-5 py-4">RFQ / RFP</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Valid Until</th>
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
                    Loading proposals...
                  </td>
                </tr>
              ) : proposals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <FileText className="mx-auto mb-3 h-8 w-8 text-black/20 dark:text-white/20" />

                    <p className="text-sm font-medium">No proposals found</p>

                    <p className="mt-1 text-sm text-black/50 dark:text-white/40">
                      Create a proposal manually or create one directly from an
                      RFQ/RFP.
                    </p>
                  </td>
                </tr>
              ) : (
                proposals.map((proposal) => {
                  const expired = isExpired(proposal);
                  const days = daysUntilExpiry(proposal.valid_until);

                  return (
                    <tr
                      key={proposal.id}
                      className="group transition hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openEditModal(proposal)}
                          className="text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {proposal.proposal_code}
                            </span>

                            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold dark:border-white/10">
                              V{proposal.version}
                            </span>
                          </div>

                          <div className="mt-1 max-w-[260px] truncate text-sm text-black/60 dark:text-white/50">
                            {proposal.title}
                          </div>

                          <div className="mt-1 max-w-[260px] truncate text-sm text-green-600 dark:text-white/50">
                            {proposal.quoted_value !== null
                              ? `${proposal.currency} ${Number(
                                  proposal.quoted_value
                                ).toLocaleString("en-NG", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : "—"}
                          </div>
                        </button>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {proposal.client_name ?? "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-black/60 dark:text-white/50">
                        {proposal.rfq_reference ?? "—"}
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={proposal.status}
                          onChange={(event) =>
                            void changeStatus(
                              proposal.id,
                              event.target.value as ProcurementProposalStatus
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
                            expired
                              ? "font-semibold text-red-600 dark:text-red-400"
                              : ""
                          }`}
                        >
                          <CalendarDays className="h-4 w-4 shrink-0" />

                          <div>
                            <div>{formatDate(proposal.valid_until)}</div>

                            {days !== null && (
                              <div className="text-[11px] text-black/50 dark:text-white/40">
                                {expired
                                  ? `${Math.abs(days)} day${
                                      Math.abs(days) === 1 ? "" : "s"
                                    } expired`
                                  : days === 0
                                    ? "Expires today"
                                    : `${days} day${
                                        days === 1 ? "" : "s"
                                      } remaining`}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {proposal.assigned_to_name ?? "Unassigned"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1 opacity-70 transition group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => openEditModal(proposal)}
                            className="inline-flex items-center justify-center rounded-lg text-blue-500 w-8 h-8 border border-blue-100"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setProposalVersionTarget(proposal)}
                            disabled={creatingVersionId === proposal.id}
                            className="inline-flex justify-center items-center rounded-lg w-8 h-8 text-slate-500 border border-slate-100 hover:border-slate-500/10 dark:text-white/40 dark:hover:text-red-400"

                            title="Create new version"
                          >
                            <Copy className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => void archiveProposal(proposal.id)}
                            className="inline-flex justify-center items-center rounded-lg w-8 h-8 text-red-500 border border-red-100 hover:border-red-500/10 dark:text-white/40 dark:hover:text-red-400"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Create follow-up"
                            onClick={() => openFollowUp(`lead=${proposal.id}`)}
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
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-950">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-white/10">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingProposal ? "Edit Proposal" : "Add Proposal"}
                </h2>

                <p className="mt-1 text-sm text-black/50 dark:text-white/40">
                  Manage the commercial and technical proposal submitted against
                  the opportunity.
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
                          opportunity_id: "",
                          rfq_id: "",
                          contact_id: "",
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

                  <Field label="Proposal Title" required>
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
                      placeholder="e.g. Microsoft 365 Managed Services Proposal"
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
                      disabled={!form.client_id}
                    >
                      <option value="">Select opportunity</option>

                      {availableOpportunities.map((opportunity) => (
                        <option key={opportunity.id} value={opportunity.id}>
                          {opportunity.opportunity_code} — {opportunity.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="RFQ / RFP">
                    <select
                      value={form.rfq_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          rfq_id: event.target.value,
                        }))
                      }
                      className={inputClass}
                      disabled={!form.client_id}
                    >
                      <option value="">Select RFQ / RFP</option>

                      {availableRfqs.map((rfq) => (
                        <option key={rfq.id} value={rfq.id}>
                          {rfq.reference_code} — {rfq.title}
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

                  <Field label="Status">
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target
                            .value as ProcurementProposalStatus,
                        }))
                      }
                      className={inputClass}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Quoted Value">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.quoted_value}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            quoted_value: event.target.value,
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
                    <Field label="Submission Date">
                      <input
                        type="date"
                        value={form.submission_date}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            submission_date: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Valid Until">
                      <input
                        type="date"
                        value={form.valid_until}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            valid_until: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Expected Decision">
                      <input
                        type="date"
                        value={form.expected_decision_date}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            expected_decision_date: event.target.value,
                          }))
                        }
                        className={inputClass}
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
                        placeholder="RFQ reference, tender number..."
                      />
                    </Field>
                  </div>

                  <Field label="Executive Summary">
                    <textarea
                      value={form.executive_summary}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          executive_summary: event.target.value,
                        }))
                      }
                      rows={4}
                      className={textareaClass}
                      placeholder="Summarise the proposed solution and value..."
                    />
                  </Field>

                  <Field label="Scope Summary">
                    <textarea
                      value={form.scope_summary}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          scope_summary: event.target.value,
                        }))
                      }
                      rows={4}
                      className={textareaClass}
                      placeholder="Summarise the scope of work..."
                    />
                  </Field>

                  <Field label="Commercial Notes">
                    <textarea
                      value={form.commercial_notes}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          commercial_notes: event.target.value,
                        }))
                      }
                      rows={3}
                      className={textareaClass}
                      placeholder="Pricing assumptions, payment terms, commercial considerations..."
                    />
                  </Field>
                </div>
              </div>

              <div className="border-t border-slate-200 px-6 py-6 dark:border-white/10">
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
                    placeholder="Submission instructions and requirements..."
                  />
                </Field>
              </div>

              <div className="border-t border-slate-200 px-6 py-6 dark:border-white/10">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Proposal Requirements
                    </h3>

                    <p className="mt-1 text-xs text-black/50 dark:text-white/40">
                      Track the documents required before the proposal can be
                      submitted.
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
                <Field label="Internal Notes">
                  <textarea
                    value={form.internal_notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        internal_notes: event.target.value,
                      }))
                    }
                    rows={4}
                    className={textareaClass}
                    placeholder="Internal notes that should not be sent to the client..."
                  />
                </Field>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 px-6 py-5 dark:border-white/10">
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
                  className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  {saving
                    ? "Saving..."
                    : editingProposal
                      ? "Save Changes"
                      : "Create Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(proposalVersionTarget)}
        title="Create Proposal Version?"
        message={
          proposalVersionTarget
            ? `Create version ${proposalVersionTarget.version + 1} of ${proposalVersionTarget.proposal_code}? The current version will be preserved.`
            : ""
        }
        confirmText="Create Version"
        cancelText="Cancel"
        variant="primary"
        loading={
          proposalVersionTarget
            ? creatingVersionId === proposalVersionTarget.id
            : false
        }
        onCancel={() => {
          if (!creatingVersionId) {
            setProposalVersionTarget(null);
          }
        }}
        onConfirm={() => {
          void handleCreateProposalVersion();
        }}
      />
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
  children: ReactNode;
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
