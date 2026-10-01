import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Building2,
  ExternalLink,
  FileCheck2,
  Handshake,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Target,
  Users,
  X,
} from "lucide-react";

import type {
  ProcurementCompany,
  ProcurementCompanyListItem,
} from "../../../types/procurement";
import { SummaryCard } from "../../../islands/AdminSummaryCard";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
}

interface CompanyForm {
  display_name: string;
  company_name: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  tax_identification_number: string;
  status: string;
  source: string;
  notes: string;
}

/**
 * Creates a clean company form with sensible defaults.
 */
function createInitialCompanyForm(): CompanyForm {
  return {
    display_name: "",
    company_name: "",
    email: "",
    phone: "",
    website: "",
    industry: "",
    tax_identification_number: "",
    status: "active",
    source: "procurement",
    notes: "",
  };
}

/**
 * Formats an empty value consistently across the companies table.
 */
function displayValue(value: string | null | undefined): string {
  return value?.trim() || "—";
}

/**
 * Opens the follow-up workspace with company context.
 */
function openFollowUp(clientId: string): void {
  window.location.href = `/admin/procurement/follow-ups?client=${clientId}`;
}

/**
 * Renders the procurement companies workspace.
 */
export default function ProcurementCompaniesWorkspace() {
  const [companies, setCompanies] = useState<ProcurementCompanyListItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] =
    useState<ProcurementCompany | null>(null);

  const [companyForm, setCompanyForm] = useState<CompanyForm>(
    createInitialCompanyForm()
  );

  const [savingCompany, setSavingCompany] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");

  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const pageSize = 20;

  /**
   * Opens the company form for creating a new organisation.
   */
  function openCreateCompanyModal(): void {
    setEditingCompany(null);
    setCompanyForm(createInitialCompanyForm());
    setCompanyError(null);
    setModalOpen(true);
  }

  /**
   * Opens the company form with the selected organisation's data.
   */
  function openEditCompanyModal(company: ProcurementCompany): void {
    setEditingCompany(company);

    setCompanyForm({
      display_name: company.display_name ?? "",
      company_name: company.company_name ?? "",
      email: company.email ?? "",
      phone: company.phone ?? "",
      website: company.website ?? "",
      industry: company.industry ?? "",
      tax_identification_number: company.tax_identification_number ?? "",
      status: company.status ?? "active",
      source: company.source ?? "procurement",
      notes: company.notes ?? "",
    });

    setCompanyError(null);
    setModalOpen(true);
  }

  /**
   * Creates a new company or updates the selected company.
   */
  async function handleCompanySubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    try {
      setSavingCompany(true);
      setCompanyError(null);

      const endpoint = editingCompany
        ? `/api/admin/procurement/companies/${editingCompany.id}`
        : "/api/admin/procurement/companies";

      const response = await fetch(endpoint, {
        method: editingCompany ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(companyForm),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ??
            `Unable to ${editingCompany ? "update" : "create"} company.`
        );
      }

      setModalOpen(false);
      setEditingCompany(null);
      setCompanyForm(createInitialCompanyForm());

      await loadCompanies();
    } catch (error) {
      console.error("Failed to save procurement company:", error);

      setCompanyError(
        error instanceof Error ? error.message : "Unable to save company."
      );
    } finally {
      setSavingCompany(false);
    }
  }

  /**
   * Loads procurement companies from the API.
   */
  async function loadCompanies(showRefreshState = false): Promise<void> {
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

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (industryFilter) {
        params.set("industry", industryFilter);
      }

      const response = await fetch(
        `/api/admin/procurement/companies?${params.toString()}`
      );

      const result: ApiResponse<ProcurementCompanyListItem[]> =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Unable to load procurement companies."
        );
      }

      setCompanies(result.data ?? []);
      setCount(result.count ?? 0);
    } catch (err) {
      console.error("Failed to load procurement companies:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load procurement companies."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadCompanies();
  }, [page, search, statusFilter, industryFilter]);

  const industries = useMemo(() => {
    return Array.from(
      new Set(
        companies
          .map((company) => company.industry?.trim())
          .filter((industry): industry is string => Boolean(industry))
      )
    ).sort();
  }, [companies]);

  const totalPages = Math.max(Math.ceil(count / pageSize), 1);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading companies...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Procurement Companies
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Organisations in the CloudTweak procurement and business development
            pipeline.
          </p>
        </div>
        <div className="space-x-2">
          <button
            type="button"
            onClick={() => void loadCompanies(true)}
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
            onClick={openCreateCompanyModal}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" />
            Add Company
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label=" Companies"
          value={count}
          icon={Building2}
          description=""
          iconBackgroundColor="bg-green-50"
          iconColor="text-green-500"
        />

        <SummaryCard
          label=" Contacts"
          value={companies.reduce(
            (total, company) => total + company.contact_count,
            0
          )}
          icon={Users}
          description=""
          iconBackgroundColor="bg-blue-50"
          iconColor="text-blue-500"
        />

        <SummaryCard
          label=" Opportunities"
          value={companies.reduce(
            (total, company) => total + company.opportunity_count,
            0
          )}
          icon={Target}
          description=""
          iconBackgroundColor="bg-orange-50"
          iconColor="text-orange-500"
        />

        <SummaryCard
          label=" Active Contracts"
          value={companies.reduce(
            (total, company) => total + company.active_contract_count,
            0
          )}
          icon={FileCheck2}
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
            placeholder="Search companies..."
            className="h-[42px] w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          className="h-[42px] w-[180px] shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={industryFilter}
          onChange={(event) => {
            setIndustryFilter(event.target.value);
            setPage(1);
          }}
          className="h-[42px] w-[200px] shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="">All industries</option>

          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                <th className="px-5 py-4 font-medium text-slate-500 dark:text-slate-400">
                  Company
                </th>

                <th className="px-5 py-4 font-medium text-slate-500 dark:text-slate-400">
                  Industry
                </th>

                <th className="px-5 py-4 text-center font-medium text-slate-500 dark:text-slate-400">
                  Contacts
                </th>

                <th className="px-5 py-4 text-center font-medium text-slate-500 dark:text-slate-400">
                  Leads
                </th>

                <th className="px-5 py-4 text-center font-medium text-slate-500 dark:text-slate-400">
                  Opportunities
                </th>

                <th className="px-5 py-4 text-center font-medium text-slate-500 dark:text-slate-400">
                  Registrations
                </th>

                <th className="px-5 py-4 text-center font-medium text-slate-500 dark:text-slate-400">
                  Contracts
                </th>

                <th className="px-5 py-4 text-right font-medium text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {companies.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800/70"
                >
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {item.company_name || item.display_name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {displayValue(item.client_code)}
                      </p>

                      {item.website && (
                        <a
                          href={item.website}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                          Website
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    {displayValue(item.industry)}
                  </td>

                  <td className="px-5 py-4 text-center text-slate-700 dark:text-slate-300">
                    {item.contact_count}
                  </td>

                  <td className="px-5 py-4 text-center text-slate-700 dark:text-slate-300">
                    {item.lead_count}
                  </td>

                  <td className="px-5 py-4 text-center text-slate-700 dark:text-slate-300">
                    {item.opportunity_count}
                  </td>

                  <td className="px-5 py-4 text-center text-slate-700 dark:text-slate-300">
                    {item.vendor_registration_count}
                  </td>

                  <td className="px-5 py-4 text-center text-slate-700 dark:text-slate-300">
                    {item.active_contract_count}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title="Contacts"
                        onClick={() =>
                          (window.location.href = `/admin/procurement/contacts?client=${item.id}`)
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Users className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        title="Follow-ups"
                        onClick={() => openFollowUp(item.id)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Handshake className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditCompanyModal(item)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!companies.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No procurement companies found.
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
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {editingCompany ? "Edit Company" : "Add Company"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {editingCompany
                      ? "Update the organisation's procurement information."
                      : "Create a new organisation for procurement activities."}
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
                onSubmit={handleCompanySubmit}
                className="min-h-0 flex-1 overflow-y-auto"
              >
                <div className="space-y-6 p-6">
                  {companyError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                      {companyError}
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Company Information
                    </h3>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Company Name *
                        </span>

                        <input
                          required
                          value={companyForm.company_name}
                          onChange={(event) =>
                            setCompanyForm((current) => ({
                              ...current,
                              company_name: event.target.value,
                              display_name:
                                current.display_name || event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700"
                          placeholder="e.g. Acme Technologies Limited"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Industry
                        </span>

                        <input
                          value={companyForm.industry}
                          onChange={(event) =>
                            setCompanyForm((current) => ({
                              ...current,
                              industry: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700"
                          placeholder="Technology, Energy, Banking..."
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Email
                        </span>

                        <input
                          type="email"
                          value={companyForm.email}
                          onChange={(event) =>
                            setCompanyForm((current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700"
                          placeholder="procurement@company.com"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Phone
                        </span>

                        <input
                          value={companyForm.phone}
                          onChange={(event) =>
                            setCompanyForm((current) => ({
                              ...current,
                              phone: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700"
                          placeholder="+234..."
                        />
                      </label>

                      <label className="block md:col-span-2">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Website
                        </span>

                        <input
                          type="url"
                          value={companyForm.website}
                          onChange={(event) =>
                            setCompanyForm((current) => ({
                              ...current,
                              website: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700"
                          placeholder="https://example.com"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Tax Identification Number
                        </span>

                        <input
                          value={companyForm.tax_identification_number}
                          onChange={(event) =>
                            setCompanyForm((current) => ({
                              ...current,
                              tax_identification_number: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Status
                        </span>

                        <select
                          value={companyForm.status}
                          onChange={(event) =>
                            setCompanyForm((current) => ({
                              ...current,
                              status: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="prospect">Prospect</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Procurement Notes
                    </h3>

                    <textarea
                      rows={4}
                      value={companyForm.notes}
                      onChange={(event) =>
                        setCompanyForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700"
                      placeholder="Add procurement or relationship notes..."
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
                    disabled={savingCompany}
                    className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    {savingCompany
                      ? "Saving..."
                      : editingCompany
                        ? "Save Changes"
                        : "Create Company"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
