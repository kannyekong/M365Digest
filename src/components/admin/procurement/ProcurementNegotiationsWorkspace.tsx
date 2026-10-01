import {
  Archive,
  Cable,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  Clock3,
  Edit3,
  Handshake,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import ConfirmModal from "../../../islands/ConfirmModal";
import type {
  CreateProcurementNegotiationInput,
  ProcurementClientOption,
  ProcurementContactOption,
  ProcurementNegotiationListItem,
  ProcurementNegotiationPriority,
  ProcurementNegotiationRequirement,
  ProcurementNegotiationStatus,
  ProcurementOpportunityOption,
  ProcurementProposalListItem,
  ProcurementStaffOption,
} from "../../../types/procurement";
import { toast } from "react-toastify";
import { SummaryCard } from "../../../islands/AdminSummaryCard";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
}

interface ProcurementNegotiationFormOptions {
  clients: ProcurementClientOption[];
  contacts: ProcurementContactOption[];
  staff: ProcurementStaffOption[];
  opportunities: ProcurementOpportunityOption[];
  proposals: ProcurementProposalListItem[];
}

type NegotiationFormState = {
  client_id: string;
  opportunity_id: string;
  proposal_id: string;
  contact_id: string;
  assigned_to: string;
  title: string;
  status: ProcurementNegotiationStatus;
  priority: ProcurementNegotiationPriority;
  starting_value: string;
  current_value: string;
  agreed_value: string;
  currency: string;
  negotiation_start_date: string;
  target_close_date: string;
  agreed_date: string;
  next_action: string;
  next_action_at: string;
  client_requests: string;
  concessions: string;
  agreed_terms: string;
  internal_notes: string;
  outcome: string;
  requirements: ProcurementNegotiationRequirement[];
};

const STATUS_OPTIONS: Array<{
  value: ProcurementNegotiationStatus;
  label: string;
}> = [
  { value: "not_started", label: "Not Started" },
  { value: "active", label: "Active" },
  { value: "client_review", label: "Client Review" },
  { value: "counter_offer", label: "Counter Offer" },
  { value: "internal_approval", label: "Internal Approval" },
  { value: "agreed", label: "Agreed" },
  { value: "contract", label: "Contract" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS: Array<{
  value: ProcurementNegotiationPriority;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const DEFAULT_REQUIREMENTS: ProcurementNegotiationRequirement[] = [
  {
    name: "Commercial terms reviewed",
    required: true,
    completed: false,
    completed_at: null,
    notes: null,
  },
  {
    name: "Client requests documented",
    required: false,
    completed: false,
    completed_at: null,
    notes: null,
  },
  {
    name: "Concessions approved internally",
    required: false,
    completed: false,
    completed_at: null,
    notes: null,
  },
  {
    name: "Final terms agreed",
    required: true,
    completed: false,
    completed_at: null,
    notes: null,
  },
];

const EMPTY_FORM: NegotiationFormState = {
  client_id: "",
  opportunity_id: "",
  proposal_id: "",
  contact_id: "",
  assigned_to: "",
  title: "",
  status: "not_started",
  priority: "medium",
  starting_value: "",
  current_value: "",
  agreed_value: "",
  currency: "NGN",
  negotiation_start_date: "",
  target_close_date: "",
  agreed_date: "",
  next_action: "",
  next_action_at: "",
  client_requests: "",
  concessions: "",
  agreed_terms: "",
  internal_notes: "",
  outcome: "",
  requirements: DEFAULT_REQUIREMENTS.map((item) => ({ ...item })),
};

function formatCurrency(value: number | null, currency: string): string {
  if (value === null || Number.isNaN(value)) return "—";

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency || "NGN",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function statusLabel(status: ProcurementNegotiationStatus): string {
  return (
    STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
  );
}

function statusClass(status: ProcurementNegotiationStatus): string {
  const classes: Record<ProcurementNegotiationStatus, string> = {
    not_started:
      "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    active:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    client_review:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300",
    counter_offer:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    internal_approval:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300",
    agreed:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    contract:
      "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300",
    closed:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    cancelled:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300",
  };

  return classes[status];
}

function priorityClass(priority: ProcurementNegotiationPriority): string {
  const classes: Record<ProcurementNegotiationPriority, string> = {
    low: "text-zinc-600 dark:text-zinc-400",
    medium: "text-blue-600 dark:text-blue-400",
    high: "text-amber-600 dark:text-amber-400",
    urgent: "text-rose-600 dark:text-rose-400",
  };

  return classes[priority];
}

function getInitialForm(
  negotiation?: ProcurementNegotiationListItem | null,
  proposal?: ProcurementProposalListItem | null
): NegotiationFormState {
  if (!negotiation && !proposal) {
    return {
      ...EMPTY_FORM,
      requirements: DEFAULT_REQUIREMENTS.map((item) => ({ ...item })),
    };
  }

  if (negotiation) {
    return {
      client_id: negotiation.client_id,
      opportunity_id: negotiation.opportunity_id ?? "",
      proposal_id: negotiation.proposal_id ?? "",
      contact_id: negotiation.contact_id ?? "",
      assigned_to: negotiation.assigned_to ?? "",
      title: negotiation.title,
      status: negotiation.status,
      priority: negotiation.priority,
      starting_value:
        negotiation.starting_value === null
          ? ""
          : String(negotiation.starting_value),
      current_value:
        negotiation.current_value === null
          ? ""
          : String(negotiation.current_value),
      agreed_value:
        negotiation.agreed_value === null
          ? ""
          : String(negotiation.agreed_value),
      currency: negotiation.currency,
      negotiation_start_date:
        negotiation.negotiation_start_date?.slice(0, 10) ?? "",
      target_close_date: negotiation.target_close_date?.slice(0, 10) ?? "",
      agreed_date: negotiation.agreed_date?.slice(0, 10) ?? "",
      next_action: negotiation.next_action ?? "",
      next_action_at: toDateTimeLocal(negotiation.next_action_at),
      client_requests: negotiation.client_requests ?? "",
      concessions: negotiation.concessions ?? "",
      agreed_terms: negotiation.agreed_terms ?? "",
      internal_notes: negotiation.internal_notes ?? "",
      outcome: negotiation.outcome ?? "",
      requirements:
        negotiation.requirements?.length > 0
          ? negotiation.requirements.map((item) => ({ ...item }))
          : DEFAULT_REQUIREMENTS.map((item) => ({ ...item })),
    };
  }

  return {
    ...EMPTY_FORM,
    client_id: proposal?.client_id ?? "",
    opportunity_id: proposal?.opportunity_id ?? "",
    proposal_id: proposal?.id ?? "",
    contact_id: proposal?.contact_id ?? "",
    assigned_to: proposal?.assigned_to ?? "",
    title: `Negotiation — ${proposal?.title ?? ""}`,
    starting_value:
      proposal?.quoted_value === null || proposal?.quoted_value === undefined
        ? ""
        : String(proposal.quoted_value),
    current_value:
      proposal?.quoted_value === null || proposal?.quoted_value === undefined
        ? ""
        : String(proposal.quoted_value),
    target_close_date: proposal?.expected_decision_date?.slice(0, 10) ?? "",
  };
}

export default function ProcurementNegotiationsWorkspace() {
  const [items, setItems] = useState<ProcurementNegotiationListItem[]>([]);
  const [count, setCount] = useState(0);
  const [options, setOptions] = useState<ProcurementNegotiationFormOptions>({
    clients: [],
    contacts: [],
    staff: [],
    opportunities: [],
    proposals: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProcurementNegotiationStatus | "">("");
  const [priority, setPriority] = useState<ProcurementNegotiationPriority | "">(
    ""
  );
  const [clientId, setClientId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creatingContractId, setCreatingContractId] = useState<string | null>(
    null
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NegotiationFormState>(getInitialForm());
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    null
  );
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const selectedProposal = useMemo(
    () =>
      options.proposals.find((proposal) => proposal.id === form.proposal_id) ??
      null,
    [form.proposal_id, options.proposals]
  );

  const availableContacts = useMemo(() => {
    if (!form.client_id) return options.contacts;
    return options.contacts.filter(
      (contact) => contact.client_id === form.client_id
    );
  }, [form.client_id, options.contacts]);

  const activeCount = useMemo(
    () => items.filter((item) => item.status === "active").length,
    [items]
  );

  const reviewCount = useMemo(
    () => items.filter((item) => item.status === "client_review").length,
    [items]
  );

  const counterOfferCount = useMemo(
    () => items.filter((item) => item.status === "counter_offer").length,
    [items]
  );

  const agreedCount = useMemo(
    () => items.filter((item) => item.status === "agreed").length,
    [items]
  );

  /**
   * Creates or retrieves the contract associated with a negotiation
   * and opens that contract in the Contracts workspace.
   */
  /**
   * Creates or retrieves the contract associated with a negotiation
   * and opens that contract in the Contracts workspace.
   */
  async function handleCreateContract(
    negotiation: ProcurementNegotiationListItem
  ): Promise<void> {
    try {
      setCreatingContractId(negotiation.id);

      const response = await fetch(
        `/api/admin/procurement/negotiations/${negotiation.id}/create-contract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.data?.id) {
        throw new Error(
          result.error ?? "Unable to create the procurement contract."
        );
      }

      toast.success("Contract created successfully.");

      window.location.href = `/admin/procurement/contracts?contract=${result.data.id}`;
    } catch (error) {
      console.error("Failed to create contract:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create the procurement contract."
      );
    } finally {
      setCreatingContractId(null);
    }
  }

  async function loadOptions(): Promise<void> {
    const [optionsResponse, proposalsResponse] = await Promise.all([
      fetch("/api/admin/procurement/options"),
      fetch("/api/admin/procurement/proposals?page=1&page_size=100"),
    ]);

    const optionsResult = (await optionsResponse.json()) as ApiResponse<
      Omit<ProcurementNegotiationFormOptions, "proposals">
    >;
    const proposalsResult = (await proposalsResponse.json()) as ApiResponse<
      ProcurementProposalListItem[]
    >;

    if (!optionsResponse.ok || !optionsResult.success) {
      throw new Error(
        optionsResult.error ?? "Unable to load procurement options."
      );
    }

    if (!proposalsResponse.ok || !proposalsResult.success) {
      throw new Error(
        proposalsResult.error ?? "Unable to load proposal options."
      );
    }

    setOptions({
      clients: optionsResult.data?.clients ?? [],
      contacts: optionsResult.data?.contacts ?? [],
      staff: optionsResult.data?.staff ?? [],
      opportunities: optionsResult.data?.opportunities ?? [],
      proposals: proposalsResult.data ?? [],
    });
  }

  async function loadNegotiations(showRefreshState = false): Promise<void> {
    try {
      if (showRefreshState) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });

      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (clientId) params.set("client_id", clientId);
      if (assignedTo) params.set("assigned_to", assignedTo);

      const response = await fetch(
        `/api/admin/procurement/negotiations?${params.toString()}`
      );
      const result = (await response.json()) as ApiResponse<
        ProcurementNegotiationListItem[]
      >;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to load negotiations.");
      }

      setItems(result.data ?? []);
      setCount(result.count ?? 0);
    } catch (loadError) {
      console.error("Failed to load procurement negotiations:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load procurement negotiations."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadNegotiation(
    id: string
  ): Promise<ProcurementNegotiationListItem> {
    const response = await fetch(`/api/admin/procurement/negotiations/${id}`);
    const result =
      (await response.json()) as ApiResponse<ProcurementNegotiationListItem>;

    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.error ?? "Unable to load the negotiation.");
    }

    return result.data;
  }

  function openCreateModal(
    proposal?: ProcurementProposalListItem | null
  ): void {
    setEditingId(null);
    setSelectedProposalId(proposal?.id ?? null);
    setForm(getInitialForm(null, proposal));
    setIsModalOpen(true);
  }

  async function openEditModal(id: string): Promise<void> {
    try {
      const negotiation = await loadNegotiation(id);
      setEditingId(id);
      setSelectedProposalId(negotiation.proposal_id);
      setForm(getInitialForm(negotiation));
      setIsModalOpen(true);
    } catch (loadError) {
      toast.error(
        loadError instanceof Error
          ? loadError.message
          : "Unable to open the negotiation."
      );
    }
  }

  function closeModal(): void {
    if (saving) return;
    setIsModalOpen(false);
    setEditingId(null);
    setSelectedProposalId(null);
    setForm(getInitialForm());
  }

  function updateForm<K extends keyof NegotiationFormState>(
    key: K,
    value: NegotiationFormState[K]
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleProposalChange(proposalId: string): void {
    const proposal = options.proposals.find((item) => item.id === proposalId);

    setForm((current) => ({
      ...current,
      proposal_id: proposalId,
      client_id: proposal?.client_id ?? current.client_id,
      opportunity_id: proposal?.opportunity_id ?? current.opportunity_id,
      contact_id: proposal?.contact_id ?? current.contact_id,
      assigned_to: proposal?.assigned_to ?? current.assigned_to,
      title:
        current.title.trim() === "" || current.title.startsWith("Negotiation —")
          ? `Negotiation — ${proposal?.title ?? ""}`
          : current.title,
      starting_value:
        current.starting_value === "" && proposal?.quoted_value != null
          ? String(proposal.quoted_value)
          : current.starting_value,
      current_value:
        current.current_value === "" && proposal?.quoted_value != null
          ? String(proposal.quoted_value)
          : current.current_value,
      target_close_date:
        current.target_close_date ||
        proposal?.expected_decision_date?.slice(0, 10) ||
        "",
    }));
  }

  function toggleRequirement(index: number): void {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              completed: !item.completed,
              completed_at: !item.completed ? new Date().toISOString() : null,
            }
          : item
      ),
    }));
  }

  function updateRequirementNotes(index: number, notes: string): void {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.map((item, itemIndex) =>
        itemIndex === index ? { ...item, notes } : item
      ),
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (!form.client_id || !form.title.trim()) {
      toast.error("Client and negotiation title are required.");
      return;
    }

    try {
      setSaving(true);

      const payload: CreateProcurementNegotiationInput = {
        client_id: form.client_id,
        opportunity_id: form.opportunity_id || null,
        proposal_id: form.proposal_id || null,
        contact_id: form.contact_id || null,
        assigned_to: form.assigned_to || null,
        title: form.title.trim(),
        status: form.status,
        priority: form.priority,
        starting_value: form.starting_value
          ? Number(form.starting_value)
          : null,
        current_value: form.current_value ? Number(form.current_value) : null,
        agreed_value: form.agreed_value ? Number(form.agreed_value) : null,
        currency: form.currency.trim() || "NGN",
        negotiation_start_date: form.negotiation_start_date || null,
        target_close_date: form.target_close_date || null,
        agreed_date: form.agreed_date || null,
        next_action: form.next_action.trim() || null,
        next_action_at: toIsoDateTime(form.next_action_at),
        client_requests: form.client_requests.trim() || null,
        concessions: form.concessions.trim() || null,
        agreed_terms: form.agreed_terms.trim() || null,
        internal_notes: form.internal_notes.trim() || null,
        outcome: form.outcome.trim() || null,
        requirements: form.requirements,
      };

      const url = editingId
        ? `/api/admin/procurement/negotiations/${editingId}`
        : "/api/admin/procurement/negotiations";

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result =
        (await response.json()) as ApiResponse<ProcurementNegotiationListItem>;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to save the negotiation.");
      }

      toast.success(
        editingId ? "Negotiation updated." : "Negotiation created."
      );
      closeModal();
      await loadNegotiations(true);
    } catch (saveError) {
      console.error("Failed to save procurement negotiation:", saveError);
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the negotiation."
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * Opens the follow-up workspace with the current procurement record
   * attached as context.
   */
  function openFollowUp(context: string): void {
    window.location.href = `/admin/procurement/follow-ups?${context}`;
  }

  async function handleStatusChange(
    id: string,
    nextStatus: ProcurementNegotiationStatus
  ): Promise<void> {
    try {
      setUpdatingStatusId(id);

      const response = await fetch(
        `/api/admin/procurement/negotiations/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "status",
            status: nextStatus,
          }),
        }
      );
      const result =
        (await response.json()) as ApiResponse<ProcurementNegotiationListItem>;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to update negotiation status.");
      }

      toast.success(`Negotiation moved to ${statusLabel(nextStatus)}.`);
      await loadNegotiations(true);
    } catch (statusError) {
      console.error("Failed to update negotiation status:", statusError);
      toast.error(
        statusError instanceof Error
          ? statusError.message
          : "Unable to update negotiation status."
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleArchive(): Promise<void> {
    if (!confirmArchiveId) return;

    try {
      const response = await fetch(
        `/api/admin/procurement/negotiations/${confirmArchiveId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "archive" }),
        }
      );
      const result = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to archive the negotiation.");
      }

      toast.success("Negotiation archived.");
      setConfirmArchiveId(null);
      await loadNegotiations(true);
    } catch (archiveError) {
      console.error("Failed to archive negotiation:", archiveError);
      toast.error(
        archiveError instanceof Error
          ? archiveError.message
          : "Unable to archive the negotiation."
      );
    }
  }

  useEffect(() => {
    void loadOptions().catch((loadError) => {
      console.error(
        "Failed to load procurement negotiation options:",
        loadError
      );
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load procurement options."
      );
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNegotiations();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [page, pageSize, search, status, priority, clientId, assignedTo]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proposalId = params.get("proposal");
    const negotiationId = params.get("negotiation");

    if (proposalId) {
      setSelectedProposalId(proposalId);
    }

    if (negotiationId) {
      void openEditModal(negotiationId);
    }
  }, []);

  useEffect(() => {
    if (!selectedProposalId || !options.proposals.length || editingId) return;

    const proposal = options.proposals.find(
      (item) => item.id === selectedProposalId
    );
    if (!proposal) return;

    setForm((current) => {
      if (current.proposal_id === proposal.id) return current;
      return getInitialForm(null, proposal);
    });
    setIsModalOpen(true);
  }, [selectedProposalId, options.proposals, editingId]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (availableContacts.some((contact) => contact.id === form.contact_id))
      return;

    if (form.contact_id) {
      setForm((current) => ({ ...current, contact_id: "" }));
    }
  }, [availableContacts, form.contact_id, isModalOpen]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Handshake}
          label="Active"
          value={activeCount}
          iconBackgroundColor="bg-teal-50"
          iconColor="text-teal-500"
        />
        <SummaryCard
          icon={Clock3}
          label="Client Review"
          value={reviewCount}
          iconBackgroundColor="bg-blue-50"
          iconColor="text-blue-500"
        />
        <SummaryCard
          icon={RefreshCw}
          label="Counter Offers"
          value={counterOfferCount}
          iconColor="text-orange-500"
          iconBackgroundColor="bg-orange-50"
        />

        <SummaryCard
          icon={Handshake}
          label="Agreed"
          value={agreedCount}
          iconBackgroundColor="bg-green-50"
          iconColor="text-green-500"
        />
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search negotiations..."
              className="h-[42px] w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <select
            value={status}
            onChange={(event) => {
              setStatus(
                event.target.value as ProcurementNegotiationStatus | ""
              );
              setPage(1);
            }}
            className="h-[42px] w-full shrink-0 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 xl:w-[180px]"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(event) => {
              setPriority(
                event.target.value as ProcurementNegotiationPriority | ""
              );
              setPage(1);
            }}
            className="h-[42px] w-full shrink-0 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 xl:w-[160px]"
          >
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
              setPage(1);
            }}
            className="h-[42px] w-full shrink-0 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 xl:w-[210px]"
          >
            <option value="">All clients</option>
            {options.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.display_name}
              </option>
            ))}
          </select>
          <select
            value={assignedTo}
            onChange={(event) => {
              setAssignedTo(event.target.value);
              setPage(1);
            }}
            className="h-[42px] w-full shrink-0 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 xl:w-[190px]"
          >
            <option value="">All assignees</option>
            {options.staff.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {`${staff.first_name} ${staff.last_name}`.trim()}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Negotiation
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] text-left">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/60">
              <tr className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <th className="px-5 py-4">Negotiation</th>
                <th className="px-5 py-4">Client</th>
                <th className="px-5 py-4">Proposal</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-16 text-center text-sm text-zinc-500"
                  >
                    Loading negotiations...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        <Handshake className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                          No negotiations found
                        </p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          Create a negotiation from a proposal or start one
                          manually.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openCreateModal()}
                        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4" />
                        Create Negotiation
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="align-top transition hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30"
                  >
                    <td className="px-5 py-4">
                      <div className="min-w-[190px]">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {item.negotiation_code}
                        </p>
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          Target: {formatDate(item.target_close_date)}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="min-w-[170px]">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {item.client_name ?? "—"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {item.contact_name ?? "No contact"}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="min-w-[170px]">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {item.proposal_code ?? "—"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {item.proposal_title ?? "No proposal"}
                        </p>
                        <p className="whitespace-nowrap text-xs text-blue-500 dark:text-zinc-100">
                         Proposed: {formatCurrency(item.current_value, item.currency)}
                        </p>
                        {item.agreed_value !== null && (
                          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                            Agreed:{" "}
                            {formatCurrency(item.agreed_value, item.currency)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                      <span
                        className={`text-sm font-semibold capitalize ${priorityClass(item.priority)}`}
                      >
                        Priority: {item.priority}
                      </span>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {item.next_action ?? "No next action"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDate(item.next_action_at)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <select
                          value={item.status}
                          disabled={updatingStatusId === item.id}
                          onChange={(event) =>
                            void handleStatusChange(
                              item.id,
                              event.target.value as ProcurementNegotiationStatus
                            )
                          }
                          title="Change status"
                          className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <ActionButton
                          label="Edit negotiation"
                          onClick={() => void openEditModal(item.id)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton
                          label="Archive negotiation"
                          onClick={() => setConfirmArchiveId(item.id)}
                          danger
                        >
                          <Archive className="h-4 w-4" />
                        </ActionButton>
                        {(item.status === "agreed" ||
                          item.status === "contract") && (
                          <button
                            type="button"
                            onClick={() => void handleCreateContract(item)}
                            disabled={creatingContractId === item.id}
                            title="Create contract"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-orange-500 transition hover:border-orange-400 hover:text-orange-600"
                          >
                            {creatingContractId === item.id ? (
                              "Creating..."
                            ) : (
                              <ClipboardPlus className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          title="Create follow-up"
                          onClick={() => openFollowUp(`lead=${item.id}`)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-green-500 transition hover:border-green-400 hover:text-green-600"
                        >
                          <Cable className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {count === 0
              ? "No records"
              : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} of ${count}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="px-2 text-sm text-zinc-500 dark:text-zinc-400">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <div>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {editingId ? "Edit Negotiation" : "New Negotiation"}
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Track commercial discussions, concessions, next actions and
                  agreed terms.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <div className="space-y-8 p-6">
                <FormSection
                  title="Negotiation Context"
                  description="Connect the negotiation to the organisation, proposal and responsible team member."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Client" required>
                      <select
                        required
                        value={form.client_id}
                        onChange={(event) =>
                          updateForm("client_id", event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="">Select client</option>
                        {options.clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.display_name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Proposal">
                      <select
                        value={form.proposal_id}
                        onChange={(event) =>
                          handleProposalChange(event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="">No proposal</option>
                        {options.proposals.map((proposal) => (
                          <option key={proposal.id} value={proposal.id}>
                            {proposal.proposal_code} — {proposal.title}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Opportunity">
                      <select
                        value={form.opportunity_id}
                        onChange={(event) =>
                          updateForm("opportunity_id", event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="">No opportunity</option>
                        {options.opportunities.map((opportunity) => (
                          <option key={opportunity.id} value={opportunity.id}>
                            {opportunity.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Contact">
                      <select
                        value={form.contact_id}
                        onChange={(event) =>
                          updateForm("contact_id", event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="">No contact</option>
                        {availableContacts.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {`${contact.first_name} ${contact.last_name}`.trim()}{" "}
                            — {contact.job_title ?? "Contact"}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Assigned To">
                      <select
                        value={form.assigned_to}
                        onChange={(event) =>
                          updateForm("assigned_to", event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="">Unassigned</option>
                        {options.staff.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {`${staff.first_name} ${staff.last_name}`.trim()}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Negotiation Title" required>
                      <input
                        required
                        value={form.title}
                        onChange={(event) =>
                          updateForm("title", event.target.value)
                        }
                        className={inputClass}
                        placeholder="e.g. Enterprise M365 managed services commercial negotiation"
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  title="Commercial Position"
                  description="Keep the original quote, current negotiating position and final agreed value separate."
                >
                  <div className="grid gap-4 md:grid-cols-4">
                    <Field label="Starting Value">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.starting_value}
                        onChange={(event) =>
                          updateForm("starting_value", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Current Value">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.current_value}
                        onChange={(event) =>
                          updateForm("current_value", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Agreed Value">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.agreed_value}
                        onChange={(event) =>
                          updateForm("agreed_value", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Currency">
                      <input
                        value={form.currency}
                        onChange={(event) =>
                          updateForm(
                            "currency",
                            event.target.value.toUpperCase()
                          )
                        }
                        className={inputClass}
                        maxLength={3}
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  title="Status & Timeline"
                  description="Control the current negotiation stage and the next commercial milestone."
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Status">
                      <select
                        value={form.status}
                        onChange={(event) =>
                          updateForm(
                            "status",
                            event.target.value as ProcurementNegotiationStatus
                          )
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
                    <Field label="Priority">
                      <select
                        value={form.priority}
                        onChange={(event) =>
                          updateForm(
                            "priority",
                            event.target.value as ProcurementNegotiationPriority
                          )
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
                    <Field label="Negotiation Start Date">
                      <input
                        type="date"
                        value={form.negotiation_start_date}
                        onChange={(event) =>
                          updateForm(
                            "negotiation_start_date",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Target Close Date">
                      <input
                        type="date"
                        value={form.target_close_date}
                        onChange={(event) =>
                          updateForm("target_close_date", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Agreed Date">
                      <input
                        type="date"
                        value={form.agreed_date}
                        onChange={(event) =>
                          updateForm("agreed_date", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Next Action">
                      <input
                        value={form.next_action}
                        onChange={(event) =>
                          updateForm("next_action", event.target.value)
                        }
                        className={inputClass}
                        placeholder="e.g. Send revised commercial offer"
                      />
                    </Field>
                    <Field label="Next Action Date & Time">
                      <input
                        type="datetime-local"
                        value={form.next_action_at}
                        onChange={(event) =>
                          updateForm("next_action_at", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  title="Negotiation Notes"
                  description="Capture what the client wants, what CloudTweak is willing to concede and the terms being discussed."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Client Requests">
                      <textarea
                        value={form.client_requests}
                        onChange={(event) =>
                          updateForm("client_requests", event.target.value)
                        }
                        className={textareaClass}
                        rows={5}
                        placeholder="Price changes, scope changes, payment terms, SLA requirements..."
                      />
                    </Field>
                    <Field label="Concessions">
                      <textarea
                        value={form.concessions}
                        onChange={(event) =>
                          updateForm("concessions", event.target.value)
                        }
                        className={textareaClass}
                        rows={5}
                        placeholder="Approved discounts, scope concessions, payment flexibility..."
                      />
                    </Field>
                    <Field label="Agreed Terms">
                      <textarea
                        value={form.agreed_terms}
                        onChange={(event) =>
                          updateForm("agreed_terms", event.target.value)
                        }
                        className={textareaClass}
                        rows={5}
                        placeholder="Terms that have been agreed with the client..."
                      />
                    </Field>
                    <Field label="Internal Notes">
                      <textarea
                        value={form.internal_notes}
                        onChange={(event) =>
                          updateForm("internal_notes", event.target.value)
                        }
                        className={textareaClass}
                        rows={5}
                        placeholder="Internal commercial strategy, approvals, risks..."
                      />
                    </Field>
                    <Field label="Outcome">
                      <textarea
                        value={form.outcome}
                        onChange={(event) =>
                          updateForm("outcome", event.target.value)
                        }
                        className={textareaClass}
                        rows={4}
                        placeholder="Final outcome or reason for closure..."
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  title="Requirements"
                  description="Use this checklist to make sure the negotiation is commercially ready for the next stage."
                >
                  <div className="space-y-3">
                    {form.requirements.map((requirement, index) => (
                      <div
                        key={`${requirement.name}-${index}`}
                        className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={requirement.completed}
                            onChange={() => toggleRequirement(index)}
                            className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {requirement.name}
                              </span>
                              {requirement.required && (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                                  Required
                                </span>
                              )}
                            </div>
                            <input
                              value={requirement.notes ?? ""}
                              onChange={(event) =>
                                updateRequirementNotes(
                                  index,
                                  event.target.value
                                )
                              }
                              className={`${inputClass} mt-3`}
                              placeholder="Optional notes"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </FormSection>

                {selectedProposal && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                      Proposal context
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedProposal.proposal_code} —{" "}
                      {selectedProposal.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Version {selectedProposal.version} · Quoted{" "}
                      {formatCurrency(
                        selectedProposal.quoted_value,
                        selectedProposal.currency
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-zinc-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Negotiation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmArchiveId)}
        title="Archive negotiation"
        message="Are you sure you want to archive this negotiation? It will no longer appear in the active negotiation list."
        confirmText="Archive"
        cancelText="Cancel"
        onConfirm={() => void handleArchive()}
        onCancel={() => setConfirmArchiveId(null)}
      />
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

const textareaClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

function ActionButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
        danger
          ? "border-rose-200 text-rose-600 hover:border-rose-500 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/30"
          : "border-zinc-200 text-zinc-600 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}
