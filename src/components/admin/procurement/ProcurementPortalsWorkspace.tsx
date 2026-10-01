import {
  Archive,
  Building2,
  Cable,
  CheckCircle2,
  ExternalLink,
  Globe,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  CreateProcurementPortalInput,
  ProcurementPortal,
  ProcurementPortalListItem,
  ProcurementPortalType,
} from "../../../types/procurement";
import { SummaryCard } from "../../../islands/AdminSummaryCard";

type PortalResponse = {
  data: ProcurementPortalListItem[];
  total: number;
};

type FormState = {
  name: string;
  organisation_name: string;
  portal_type: ProcurementPortalType;
  url: string;
  registration_url: string;
  country: string;
  state: string;
  description: string;
  login_required: boolean;
  active: boolean;
  notes: string;
};

const portalTypes: Array<{
  value: ProcurementPortalType;
  label: string;
}> = [
  { value: "corporate", label: "Corporate" },
  { value: "government", label: "Government" },
  { value: "energy", label: "Energy" },
  { value: "banking", label: "Banking" },
  { value: "telecoms", label: "Telecoms" },
  { value: "international", label: "International" },
  { value: "supplier_network", label: "Supplier Network" },
  { value: "tender", label: "Tender" },
  { value: "other", label: "Other" },
];

const emptyForm: FormState = {
  name: "",
  organisation_name: "",
  portal_type: "corporate",
  url: "",
  registration_url: "",
  country: "Nigeria",
  state: "",
  description: "",
  login_required: false,
  active: true,
  notes: "",
};

/**
 * Provides the administration workspace for procurement portals.
 */
export default function ProcurementPortalsWorkspace() {
  const [portals, setPortals] = useState<ProcurementPortalListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [portalType, setPortalType] = useState("");
  const [activeFilter, setActiveFilter] = useState("true");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPortal, setEditingPortal] = useState<ProcurementPortal | null>(
    null
  );
  const [form, setForm] = useState<FormState>(emptyForm);

  /**
   * Loads procurement portals using the current workspace filters.
   */
  async function loadPortals() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (portalType) {
        params.set("portal_type", portalType);
      }

      if (activeFilter) {
        params.set("active", activeFilter);
      }

      params.set("page", "1");
      params.set("page_size", "50");

      const response = await fetch(
        `/api/admin/procurement/portals?${params.toString()}`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to load procurement portals.");
      }

      const payload = result.data as PortalResponse;

      setPortals(payload.data ?? []);
      setTotal(payload.total ?? 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load procurement portals."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * Loads portal data when the filters change.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPortals();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search, portalType, activeFilter]);

  /**
   * Opens the creation modal with a clean form.
   */
  function openCreateModal() {
    setEditingPortal(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  /**
   * Opens the edit modal with the selected portal's existing values.
   */
  function openEditModal(portal: ProcurementPortalListItem) {
    setEditingPortal(portal);
    setForm({
      name: portal.name,
      organisation_name: portal.organisation_name,
      portal_type: portal.portal_type,
      url: portal.url ?? "",
      registration_url: portal.registration_url ?? "",
      country: portal.country ?? "Nigeria",
      state: portal.state ?? "",
      description: portal.description ?? "",
      login_required: portal.login_required,
      active: portal.active,
      notes: portal.notes ?? "",
    });
    setError("");
    setModalOpen(true);
  }

  /**
   * Updates a form field without replacing the other form values.
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
   * Opens the follow-up workspace with the current procurement record
   * attached as context.
   */
  function openFollowUp(context: string): void {
    window.location.href = `/admin/procurement/follow-ups?${context}`;
  }

  /**
   * Saves a new or existing procurement portal.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.organisation_name.trim()) {
      setError("Portal name and organisation name are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload: CreateProcurementPortalInput = {
        name: form.name.trim(),
        organisation_name: form.organisation_name.trim(),
        portal_type: form.portal_type,
        url: form.url.trim() || null,
        registration_url: form.registration_url.trim() || null,
        country: form.country.trim() || "Nigeria",
        state: form.state.trim() || null,
        description: form.description.trim() || null,
        login_required: form.login_required,
        active: form.active,
        notes: form.notes.trim() || null,
      };

      const response = await fetch(
        editingPortal
          ? `/api/admin/procurement/portals/${editingPortal.id}`
          : "/api/admin/procurement/portals",
        {
          method: editingPortal ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save procurement portal.");
      }

      setModalOpen(false);
      setEditingPortal(null);
      setForm(emptyForm);

      await loadPortals();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save procurement portal."
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * Archives a procurement portal after confirming the user's intent.
   */
  async function archivePortal(portal: ProcurementPortalListItem) {
    const confirmed = window.confirm(
      `Archive ${portal.organisation_name} — ${portal.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `/api/admin/procurement/portals/${portal.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to archive procurement portal."
        );
      }

      await loadPortals();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to archive procurement portal."
      );
    }
  }

  const summary = useMemo(() => {
    const active = portals.filter((portal) => portal.active).length;
    const registrations = portals.reduce(
      (total, portal) => total + portal.registrations_count,
      0
    );
    const approved = portals.reduce(
      (total, portal) => total + portal.approved_registrations_count,
      0
    );

    return {
      active,
      registrations,
      approved,
    };
  }, [portals]);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Active Portals"
          value={summary.active}
          icon={Globe}
          description=""
          iconBackgroundColor="bg-blue-50"
          iconColor="text-blue-500"
        />

        <SummaryCard
          label="Registrations"
          value={summary.registrations}
          icon={Building2}
          description=""
          iconBackgroundColor="bg-violet-50"
          iconColor="text-violet-500"
        />

        <SummaryCard
          label="Approved Registrations"
          value={summary.approved}
          icon={CheckCircle2}
          description=""
          iconBackgroundColor="bg-green-50"
          iconColor="text-green-500"
        />
      </div>

      <div className="rounded-2xl border border-slate-300 bg-white dark:border-white/10 dark:bg-white/[0.03]">
        <div className="border-b border-slate-300 p-5 dark:border-white/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Procurement Portals</h2>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                Manage supplier, tender and procurement registration channels.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
            >
              <Plus className="h-4 w-4" />
              Add Portal
            </button>
          </div>

          <div className="mt-5 flex w-full flex-col gap-3 xl:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search portal or organisation..."
                className="h-11 w-full rounded-xl border border-slate-300 bg-transparent pl-10 pr-4 text-sm outline-none transition focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              />
            </div>

            <select
              value={portalType}
              onChange={(event) => setPortalType(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10 xl:w-[190px]"
            >
              <option value="">All Types</option>
              {portalTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10 xl:w-[150px]"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
              <option value="">All Status</option>
            </select>

            <button
              type="button"
              onClick={() => void loadPortals()}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm transition hover:bg-primary/5 dark:border-white/10 dark:hover:bg-white/5"
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
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-black/50 dark:border-white/10 dark:text-white/50">
                <th className="px-5 py-4 font-medium">Portal</th>
                <th className="px-5 py-4 font-medium">Organisation</th>
                <th className="px-5 py-4 font-medium">Type</th>
                <th className="px-5 py-4 font-medium">Registrations</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-14 text-center text-sm text-black/50 dark:text-white/50"
                  >
                    Loading procurement portals...
                  </td>
                </tr>
              ) : portals.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-14 text-center text-sm text-black/50 dark:text-white/50"
                  >
                    No procurement portals found.
                  </td>
                </tr>
              ) : (
                portals.map((portal) => (
                  <tr
                    key={portal.id}
                    className="border-b border-black/5 last:border-b-0 dark:border-white/5"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium">{portal.name}</div>
                      {portal.url && (
                        <a
                          href={portal.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs opacity-60 hover:opacity-100"
                        >
                          Visit portal
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm">
                      {portal.organisation_name}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-primary/5 px-2.5 py-1 text-xs dark:bg-white/10">
                        {portalTypes.find(
                          (type) => type.value === portal.portal_type
                        )?.label ?? portal.portal_type}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm">
                      <div>{portal.registrations_count}</div>
                      {portal.approved_registrations_count > 0 && (
                        <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                          {portal.approved_registrations_count} approved
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          portal.active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-primary/5 text-black/50 dark:bg-white/10 dark:text-white/50"
                        }`}
                      >
                        {portal.active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(portal)}
                          title="Edit portal"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 transition hover:bg-primary/5 dark:border-white/10 dark:hover:bg-white/5"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => void archivePortal(portal)}
                          title="Archive portal"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Create follow-up"
                          onClick={() => openFollowUp(`lead=${portal.id}`)}
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
          Showing {portals.length} of {total} portals
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-950">
            <div className="flex items-center justify-between border-b border-slate-300 px-6 py-5 dark:border-white/10">
              <div>
                <h3 className="text-lg font-semibold">
                  {editingPortal
                    ? "Edit Procurement Portal"
                    : "Add Procurement Portal"}
                </h3>
                <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                  Keep procurement registration channels organised and current.
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

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Portal Name</span>
                  <input
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="Supplier Portal"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Organisation</span>
                  <input
                    value={form.organisation_name}
                    onChange={(event) =>
                      updateForm("organisation_name", event.target.value)
                    }
                    placeholder="Organisation name"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Portal Type</span>
                  <select
                    value={form.portal_type}
                    onChange={(event) =>
                      updateForm(
                        "portal_type",
                        event.target.value as ProcurementPortalType
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                  >
                    {portalTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Country</span>
                  <input
                    value={form.country}
                    onChange={(event) =>
                      updateForm("country", event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Portal URL</span>
                  <input
                    type="url"
                    value={form.url}
                    onChange={(event) => updateForm("url", event.target.value)}
                    placeholder="https://..."
                    className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Registration URL</span>
                  <input
                    type="url"
                    value={form.registration_url}
                    onChange={(event) =>
                      updateForm("registration_url", event.target.value)
                    }
                    placeholder="https://..."
                    className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium">State / Region</span>
                <input
                  value={form.state}
                  onChange={(event) => updateForm("state", event.target.value)}
                  placeholder="Optional"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  rows={3}
                  placeholder="Describe the procurement channel..."
                  className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-3 text-sm outline-none dark:border-white/10"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  rows={3}
                  placeholder="Internal notes..."
                  className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-3 text-sm outline-none dark:border-white/10"
                />
              </label>

              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.login_required}
                    onChange={(event) =>
                      updateForm("login_required", event.target.checked)
                    }
                    className="h-4 w-4 rounded"
                  />
                  Login required
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) =>
                      updateForm("active", event.target.checked)
                    }
                    className="h-4 w-4 rounded"
                  />
                  Active portal
                </label>
              </div>

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
                    : editingPortal
                      ? "Save Changes"
                      : "Create Portal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
