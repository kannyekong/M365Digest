import {
  Calculator,
  LoaderCircle,
  Plus,
  ReceiptText,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  CreateInvoiceInput,
  CreateInvoiceItemInput,
  InvoiceDiscountType,
  InvoiceStatus,
} from "../../../../types/invoice";
import {
  DEFAULT_INVOICE_CURRENCY,
  DEFAULT_INVOICE_TAX_RATE,
  DEFAULT_INVOICE_TERMS,
  INVOICE_DISCOUNT_TYPES,
} from "../../../../config/invoice";
import {
  calculateInvoiceItem,
  calculateInvoiceTotals,
  formatInvoiceCurrency,
  getDefaultInvoiceDueDate,
} from "../../../../utils/invoice";

interface InvoiceBuilderProps {
  open: boolean;

  submitting: boolean;

  onClose: () => void;

  onSubmit: (input: CreateInvoiceInput) => Promise<void> | void;
}

interface InvoiceBuilderState {
  customerName: string;

  customerCompany: string;

  customerEmail: string;

  customerPhone: string;

  billingAddress: string;

  currency: string;

  issueDate: string;

  dueDate: string;

  status: InvoiceStatus;

  discountType: InvoiceDiscountType;

  discountValue: string;

  notes: string;

  terms: string;

  internalNotes: string;

  purchaseOrderNumber: string;

  items: Array<{
    id: string;

    description: string;

    quantity: string;

    unitPrice: string;

    discountType: InvoiceDiscountType;

    discountValue: string;

    taxRate: string;
  }>;
}

/**
 * Build one fresh invoice-builder state.
 */
function createDefaultInvoiceState(): InvoiceBuilderState {
  const issueDate = new Date().toISOString().slice(0, 10);

  return {
    customerName: "",
    customerCompany: "",
    customerEmail: "",
    customerPhone: "",
    billingAddress: "",
    currency: DEFAULT_INVOICE_CURRENCY,
    issueDate,
    dueDate: getDefaultInvoiceDueDate(new Date()),
    status: "draft",
    discountType: "fixed",
    discountValue: "0",
    notes: "",
    terms: DEFAULT_INVOICE_TERMS,
    internalNotes: "",
    purchaseOrderNumber: "",
    items: [
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: "1",
        unitPrice: "0",
        discountType: "fixed",
        discountValue: "0",
        taxRate: String(DEFAULT_INVOICE_TAX_RATE),
      },
    ],
  };
}

/**
 * Convert one builder item into the invoice-service input shape.
 */
function mapBuilderItem(
  item: InvoiceBuilderState["items"][number],
  index: number
): CreateInvoiceItemInput {
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

/**
 * Display the invoice creation modal and line-item builder.
 */
export default function InvoiceBuilder({
  open,
  submitting,
  onClose,
  onSubmit,
}: InvoiceBuilderProps) {
  const [form, setForm] = useState<InvoiceBuilderState>(
    createDefaultInvoiceState
  );

  /**
   * Convert the current line items into calculation inputs.
   */
  const calculatedItems = useMemo(() => {
    return form.items.map(mapBuilderItem);
  }, [form.items]);

  /**
   * Calculate the live invoice totals.
   */
  const totals = useMemo(() => {
    return calculateInvoiceTotals({
      items: calculatedItems,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
    });
  }, [calculatedItems, form.discountType, form.discountValue]);

  /**
   * Update one top-level builder field.
   */
  function updateField<Key extends keyof InvoiceBuilderState>(
    field: Key,
    value: InvoiceBuilderState[Key]
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  /**
   * Update one invoice line-item field.
   */
  function updateItem(
    itemId: string,
    field: keyof InvoiceBuilderState["items"][number],
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

  /**
   * Add one blank line item.
   */
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
          taxRate: String(DEFAULT_INVOICE_TAX_RATE),
        },
      ],
    }));
  }

  /**
   * Remove one line item while preserving at least one item.
   */
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

  /**
   * Close the builder and reset its state.
   */
  function closeBuilder() {
    if (submitting) {
      return;
    }

    setForm(createDefaultInvoiceState());
    onClose();
  }

  /**
   * Validate and submit the complete invoice.
   */
  async function handleSubmit() {
    if (!form.customerName.trim()) {
      throw new Error("Customer name is required.");
    }

    if (!form.customerEmail.trim()) {
      throw new Error("Customer email is required.");
    }

    if (calculatedItems.some((item) => !item.description)) {
      throw new Error("Every invoice item requires a description.");
    }

    await onSubmit({
      customerName: form.customerName.trim(),
      customerCompany: form.customerCompany.trim() || null,
      customerEmail: form.customerEmail.trim(),
      customerPhone: form.customerPhone.trim() || null,
      billingAddress: form.billingAddress.trim() || null,
      currency: form.currency.trim().toUpperCase(),
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      status: form.status,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      notes: form.notes.trim() || null,
      terms: form.terms.trim() || null,
      internalNotes: form.internalNotes.trim() || null,
      purchaseOrderNumber: form.purchaseOrderNumber.trim() || null,
      items: calculatedItems,
    });

    setForm(createDefaultInvoiceState());
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/65 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <ReceiptText size={22} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                Finance
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                Create Invoice
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Add customer details, services, discounts, and payment terms.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeBuilder}
            disabled={submitting}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Close invoice builder"
          >
            <X size={19} />
          </button>
        </header>

        <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Customer details
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Customer name
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(event) =>
                      updateField("customerName", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="Customer or contact name"
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
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="Optional company name"
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
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="billing@customer.com"
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
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="+234..."
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
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="Customer billing address"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Invoice items
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Add each service, product, or billable activity.
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
                  const calculation = calculateInvoiceItem(
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
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/30"
                          aria-label={`Remove item ${index + 1}`}
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
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            placeholder="Microsoft 365 implementation"
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
                              updateItem(item.id, "quantity", event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                              updateItem(item.id, "unitPrice", event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                            {INVOICE_DISCOUNT_TYPES.map((discountType) => (
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
                          {formatInvoiceCurrency(
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

            <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Invoice settings
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Issue date
                  <div className="mt-2 flex w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                    <input
                      type="date"
                      value={form.issueDate}
                      onChange={(event) =>
                        updateField("issueDate", event.target.value)
                      }
                      className="block w-full min-w-0 border-0 bg-transparent p-0 text-slate-950 outline-none dark:text-white"
                    />
                  </div>
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Due date
                  <div className="mt-2 flex w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(event) =>
                        updateField("dueDate", event.target.value)
                      }
                      className="block w-full min-w-0 border-0 bg-transparent p-0 text-slate-950 outline-none dark:text-white"
                    />
                  </div>
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
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Purchase order
                  <input
                    type="text"
                    value={form.purchaseOrderNumber}
                    onChange={(event) =>
                      updateField("purchaseOrderNumber", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="Optional PO number"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Customer note
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      updateField("notes", event.target.value)
                    }
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="Visible to the customer"
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
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="Only visible to staff"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 sm:col-span-2">
                  Payment terms
                  <textarea
                    value={form.terms}
                    onChange={(event) =>
                      updateField("terms", event.target.value)
                    }
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
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
                Invoice summary
              </h3>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">
                  Subtotal
                </span>

                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatInvoiceCurrency(
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
                  {formatInvoiceCurrency(
                    totals.lineDiscountAmount,
                    form.currency
                  )}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_110px] items-end gap-3">
                <label className="text-slate-500 dark:text-slate-400">
                  Invoice discount
                  <select
                    value={form.discountType}
                    onChange={(event) =>
                      updateField(
                        "discountType",
                        event.target.value as InvoiceDiscountType
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    {INVOICE_DISCOUNT_TYPES.map((discountType) => (
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
                  Invoice discount total
                </span>

                <span className="font-semibold text-slate-900 dark:text-white">
                  -
                  {formatInvoiceCurrency(
                    totals.invoiceDiscountAmount,
                    form.currency
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">
                  Tax
                </span>

                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatInvoiceCurrency(totals.taxAmount, form.currency)}
                </span>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total
              </p>

              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                {formatInvoiceCurrency(totals.totalAmount, form.currency)}
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
                  <ReceiptText size={17} />
                )}

                {submitting ? "Creating invoice..." : "Create invoice"}
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
