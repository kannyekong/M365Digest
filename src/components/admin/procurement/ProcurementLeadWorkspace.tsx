import {
  Archive,
  ArrowRight,
  Cable,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Filter,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import type {
  CreateProcurementLeadInput,
  ProcurementLeadListItem,
  ProcurementLeadPriority,
  ProcurementLeadSource,
  ProcurementLeadStatus,
} from "../../../types/procurement";

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

interface ProcurementOptionsResponse {
  success: boolean;
  clients?: ProcurementClientOption[];
  contacts?: ProcurementContactOption[];
  staff?: ProcurementStaffOption[];
  error?: string;
}

interface LeadsResponse {
  success: boolean;
  data?: ProcurementLeadListItem[];
  total?: number;
  page?: number;
  page_size?: number;
  error?: string;
}

interface LeadResponse {
  success: boolean;
  data?: ProcurementLeadListItem;
  error?: string;
}

const PAGE_SIZE = 15;

const LEAD_STATUSES: Array<{
  value: ProcurementLeadStatus;
  label: string;
}> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "engaged", label: "Engaged" },
  { value: "qualified", label: "Qualified" },
  { value: "unqualified", label: "Unqualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

const LEAD_PRIORITIES: Array<{
  value: ProcurementLeadPriority;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const LEAD_SOURCES: Array<{
  value: ProcurementLeadSource;
  label: string;
}> = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "procurement_portal", label: "Procurement Portal" },
  { value: "tender", label: "Tender" },
  { value: "rfq", label: "RFQ" },
  { value: "event", label: "Event" },
  { value: "existing_client", label: "Existing Client" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Other" },
];

interface LeadFormState {
  client_id: string;
  contact_id: string;
  title: string;
  description: string;
  source: ProcurementLeadSource;
  source_reference: string;
  status: ProcurementLeadStatus;
  priority: ProcurementLeadPriority;
  estimated_value: string;
  currency: string;
  industry: string;
  service_interest: string;
  next_follow_up_at: string;
  qualification_notes: string;
  notes: string;
  assigned_to: string;
}

const DEFAULT_FORM: LeadFormState = {
  client_id: "",
  contact_id: "",
  title: "",
  description: "",
  source: "cold_outreach",
  source_reference: "",
  status: "new",
  priority: "medium",
  estimated_value: "",
  currency: "NGN",
  industry: "",
  service_interest: "",
  next_follow_up_at: "",
  qualification_notes: "",
  notes: "",
  assigned_to: "",
};

/**
 * Converts a technical lead value into a readable dashboard label.
 */
function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Formats a monetary value for the procurement workspace.
 */
function formatCurrency(value: number | null, currency = "NGN") {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats an ISO date into a compact administrative date.
 */
function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

/**
 * Returns the Tailwind classes used by a lead status badge.
 */
function getStatusClasses(status: ProcurementLeadStatus) {
  switch (status) {
    case "qualified":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300";

    case "engaged":
      return "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300";

    case "contacted":
      return "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300";

    case "lost":
    case "unqualified":
      return "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300";

    case "converted":
      return "bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300";
  }
}

/**
 * Returns the Tailwind classes used by a lead priority badge.
 */
function getPriorityClasses(priority: ProcurementLeadPriority) {
  switch (priority) {
    case "urgent":
      return "text-rose-600 dark:text-rose-400";

    case "high":
      return "text-orange-600 dark:text-orange-400";

    case "medium":
      return "text-amber-600 dark:text-amber-400";

    default:
      return "text-slate-500 dark:text-slate-400";
  }
}

/**
 * Renders and manages the procurement leads workspace.
 */
export default function ProcurementLeadsWorkspace() {
  const [leads, setLeads] = useState<ProcurementLeadListItem[]>([]);
  const [clients, setClients] = useState<ProcurementClientOption[]>([]);
  const [contacts, setContacts] = useState<ProcurementContactOption[]>([]);
  const [staff, setStaff] = useState<ProcurementStaffOption[]>([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] =
    useState<ProcurementLeadListItem | null>(null);
  const [form, setForm] = useState<LeadFormState>(DEFAULT_FORM);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const filteredContacts = useMemo(() => {
    if (!form.client_id) {
      return contacts;
    }

    return contacts.filter((contact) => contact.client_id === form.client_id);
  }, [contacts, form.client_id]);

  /**
   * Loads procurement form options from the protected admin API.
   */
  async function loadOptions() {
    setOptionsLoading(true);

    try {
      const response = await fetch("/api/admin/procurement/options", {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const result = (await response.json()) as ProcurementOptionsResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Procurement options could not be loaded."
        );
      }

      setClients(result.clients ?? []);
      setContacts(result.contacts ?? []);
      setStaff(result.staff ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Procurement options could not be loaded."
      );
    } finally {
      setOptionsLoading(false);
    }
  }

  /**
   * Loads procurement leads using the active filters.
   */
  async function loadLeads() {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("page_size", String(PAGE_SIZE));

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (status) {
        params.set("status", status);
      }

      if (priority) {
        params.set("priority", priority);
      }

      if (source) {
        params.set("source", source);
      }

      const response = await fetch(
        `/api/admin/procurement/leads?${params.toString()}`,
        {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const result = (await response.json()) as LeadsResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Procurement leads could not be loaded."
        );
      }

      setLeads(result.data ?? []);
      setTotal(result.total ?? 0);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Procurement leads could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOptions();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLeads();
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [page, search, status, priority, source]);

  /**
   * Updates a single field in the lead form.
   */
  function updateForm<Key extends keyof LeadFormState>(
    field: Key,
    value: LeadFormState[Key]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /**
   * Opens the form in create mode.
   */
  function openCreateForm() {
    setEditingLead(null);
    setForm(DEFAULT_FORM);
    setFormOpen(true);
  }

  /**
   * Opens the form with an existing lead's information.
   */
  function openEditForm(lead: ProcurementLeadListItem) {
    setEditingLead(lead);

    setForm({
      client_id: lead.client_id ?? "",
      contact_id: lead.contact_id ?? "",
      title: lead.title,
      description: lead.description ?? "",
      source: lead.source,
      source_reference: lead.source_reference ?? "",
      status: lead.status,
      priority: lead.priority,
      estimated_value:
        lead.estimated_value === null ? "" : String(lead.estimated_value),
      currency: lead.currency,
      industry: lead.industry ?? "",
      service_interest: lead.service_interest ?? "",
      next_follow_up_at: lead.next_follow_up_at
        ? lead.next_follow_up_at.slice(0, 16)
        : "",
      qualification_notes: lead.qualification_notes ?? "",
      notes: lead.notes ?? "",
      assigned_to: lead.assigned_to ?? "",
    });

    setFormOpen(true);
  }

  /**
   * Opens the follow-up workspace with the current procurement record
   * attached as context.
   */
  function openFollowUp(context: string): void {
    window.location.href = `/admin/procurement/follow-ups?${context}`;
  }
  /**
   * Validates and submits the lead form.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error("Lead title is required.");
      return;
    }

    if (!form.client_id) {
      toast.error("Select the organisation associated with this lead.");
      return;
    }

    setSaving(true);

    try {
      const payload: CreateProcurementLeadInput = {
        client_id: form.client_id,
        contact_id: form.contact_id || null,
        assigned_to: form.assigned_to || null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        source: form.source,
        source_reference: form.source_reference.trim() || null,
        status: form.status,
        priority: form.priority,
        estimated_value:
          form.estimated_value.trim() === ""
            ? null
            : Number(form.estimated_value),
        currency: form.currency.trim().toUpperCase() || "NGN",
        industry: form.industry.trim() || null,
        service_interest: form.service_interest.trim() || null,
        next_follow_up_at: form.next_follow_up_at.trim() || null,
        qualification_notes: form.qualification_notes.trim() || null,
        notes: form.notes.trim() || null,
      };

      const url = editingLead
        ? `/api/admin/procurement/leads/${editingLead.id}`
        : "/api/admin/procurement/leads";

      const response = await fetch(url, {
        method: editingLead ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as LeadResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            `Unable to ${editingLead ? "update" : "create"} the lead.`
        );
      }

      toast.success(
        editingLead
          ? "Procurement lead updated successfully."
          : "Procurement lead created successfully."
      );

      setFormOpen(false);
      setEditingLead(null);
      setForm(DEFAULT_FORM);

      await loadLeads();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save procurement lead."
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * Converts a qualified procurement lead into an opportunity.
   */
  async function convertLead(lead: ProcurementLeadListItem) {
    if (lead.status !== "qualified") {
      toast.error("Only qualified leads can be converted into opportunities.");
      return;
    }

    const confirmed = window.confirm(
      `Convert "${lead.title}" into an opportunity?`
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(lead.id);

    try {
      const response = await fetch(
        `/api/admin/procurement/leads/${lead.id}/convert`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: lead.title,
            primary_contact_id: lead.contact_id,
            assigned_to: lead.assigned_to,
            service_type: lead.service_interest,
            estimated_value: lead.estimated_value,
            currency: lead.currency,
          }),
        }
      );

      const result = (await response.json()) as {
        success: boolean;
        data?: {
          opportunity_code: string;
        };
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to convert procurement lead.");
      }

      toast.success(
        `Lead converted to ${result.data?.opportunity_code ?? "opportunity"}.`
      );

      await loadLeads();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to convert procurement lead."
      );
    } finally {
      setProcessingId(null);
    }
  }

  /**
   * Archives a procurement lead after confirmation.
   */
  async function archiveLead(lead: ProcurementLeadListItem) {
    const confirmed = window.confirm(
      `Archive "${lead.title}"? This lead will no longer appear in the active workspace.`
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(lead.id);

    try {
      const response = await fetch(`/api/admin/procurement/leads/${lead.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to archive procurement lead.");
      }

      toast.success("Procurement lead archived.");
      await loadLeads();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to archive procurement lead."
      );
    } finally {
      setProcessingId(null);
    }
  }

  /**
   * Clears all lead filters and returns to the first page.
   */
  function clearFilters() {
    setSearch("");
    setStatus("");
    setPriority("");
    setSource("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Procurement Leads
          </h1>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Capture and qualify organisations before they enter the opportunity
            pipeline.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadLeads()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex w-full items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search leads..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="w-[180px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none dark:border-white/10 dark:bg-black/20 dark:text-slate-200"
          >
            <option value="">All statuses</option>

            {LEAD_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value);
              setPage(1);
            }}
            className="w-[180px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none dark:border-white/10 dark:bg-black/20 dark:text-slate-200"
          >
            <option value="">All priorities</option>

            {LEAD_PRIORITIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setPage(1);
            }}
            className="w-[200px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none dark:border-white/10 dark:bg-black/20 dark:text-slate-200"
          >
            <option value="">All sources</option>

            {LEAD_SOURCES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <Filter className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Lead
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Company
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Contact
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Status
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Priority
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Value
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Follow-up
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-16 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Loading procurement leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      No leads found
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Add your first procurement prospect or adjust the filters.
                    </p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {lead.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {lead.lead_code}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {lead.client_name ?? "—"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {lead.industry ?? "Industry not specified"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {lead.contact_name ?? "—"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {lead.contact_email ?? ""}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          lead.status
                        )}`}
                      >
                        {formatLabel(lead.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`text-sm font-semibold ${getPriorityClasses(
                          lead.priority
                        )}`}
                      >
                        {formatLabel(lead.priority)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(lead.estimated_value, lead.currency)}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(lead.next_follow_up_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        {lead.status === "qualified" && (
                          <button
                            type="button"
                            title="Convert to opportunity"
                            disabled={processingId === lead.id}
                            onClick={() => void convertLead(lead)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-300"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          title="Edit lead"
                          onClick={() => openEditForm(lead)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          title="Archive lead"
                          disabled={processingId === lead.id}
                          onClick={() => void archiveLead(lead)}
                          className="rounded-lg p-2 text-orange-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-rose-400/10 dark:hover:text-rose-300"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Create follow-up"
                          onClick={() => openFollowUp(`lead=${lead.id}`)}
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

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {total === 0
              ? "No leads"
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                  page * PAGE_SIZE,
                  total
                )} of ${total}`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40 dark:border-white/10 dark:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="min-w-20 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(current + 1, totalPages))
              }
              className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40 dark:border-white/10 dark:text-slate-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-slate-950">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingLead
                    ? "Edit Procurement Lead"
                    : "Add Procurement Lead"}
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Capture enough information to qualify and progress the
                  prospect.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Organisation *
                  </span>

                  <select
                    required
                    disabled={optionsLoading}
                    value={form.client_id}
                    onChange={(event) => {
                      updateForm("client_id", event.target.value);
                      updateForm("contact_id", "");
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="">Select organisation</option>

                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.display_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Decision Maker / Contact
                  </span>

                  <select
                    value={form.contact_id}
                    disabled={!form.client_id}
                    onChange={(event) =>
                      updateForm("contact_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="">Select contact</option>

                    {filteredContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                        {contact.job_title ? ` — ${contact.job_title}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Lead title *
                  </span>

                  <input
                    required
                    value={form.title}
                    onChange={(event) =>
                      updateForm("title", event.target.value)
                    }
                    placeholder="e.g. Microsoft 365 Security Assessment"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Description
                  </span>

                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    placeholder="What triggered this prospect or requirement?"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Source
                  </span>

                  <select
                    value={form.source}
                    onChange={(event) =>
                      updateForm(
                        "source",
                        event.target.value as ProcurementLeadSource
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    {LEAD_SOURCES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Source reference
                  </span>

                  <input
                    value={form.source_reference}
                    onChange={(event) =>
                      updateForm("source_reference", event.target.value)
                    }
                    placeholder="Tender number, referral name, URL..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Status
                  </span>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value as ProcurementLeadStatus
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    {LEAD_STATUSES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Priority
                  </span>

                  <select
                    value={form.priority}
                    onChange={(event) =>
                      updateForm(
                        "priority",
                        event.target.value as ProcurementLeadPriority
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    {LEAD_PRIORITIES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Estimated value
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={form.estimated_value}
                    onChange={(event) =>
                      updateForm("estimated_value", event.target.value)
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Currency
                  </span>

                  <input
                    value={form.currency}
                    onChange={(event) =>
                      updateForm("currency", event.target.value)
                    }
                    maxLength={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm uppercase text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Industry
                  </span>

                  <input
                    value={form.industry}
                    onChange={(event) =>
                      updateForm("industry", event.target.value)
                    }
                    placeholder="Financial Services"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Service interest
                  </span>

                  <input
                    value={form.service_interest}
                    onChange={(event) =>
                      updateForm("service_interest", event.target.value)
                    }
                    placeholder="Microsoft 365, Security, Automation..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Next follow-up
                  </span>

                  <input
                    type="datetime-local"
                    value={form.next_follow_up_at}
                    onChange={(event) =>
                      updateForm("next_follow_up_at", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Assigned to
                  </span>

                  <select
                    value={form.assigned_to}
                    onChange={(event) =>
                      updateForm("assigned_to", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="">Unassigned</option>

                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                        {member.position ? ` — ${member.position}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Qualification notes
                  </span>

                  <textarea
                    rows={3}
                    value={form.qualification_notes}
                    onChange={(event) =>
                      updateForm("qualification_notes", event.target.value)
                    }
                    placeholder="Budget, authority, need, timeline, procurement process..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Notes
                  </span>

                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(event) =>
                      updateForm("notes", event.target.value)
                    }
                    placeholder="Additional internal notes..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || optionsLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingLead
                      ? "Save Changes"
                      : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
