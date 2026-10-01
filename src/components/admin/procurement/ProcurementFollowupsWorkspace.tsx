import {
  AlertCircle,
  Archive,
  Calendar,
  CheckCircle2,
  Clock3,
  Edit3,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import ConfirmModal from "../../../islands/ConfirmModal";
import type {
  CreateProcurementFollowUpInput,
  ProcurementFollowUpActivityType,
  ProcurementFollowUpListItem,
  ProcurementFollowUpPriority,
  ProcurementFollowUpStatus,
  UpdateProcurementFollowUpInput,
} from "../../../types/procurement";
import { SummaryCard } from "../../../islands/AdminSummaryCard";

interface FollowUpContext {
  lead?: string;
  opportunity?: string;
  vendor_registration?: string;
  rfq?: string;
  proposal?: string;
  negotiation?: string;
  contract?: string;
}

interface ProcurementClientOption {
  id: string;
  display_name: string;
  company_name: string | null;
}

interface ProcurementContactOption {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  email: string | null;
}

interface ProcurementStaffOption {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
}

interface ProcurementLeadOption {
  id: string;
  title: string;
  client_id: string;
}

interface ProcurementOpportunityOption {
  id: string;
  name: string;
  client_id: string;
}

interface ProcurementPortalOption {
  id: string;
  name: string;
}

interface ProcurementVendorRegistrationOption {
  id: string;
  registration_code: string;
  client_id: string;
}

interface ProcurementRfqOption {
  id: string;
  reference_code: string;
  title: string;
  client_id: string;
}

interface ProcurementProposalOption {
  id: string;
  proposal_code: string;
  title: string;
  client_id: string;
}

interface ProcurementNegotiationOption {
  id: string;
  negotiation_code: string;
  title: string;
  client_id: string;
}

interface ProcurementContractOption {
  id: string;
  contract_code: string;
  title: string;
  client_id: string;
}

interface ProcurementFollowUpOptions {
  clients: ProcurementClientOption[];
  contacts: ProcurementContactOption[];
  staff: ProcurementStaffOption[];
  leads: ProcurementLeadOption[];
  opportunities: ProcurementOpportunityOption[];
  portals: ProcurementPortalOption[];
  vendor_registrations: ProcurementVendorRegistrationOption[];
  rfqs: ProcurementRfqOption[];
  proposals: ProcurementProposalOption[];
  negotiations: ProcurementNegotiationOption[];
  contracts: ProcurementContractOption[];
}

interface FollowUpFormState {
  client_id: string;
  contact_id: string;
  lead_id: string;
  opportunity_id: string;
  vendor_registration_id: string;
  rfq_id: string;
  proposal_id: string;
  negotiation_id: string;
  contract_id: string;
  assigned_to: string;
  activity_type: ProcurementFollowUpActivityType;
  status: ProcurementFollowUpStatus;
  priority: ProcurementFollowUpPriority;
  subject: string;
  description: string;
  due_at: string;
  completed_at: string;
  next_follow_up_at: string;
  outcome: string;
  notes: string;
}

/**
 * Reads procurement record context from the current page URL.
 */
function getFollowUpContext(): FollowUpContext {
  const params = new URLSearchParams(window.location.search);

  return {
    lead: params.get("lead") || undefined,
    opportunity: params.get("opportunity") || undefined,
    vendor_registration: params.get("vendor_registration") || undefined,
    rfq: params.get("rfq") || undefined,
    proposal: params.get("proposal") || undefined,
    negotiation: params.get("negotiation") || undefined,
    contract: params.get("contract") || undefined,
  };
}

/**
 * Creates the default follow-up form state.
 */
function createInitialForm(): FollowUpFormState {
  return {
    client_id: "",
    contact_id: "",
    lead_id: "",
    opportunity_id: "",
    vendor_registration_id: "",
    rfq_id: "",
    proposal_id: "",
    negotiation_id: "",
    contract_id: "",
    assigned_to: "",
    activity_type: "follow_up",
    status: "pending",
    priority: "medium",
    subject: "",
    description: "",
    due_at: "",
    completed_at: "",
    next_follow_up_at: "",
    outcome: "",
    notes: "",
  };
}

/**
 * Formats an ISO date/time value for display.
 */
function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Converts an ISO timestamp into a datetime-local input value.
 */
function toDateTimeLocal(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number: number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Converts a datetime-local value into an ISO timestamp.
 */
function fromDateTimeLocal(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Determines whether a follow-up is overdue.
 */
function isOverdue(item: ProcurementFollowUpListItem): boolean {
  if (!item.due_at) {
    return false;
  }

  if (["completed", "cancelled"].includes(item.status)) {
    return false;
  }

  return new Date(item.due_at).getTime() < Date.now();
}

/**
 * Returns the display label for an activity type.
 */
function activityLabel(type: ProcurementFollowUpActivityType): string {
  const labels: Record<ProcurementFollowUpActivityType, string> = {
    call: "Call",
    email: "Email",
    meeting: "Meeting",
    follow_up: "Follow-up",
    document_request: "Document Request",
    vendor_registration: "Vendor Registration",
    rfq_follow_up: "RFQ Follow-up",
    proposal_follow_up: "Proposal Follow-up",
    negotiation: "Negotiation",
    contract: "Contract",
    renewal: "Renewal",
    other: "Other",
  };

  return labels[type];
}

/**
 * Returns the display label for a follow-up status.
 */
function statusLabel(status: ProcurementFollowUpStatus): string {
  const labels: Record<ProcurementFollowUpStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    overdue: "Overdue",
  };

  return labels[status];
}

/**
 * Returns the display label for a priority.
 */
function priorityLabel(priority: ProcurementFollowUpPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

/**
 * Builds the API payload from the form state.
 */
function buildPayload(form: FollowUpFormState): CreateProcurementFollowUpInput {
  return {
    client_id: form.client_id,
    contact_id: form.contact_id || null,
    lead_id: form.lead_id || null,
    opportunity_id: form.opportunity_id || null,
    vendor_registration_id: form.vendor_registration_id || null,
    rfq_id: form.rfq_id || null,
    proposal_id: form.proposal_id || null,
    negotiation_id: form.negotiation_id || null,
    contract_id: form.contract_id || null,
    assigned_to: form.assigned_to || null,
    activity_type: form.activity_type,
    status: form.status,
    priority: form.priority,
    subject: form.subject.trim(),
    description: form.description.trim() || null,
    due_at: fromDateTimeLocal(form.due_at),
    completed_at: fromDateTimeLocal(form.completed_at),
    next_follow_up_at: fromDateTimeLocal(form.next_follow_up_at),
    outcome: form.outcome.trim() || null,
    notes: form.notes.trim() || null,
  };
}

export default function ProcurementFollowUpsWorkspace() {
  const [followUps, setFollowUps] = useState<ProcurementFollowUpListItem[]>([]);
  const [initialContextApplied, setInitialContextApplied] = useState(false);
  const [options, setOptions] = useState<ProcurementFollowUpOptions>({
    clients: [],
    contacts: [],
    staff: [],
    leads: [],
    opportunities: [],
    portals: [],
    vendor_registrations: [],
    rfqs: [],
    proposals: [],
    negotiations: [],
    contracts: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");

  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] =
    useState<ProcurementFollowUpListItem | null>(null);

  const [form, setForm] = useState<FollowUpFormState>(createInitialForm());

  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);

  const pageSize = 15;

  const totalPages = Math.max(Math.ceil(count / pageSize), 1);

  const availableContacts = useMemo(
    () =>
      options.contacts.filter(
        (contact) => !form.client_id || contact.client_id === form.client_id
      ),
    [options.contacts, form.client_id]
  );

  const availableLeads = useMemo(
    () =>
      options.leads.filter(
        (lead) => !form.client_id || lead.client_id === form.client_id
      ),
    [options.leads, form.client_id]
  );

  const availableOpportunities = useMemo(
    () =>
      options.opportunities.filter(
        (opportunity) =>
          !form.client_id || opportunity.client_id === form.client_id
      ),
    [options.opportunities, form.client_id]
  );

  const availableVendorRegistrations = useMemo(
    () =>
      options.vendor_registrations.filter(
        (registration) =>
          !form.client_id || registration.client_id === form.client_id
      ),
    [options.vendor_registrations, form.client_id]
  );

  const availableRfqs = useMemo(
    () =>
      options.rfqs.filter(
        (rfq) => !form.client_id || rfq.client_id === form.client_id
      ),
    [options.rfqs, form.client_id]
  );

  const availableProposals = useMemo(
    () =>
      options.proposals.filter(
        (proposal) => !form.client_id || proposal.client_id === form.client_id
      ),
    [options.proposals, form.client_id]
  );

  const availableNegotiations = useMemo(
    () =>
      options.negotiations.filter(
        (negotiation) =>
          !form.client_id || negotiation.client_id === form.client_id
      ),
    [options.negotiations, form.client_id]
  );

  const availableContracts = useMemo(
    () =>
      options.contracts.filter(
        (contract) => !form.client_id || contract.client_id === form.client_id
      ),
    [options.contracts, form.client_id]
  );

  const statistics = useMemo(() => {
    const overdue = followUps.filter(isOverdue).length;

    return {
      total: count,
      pending: followUps.filter(
        (item) => item.status === "pending" || item.status === "in_progress"
      ).length,
      overdue,
      completed: followUps.filter((item) => item.status === "completed").length,
    };
  }, [count, followUps]);

  /**
   * Applies a procurement record context to a new follow-up form.
   *
   * The related record determines the client automatically so that
   * staff do not need to manually select the organisation first.
   */
  function applyFollowUpContext(context: FollowUpContext): void {
    if (initialContextApplied) {
      return;
    }

    if (!Object.values(context).some(Boolean)) {
      setInitialContextApplied(true);
      return;
    }

    if (context.lead) {
      const lead = options.leads.find((item) => item.id === context.lead);

      if (lead) {
        setEditingFollowUp(null);
        setForm({
          ...createInitialForm(),
          client_id: lead.client_id,
          lead_id: lead.id,
          activity_type: "follow_up",
          subject: `Follow up: ${lead.title}`,
        });
        setModalOpen(true);
      }

      setInitialContextApplied(true);
      return;
    }

    if (context.opportunity) {
      const opportunity = options.opportunities.find(
        (item) => item.id === context.opportunity
      );

      if (opportunity) {
        setEditingFollowUp(null);
        setForm({
          ...createInitialForm(),
          client_id: opportunity.client_id,
          opportunity_id: opportunity.id,
          activity_type: "follow_up",
          subject: `Follow up: ${opportunity.name}`,
        });
        setModalOpen(true);
      }

      setInitialContextApplied(true);
      return;
    }

    if (context.vendor_registration) {
      const registration = options.vendor_registrations.find(
        (item) => item.id === context.vendor_registration
      );

      if (registration) {
        setEditingFollowUp(null);
        setForm({
          ...createInitialForm(),
          client_id: registration.client_id,
          vendor_registration_id: registration.id,
          activity_type: "vendor_registration",
          subject: `Vendor registration follow-up: ${registration.registration_code}`,
        });
        setModalOpen(true);
      }

      setInitialContextApplied(true);
      return;
    }

    if (context.rfq) {
      const rfq = options.rfqs.find((item) => item.id === context.rfq);

      if (rfq) {
        setEditingFollowUp(null);
        setForm({
          ...createInitialForm(),
          client_id: rfq.client_id,
          rfq_id: rfq.id,
          activity_type: "rfq_follow_up",
          subject: `RFQ follow-up: ${rfq.reference_code}`,
        });
        setModalOpen(true);
      }

      setInitialContextApplied(true);
      return;
    }

    if (context.proposal) {
      const proposal = options.proposals.find(
        (item) => item.id === context.proposal
      );

      if (proposal) {
        setEditingFollowUp(null);
        setForm({
          ...createInitialForm(),
          client_id: proposal.client_id,
          proposal_id: proposal.id,
          activity_type: "proposal_follow_up",
          subject: `Proposal follow-up: ${proposal.proposal_code}`,
        });
        setModalOpen(true);
      }

      setInitialContextApplied(true);
      return;
    }

    if (context.negotiation) {
      const negotiation = options.negotiations.find(
        (item) => item.id === context.negotiation
      );

      if (negotiation) {
        setEditingFollowUp(null);
        setForm({
          ...createInitialForm(),
          client_id: negotiation.client_id,
          negotiation_id: negotiation.id,
          activity_type: "negotiation",
          subject: `Negotiation follow-up: ${negotiation.negotiation_code}`,
        });
        setModalOpen(true);
      }

      setInitialContextApplied(true);
      return;
    }

    if (context.contract) {
      const contract = options.contracts.find(
        (item) => item.id === context.contract
      );

      if (contract) {
        setEditingFollowUp(null);
        setForm({
          ...createInitialForm(),
          client_id: contract.client_id,
          contract_id: contract.id,
          activity_type: "contract",
          subject: `Contract follow-up: ${contract.contract_code}`,
        });
        setModalOpen(true);
      }

      setInitialContextApplied(true);
      return;
    }

    setInitialContextApplied(true);
  }

  /**
   * Loads the procurement form options.
   */
  async function loadOptions(): Promise<void> {
    try {
      const response = await fetch("/api/admin/procurement/options");

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to load procurement options.");
      }

      setOptions((current) => ({
        ...current,
        ...result.data,
      }));
    } catch (error) {
      console.error("Failed to load procurement options:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load procurement options."
      );
    }
  }

  /**
   * Loads the follow-up records using the active filters.
   */
  async function loadFollowUps(): Promise<void> {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (activityFilter) {
        params.set("activity_type", activityFilter);
      }

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (priorityFilter) {
        params.set("priority", priorityFilter);
      }

      if (clientFilter) {
        params.set("client_id", clientFilter);
      }

      if (assignedFilter) {
        params.set("assigned_to", assignedFilter);
      }

      params.set("page", String(page));
      params.set("page_size", String(pageSize));

      const response = await fetch(
        `/api/admin/procurement/follow-ups?${params.toString()}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Unable to load procurement follow-ups."
        );
      }

      setFollowUps(result.data ?? []);
      setCount(result.count ?? 0);
    } catch (error) {
      console.error("Failed to load procurement follow-ups:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load procurement follow-ups."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * Opens a blank form for creating a follow-up.
   */
  function openCreateModal(): void {
    setEditingFollowUp(null);
    setForm(createInitialForm());
    setModalOpen(true);
  }

  /**
   * Opens the form with an existing follow-up.
   */
  function openEditModal(item: ProcurementFollowUpListItem): void {
    setEditingFollowUp(item);

    setForm({
      client_id: item.client_id,
      contact_id: item.contact_id ?? "",
      lead_id: item.lead_id ?? "",
      opportunity_id: item.opportunity_id ?? "",
      vendor_registration_id: item.vendor_registration_id ?? "",
      rfq_id: item.rfq_id ?? "",
      proposal_id: item.proposal_id ?? "",
      negotiation_id: item.negotiation_id ?? "",
      contract_id: item.contract_id ?? "",
      assigned_to: item.assigned_to ?? "",
      activity_type: item.activity_type,
      status: item.status,
      priority: item.priority,
      subject: item.subject,
      description: item.description ?? "",
      due_at: toDateTimeLocal(item.due_at),
      completed_at: toDateTimeLocal(item.completed_at),
      next_follow_up_at: toDateTimeLocal(item.next_follow_up_at),
      outcome: item.outcome ?? "",
      notes: item.notes ?? "",
    });

    setModalOpen(true);
  }

  /**
   * Saves either a new or existing follow-up.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.client_id) {
      toast.error("Select a client.");
      return;
    }

    if (!form.subject.trim()) {
      toast.error("Enter a follow-up subject.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = buildPayload(form);

      const endpoint = editingFollowUp
        ? `/api/admin/procurement/follow-ups/${editingFollowUp.id}`
        : "/api/admin/procurement/follow-ups";

      const method = editingFollowUp ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingFollowUp
            ? ({
                id: editingFollowUp.id,
                ...payload,
              } as UpdateProcurementFollowUpInput)
            : payload
        ),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Unable to save the procurement follow-up."
        );
      }

      toast.success(
        editingFollowUp
          ? "Follow-up updated successfully."
          : "Follow-up created successfully."
      );

      setModalOpen(false);
      setEditingFollowUp(null);
      setForm(createInitialForm());

      await loadFollowUps();
    } catch (error) {
      console.error("Failed to save procurement follow-up:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save the procurement follow-up."
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * Changes a follow-up lifecycle status.
   */
  async function handleStatusChange(
    id: string,
    status: ProcurementFollowUpStatus
  ): Promise<void> {
    try {
      const response = await fetch(`/api/admin/procurement/follow-ups/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "status",
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to update follow-up status.");
      }

      toast.success(`Follow-up marked ${statusLabel(status).toLowerCase()}.`);

      await loadFollowUps();
    } catch (error) {
      console.error("Failed to update follow-up status:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update follow-up status."
      );
    }
  }

  /**
   * Archives the selected follow-up after confirmation.
   */
  async function handleArchive(): Promise<void> {
    if (!confirmArchiveId) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/procurement/follow-ups/${confirmArchiveId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "archive",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Unable to archive procurement follow-up."
        );
      }

      toast.success("Follow-up archived.");
      setConfirmArchiveId(null);

      await loadFollowUps();
    } catch (error) {
      console.error("Failed to archive procurement follow-up:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to archive procurement follow-up."
      );
    }
  }

  /**
   * Clears all active filters.
   */
  function clearFilters(): void {
    setSearch("");
    setActivityFilter("");
    setStatusFilter("");
    setPriorityFilter("");
    setClientFilter("");
    setAssignedFilter("");
    setPage(1);
  }

  /**
   * Returns the icon associated with an activity type.
   */
  function activityIcon(type: ProcurementFollowUpActivityType) {
    if (type === "call") {
      return Phone;
    }

    if (type === "email") {
      return Mail;
    }

    if (type === "meeting") {
      return Users;
    }

    return MessageSquare;
  }

  useEffect(() => {
    void loadOptions();
  }, []);

  /**
   * Applies URL-provided procurement context after the form options
   * have finished loading.
   */
  useEffect(() => {
    if (!initialContextApplied && options.clients.length > 0) {
      applyFollowUpContext(getFollowUpContext());
    }
  }, [
    initialContextApplied,
    options.clients.length,
    options.leads,
    options.opportunities,
    options.vendor_registrations,
    options.rfqs,
    options.proposals,
    options.negotiations,
    options.contracts,
  ]);

  useEffect(() => {
    void loadFollowUps();
  }, [
    search,
    activityFilter,
    statusFilter,
    priorityFilter,
    clientFilter,
    assignedFilter,
    page,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Procurement Follow-ups
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track calls, meetings, document requests and next actions across the
            procurement pipeline.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          <Plus className="h-4 w-4" />
          Add Follow-up
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total"
          value={statistics.total}
          icon={MessageSquare}
          description=""
          iconBackgroundColor="bg-blue-50"
          iconColor="text-blue-500"
        />

        <SummaryCard
          label="Pending"
          value={statistics.pending}
          icon={Clock3}
          description=""
          iconBackgroundColor="bg-amber-50"
          iconColor="text-amber-500"
        />

        <SummaryCard
          label="Overdue"
          value={statistics.overdue}
          icon={AlertCircle}
          description=""
          iconBackgroundColor="bg-red-50"
          iconColor="text-red-500"
        />

        <SummaryCard
          label="Completed"
          value={statistics.completed}
          icon={CheckCircle2}
          description=""
          iconBackgroundColor="bg-green-50"
          iconColor="text-green-500"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search follow-ups..."
              className="h-[42px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
            />
          </div>

          <select
            value={activityFilter}
            onChange={(event) => {
              setActivityFilter(event.target.value);
              setPage(1);
            }}
            className="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 xl:w-[180px]"
          >
            <option value="">All Activities</option>
            {(
              [
                "call",
                "email",
                "meeting",
                "follow_up",
                "document_request",
                "vendor_registration",
                "rfq_follow_up",
                "proposal_follow_up",
                "negotiation",
                "contract",
                "renewal",
                "other",
              ] as ProcurementFollowUpActivityType[]
            ).map((type) => (
              <option key={type} value={type}>
                {activityLabel(type)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 xl:w-[160px]"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(event) => {
              setPriorityFilter(event.target.value);
              setPage(1);
            }}
            className="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 xl:w-[150px]"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          <select
            value={clientFilter}
            onChange={(event) => {
              setClientFilter(event.target.value);
              setPage(1);
            }}
            className="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 xl:w-[200px]"
          >
            <option value="">All Clients</option>

            {options.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.display_name}
              </option>
            ))}
          </select>

          <select
            value={assignedFilter}
            onChange={(event) => {
              setAssignedFilter(event.target.value);
              setPage(1);
            }}
            className="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 xl:w-[180px]"
          >
            <option value="">All Assignees</option>

            {options.staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.first_name} {member.last_name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => void loadFollowUps()}
            className="inline-flex items-center gap-2 font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <tr>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Follow-up
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Client
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Related To
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Due
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Priority
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    Loading follow-ups...
                  </td>
                </tr>
              ) : followUps.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    No procurement follow-ups found.
                  </td>
                </tr>
              ) : (
                followUps.map((item) => {
                  const Icon = activityIcon(item.activity_type);
                  const overdue = isOverdue(item);

                  return (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                            <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                          </div>

                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white">
                              {item.subject}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.follow_up_code} ·{" "}
                              {activityLabel(item.activity_type)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {item.client_name ?? "—"}
                        </p>

                        {item.contact_name && (
                          <p className="mt-1 text-xs text-slate-500">
                            {item.contact_name}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1 text-xs">
                          {item.lead_title && (
                            <p>
                              <span className="font-medium">Lead:</span>{" "}
                              {item.lead_title}
                            </p>
                          )}

                          {item.opportunity_name && (
                            <p>
                              <span className="font-medium">Opportunity:</span>{" "}
                              {item.opportunity_name}
                            </p>
                          )}

                          {item.vendor_registration_code && (
                            <p>
                              <span className="font-medium">Vendor:</span>{" "}
                              {item.vendor_registration_code}
                            </p>
                          )}

                          {item.rfq_reference && (
                            <p>
                              <span className="font-medium">RFQ:</span>{" "}
                              {item.rfq_reference}
                            </p>
                          )}

                          {item.proposal_code && (
                            <p>
                              <span className="font-medium">Proposal:</span>{" "}
                              {item.proposal_code}
                            </p>
                          )}

                          {item.negotiation_code && (
                            <p>
                              <span className="font-medium">Negotiation:</span>{" "}
                              {item.negotiation_code}
                            </p>
                          )}

                          {item.contract_code && (
                            <p>
                              <span className="font-medium">Contract:</span>{" "}
                              {item.contract_code}
                            </p>
                          )}

                          {!item.lead_title &&
                            !item.opportunity_name &&
                            !item.vendor_registration_code &&
                            !item.rfq_reference &&
                            !item.proposal_code &&
                            !item.negotiation_code &&
                            !item.contract_code && <span>—</span>}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div
                          className={`flex items-center gap-2 text-sm ${
                            overdue
                              ? "font-medium text-red-600 dark:text-red-400"
                              : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <Calendar className="h-4 w-4" />
                          {formatDateTime(item.due_at)}
                        </div>

                        {overdue && (
                          <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                            Overdue
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {priorityLabel(item.priority)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={item.status}
                          onChange={(event) =>
                            void handleStatusChange(
                              item.id,
                              event.target.value as ProcurementFollowUpStatus
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title="Edit follow-up"
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmArchiveId(item.id)}
                            title="Archive follow-up"
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Archive
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

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(current + 1, totalPages))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {editingFollowUp ? "Edit Follow-up" : "Add Follow-up"}
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Record the next action and keep the procurement relationship
                  moving.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-2xl leading-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <div className="space-y-6 p-6">
                <section>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                    Activity
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <label className="space-y-1.5 lg:col-span-2">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Subject *
                      </span>

                      <input
                        value={form.subject}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            subject: event.target.value,
                          }))
                        }
                        required
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        placeholder="Follow up with procurement manager"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Activity
                      </span>

                      <select
                        value={form.activity_type}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            activity_type: event.target
                              .value as ProcurementFollowUpActivityType,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        {(
                          [
                            "call",
                            "email",
                            "meeting",
                            "follow_up",
                            "document_request",
                            "vendor_registration",
                            "rfq_follow_up",
                            "proposal_follow_up",
                            "negotiation",
                            "contract",
                            "renewal",
                            "other",
                          ] as ProcurementFollowUpActivityType[]
                        ).map((type) => (
                          <option key={type} value={type}>
                            {activityLabel(type)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Priority
                      </span>

                      <select
                        value={form.priority}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            priority: event.target
                              .value as ProcurementFollowUpPriority,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                    Relationship
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Client *
                      </span>

                      <select
                        value={form.client_id}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            client_id: event.target.value,
                            contact_id: "",
                            lead_id: "",
                            opportunity_id: "",
                            vendor_registration_id: "",
                            rfq_id: "",
                            proposal_id: "",
                            negotiation_id: "",
                            contract_id: "",
                          }))
                        }
                        required
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">Select client</option>

                        {options.clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.display_name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Contact
                      </span>

                      <select
                        value={form.contact_id}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            contact_id: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">Select contact</option>

                        {availableContacts.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.first_name} {contact.last_name}
                            {contact.job_title ? ` — ${contact.job_title}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Assigned To
                      </span>

                      <select
                        value={form.assigned_to}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            assigned_to: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">Select staff</option>

                        {options.staff.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Status
                      </span>

                      <select
                        value={form.status}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            status: event.target
                              .value as ProcurementFollowUpStatus,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                    Procurement Context
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Lead
                      </span>

                      <select
                        value={form.lead_id}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            lead_id: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">None</option>

                        {availableLeads.map((lead) => (
                          <option key={lead.id} value={lead.id}>
                            {lead.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Opportunity
                      </span>

                      <select
                        value={form.opportunity_id}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            opportunity_id: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">None</option>

                        {availableOpportunities.map((opportunity) => (
                          <option key={opportunity.id} value={opportunity.id}>
                            {opportunity.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Vendor Registration
                      </span>

                      <select
                        value={form.vendor_registration_id}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            vendor_registration_id: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">None</option>

                        {availableVendorRegistrations.map((registration) => (
                          <option key={registration.id} value={registration.id}>
                            {registration.registration_code}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        RFQ / RFP
                      </span>

                      <select
                        value={form.rfq_id}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            rfq_id: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">None</option>

                        {availableRfqs.map((rfq) => (
                          <option key={rfq.id} value={rfq.id}>
                            {rfq.reference_code} — {rfq.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Proposal
                      </span>

                      <select
                        value={form.proposal_id}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            proposal_id: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">None</option>

                        {availableProposals.map((proposal) => (
                          <option key={proposal.id} value={proposal.id}>
                            {proposal.proposal_code} — {proposal.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Negotiation
                      </span>

                      <select
                        value={form.negotiation_id}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            negotiation_id: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">None</option>

                        {availableNegotiations.map((negotiation) => (
                          <option key={negotiation.id} value={negotiation.id}>
                            {negotiation.negotiation_code} — {negotiation.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Contract
                      </span>

                      <select
                        value={form.contract_id}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            contract_id: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">None</option>

                        {availableContracts.map((contract) => (
                          <option key={contract.id} value={contract.id}>
                            {contract.contract_code} — {contract.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                    Scheduling
                  </h3>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Due Date
                      </span>

                      <input
                        type="datetime-local"
                        value={form.due_at}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            due_at: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Next Follow-up
                      </span>

                      <input
                        type="datetime-local"
                        value={form.next_follow_up_at}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            next_follow_up_at: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Completed At
                      </span>

                      <input
                        type="datetime-local"
                        value={form.completed_at}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            completed_at: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                    Notes
                  </h3>

                  <div className="space-y-4">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Description
                      </span>

                      <textarea
                        value={form.description}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        placeholder="Describe the purpose of this follow-up..."
                      />
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Outcome
                      </span>

                      <textarea
                        value={form.outcome}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            outcome: event.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        placeholder="Record the result or response..."
                      />
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Internal Notes
                      </span>

                      <textarea
                        value={form.notes}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        placeholder="Internal procurement notes..."
                      />
                    </label>
                  </div>
                </section>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
                >
                  {saving
                    ? "Saving..."
                    : editingFollowUp
                      ? "Update"
                      : "Create Follow-up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmArchiveId)}
        title="Archive Follow-up"
        message="Are you sure you want to archive this procurement follow-up? It will no longer appear in the active follow-up list."
        confirmText="Archive"
        cancelText="Cancel"
        onConfirm={() => void handleArchive()}
        onCancel={() => setConfirmArchiveId(null)}
      />
    </div>
  );
}
