import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Cable,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import ConfirmModal from "../../../islands/ConfirmModal";
import { toast } from "react-toastify";
import type {
  CreateProcurementContractInput,
  ProcurementContractListItem,
  ProcurementContractPriority,
  ProcurementContractRequirement,
  ProcurementContractStatus,
  UpdateProcurementContractInput,
} from "../../../types/procurement";
import { SummaryCard } from "../../../islands/AdminSummaryCard";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
}

interface ProcurementContractFormOptions {
  clients: Array<{
    id: string;
    display_name: string | null;
    company_name: string | null;
  }>;
  contacts: Array<{
    id: string;
    client_id: string;
    first_name: string;
    last_name: string;
    job_title: string | null;
  }>;
  staff: Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
  opportunities: Array<{
    id: string;
    client_id: string;
    name: string;
  }>;
  proposals: Array<{
    id: string;
    client_id: string;
    proposal_code: string;
    title: string;
  }>;
  negotiations: Array<{
    id: string;
    client_id: string;
    negotiation_code: string;
    title: string;
    status: ProcurementNegotiationStatus;
  }>;
}

type ProcurementNegotiationStatus =
  | "not_started"
  | "active"
  | "client_review"
  | "counter_offer"
  | "internal_approval"
  | "agreed"
  | "contract"
  | "closed"
  | "cancelled";

interface ContractFormState {
  client_id: string;
  opportunity_id: string;
  proposal_id: string;
  negotiation_id: string;
  contact_id: string;
  assigned_to: string;
  title: string;
  status: ProcurementContractStatus;
  priority: ProcurementContractPriority;
  contract_value: string;
  currency: string;
  contract_date: string;
  start_date: string;
  end_date: string;
  renewal_date: string;
  payment_terms: string;
  billing_frequency: string;
  scope_summary: string;
  deliverables: string;
  service_level_terms: string;
  termination_terms: string;
  renewal_terms: string;
  next_action: string;
  next_action_at: string;
  internal_notes: string;
  client_notes: string;
  outcome: string;
  requirements: ProcurementContractRequirement[];
}

const STATUS_OPTIONS: ProcurementContractStatus[] = [
  "draft",
  "internal_review",
  "client_review",
  "negotiation",
  "pending_signature",
  "signed",
  "active",
  "suspended",
  "completed",
  "expired",
  "terminated",
  "cancelled",
];

const PRIORITY_OPTIONS: ProcurementContractPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

/**
 * Creates the default contract form state.
 */
function createInitialForm(): ContractFormState {
  return {
    client_id: "",
    opportunity_id: "",
    proposal_id: "",
    negotiation_id: "",
    contact_id: "",
    assigned_to: "",
    title: "",
    status: "draft",
    priority: "medium",
    contract_value: "",
    currency: "NGN",
    contract_date: new Date().toISOString().slice(0, 10),
    start_date: "",
    end_date: "",
    renewal_date: "",
    payment_terms: "",
    billing_frequency: "",
    scope_summary: "",
    deliverables: "",
    service_level_terms: "",
    termination_terms: "",
    renewal_terms: "",
    next_action: "",
    next_action_at: "",
    internal_notes: "",
    client_notes: "",
    outcome: "",
    requirements: [],
  };
}

/**
 * Opens the follow-up workspace with the current procurement record
 * attached as context.
 */
function openFollowUp(context: string): void {
  window.location.href = `/admin/procurement/follow-ups?${context}`;
}

/**
 * Formats a contract status for display.
 */
function formatStatus(status: ProcurementContractStatus): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Formats a contract priority for display.
 */
function formatPriority(priority: ProcurementContractPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

/**
 * Formats a currency amount for display.
 */
function formatCurrency(value: number | null, currency = "NGN"): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formats a date for compact table display.
 */
function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Returns the CSS classes used by contract status badges.
 */
function statusClasses(status: ProcurementContractStatus): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

    case "signed":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";

    case "pending_signature":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";

    case "completed":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";

    case "terminated":
    case "cancelled":
    case "expired":
      return "bg-red-500/10 text-red-700 dark:text-red-300";

    case "suspended":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-300";

    default:
      return "bg-slate-500/10 text-slate-700 dark:text-slate-300";
  }
}

/**
 * Returns the CSS classes used by contract priority badges.
 */
function priorityClasses(priority: ProcurementContractPriority): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500/10 text-red-700 dark:text-red-300";

    case "high":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-300";

    case "medium":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";

    default:
      return "bg-slate-500/10 text-slate-700 dark:text-slate-300";
  }
}

/**
 * Returns a safe display name for a client.
 */
function clientLabel(
  client: ProcurementContractFormOptions["clients"][number]
): string {
  return client.display_name || client.company_name || "Unnamed client";
}

/**
 * Procurement contracts workspace.
 */
export default function ProcurementContractsWorkspace() {
  const [contracts, setContracts] = useState<ProcurementContractListItem[]>([]);

  const [options, setOptions] = useState<ProcurementContractFormOptions>({
    clients: [],
    contacts: [],
    staff: [],
    opportunities: [],
    proposals: [],
    negotiations: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    ProcurementContractStatus | ""
  >("");
  const [priorityFilter, setPriorityFilter] = useState<
    ProcurementContractPriority | ""
  >("");
  const [clientFilter, setClientFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [count, setCount] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContract, setEditingContract] =
    useState<ProcurementContractListItem | null>(null);

  const [form, setForm] = useState<ContractFormState>(createInitialForm());

  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);

  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [creatingFromNegotiationId, setCreatingFromNegotiationId] = useState<
    string | null
  >(null);

  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    null
  );

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
          (!form.client_id || negotiation.client_id === form.client_id) &&
          ["agreed", "contract"].includes(negotiation.status)
      ),
    [options.negotiations, form.client_id]
  );

  const statistics = useMemo(() => {
    return {
      total: count,
      active: contracts.filter((contract) => contract.status === "active")
        .length,
      pendingSignature: contracts.filter(
        (contract) => contract.status === "pending_signature"
      ).length,
      expiring: contracts.filter((contract) => {
        if (!contract.end_date) {
          return false;
        }

        const end = new Date(contract.end_date);
        const now = new Date();
        const fourteenDays = new Date();

        fourteenDays.setDate(now.getDate() + 30);

        return (
          end >= now &&
          end <= fourteenDays &&
          !["completed", "cancelled", "terminated"].includes(contract.status)
        );
      }).length,
    };
  }, [contracts, count]);

  /**
   * Loads the contracts available to the current filters.
   */
  async function loadContracts(): Promise<void> {
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

      if (priorityFilter) {
        params.set("priority", priorityFilter);
      }

      if (clientFilter) {
        params.set("client_id", clientFilter);
      }

      if (assignedFilter) {
        params.set("assigned_to", assignedFilter);
      }

      const response = await fetch(
        `/api/admin/procurement/contracts?${params.toString()}`
      );

      const result: ApiResponse<ProcurementContractListItem[]> =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Unable to load procurement contracts."
        );
      }

      setContracts(result.data ?? []);
      setCount(result.count ?? 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load procurement contracts."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * Loads shared procurement form options.
   */
  async function loadOptions(): Promise<void> {
    try {
      const response = await fetch("/api/admin/procurement/options");

      const result: ApiResponse<Partial<ProcurementContractFormOptions>> =
        await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error ?? "Unable to load procurement options.");
      }

      setOptions({
        clients: result.data.clients ?? [],
        contacts: result.data.contacts ?? [],
        staff: result.data.staff ?? [],
        opportunities: result.data.opportunities ?? [],
        proposals: result.data.proposals ?? [],
        negotiations: result.data.negotiations ?? [],
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load procurement options."
      );
    }
  }

  /**
   * Opens a blank contract creation form.
   */
  function openCreateModal(): void {
    setEditingContract(null);
    setForm(createInitialForm());
    setModalOpen(true);
  }

  /**
   * Opens an existing contract for editing.
   */
  function openEditModal(contract: ProcurementContractListItem): void {
    setEditingContract(contract);

    setForm({
      client_id: contract.client_id,
      opportunity_id: contract.opportunity_id ?? "",
      proposal_id: contract.proposal_id ?? "",
      negotiation_id: contract.negotiation_id ?? "",
      contact_id: contract.contact_id ?? "",
      assigned_to: contract.assigned_to ?? "",
      title: contract.title,
      status: contract.status,
      priority: contract.priority,
      contract_value:
        contract.contract_value !== null ? String(contract.contract_value) : "",
      currency: contract.currency,
      contract_date: contract.contract_date ?? "",
      start_date: contract.start_date ?? "",
      end_date: contract.end_date ?? "",
      renewal_date: contract.renewal_date ?? "",
      payment_terms: contract.payment_terms ?? "",
      billing_frequency: contract.billing_frequency ?? "",
      scope_summary: contract.scope_summary ?? "",
      deliverables: contract.deliverables ?? "",
      service_level_terms: contract.service_level_terms ?? "",
      termination_terms: contract.termination_terms ?? "",
      renewal_terms: contract.renewal_terms ?? "",
      next_action: contract.next_action ?? "",
      next_action_at: contract.next_action_at
        ? contract.next_action_at.slice(0, 16)
        : "",
      internal_notes: contract.internal_notes ?? "",
      client_notes: contract.client_notes ?? "",
      outcome: contract.outcome ?? "",
      requirements: contract.requirements ?? [],
    });

    setModalOpen(true);
  }

  /**
   * Opens a contract form pre-populated from a negotiation.
   */
  function openNegotiationContractForm(negotiationId: string): void {
    const negotiation = options.negotiations.find(
      (item) => item.id === negotiationId
    );

    if (!negotiation) {
      toast.error("The negotiation could not be found.");
      return;
    }

    setEditingContract(null);

    setForm({
      ...createInitialForm(),
      client_id: negotiation.client_id,
      negotiation_id: negotiation.id,
      title: `Contract — ${negotiation.title}`,
    });

    setModalOpen(true);
  }

  /**
   * Updates a form field.
   */
  function updateForm(
    field: keyof ContractFormState,
    value: string | ProcurementContractRequirement[]
  ): void {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /**
   * Adds a new contract requirement.
   */
  function addRequirement(): void {
    setForm((current) => ({
      ...current,
      requirements: [
        ...current.requirements,
        {
          name: "",
          required: true,
          completed: false,
          completed_at: null,
          notes: null,
        },
      ],
    }));
  }

  /**
   * Updates a contract requirement.
   */
  function updateRequirement(
    index: number,
    changes: Partial<ProcurementContractRequirement>
  ): void {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.map((requirement, requirementIndex) =>
        requirementIndex === index
          ? { ...requirement, ...changes }
          : requirement
      ),
    }));
  }

  /**
   * Removes a contract requirement.
   */
  function removeRequirement(index: number): void {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.filter(
        (_, requirementIndex) => requirementIndex !== index
      ),
    }));
  }

  /**
   * Saves a new or existing contract.
   */
  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (!form.client_id) {
      toast.error("Select a client.");
      return;
    }

    if (!form.title.trim()) {
      toast.error("Enter a contract title.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        client_id: form.client_id,
        opportunity_id: form.opportunity_id || null,
        proposal_id: form.proposal_id || null,
        negotiation_id: form.negotiation_id || null,
        contact_id: form.contact_id || null,
        assigned_to: form.assigned_to || null,
        title: form.title.trim(),
        status: form.status,
        priority: form.priority,
        contract_value:
          form.contract_value.trim() !== ""
            ? Number(form.contract_value)
            : null,
        currency: form.currency || "NGN",
        contract_date: form.contract_date || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        renewal_date: form.renewal_date || null,
        payment_terms: form.payment_terms || null,
        billing_frequency: form.billing_frequency || null,
        scope_summary: form.scope_summary || null,
        deliverables: form.deliverables || null,
        service_level_terms: form.service_level_terms || null,
        termination_terms: form.termination_terms || null,
        renewal_terms: form.renewal_terms || null,
        next_action: form.next_action || null,
        next_action_at: form.next_action_at
          ? new Date(form.next_action_at).toISOString()
          : null,
        internal_notes: form.internal_notes || null,
        client_notes: form.client_notes || null,
        outcome: form.outcome || null,
        requirements: form.requirements.filter((requirement) =>
          requirement.name.trim()
        ),
      } satisfies CreateProcurementContractInput;

      const endpoint = editingContract
        ? `/api/admin/procurement/contracts/${editingContract.id}`
        : "/api/admin/procurement/contracts";

      const response = await fetch(endpoint, {
        method: editingContract ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingContract
            ? ({
                id: editingContract.id,
                ...payload,
              } satisfies UpdateProcurementContractInput)
            : payload
        ),
      });

      const result: ApiResponse<ProcurementContractListItem> =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to save procurement contract.");
      }

      toast.success(
        editingContract
          ? "Contract updated successfully."
          : "Contract created successfully."
      );

      setModalOpen(false);
      setEditingContract(null);

      await loadContracts();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Unable to save procurement contract."
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * Archives the selected contract.
   */
  async function handleArchive(): Promise<void> {
    if (!confirmArchiveId) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/procurement/contracts/${confirmArchiveId}`,
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
        throw new Error(result.error ?? "Unable to archive the contract.");
      }

      toast.success("Contract archived successfully.");

      setConfirmArchiveId(null);

      await loadContracts();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to archive the contract."
      );
    }
  }

  /**
   * Changes the lifecycle status of a contract.
   */
  async function handleStatusChange(
    contractId: string,
    status: ProcurementContractStatus
  ): Promise<void> {
    try {
      setStatusUpdatingId(contractId);

      const response = await fetch(
        `/api/admin/procurement/contracts/${contractId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "status",
            status,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to update contract status.");
      }

      toast.success(`Contract moved to ${formatStatus(status)}.`);

      await loadContracts();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to update contract status."
      );
    } finally {
      setStatusUpdatingId(null);
    }
  }

  /**
   * Creates or retrieves a contract directly from an eligible negotiation.
   */
  async function handleCreateFromNegotiation(
    negotiationId: string
  ): Promise<void> {
    try {
      setCreatingFromNegotiationId(negotiationId);

      const response = await fetch(
        `/api/admin/procurement/negotiations/${negotiationId}/create-contract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      const result: ApiResponse<ProcurementContractListItem> =
        await response.json();

      if (!response.ok || !result.success || !result.data?.id) {
        throw new Error(result.error ?? "Unable to create the contract.");
      }

      toast.success("Contract created from negotiation successfully.");

      await loadContracts();

      openEditModal(result.data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to create the contract."
      );
    } finally {
      setCreatingFromNegotiationId(null);
    }
  }

  /**
   * Handles URL-based selection of a contract.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const contractId = params.get("contract");

    if (contractId) {
      setSelectedContractId(contractId);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, []);

  useEffect(() => {
    void loadContracts();
  }, [
    page,
    search,
    statusFilter,
    priorityFilter,
    clientFilter,
    assignedFilter,
  ]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Contracts
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage procurement contracts, signatures, active agreements,
            renewals, and contract lifecycle activity.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          <Plus className="h-4 w-4" />
          New Contract
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Contracts"
          value={statistics.total}
          icon={FileText}
          description=""
          iconBackgroundColor="bg-slate-100"
          iconColor="text-slate-500"
        />

        <SummaryCard
          label="Active"
          value={statistics.active}
          icon={FileCheck2}
          description=""
          iconBackgroundColor="bg-green-50"
          iconColor="text-green-500"
        />

        <SummaryCard
          label="Pending Signature"
          value={statistics.pendingSignature}
          icon={ClipboardCheck}
          description=""
          iconBackgroundColor="bg-amber-50"
          iconColor="text-amber-500"
        />

        <SummaryCard
          label="Expiring Soon"
          value={statistics.expiring}
          icon={CalendarDays}
          description=""
          iconBackgroundColor="bg-red-50"
          iconColor="text-red-500"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex w-full items-center gap-3 overflow-x-auto">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search contracts..."
              className="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value as ProcurementContractStatus | ""
              );
              setPage(1);
            }}
            className="h-[42px] w-[180px] shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          >
            <option value="">All statuses</option>

            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(event) => {
              setPriorityFilter(
                event.target.value as ProcurementContractPriority | ""
              );
              setPage(1);
            }}
            className="h-[42px] w-[160px] shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          >
            <option value="">All priorities</option>

            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {formatPriority(priority)}
              </option>
            ))}
          </select>

          <select
            value={clientFilter}
            onChange={(event) => {
              setClientFilter(event.target.value);
              setPage(1);
            }}
            className="h-[42px] w-[200px] shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          >
            <option value="">All clients</option>

            {options.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {clientLabel(client)}
              </option>
            ))}
          </select>

          <select
            value={assignedFilter}
            onChange={(event) => {
              setAssignedFilter(event.target.value);
              setPage(1);
            }}
            className="h-[42px] w-[190px] shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          >
            <option value="">All assignees</option>

            {options.staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.first_name} {member.last_name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setPriorityFilter("");
              setClientFilter("");
              setAssignedFilter("");
              setPage(1);
            }}
            className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <tr>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contract
                </th>

                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Client
                </th>

                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Negotiation
                </th>

                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>

                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Priority
                </th>

                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Dates
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    Loading contracts...
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    No procurement contracts found.
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className={`transition hover:bg-slate-50 dark:hover:bg-slate-950 ${
                      selectedContractId === contract.id
                        ? "bg-slate-50 dark:bg-slate-950"
                        : ""
                    }`}
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => openEditModal(contract)}
                        className="text-left"
                      >
                        <p className="font-semibold text-slate-900 hover:underline dark:text-white">
                          {contract.contract_code}
                        </p>

                        <p className="mt-1 max-w-[240px] truncate text-sm text-slate-500 dark:text-slate-400">
                          {contract.title}
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                         Amount: {formatCurrency(
                            contract.contract_value,
                            contract.currency
                          )}
                        </p>
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {contract.client_name ?? "—"}
                      </p>

                      {contract.contact_name && (
                        <p className="mt-1 text-xs text-slate-500">
                          {contract.contact_name}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {contract.negotiation_code ? (
                        <>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {contract.negotiation_code}
                          </p>

                          <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                            {contract.negotiation_title}
                          </p>
                        </>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <select
                        value={contract.status}
                        disabled={statusUpdatingId === contract.id}
                        onChange={(event) =>
                          void handleStatusChange(
                            contract.id,
                            event.target.value as ProcurementContractStatus
                          )
                        }
                        className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ${statusClasses(
                          contract.status
                        )}`}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {formatStatus(status)}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityClasses(
                          contract.priority
                        )}`}
                      >
                        {formatPriority(contract.priority)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Start: {formatDate(contract.start_date)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        End: {formatDate(contract.end_date)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(contract)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-blue-500 transition hover:border-blue-200 hover:text-blue-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          title="Archive contract"
                          onClick={() => setConfirmArchiveId(contract.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-orange-500 transition hover:border-red-200 hover:text-red-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-red-900 dark:hover:text-red-400"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Create follow-up"
                          onClick={() => openFollowUp(`lead=${contract.id}`)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-green-500 transition hover:border-green-400 hover:text-green-600"
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

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Page {page} of {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {editingContract ? "Edit Contract" : "New Contract"}
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Capture the commercial and operational details of the
                  contract.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <div className="space-y-8 p-6">
                <section>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Contract context
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Client *
                      </span>

                      <select
                        required
                        value={form.client_id}
                        onChange={(event) => {
                          setForm((current) => ({
                            ...current,
                            client_id: event.target.value,
                            contact_id: "",
                            opportunity_id: "",
                            proposal_id: "",
                            negotiation_id: "",
                          }));
                        }}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">Select client</option>

                        {options.clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {clientLabel(client)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Contact
                      </span>

                      <select
                        value={form.contact_id}
                        onChange={(event) =>
                          updateForm("contact_id", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Opportunity
                      </span>

                      <select
                        value={form.opportunity_id}
                        onChange={(event) =>
                          updateForm("opportunity_id", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">Select opportunity</option>

                        {availableOpportunities.map((opportunity) => (
                          <option key={opportunity.id} value={opportunity.id}>
                            {opportunity.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Proposal
                      </span>

                      <select
                        value={form.proposal_id}
                        onChange={(event) =>
                          updateForm("proposal_id", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">Select proposal</option>

                        {availableProposals.map((proposal) => (
                          <option key={proposal.id} value={proposal.id}>
                            {proposal.proposal_code} — {proposal.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Negotiation
                      </span>

                      <select
                        value={form.negotiation_id}
                        onChange={(event) =>
                          updateForm("negotiation_id", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">Select agreed negotiation</option>

                        {availableNegotiations.map((negotiation) => (
                          <option key={negotiation.id} value={negotiation.id}>
                            {negotiation.negotiation_code} — {negotiation.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Contract details
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Contract title *
                      </span>

                      <input
                        required
                        value={form.title}
                        onChange={(event) =>
                          updateForm("title", event.target.value)
                        }
                        placeholder="Enter contract title"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Status
                      </span>

                      <select
                        value={form.status}
                        onChange={(event) =>
                          updateForm(
                            "status",
                            event.target.value as ProcurementContractStatus
                          )
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {formatStatus(status)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Priority
                      </span>

                      <select
                        value={form.priority}
                        onChange={(event) =>
                          updateForm(
                            "priority",
                            event.target.value as ProcurementContractPriority
                          )
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        {PRIORITY_OPTIONS.map((priority) => (
                          <option key={priority} value={priority}>
                            {formatPriority(priority)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Contract value
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.contract_value}
                        onChange={(event) =>
                          updateForm("contract_value", event.target.value)
                        }
                        placeholder="0.00"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Currency
                      </span>

                      <input
                        value={form.currency}
                        onChange={(event) =>
                          updateForm(
                            "currency",
                            event.target.value.toUpperCase()
                          )
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Assigned to
                      </span>

                      <select
                        value={form.assigned_to}
                        onChange={(event) =>
                          updateForm("assigned_to", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">Select staff member</option>

                        {options.staff.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Contract dates
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Contract date
                      </span>

                      <input
                        type="date"
                        value={form.contract_date}
                        onChange={(event) =>
                          updateForm("contract_date", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Start date
                      </span>

                      <input
                        type="date"
                        value={form.start_date}
                        onChange={(event) =>
                          updateForm("start_date", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        End date
                      </span>

                      <input
                        type="date"
                        value={form.end_date}
                        onChange={(event) =>
                          updateForm("end_date", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Renewal date
                      </span>

                      <input
                        type="date"
                        value={form.renewal_date}
                        onChange={(event) =>
                          updateForm("renewal_date", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Commercial terms
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Payment terms
                      </span>

                      <textarea
                        rows={3}
                        value={form.payment_terms}
                        onChange={(event) =>
                          updateForm("payment_terms", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Billing frequency
                      </span>

                      <input
                        value={form.billing_frequency}
                        onChange={(event) =>
                          updateForm("billing_frequency", event.target.value)
                        }
                        placeholder="Monthly, quarterly, annually..."
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Scope and obligations
                  </h3>

                  <div className="mt-4 space-y-4">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Scope summary
                      </span>

                      <textarea
                        rows={4}
                        value={form.scope_summary}
                        onChange={(event) =>
                          updateForm("scope_summary", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Deliverables
                      </span>

                      <textarea
                        rows={4}
                        value={form.deliverables}
                        onChange={(event) =>
                          updateForm("deliverables", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Service level terms
                        </span>

                        <textarea
                          rows={4}
                          value={form.service_level_terms}
                          onChange={(event) =>
                            updateForm(
                              "service_level_terms",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Termination terms
                        </span>

                        <textarea
                          rows={4}
                          value={form.termination_terms}
                          onChange={(event) =>
                            updateForm("termination_terms", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </label>
                    </div>

                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Renewal terms
                      </span>

                      <textarea
                        rows={3}
                        value={form.renewal_terms}
                        onChange={(event) =>
                          updateForm("renewal_terms", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Contract requirements
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Track documents, approvals, and other contract
                        requirements.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addRequirement}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" />
                      Add Requirement
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {form.requirements.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">
                        No requirements added.
                      </div>
                    ) : (
                      form.requirements.map((requirement, index) => (
                        <div
                          key={`${index}-${requirement.name}`}
                          className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                        >
                          <div className="flex items-start gap-3">
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
                              className="mt-1 h-4 w-4 rounded border-slate-300"
                            />

                            <div className="min-w-0 flex-1">
                              <input
                                value={requirement.name}
                                onChange={(event) =>
                                  updateRequirement(index, {
                                    name: event.target.value,
                                  })
                                }
                                placeholder="Requirement name"
                                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                              />

                              <div className="mt-3 flex items-center gap-4">
                                <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
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
                                  className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Follow-up
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Next action
                      </span>

                      <input
                        value={form.next_action}
                        onChange={(event) =>
                          updateForm("next_action", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Next action date
                      </span>

                      <input
                        type="datetime-local"
                        value={form.next_action_at}
                        onChange={(event) =>
                          updateForm("next_action_at", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Notes
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Client notes
                      </span>

                      <textarea
                        rows={4}
                        value={form.client_notes}
                        onChange={(event) =>
                          updateForm("client_notes", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Internal notes
                      </span>

                      <textarea
                        rows={4}
                        value={form.internal_notes}
                        onChange={(event) =>
                          updateForm("internal_notes", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block space-y-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Outcome
                    </span>

                    <textarea
                      rows={3}
                      value={form.outcome}
                      onChange={(event) =>
                        updateForm("outcome", event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                </section>
              </div>

              <div className="sticky bottom-0 flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
                >
                  {saving
                    ? "Saving..."
                    : editingContract
                      ? "Update Contract"
                      : "Create Contract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmArchiveId)}
        title="Archive contract"
        message="Are you sure you want to archive this contract? The contract will no longer appear in the active contracts list."
        confirmText="Archive"
        cancelText="Cancel"
        onConfirm={() => void handleArchive()}
        onCancel={() => setConfirmArchiveId(null)}
      />
    </section>
  );
}
