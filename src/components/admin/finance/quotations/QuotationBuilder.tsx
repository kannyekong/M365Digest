import {
  Calculator,
  FileText,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { listClientOptions } from "../../../../lib/client";
import { getProjectsForClient } from "../../../../lib/server/projects";
import type { ClientOption } from "../../../../types/client";
import type { ProjectOption } from "../../../../types/project";
import type {
  CreateQuotationInput,
  CreateQuotationItemInput,
  Quotation,
  QuotationDiscountType,
  QuotationStatus,
} from "../../../../types/quotation";
import {
  DEFAULT_QUOTATION_CURRENCY,
  DEFAULT_QUOTATION_TAX_RATE,
  DEFAULT_QUOTATION_TERMS,
  DEFAULT_QUOTATION_VALIDITY_DAYS,
  QUOTATION_DISCOUNT_TYPES,
} from "../../../../config/quotation";
import {
  calculateQuotationItem,
  calculateQuotationTotals,
  formatQuotationCurrency,
  getDefaultQuotationValidUntil,
} from "../../../../utils/quotation";

interface QuotationBuilderProps {
  open: boolean;

  submitting: boolean;

  quotation?: Quotation | null;

  onClose: () => void;

  onSubmit: (input: CreateQuotationInput) => Promise<void> | void;
}

interface QuotationBuilderState {
  customerId: string;

  projectId: string;

  customerName: string;

  customerCompany: string;

  customerEmail: string;

  customerPhone: string;

  billingAddress: string;

  subject: string;

  currency: string;

  issueDate: string;

  validUntil: string;

  status: QuotationStatus;

  discountType: QuotationDiscountType;

  discountValue: string;

  notes: string;

  terms: string;

  internalNotes: string;

  items: Array<{
    id: string;

    description: string;

    quantity: string;

    unitPrice: string;

    discountType: QuotationDiscountType;

    discountValue: string;

    taxRate: string;
  }>;
}

/* Builds one empty Quotation Builder state. */
function createDefaultQuotationState(): QuotationBuilderState {
  const issueDate = new Date().toISOString().slice(0, 10);

  return {
    customerId: "",

    projectId: "",

    customerName: "",

    customerCompany: "",

    customerEmail: "",

    customerPhone: "",

    billingAddress: "",

    subject: "",

    currency: DEFAULT_QUOTATION_CURRENCY,

    issueDate,

    validUntil: getDefaultQuotationValidUntil(
      new Date(),
      DEFAULT_QUOTATION_VALIDITY_DAYS
    ),

    status: "draft",

    discountType: "fixed",

    discountValue: "0",

    notes: "",

    terms: DEFAULT_QUOTATION_TERMS,

    internalNotes: "",

    items: [
      {
        id: crypto.randomUUID(),

        description: "",

        quantity: "1",

        unitPrice: "0",

        discountType: "fixed",

        discountValue: "0",

        taxRate: String(DEFAULT_QUOTATION_TAX_RATE),
      },
    ],
  };
}

/* Converts one Builder item into the service input format. */
function mapBuilderItem(
  item: QuotationBuilderState["items"][number],
  index: number
): CreateQuotationItemInput {
  return {
    description: item.description.trim(),

    quantity: Number(item.quantity),

    unitPrice: Number(item.unitPrice),

    discountType: item.discountType,

    discountValue: Number(item.discountValue),

    taxRate: Number(item.taxRate),

    sortOrder: index,
  };
}

/* Converts one existing draft quotation into editable Builder state. */
function quotationToBuilderState(quotation: Quotation): QuotationBuilderState {
  return {
    customerId: quotation.customer_id ?? "",

    projectId: quotation.project_id ?? "",

    customerName: quotation.customer_name,

    customerCompany: quotation.customer_company ?? "",

    customerEmail: quotation.customer_email ?? "",

    customerPhone: quotation.customer_phone ?? "",

    billingAddress: quotation.billing_address ?? "",

    subject: quotation.subject,

    currency: quotation.currency,

    issueDate: quotation.issue_date,

    validUntil: quotation.valid_until,

    status: "draft",

    discountType: quotation.discount_type,

    discountValue: String(quotation.discount_value),

    notes: quotation.notes ?? "",

    terms: quotation.terms ?? "",

    internalNotes: quotation.internal_notes ?? "",

    items:
      quotation.items && quotation.items.length > 0
        ? quotation.items.map((item) => ({
            id: item.id,

            description: item.description,

            quantity: String(item.quantity),

            unitPrice: String(item.unit_price),

            discountType: item.discount_type,

            discountValue: String(item.discount_value),

            taxRate: String(item.tax_rate),
          }))
        : createDefaultQuotationState().items,
  };
}

/* Displays the quotation creation and draft-editing modal. */
export default function QuotationBuilder({
  open,
  submitting,
  quotation = null,
  onClose,
  onSubmit,
}: QuotationBuilderProps) {
  const [form, setForm] = useState<QuotationBuilderState>(
    createDefaultQuotationState
  );

  const [clients, setClients] = useState<ClientOption[]>([]);

  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const [loadingClients, setLoadingClients] = useState(false);

  const [loadingProjects, setLoadingProjects] = useState(false);

  /* Resets the Builder whenever it opens or the selected quotation changes. */
  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(
      quotation
        ? quotationToBuilderState(quotation)
        : createDefaultQuotationState()
    );
  }, [quotation, open]);

  /* Loads active Clients whenever the Builder is opened. */
  useEffect(() => {
    if (!open) {
      return;
    }

    async function loadClients() {
      setLoadingClients(true);

      try {
        const clientOptions = await listClientOptions();

        setClients(clientOptions);
      } catch (error) {
        console.error("Failed to load quotation Clients:", error);

        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    }

    void loadClients();
  }, [open]);

  /* Loads projects for an existing quotation when the Builder opens. */
  useEffect(() => {
    if (!open || !quotation?.customer_id) {
      return;
    }

    void loadProjectsForClient(quotation.customer_id);
  }, [quotation?.customer_id, open]);

  /* Converts line-item state into values used for live quotation calculations. */
  const calculatedItems = useMemo(() => {
    return form.items.map(mapBuilderItem);
  }, [form.items]);

  /* Calculates all quotation totals whenever pricing values change. */
  const totals = useMemo(() => {
    return calculateQuotationTotals({
      items: calculatedItems,

      discountType: form.discountType,

      discountValue: Number(form.discountValue),
    });
  }, [calculatedItems, form.discountType, form.discountValue]);

  /* Updates one top-level quotation field. */
  function updateField<Key extends keyof QuotationBuilderState>(
    field: Key,
    value: QuotationBuilderState[Key]
  ) {
    setForm((currentForm) => ({
      ...currentForm,

      [field]: value,
    }));
  }

  /* Loads all non-archived Projects associated with one Client. */
  async function loadProjectsForClient(clientId: string) {
    if (!clientId) {
      setProjects([]);

      return;
    }

    setLoadingProjects(true);

    try {
      const projectOptions = await getProjectsForClient(clientId);

      setProjects(projectOptions);
    } catch (error) {
      console.error("Failed to load quotation Client projects:", error);

      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }

  /* Selects a Client and fills its current CRM information into the quotation snapshot. */
  function handleClientChange(event: ChangeEvent<HTMLSelectElement>) {
    const clientId = event.target.value;

    const selectedClient = clients.find((client) => client.id === clientId);

    if (!selectedClient) {
      setForm((currentForm) => ({
        ...currentForm,

        customerId: "",

        projectId: "",

        customerName: "",

        customerCompany: "",

        customerEmail: "",

        customerPhone: "",

        billingAddress: "",
      }));

      setProjects([]);

      return;
    }

    setForm((currentForm) => ({
      ...currentForm,

      customerId: selectedClient.id,

      projectId: "",

      customerName: selectedClient.display_name,

      customerCompany: selectedClient.company_name ?? "",

      customerEmail: selectedClient.email ?? "",

      customerPhone: selectedClient.phone ?? "",

      billingAddress: selectedClient.billing_address ?? "",
    }));

    void loadProjectsForClient(selectedClient.id);
  }

  /* Updates one quotation line-item field. */
  function updateItem(
    itemId: string,
    field: keyof QuotationBuilderState["items"][number],
    value: string
  ) {
    setForm((currentForm) => ({
      ...currentForm,

      items: currentForm.items.map((item) =>
        item.id === itemId
          ? {
              ...item,

              [field]: value,
            }
          : item
      ),
    }));
  }

  /* Adds one empty line item to the quotation. */
  function addItem() {
    setForm((currentForm) => ({
      ...currentForm,

      items: [
        ...currentForm.items,

        {
          id: crypto.randomUUID(),

          description: "",

          quantity: "1",

          unitPrice: "0",

          discountType: "fixed",

          discountValue: "0",

          taxRate: String(DEFAULT_QUOTATION_TAX_RATE),
        },
      ],
    }));
  }

  /* Removes one line item while keeping at least one row available. */
  function removeItem(itemId: string) {
    setForm((currentForm) => {
      if (currentForm.items.length === 1) {
        return currentForm;
      }

      return {
        ...currentForm,

        items: currentForm.items.filter((item) => item.id !== itemId),
      };
    });
  }

  /* Closes the quotation Builder and resets its local state. */
  function closeBuilder() {
    if (submitting) {
      return;
    }

    setForm(createDefaultQuotationState());

    setProjects([]);

    onClose();
  }

  /* Validates and submits the complete quotation. */
  async function handleSubmit() {
    if (!form.customerName.trim()) {
      throw new Error("Customer name is required.");
    }

    if (!form.subject.trim()) {
      throw new Error("Quotation subject is required.");
    }

    if (calculatedItems.some((item) => !item.description)) {
      throw new Error("Every quotation item requires a description.");
    }

    await onSubmit({
      customerId: form.customerId || null,

      projectId: form.projectId || null,

      customerName: form.customerName.trim(),

      customerCompany: form.customerCompany.trim() || null,

      customerEmail: form.customerEmail.trim() || null,

      customerPhone: form.customerPhone.trim() || null,

      billingAddress: form.billingAddress.trim() || null,

      subject: form.subject.trim(),

      currency: form.currency.trim().toUpperCase(),

      issueDate: form.issueDate,

      validUntil: form.validUntil,

      status: form.status,

      discountType: form.discountType,

      discountValue: Number(form.discountValue),

      notes: form.notes.trim() || null,

      terms: form.terms.trim() || null,

      internalNotes: form.internalNotes.trim() || null,

      items: calculatedItems,
    });

    setForm(createDefaultQuotationState());

    setProjects([]);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/65 px-3 py-6 backdrop-blur-sm sm:px-4 sm:py-8">
      <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 dark:border-slate-800 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <FileText size={22} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                Sales
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                {quotation ? "Edit Draft Quotation" : "Create Quotation"}
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Build a commercial proposal for an existing or prospective
                Client.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeBuilder}
            disabled={submitting}
            aria-label="Close quotation builder"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <X size={19} />
          </button>
        </header>

        <div className="grid gap-6 p-4 sm:p-7 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Client details
              </h3>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Select a Client to automatically populate the quotation details.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Client
                  <select
                    value={form.customerId}
                    onChange={handleClientChange}
                    disabled={loadingClients}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">
                      {loadingClients
                        ? "Loading Clients..."
                        : clients.length === 0
                          ? "No active Clients available"
                          : "Select a Client"}
                    </option>

                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.client_code} — {client.display_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Project
                  <select
                    value={form.projectId}
                    onChange={(event) =>
                      updateField("projectId", event.target.value)
                    }
                    disabled={!form.customerId || loadingProjects}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">
                      {!form.customerId
                        ? "Select a Client first"
                        : loadingProjects
                          ? "Loading projects..."
                          : projects.length === 0
                            ? "No Project linked yet"
                            : "Optional Project"}
                    </option>

                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.project_code} — {project.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Customer name
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(event) =>
                      updateField("customerName", event.target.value)
                    }
                    placeholder="Customer or contact name"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Company
                  <input
                    type="text"
                    value={form.customerCompany}
                    onChange={(event) =>
                      updateField("customerCompany", event.target.value)
                    }
                    placeholder="Optional company name"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Email
                  <input
                    type="email"
                    value={form.customerEmail}
                    onChange={(event) =>
                      updateField("customerEmail", event.target.value)
                    }
                    placeholder="contact@customer.com"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Phone
                  <input
                    type="tel"
                    value={form.customerPhone}
                    onChange={(event) =>
                      updateField("customerPhone", event.target.value)
                    }
                    placeholder="+234..."
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 sm:col-span-2">
                  Billing address
                  <textarea
                    value={form.billingAddress}
                    onChange={(event) =>
                      updateField("billingAddress", event.target.value)
                    }
                    rows={3}
                    placeholder="Customer billing address"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Quotation details
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 sm:col-span-2">
                  Subject
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(event) =>
                      updateField("subject", event.target.value)
                    }
                    placeholder="Microsoft 365 Migration Proposal"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Issue date
                  <input
                    type="date"
                    value={form.issueDate}
                    onChange={(event) =>
                      updateField("issueDate", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Valid until
                  <input
                    type="date"
                    min={form.issueDate || undefined}
                    value={form.validUntil}
                    onChange={(event) =>
                      updateField("validUntil", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Currency
                  <input
                    type="text"
                    maxLength={3}
                    value={form.currency}
                    onChange={(event) =>
                      updateField("currency", event.target.value.toUpperCase())
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Quotation items
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Add each deliverable, service, product, or billable
                    activity.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <Plus size={16} />
                  Add item
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {form.items.map((item, index) => {
                  const calculation = calculateQuotationItem(
                    mapBuilderItem(item, index)
                  );

                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Item {index + 1}
                        </p>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={form.items.length === 1}
                          aria-label={`Remove item ${index + 1}`}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/30"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2 xl:col-span-2">
                          Description
                          <input
                            type="text"
                            value={item.description}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "description",
                                event.target.value
                              )
                            }
                            placeholder="Microsoft 365 implementation"
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />
                        </label>

                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          Quantity
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "quantity",
                                event.target.value
                              )
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />
                        </label>

                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          Unit price
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "unitPrice",
                                event.target.value
                              )
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />
                        </label>

                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          Discount
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discountValue}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "discountValue",
                                event.target.value
                              )
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />
                        </label>

                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          VAT %
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.taxRate}
                            onChange={(event) =>
                              updateItem(item.id, "taxRate", event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />
                        </label>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
                        <label className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          Discount type
                          <select
                            value={item.discountType}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "discountType",
                                event.target.value
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                          >
                            {QUOTATION_DISCOUNT_TYPES.map((discountType) => (
                              <option
                                key={discountType.value}
                                value={discountType.value}
                              >
                                {discountType.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <p className="font-semibold text-slate-900 dark:text-white">
                          Line total:{" "}
                          {formatQuotationCurrency(
                            calculation.lineTotal,
                            form.currency
                          )}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Notes & terms
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Customer note
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      updateField("notes", event.target.value)
                    }
                    rows={4}
                    placeholder="Visible to the customer"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Internal note
                  <textarea
                    value={form.internalNotes}
                    onChange={(event) =>
                      updateField("internalNotes", event.target.value)
                    }
                    rows={4}
                    placeholder="Only visible to staff"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 sm:col-span-2">
                  Terms
                  <textarea
                    value={form.terms}
                    onChange={(event) =>
                      updateField("terms", event.target.value)
                    }
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60 xl:sticky xl:top-6">
            <div className="flex items-center gap-2">
              <Calculator
                size={18}
                className="text-blue-600 dark:text-blue-400"
              />

              <h3 className="font-semibold text-slate-950 dark:text-white">
                Quotation summary
              </h3>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">
                  Subtotal
                </span>

                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatQuotationCurrency(
                    totals.subtotalAmount,
                    form.currency
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">
                  Line discounts
                </span>

                <span className="font-semibold text-slate-900 dark:text-white">
                  -
                  {formatQuotationCurrency(
                    totals.lineDiscountAmount,
                    form.currency
                  )}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_110px] items-end gap-3">
                <label className="text-slate-500 dark:text-slate-400">
                  Quote discount
                  <select
                    value={form.discountType}
                    onChange={(event) =>
                      updateField(
                        "discountType",
                        event.target.value as QuotationDiscountType
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    {QUOTATION_DISCOUNT_TYPES.map((discountType) => (
                      <option
                        key={discountType.value}
                        value={discountType.value}
                      >
                        {discountType.label}
                      </option>
                    ))}
                  </select>
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discountValue}
                  onChange={(event) =>
                    updateField("discountValue", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">
                  Quotation discount
                </span>

                <span className="font-semibold text-slate-900 dark:text-white">
                  -
                  {formatQuotationCurrency(
                    totals.quotationDiscountAmount,
                    form.currency
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">Tax</span>

                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatQuotationCurrency(totals.taxAmount, form.currency)}
                </span>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total
              </p>

              <p className="mt-1 break-words text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                {formatQuotationCurrency(totals.totalAmount, form.currency)}
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {submitting ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <FileText size={17} />
                )}

                {submitting
                  ? quotation
                    ? "Saving changes..."
                    : "Creating quotation..."
                  : quotation
                    ? "Save changes"
                    : "Create quotation"}
              </button>

              <button
                type="button"
                onClick={closeBuilder}
                disabled={submitting}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-950"
              >
                Cancel
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
