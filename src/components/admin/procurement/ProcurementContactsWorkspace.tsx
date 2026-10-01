import {
  Archive,
  Edit3,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import type {
  ProcurementCompany,
  ProcurementContact,
  ProcurementContactListItem,
} from "../../../types/procurement";
import ConfirmModal from "../../../islands/ConfirmModal";
import { SummaryCard } from "../../../islands/AdminSummaryCard";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
}

interface ContactForm {
  client_id: string;
  contact_type: string;
  first_name: string;
  last_name: string;
  job_title: string;
  department: string;
  email: string;
  phone: string;
  alternative_phone: string;
  is_primary: boolean;
  notes: string;
}

interface ContactContext {
  client?: string;
}

/**
 * Creates a clean contact form with sensible defaults.
 */
function createInitialContactForm(): ContactForm {
  return {
    client_id: "",
    contact_type: "general",
    first_name: "",
    last_name: "",
    job_title: "",
    department: "",
    email: "",
    phone: "",
    alternative_phone: "",
    is_primary: false,
    notes: "",
  };
}

/**
 * Reads an optional company context from the current page URL.
 */
function getContactContext(): ContactContext {
  const params = new URLSearchParams(window.location.search);

  return {
    client: params.get("client") || undefined,
  };
}

/**
 * Formats an empty value consistently across the contacts table.
 */
function displayValue(value: string | null | undefined): string {
  return value?.trim() || "—";
}

/**
 * Renders the procurement contacts workspace.
 */
export default function ProcurementContactsWorkspace() {
  const [contacts, setContacts] = useState<ProcurementContactListItem[]>([]);
  const [companies, setCompanies] = useState<ProcurementCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [contactTypeFilter, setContactTypeFilter] = useState("");
  const [primaryFilter, setPrimaryFilter] = useState("");
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] =
    useState<ProcurementContact | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>(
    createInitialContactForm()
  );
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [initialContextApplied, setInitialContextApplied] = useState(false);
  const pageSize = 20;

  /**
   * Loads available procurement companies for the contact form.
   */
  async function loadCompanies(): Promise<void> {
    try {
      const response = await fetch(
        "/api/admin/procurement/companies?page=1&page_size=100"
      );

      const result: ApiResponse<
        Array<ProcurementCompany & Record<string, unknown>>
      > = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Unable to load procurement companies."
        );
      }

      setCompanies(
        (result.data ?? []).map((company) => ({
          id: company.id,
          client_code: company.client_code,
          display_name: company.display_name,
          company_name: company.company_name,
          email: company.email,
          phone: company.phone,
          website: company.website,
          industry: company.industry,
          tax_identification_number: company.tax_identification_number,
          status: company.status,
          source: company.source,
          notes: company.notes,
          created_at: company.created_at,
          updated_at: company.updated_at,
        }))
      );
    } catch (err) {
      console.error("Failed to load procurement companies:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load procurement companies."
      );
    }
  }

  /**
   * Loads procurement contacts from the API.
   */
  async function loadContacts(showRefreshState = false): Promise<void> {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (companyFilter) {
        params.set("client_id", companyFilter);
      }

      if (contactTypeFilter) {
        params.set("contact_type", contactTypeFilter);
      }

      if (primaryFilter) {
        params.set("is_primary", primaryFilter);
      }

      const response = await fetch(
        `/api/admin/procurement/contacts?${params.toString()}`
      );

      const result: ApiResponse<ProcurementContactListItem[]> =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to load procurement contacts.");
      }

      setContacts(result.data ?? []);
      setCount(result.count ?? 0);
    } catch (err) {
      console.error("Failed to load procurement contacts:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load procurement contacts."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /**
   * Opens a blank contact form.
   */
  function openCreateContactModal(): void {
    setEditingContact(null);
    setContactForm(createInitialContactForm());
    setContactError(null);
    setModalOpen(true);
  }

  /**
   * Opens the contact form with the selected contact.
   */
  function openEditContactModal(contact: ProcurementContactListItem): void {
    setEditingContact(contact);

    setContactForm({
      client_id: contact.client_id,
      contact_type: contact.contact_type ?? "general",
      first_name: contact.first_name ?? "",
      last_name: contact.last_name ?? "",
      job_title: contact.job_title ?? "",
      department: contact.department ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      alternative_phone: contact.alternative_phone ?? "",
      is_primary: contact.is_primary,
      notes: contact.notes ?? "",
    });

    setContactError(null);
    setModalOpen(true);
  }

  /**
   * Applies company context passed from the Companies workspace.
   */
  function applyContactContext(): void {
    if (initialContextApplied) {
      return;
    }

    const context = getContactContext();

    if (context.client && companies.length > 0) {
      const company = companies.find((item) => item.id === context.client);

      if (company) {
        setCompanyFilter(company.id);
        setContactForm((current) => ({
          ...current,
          client_id: company.id,
        }));
      }
    }

    setInitialContextApplied(true);
  }

  /**
   * Creates or updates a procurement contact.
   */
  async function handleContactSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    try {
      setSavingContact(true);
      setContactError(null);

      if (!contactForm.client_id) {
        throw new Error("Please select a company.");
      }

      if (!contactForm.first_name.trim()) {
        throw new Error("First name is required.");
      }

      const endpoint = editingContact
        ? `/api/admin/procurement/contacts/${editingContact.id}`
        : "/api/admin/procurement/contacts";

      const response = await fetch(endpoint, {
        method: editingContact ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactForm),
      });

      const result: ApiResponse<ProcurementContact> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ??
            `Unable to ${editingContact ? "update" : "create"} contact.`
        );
      }

      setModalOpen(false);
      setEditingContact(null);
      setContactForm(createInitialContactForm());

      await loadContacts();
    } catch (err) {
      console.error("Failed to save procurement contact:", err);

      setContactError(
        err instanceof Error ? err.message : "Unable to save contact."
      );
    } finally {
      setSavingContact(false);
    }
  }

  /**
   * Opens the archive confirmation dialog for a contact.
   */
  function requestArchive(contactId: string): void {
    setConfirmArchiveId(contactId);
  }

  /**
   * Archives the selected contact after the user confirms the action.
   */
  async function handleArchive(): Promise<void> {
    if (!confirmArchiveId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/procurement/contacts/${confirmArchiveId}`,
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
        throw new Error(result.error ?? "Unable to archive contact.");
      }

      setConfirmArchiveId(null);
      await loadContacts();
    } catch (error) {
      console.error("Failed to archive contact:", error);

      setError(
        error instanceof Error ? error.message : "Unable to archive contact."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCompanies();
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [page, search, companyFilter, contactTypeFilter, primaryFilter]);

  useEffect(() => {
    if (!initialContextApplied && companies.length > 0) {
      applyContactContext();
    }
  }, [companies, initialContextApplied]);

  const totalPages = Math.max(Math.ceil(count / pageSize), 1);

  const companyOptions = useMemo(
    () =>
      companies
        .slice()
        .sort((a, b) =>
          (a.company_name || a.display_name).localeCompare(
            b.company_name || b.display_name
          )
        ),
    [companies]
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading contacts...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Procurement Contacts
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Decision-makers and business contacts connected to procurement
            organisations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadContacts(true)}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateContactModal}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Contacts"
          value={count}
          icon={Users}
          description=""
          iconBackgroundColor="bg-blue-50"
          iconColor="text-blue-500"
        />

        <SummaryCard
          label="Primary Contacts"
          value={contacts.filter((contact) => contact.is_primary).length}
          icon={UserRound}
          description=""
          iconBackgroundColor="bg-violet-50"
          iconColor="text-violet-500"
        />

        <SummaryCard
          label="With Email"
          value={contacts.filter((contact) => Boolean(contact.email)).length}
          icon={Mail}
          description=""
          iconBackgroundColor="bg-amber-50"
          iconColor="text-amber-500"
        />

        <SummaryCard
          label="With Phone"
          value={contacts.filter((contact) => Boolean(contact.phone)).length}
          icon={Phone}
          description=""
          iconBackgroundColor="bg-green-50"
          iconColor="text-green-500"
        />
      </div>

      <div className="flex w-full items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search contacts..."
            className="h-[42px] w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <select
          value={companyFilter}
          onChange={(event) => {
            setCompanyFilter(event.target.value);
            setPage(1);
          }}
          className="h-[42px] w-[220px] shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="">All companies</option>

          {companyOptions.map((company) => (
            <option key={company.id} value={company.id}>
              {company.company_name || company.display_name}
            </option>
          ))}
        </select>

        <select
          value={contactTypeFilter}
          onChange={(event) => {
            setContactTypeFilter(event.target.value);
            setPage(1);
          }}
          className="h-[42px] w-[180px] shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="general">General</option>
          <option value="billing">Billing</option>
          <option value="technical">Technical</option>
          <option value="executive">Executive</option>
          <option value="legal">Legal</option>
          <option value="other">Other</option>
        </select>

        <select
          value={primaryFilter}
          onChange={(event) => {
            setPrimaryFilter(event.target.value);
            setPage(1);
          }}
          className="h-[42px] w-[160px] shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="">All contact types</option>
          <option value="general">General</option>
          <option value="billing">Billing</option>
          <option value="technical">Technical</option>
          <option value="executive">Executive</option>
          <option value="legal">Legal</option>
          <option value="other">Other</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                <th className="px-5 py-4 font-medium text-slate-500 dark:text-slate-400">
                  Contact
                </th>

                <th className="px-5 py-4 font-medium text-slate-500 dark:text-slate-400">
                  Company
                </th>

                <th className="px-5 py-4 font-medium text-slate-500 dark:text-slate-400">
                  Role
                </th>

                <th className="px-5 py-4 font-medium text-slate-500 dark:text-slate-400">
                  Contact Details
                </th>

                <th className="px-5 py-4 text-center font-medium text-slate-500 dark:text-slate-400">
                  Leads
                </th>

                <th className="px-5 py-4 text-center font-medium text-slate-500 dark:text-slate-400">
                  Opportunities
                </th>

                <th className="px-5 py-4 text-center font-medium text-slate-500 dark:text-slate-400">
                  Follow-ups
                </th>

                <th className="px-5 py-4 text-right font-medium text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {contacts.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800/70"
                >
                  <td className="px-5 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-900 dark:text-white">
                          {item.first_name} {item.last_name ?? ""}
                        </p>

                        {item.is_primary && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                            Primary
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {displayValue(item.contact_type)}
                      </p>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      {item.company_name || item.client_name || "—"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      {displayValue(item.job_title)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {displayValue(item.department)}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    {item.email && (
                      <a
                        href={`mailto:${item.email}`}
                        className="block text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      >
                        {item.email}
                      </a>
                    )}

                    {item.phone && (
                      <a
                        href={`tel:${item.phone}`}
                        className="mt-1 block text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      >
                        {item.phone}
                      </a>
                    )}

                    {!item.email && !item.phone && (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-center text-slate-700 dark:text-slate-300">
                    {item.lead_count}
                  </td>

                  <td className="px-5 py-4 text-center text-slate-700 dark:text-slate-300">
                    {item.opportunity_count}
                  </td>

                  <td className="px-5 py-4 text-center text-slate-700 dark:text-slate-300">
                    {item.follow_up_count}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditContactModal(item)}
                        className="inline-flex h-8  items-center rounded-lg border border-blue-100 px-2 text-xs font-medium text-blue-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => requestArchive(item.id)}
                        className="inline-flex h-8 items-center rounded-lg border border-red-100 px-2 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!contacts.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No procurement contacts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Page {page} of {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(current + 1, totalPages))
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {editingContact ? "Edit Contact" : "Add Contact"}
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Add a decision-maker or business contact to a procurement
                  organisation.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleContactSubmit}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <div className="space-y-6 p-6">
                {contactError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    {contactError}
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Contact Information
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block md:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Company *
                      </span>

                      <select
                        required
                        value={contactForm.client_id}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            client_id: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="">Select company</option>

                        {companyOptions.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.company_name || company.display_name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        First Name *
                      </span>

                      <input
                        required
                        value={contactForm.first_name}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            first_name: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Last Name
                      </span>

                      <input
                        value={contactForm.last_name}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            last_name: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Job Title
                      </span>

                      <input
                        value={contactForm.job_title}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            job_title: event.target.value,
                          }))
                        }
                        placeholder="Procurement Manager"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Department
                      </span>

                      <input
                        value={contactForm.department}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            department: event.target.value,
                          }))
                        }
                        placeholder="Procurement"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Contact Type
                      </span>

                      <select
                        value={contactForm.contact_type}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            contact_type: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="general">General</option>
                        <option value="billing">Billing</option>
                        <option value="technical">Technical</option>
                        <option value="executive">Executive</option>
                        <option value="legal">Legal</option>
                        <option value="other">Other</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Email
                      </span>

                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Phone
                      </span>

                      <input
                        value={contactForm.phone}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        placeholder="+234..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Alternative Phone
                      </span>

                      <input
                        value={contactForm.alternative_phone}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            alternative_phone: event.target.value,
                          }))
                        }
                        placeholder="+234..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </label>

                    <label className="flex items-center gap-3 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={contactForm.is_primary}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            is_primary: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />

                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        Mark as primary contact for this company
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Notes
                  </h3>

                  <textarea
                    rows={4}
                    value={contactForm.notes}
                    onChange={(event) =>
                      setContactForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Add relationship or procurement notes..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingContact}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  {savingContact
                    ? "Saving..."
                    : editingContact
                      ? "Save Changes"
                      : "Create Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={Boolean(confirmArchiveId)}
        title="Archive Contact"
        message="Are you sure you want to archive this contact? The contact will no longer appear in the active procurement contacts list."
        confirmText="Archive Contact"
        cancelText="Cancel"
        onConfirm={() => void handleArchive()}
        onCancel={() => setConfirmArchiveId(null)}
      />
    </div>
  );
}
