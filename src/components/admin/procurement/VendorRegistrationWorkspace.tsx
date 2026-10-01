import {
  Archive,
  Building2,
  Cable,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  CreateVendorRegistrationInput,
  ProcurementClientOption,
  ProcurementPortalListItem,
  ProcurementStaffOption,
  UpdateVendorRegistrationInput,
  VendorRegistrationListItem,
  VendorRegistrationRequirement,
  VendorRegistrationStatus,
} from "../../../types/procurement";
import { SummaryCard } from "../../../islands/AdminSummaryCard";

type FormOptions = {
  clients: ProcurementClientOption[];
  contacts: Array<{
    id: string;
    client_id: string;
    first_name: string;
    last_name: string;
    job_title: string | null;
    email: string | null;
  }>;
  staff: ProcurementStaffOption[];
  portals: ProcurementPortalListItem[];
};

type RegistrationResponse = {
  data: VendorRegistrationListItem[];
  total: number;
};

type FormState = {
  client_id: string;
  portal_id: string;
  status: VendorRegistrationStatus;
  assigned_to: string;
  registration_number: string;
  submitted_at: string;
  approved_at: string;
  rejected_at: string;
  expiry_date: string;
  next_action_at: string;
  notes: string;
  requirements: VendorRegistrationRequirement[];
};

const statuses: Array<{
  value: VendorRegistrationStatus;
  label: string;
}> = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

const defaultRequirements: VendorRegistrationRequirement[] = [
  {
    name: "Company registration documents",
    required: true,
    completed: false,
  },
  {
    name: "Tax identification documents",
    required: true,
    completed: false,
  },
  {
    name: "Company profile",
    required: true,
    completed: false,
  },
  {
    name: "Bank account details",
    required: true,
    completed: false,
  },
  {
    name: "Relevant certifications",
    required: false,
    completed: false,
  },
];

const emptyForm: FormState = {
  client_id: "",
  portal_id: "",
  status: "not_started",
  assigned_to: "",
  registration_number: "",
  submitted_at: "",
  approved_at: "",
  rejected_at: "",
  expiry_date: "",
  next_action_at: "",
  notes: "",
  requirements: defaultRequirements,
};

/**
 * Provides the administration workspace for vendor registrations.
 */
export default function VendorRegistrationsWorkspace() {
  const [registrations, setRegistrations] = useState<
    VendorRegistrationListItem[]
  >([]);
  const [total, setTotal] = useState(0);
  const [options, setOptions] = useState<FormOptions>({
    clients: [],
    contacts: [],
    staff: [],
    portals: [],
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [clientId, setClientId] = useState("");
  const [portalId, setPortalId] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRegistration, setEditingRegistration] =
    useState<VendorRegistrationListItem | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);

  /**
   * Loads the organisation, staff and procurement portal options.
   */
  async function loadOptions() {
    try {
      setLoadingOptions(true);

      const response = await fetch("/api/admin/procurement/options");

      if (!response.ok) {
        throw new Error("Unable to load procurement form options.");
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(
          result.error ?? "Unable to load procurement form options."
        );
      }

      setOptions(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load procurement options."
      );
    } finally {
      setLoadingOptions(false);
    }
  }

  /**
   * Loads vendor registrations using the current filters.
   */
  async function loadRegistrations() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (status) {
        params.set("status", status);
      }

      if (clientId) {
        params.set("client_id", clientId);
      }

      if (portalId) {
        params.set("portal_id", portalId);
      }

      params.set("page", "1");
      params.set("page_size", "50");

      const response = await fetch(
        `/api/admin/procurement/vendor-registrations?${params.toString()}`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to load vendor registrations.");
      }

      const payload = result.data as RegistrationResponse;

      setRegistrations(payload.data ?? []);
      setTotal(payload.total ?? 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load vendor registrations."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * Loads form options when the workspace is mounted.
   */
  useEffect(() => {
    void loadOptions();
  }, []);

  /**
   * Reloads registrations whenever the filters change.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRegistrations();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search, status, clientId, portalId]);

  /**
   * Opens a clean form for creating a vendor registration.
   */
  function openCreateModal() {
    setEditingRegistration(null);
    setForm({
      ...emptyForm,
      requirements: defaultRequirements.map((requirement) => ({
        ...requirement,
      })),
    });
    setError("");
    setModalOpen(true);
  }

  /**
   * Opens the registration form with the selected registration.
   */
  function openEditModal(registration: VendorRegistrationListItem) {
    setEditingRegistration(registration);

    setForm({
      client_id: registration.client_id,
      portal_id: registration.portal_id ?? "",
      status: registration.status,
      assigned_to: registration.assigned_to ?? "",
      registration_number: registration.registration_number ?? "",
      submitted_at: registration.submitted_at?.slice(0, 16) ?? "",
      approved_at: registration.approved_at?.slice(0, 16) ?? "",
      rejected_at: registration.rejected_at?.slice(0, 16) ?? "",
      expiry_date: registration.expiry_date?.slice(0, 10) ?? "",
      next_action_at: registration.next_action_at?.slice(0, 16) ?? "",
      notes: registration.notes ?? "",
      requirements: registration.requirements?.length
        ? registration.requirements
        : defaultRequirements.map((requirement) => ({
            ...requirement,
          })),
    });

    setError("");
    setModalOpen(true);
  }

  /**
   * Updates a single registration form field.
   */
  function updateForm<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /**
   * Updates one requirement in the registration checklist.
   */
  function updateRequirement(
    index: number,
    changes: Partial<VendorRegistrationRequirement>
  ) {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.map((requirement, requirementIndex) =>
        requirementIndex === index
          ? {
              ...requirement,
              ...changes,
            }
          : requirement
      ),
    }));
  }

  /**
   * Adds a custom requirement to the checklist.
   */
  function addRequirement() {
    setForm((current) => ({
      ...current,
      requirements: [
        ...current.requirements,
        {
          name: "",
          required: false,
          completed: false,
        },
      ],
    }));
  }

  /**
   * Removes a requirement from the checklist.
   */
  function removeRequirement(index: number) {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.filter(
        (_, requirementIndex) => requirementIndex !== index
      ),
    }));
  }

  /**
   * Opens the follow-up workspace with the current procurement record
   * attached as context.
   */
  function openFollowUp(context: string): void {
    window.location.href = `/admin/procurement/follow-ups?${context}`;
  }

  /**
   * Saves a new or existing vendor registration.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.client_id) {
      setError("Organisation is required.");
      return;
    }

    const requirements = form.requirements.filter(
      (requirement) => requirement.name.trim().length > 0
    );

    try {
      setSaving(true);
      setError("");

      const payload: CreateVendorRegistrationInput = {
        client_id: form.client_id,
        portal_id: form.portal_id || null,
        status: form.status,
        assigned_to: form.assigned_to || null,
        registration_number: form.registration_number.trim() || null,
        submitted_at: form.submitted_at || null,
        approved_at: form.approved_at || null,
        rejected_at: form.rejected_at || null,
        expiry_date: form.expiry_date || null,
        next_action_at: form.next_action_at || null,
        notes: form.notes.trim() || null,
        requirements,
      };

      const updatePayload: UpdateVendorRegistrationInput = {
        ...payload,
        id: editingRegistration?.id ?? "",
      };

      const response = await fetch(
        editingRegistration
          ? `/api/admin/procurement/vendor-registrations/${editingRegistration.id}`
          : "/api/admin/procurement/vendor-registrations",
        {
          method: editingRegistration ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editingRegistration ? updatePayload : payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save vendor registration.");
      }

      setModalOpen(false);
      setEditingRegistration(null);
      setForm(emptyForm);

      await loadRegistrations();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save vendor registration."
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * Archives a vendor registration.
   */
  async function archiveRegistration(registration: VendorRegistrationListItem) {
    const confirmed = window.confirm(
      `Archive vendor registration ${registration.registration_code}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `/api/admin/procurement/vendor-registrations/${registration.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to archive vendor registration."
        );
      }

      await loadRegistrations();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to archive vendor registration."
      );
    }
  }

  const summary = useMemo(() => {
    return {
      total,
      active: registrations.filter(
        (registration) =>
          !["approved", "rejected", "expired"].includes(registration.status)
      ).length,
      approved: registrations.filter(
        (registration) => registration.status === "approved"
      ).length,
      attention: registrations.filter((registration) =>
        ["submitted", "under_review", "expired"].includes(registration.status)
      ).length,
    };
  }, [registrations, total]);

  /**
   * Converts a registration status into a readable label.
   */
  function getStatusLabel(value: VendorRegistrationStatus) {
    return statuses.find((item) => item.value === value)?.label ?? value;
  }

  /**
   * Returns the appropriate visual styling for a registration status.
   */
  function getStatusClass(value: VendorRegistrationStatus) {
    if (value === "approved") {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    }

    if (value === "rejected" || value === "expired") {
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    }

    if (value === "submitted" || value === "under_review") {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    }

    return "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60";
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          label="Total"
          value={summary.total}
          icon={Building2}
          description=""
          iconBackgroundColor="bg-blue-50"
          iconColor="text-blue-500"
        />

        <SummaryCard
          label="In Progress"
          value={summary.active}
          icon={Clock3}
          description=""
          iconBackgroundColor="bg-amber-50"
          iconColor="text-amber-500"
        />

        <SummaryCard
          label="Approved"
          value={summary.approved}
          icon={CheckCircle2}
          description=""
          iconBackgroundColor="bg-green-50"
          iconColor="text-green-500"
        />

        <SummaryCard
          label="Attention"
          value={summary.attention}
          icon={ClipboardCheck}
          description=""
          iconBackgroundColor="bg-rose-50"
          iconColor="text-rose-500"
        />
      </div>

      <div className="rounded-2xl border border-slate-300 bg-white dark:border-white/10 dark:bg-white/[0.03]">
        <div className="border-b border-slate-300 p-5 dark:border-white/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Vendor Registrations</h2>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                Track supplier registration activity from preparation through
                approval.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              disabled={loadingOptions}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
            >
              <Plus className="h-4 w-4" />
              New Registration
            </button>
          </div>

          <div className="mt-5 flex w-full flex-col gap-3 xl:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search registration..."
                className="h-11 w-full rounded-xl border border-slate-300 bg-transparent pl-10 pr-4 text-sm outline-none dark:border-white/10"
              />
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10 xl:w-[180px]"
            >
              <option value="">All Statuses</option>
              {statuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10 xl:w-[220px]"
            >
              <option value="">All Organisations</option>
              {options.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.display_name}
                </option>
              ))}
            </select>

            <select
              value={portalId}
              onChange={(event) => setPortalId(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10 xl:w-[220px]"
            >
              <option value="">All Portals</option>
              {options.portals.map((portal) => (
                <option key={portal.id} value={portal.id}>
                  {portal.organisation_name} — {portal.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void loadRegistrations()}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-black/50 dark:border-white/10 dark:text-white/50">
                <th className="px-5 py-4 font-medium">Registration</th>
                <th className="px-5 py-4 font-medium">Organisation</th>
                <th className="px-5 py-4 font-medium">Portal</th>
                <th className="px-5 py-4 font-medium">Assigned To</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Next Action</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-14 text-center text-sm text-black/50 dark:text-white/50"
                  >
                    Loading vendor registrations...
                  </td>
                </tr>
              ) : registrations.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-14 text-center text-sm text-black/50 dark:text-white/50"
                  >
                    No vendor registrations found.
                  </td>
                </tr>
              ) : (
                registrations.map((registration) => (
                  <tr
                    key={registration.id}
                    className="border-b border-slate-300/5 last:border-b-0 dark:border-white/5"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium">
                        {registration.registration_code}
                      </div>
                      {registration.registration_number && (
                        <div className="mt-1 text-xs opacity-50">
                          {registration.registration_number}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm">
                      {registration.client_name ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-sm">
                      {registration.portal_name ?? "Manual / External"}
                    </td>

                    <td className="px-5 py-4 text-sm">
                      {registration.assigned_to_name ?? "Unassigned"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${getStatusClass(
                          registration.status
                        )}`}
                      >
                        {getStatusLabel(registration.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm">
                      {registration.next_action_at
                        ? new Date(
                            registration.next_action_at
                          ).toLocaleDateString()
                        : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(registration)}
                          title="Edit registration"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => void archiveRegistration(registration)}
                          title="Archive registration"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Create follow-up"
                          onClick={() =>
                            openFollowUp(`lead=${registration.id}`)
                          }
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

        <div className="border-t border-slate-300 px-5 py-4 text-sm text-black/50 dark:border-white/10 dark:text-white/50">
          Showing {registrations.length} of {total} registrations
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-950">
            <div className="flex items-center justify-between border-b border-slate-300 px-6 py-5 dark:border-white/10">
              <div>
                <h3 className="text-lg font-semibold">
                  {editingRegistration
                    ? "Edit Vendor Registration"
                    : "New Vendor Registration"}
                </h3>
                <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                  Track the supplier registration lifecycle and required
                  documentation.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 dark:border-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Organisation</span>
                  <select
                    value={form.client_id}
                    onChange={(event) =>
                      updateForm("client_id", event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                  >
                    <option value="">Select organisation</option>
                    {options.clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.display_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Procurement Portal
                  </span>
                  <select
                    value={form.portal_id}
                    onChange={(event) =>
                      updateForm("portal_id", event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                  >
                    <option value="">Manual / External</option>
                    {options.portals.map((portal) => (
                      <option key={portal.id} value={portal.id}>
                        {portal.organisation_name} — {portal.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Status</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value as VendorRegistrationStatus
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                  >
                    {statuses.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Assigned To</span>
                  <select
                    value={form.assigned_to}
                    onChange={(event) =>
                      updateForm("assigned_to", event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                  >
                    <option value="">Unassigned</option>
                    {options.staff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Registration Number
                  </span>
                  <input
                    value={form.registration_number}
                    onChange={(event) =>
                      updateForm("registration_number", event.target.value)
                    }
                    placeholder="Portal registration number"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Expiry Date</span>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(event) =>
                      updateForm("expiry_date", event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Submitted At</span>
                  <input
                    type="datetime-local"
                    value={form.submitted_at}
                    onChange={(event) =>
                      updateForm("submitted_at", event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Next Action</span>
                  <input
                    type="datetime-local"
                    value={form.next_action_at}
                    onChange={(event) =>
                      updateForm("next_action_at", event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-slate-300 p-5 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Registration Requirements</h4>
                    <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                      Track documents and requirements needed for registration.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addRequirement}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs dark:border-white/10"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Requirement
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {form.requirements.map((requirement, index) => (
                    <div
                      key={`${requirement.name}-${index}`}
                      className="flex items-center gap-3 rounded-xl border border-slate-300/5 p-3 dark:border-white/5"
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
                        className="h-4 w-4 rounded"
                      />

                      <input
                        value={requirement.name}
                        onChange={(event) =>
                          updateRequirement(index, {
                            name: event.target.value,
                          })
                        }
                        placeholder="Requirement name"
                        className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                      />

                      <label className="flex shrink-0 items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={requirement.required}
                          onChange={(event) =>
                            updateRequirement(index, {
                              required: event.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded"
                        />
                        Required
                      </label>

                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        title="Remove requirement"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-500/20 text-red-600 dark:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  rows={4}
                  placeholder="Internal registration notes..."
                  className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-3 text-sm outline-none dark:border-white/10"
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-300 pt-5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 rounded-xl border border-slate-300 px-5 text-sm dark:border-white/10"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {saving
                    ? "Saving..."
                    : editingRegistration
                      ? "Save Changes"
                      : "Create Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
