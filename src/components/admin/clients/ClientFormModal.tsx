import { Building2, LoaderCircle, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { createClient, updateClient } from "../../../lib/client";
import { supabase } from "../../../lib/superbase";
import type {
  Client,
  ClientListItem,
  ClientStatus,
  ClientType,
  CreateClientInput,
  UpdateClientInput,
} from "../../../types/client";

interface ClientFormModalProps {
  open: boolean;

  client?: ClientListItem | Client | null;

  onClose: () => void;

  onSaved: (client: Client) => void | Promise<void>;
}

interface ClientFormState {
  client_type: ClientType;

  display_name: string;

  company_name: string;

  first_name: string;

  last_name: string;

  email: string;

  phone: string;

  alternative_phone: string;

  website: string;

  industry: string;

  tax_identification_number: string;

  billing_address: string;

  city: string;

  state: string;

  country: string;

  postal_code: string;

  status: ClientStatus;

  account_manager_id: string;

  source: string;

  notes: string;
}

interface StaffAccountManagerRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string;
}

interface AccountManagerOption {
  id: string;

  name: string;

  email: string | null;
}

const CLIENT_STATUSES: Array<{
  value: ClientStatus;
  label: string;
}> = [
  {
    value: "lead",
    label: "Lead",
  },
  {
    value: "prospect",
    label: "Prospect",
  },
  {
    value: "active",
    label: "Active",
  },
  {
    value: "inactive",
    label: "Inactive",
  },
  {
    value: "suspended",
    label: "Suspended",
  },
];

const CLIENT_SOURCES = [
  "Website",
  "Referral",
  "Direct Outreach",
  "Social Media",
  "Existing Contact",
  "Financial Transaction",
  "Other",
];

/**
 * Return the empty Client form state.
 */
function getEmptyClientForm(): ClientFormState {
  return {
    client_type: "organisation",

    display_name: "",

    company_name: "",

    first_name: "",

    last_name: "",

    email: "",

    phone: "",

    alternative_phone: "",

    website: "",

    industry: "",

    tax_identification_number: "",

    billing_address: "",

    city: "",

    state: "",

    country: "Nigeria",

    postal_code: "",

    status: "lead",

    account_manager_id: "",

    source: "",

    notes: "",
  };
}

/**
 * Convert an existing Client into editable form values.
 */
function getClientFormValues(
  client: ClientListItem | Client | null | undefined
): ClientFormState {
  if (!client) {
    return getEmptyClientForm();
  }

  return {
    client_type: client.client_type,

    display_name: client.display_name,

    company_name: client.company_name ?? "",

    first_name: client.first_name ?? "",

    last_name: client.last_name ?? "",

    email: client.email ?? "",

    phone: client.phone ?? "",

    alternative_phone: client.alternative_phone ?? "",

    website: client.website ?? "",

    industry: client.industry ?? "",

    tax_identification_number: client.tax_identification_number ?? "",

    billing_address: client.billing_address ?? "",

    city: client.city ?? "",

    state: client.state ?? "",

    country: client.country || "Nigeria",

    postal_code: client.postal_code ?? "",

    status: client.status,

    account_manager_id: client.account_manager_id ?? "",

    source: client.source ?? "",

    notes: client.notes ?? "",
  };
}

/**
 * Convert optional text into a trimmed value or null.
 */
function normalizeOptionalText(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue || null;
}

/**
 * Validate one optional email address.
 */
function isValidEmail(value: string) {
  if (!value.trim()) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Validate one optional website URL.
 */
function isValidWebsite(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    new URL(value.trim());

    return true;
  } catch {
    return false;
  }
}

/**
 * Render one reusable Client form field.
 */
function ClientField({
  label,
  required = false,
  helperText,
  children,
}: {
  label: string;

  required?: boolean;

  helperText?: string;

  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      {children}

      {helperText && (
        <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          {helperText}
        </span>
      )}
    </label>
  );
}

/**
 * Render the Client create and edit form modal.
 */
export default function ClientFormModal({
  open,
  client = null,
  onClose,
  onSaved,
}: ClientFormModalProps) {
  const [form, setForm] = useState<ClientFormState>(
    getClientFormValues(client)
  );

  const [accountManagers, setAccountManagers] = useState<
    AccountManagerOption[]
  >([]);

  const [loadingManagers, setLoadingManagers] = useState(false);

  const [saving, setSaving] = useState(false);

  const editing = Boolean(client);

  const inputClasses =
    "w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-white";

  /**
   * Reset the form whenever the modal or selected Client changes.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(getClientFormValues(client));
  }, [client, open]);

  /**
   * Load active staff members for the account-manager select field.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    /**
     * Load staff members for the Account Manager select field.
     */
    async function loadAccountManagers() {
      setLoadingManagers(true);

      try {
        const { data, error } = await supabase
          .from("staff")
          .select(
            `
        id,
        first_name,
        last_name,
        email,
        status
      `
          )
          .order("first_name", {
            ascending: true,
          });

        console.log("Account managers:", data);
        console.log("Account manager error:", error);

        if (error) {
          throw error;
        }

        const options: AccountManagerOption[] = (
          (data ?? []) as StaffAccountManagerRow[]
        ).map((staffMember) => {
          const fullName = [staffMember.first_name, staffMember.last_name]
            .filter(Boolean)
            .join(" ")
            .trim();

          return {
            id: staffMember.id,
            name: fullName || staffMember.email || "Unnamed staff member",
            email: staffMember.email,
          };
        });

        setAccountManagers(options);
      } catch (error) {
        console.error("Failed to load Account Managers:", error);

        toast.error("Account Managers could not be loaded.");

        setAccountManagers([]);
      } finally {
        setLoadingManagers(false);
      }
    }

    void loadAccountManagers();
  }, [open]);

  const resolvedDisplayName = useMemo(() => {
    if (form.client_type === "organisation") {
      return form.display_name.trim() || form.company_name.trim();
    }

    const fullName = [form.first_name.trim(), form.last_name.trim()]
      .filter(Boolean)
      .join(" ");

    return form.display_name.trim() || fullName;
  }, [
    form.client_type,
    form.company_name,
    form.display_name,
    form.first_name,
    form.last_name,
  ]);

  if (!open) {
    return null;
  }

  /**
   * Update one controlled Client form field.
   */
  function updateField<Key extends keyof ClientFormState>(
    key: Key,
    value: ClientFormState[Key]
  ) {
    setForm((currentForm: ClientFormState) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  /**
   * Change the Client type while preserving relevant values.
   */
  function handleClientTypeChange(clientType: ClientType) {
    setForm((currentForm: ClientFormState) => ({
      ...currentForm,

      client_type: clientType,

      display_name:
        clientType === "organisation"
          ? currentForm.display_name || currentForm.company_name
          : currentForm.display_name ||
            [currentForm.first_name, currentForm.last_name]
              .filter(Boolean)
              .join(" "),
    }));
  }

  /**
   * Validate and save the Client record.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resolvedDisplayName) {
      toast.error("Client display name is required.");

      return;
    }

    if (form.client_type === "organisation" && !form.company_name.trim()) {
      toast.error("Company name is required for an organisation.");

      return;
    }

    if (form.client_type === "individual" && !form.first_name.trim()) {
      toast.error("First name is required for an individual Client.");

      return;
    }

    if (!isValidEmail(form.email)) {
      toast.error("Enter a valid Client email address.");

      return;
    }

    if (!isValidWebsite(form.website)) {
      toast.error("Enter a valid website URL, including https://.");

      return;
    }

    if (!form.country.trim()) {
      toast.error("Client country is required.");

      return;
    }

    setSaving(true);

    try {
      const sharedInput = {
        client_type: form.client_type,

        display_name: resolvedDisplayName,

        company_name:
          form.client_type === "organisation"
            ? normalizeOptionalText(form.company_name)
            : normalizeOptionalText(form.company_name),

        first_name: normalizeOptionalText(form.first_name),

        last_name: normalizeOptionalText(form.last_name),

        email: normalizeOptionalText(form.email),

        phone: normalizeOptionalText(form.phone),

        alternative_phone: normalizeOptionalText(form.alternative_phone),

        website: normalizeOptionalText(form.website),

        industry: normalizeOptionalText(form.industry),

        tax_identification_number: normalizeOptionalText(
          form.tax_identification_number
        ),

        billing_address: normalizeOptionalText(form.billing_address),

        city: normalizeOptionalText(form.city),

        state: normalizeOptionalText(form.state),

        country: form.country.trim(),

        postal_code: normalizeOptionalText(form.postal_code),

        status: form.status,

        account_manager_id: form.account_manager_id || null,

        source: normalizeOptionalText(form.source),

        notes: normalizeOptionalText(form.notes),

        metadata: {
          form_version: 1,

          last_updated_from: "admin_client_form",
        },
      };

      let savedClient: Client;

      if (client) {
        const updateInput: UpdateClientInput = sharedInput;

        savedClient = await updateClient(client.id, updateInput);

        toast.success("Client updated successfully.");
      } else {
        const createInput: CreateClientInput = sharedInput;

        savedClient = await createClient(createInput);

        toast.success("Client created successfully.");
      }

      await onSaved(savedClient);
    } catch (error) {
      console.error(
        `Failed to ${editing ? "update" : "create"} Client:`,
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : `The Client could not be ${editing ? "updated" : "created"}.`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-form-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[95vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6 sm:py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              Clients and CRM
            </p>

            <h2
              id="client-form-title"
              className="mt-1 text-xl font-bold text-slate-950 dark:text-white sm:text-2xl"
            >
              {editing ? "Edit Client" : "Add Client"}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {editing
                ? `Update ${client?.client_code ?? "this Client"} and its business information.`
                : "Create a permanent Client profile for projects, invoices and financial activity."}
            </p>
          </div>

          <button
            type="button"
            title="Close Client Form"
            aria-label="Close Client Form"
            disabled={saving}
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            <X size={18} />
          </button>
        </header>

        <div className="max-h-[calc(95vh-155px)] overflow-y-auto">
          <div className="space-y-6 p-4 sm:p-6">
            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Client type
              </h3>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Select whether this profile represents a person or an
                organisation.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleClientTypeChange("organisation")}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition sm:p-4 ${
                    form.client_type === "organisation"
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  }`}
                >
                  <Building2 size={20} className="shrink-0" />

                  <span>
                    <span className="block text-sm font-semibold">
                      Organisation
                    </span>

                    <span className="mt-0.5 hidden text-xs opacity-75 sm:block">
                      Company or institution
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleClientTypeChange("individual")}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition sm:p-4 ${
                    form.client_type === "individual"
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  }`}
                >
                  <UserRound size={20} className="shrink-0" />

                  <span>
                    <span className="block text-sm font-semibold">
                      Individual
                    </span>

                    <span className="mt-0.5 hidden text-xs opacity-75 sm:block">
                      Personal Client
                    </span>
                  </span>
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Identity
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {form.client_type === "organisation" ? (
                  <>
                    <ClientField label="Company Name" required>
                      <input
                        value={form.company_name}
                        onChange={(event) => {
                          const companyName = event.target.value;

                          updateField("company_name", companyName);

                          if (!form.display_name.trim()) {
                            updateField("display_name", companyName);
                          }
                        }}
                        placeholder="CloudTweak Technologies Limited"
                        className={inputClasses}
                      />
                    </ClientField>

                    <ClientField label="Display Name (This is shown across the admin center)" required>
                      <input
                        value={form.display_name}
                        onChange={(event) =>
                          updateField("display_name", event.target.value)
                        }
                        placeholder="CloudTweak"
                        className={inputClasses}
                      />
                    </ClientField>
                  </>
                ) : (
                  <>
                    <ClientField label="First Name" required>
                      <input
                        value={form.first_name}
                        onChange={(event) =>
                          updateField("first_name", event.target.value)
                        }
                        placeholder="John"
                        className={inputClasses}
                      />
                    </ClientField>

                    <ClientField label="Last Name">
                      <input
                        value={form.last_name}
                        onChange={(event) =>
                          updateField("last_name", event.target.value)
                        }
                        placeholder="Doe"
                        className={inputClasses}
                      />
                    </ClientField>

                    <div className="sm:col-span-2">
                      <ClientField
                        label="Display Name"
                        helperText={`Profile name: ${
                          resolvedDisplayName || "Not available"
                        }`}
                      >
                        <input
                          value={form.display_name}
                          onChange={(event) =>
                            updateField("display_name", event.target.value)
                          }
                          placeholder="Leave empty to use the full name"
                          className={inputClasses}
                        />
                      </ClientField>
                    </div>
                  </>
                )}

                <ClientField label="Client Status">
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField("status", event.target.value as ClientStatus)
                    }
                    className={inputClasses}
                  >
                    {CLIENT_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </ClientField>

                <ClientField label="Industry">
                  <input
                    value={form.industry}
                    onChange={(event) =>
                      updateField("industry", event.target.value)
                    }
                    placeholder="Technology, Finance, Education..."
                    className={inputClasses}
                  />
                </ClientField>

                <ClientField label="Source">
                  <select
                    value={form.source}
                    onChange={(event) =>
                      updateField("source", event.target.value)
                    }
                    className={inputClasses}
                  >
                    <option value="">Select source</option>

                    {CLIENT_SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </ClientField>

                <ClientField label="Account Manager">
                  <select
                    value={form.account_manager_id}
                    onChange={(event) =>
                      updateField("account_manager_id", event.target.value)
                    }
                    disabled={loadingManagers}
                    className={inputClasses}
                  >
                    <option value="">
                      {loadingManagers
                        ? "Loading staff..."
                        : "No account manager assigned"}
                    </option>

                    {accountManagers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                        {manager.email ? ` — ${manager.email}` : ""}
                      </option>
                    ))}
                  </select>
                </ClientField>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Contact information
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <ClientField label="Email Address">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="client@example.com"
                    className={inputClasses}
                  />
                </ClientField>

                <ClientField label="Phone Number">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    placeholder="+234..."
                    className={inputClasses}
                  />
                </ClientField>

                <ClientField label="Alternative Phone">
                  <input
                    type="tel"
                    value={form.alternative_phone}
                    onChange={(event) =>
                      updateField("alternative_phone", event.target.value)
                    }
                    placeholder="+234..."
                    className={inputClasses}
                  />
                </ClientField>

                <ClientField label="Website">
                  <input
                    type="url"
                    value={form.website}
                    onChange={(event) =>
                      updateField("website", event.target.value)
                    }
                    placeholder="https://example.com"
                    className={inputClasses}
                  />
                </ClientField>

                <ClientField label="Tax Identification Number">
                  <input
                    value={form.tax_identification_number}
                    onChange={(event) =>
                      updateField(
                        "tax_identification_number",
                        event.target.value
                      )
                    }
                    placeholder="TIN"
                    className={inputClasses}
                  />
                </ClientField>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Billing address
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <ClientField label="Address">
                    <textarea
                      rows={3}
                      value={form.billing_address}
                      onChange={(event) =>
                        updateField("billing_address", event.target.value)
                      }
                      placeholder="Street and billing address"
                      className={inputClasses}
                    />
                  </ClientField>
                </div>

                <ClientField label="City">
                  <input
                    value={form.city}
                    onChange={(event) =>
                      updateField("city", event.target.value)
                    }
                    placeholder="Lagos"
                    className={inputClasses}
                  />
                </ClientField>

                <ClientField label="State">
                  <input
                    value={form.state}
                    onChange={(event) =>
                      updateField("state", event.target.value)
                    }
                    placeholder="Lagos"
                    className={inputClasses}
                  />
                </ClientField>

                <ClientField label="Country" required>
                  <input
                    value={form.country}
                    onChange={(event) =>
                      updateField("country", event.target.value)
                    }
                    placeholder="Nigeria"
                    className={inputClasses}
                  />
                </ClientField>

                <ClientField label="Postal Code">
                  <input
                    value={form.postal_code}
                    onChange={(event) =>
                      updateField("postal_code", event.target.value)
                    }
                    placeholder="100001"
                    className={inputClasses}
                  />
                </ClientField>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <ClientField label="Internal Notes">
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="Add internal information about this Client..."
                  className={inputClasses}
                />
              </ClientField>
            </section>
          </div>
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || loadingManagers}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {saving && <LoaderCircle size={16} className="animate-spin" />}

              {saving
                ? editing
                  ? "Saving Changes..."
                  : "Creating Client..."
                : editing
                  ? "Save Changes"
                  : "Create Client"}
            </button>
          </footer>
        </div>
      </form>
    </div>
  );
}
