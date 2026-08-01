import { supabase } from "./superbase";
import type {
  CreateInvoiceInput,
  Invoice,
  InvoiceFilters,
  InvoiceItem,
  InvoiceListResult,
  InvoiceSortField,
  InvoiceStatistics,
  InvoiceStatus,
  UpdateInvoiceInput,
} from "../types/invoice";
import {
  calculateInvoiceItem,
  calculateInvoiceTotals,
  resolveInvoiceStatus,
  roundMoney,
} from "../utils/invoice";

export type InvoiceSortDirection = "asc" | "desc";

interface ListInvoicesOptions {
  page?: number;
  pageSize?: number;
  filters?: InvoiceFilters;
  sortBy?: InvoiceSortField;
  sortDirection?: InvoiceSortDirection;
}

interface RecordInvoicePaymentInput {
  amount: number;
  paymentReference?: string | null;
  revenueTransactionId?: string | null;
}

interface InvoiceDatabasePayload {
  customer_id: string | null;
  customer_name: string;
  customer_company: string | null;
  customer_email: string;
  customer_phone: string | null;
  billing_address: string | null;
  currency: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  notes: string | null;
  terms: string | null;
  internal_notes: string | null;
  purchase_order_number: string | null;
}

interface InvoiceItemDatabasePayload {
  description: string;
  quantity: number;
  unit_price: number;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_subtotal: number;
  line_total: number;
  sort_order: number;
}

/**
 * Convert blank optional text into null before storing it.
 */
function optionalText(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

/**
 * Validate the values required to create or update an invoice.
 */
function validateInvoiceInput(input: CreateInvoiceInput) {
  if (!input.customerName.trim()) {
    throw new Error("Customer name is required.");
  }

  if (!input.customerEmail.trim()) {
    throw new Error("Customer email is required.");
  }

  if (!input.currency.trim()) {
    throw new Error("Invoice currency is required.");
  }

  if (!input.issueDate || !input.dueDate) {
    throw new Error("Issue date and due date are required.");
  }

  if (new Date(input.dueDate).getTime() < new Date(input.issueDate).getTime()) {
    throw new Error("Due date cannot be earlier than the issue date.");
  }

  if (input.items.length === 0) {
    throw new Error("Add at least one invoice item.");
  }

  input.items.forEach((item, index) => {
    if (!item.description.trim()) {
      throw new Error(`Item ${index + 1} requires a description.`);
    }

    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error(`Item ${index + 1} requires a quantity greater than zero.`);
    }

    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new Error(`Item ${index + 1} has an invalid unit price.`);
    }
  });
}

/**
 * Build normalized invoice and item payloads for the atomic database functions.
 */
function buildInvoicePayload(
  input: CreateInvoiceInput,
  amountPaid = 0
): {
  invoice: InvoiceDatabasePayload;
  items: InvoiceItemDatabasePayload[];
} {
  validateInvoiceInput(input);

  const discountType = input.discountType ?? "fixed";
  const discountValue = Math.max(0, Number(input.discountValue ?? 0));

  const totals = calculateInvoiceTotals({
    items: input.items,
    discountType,
    discountValue,
    amountPaid,
  });

  const requestedStatus = input.status ?? "draft";
  const resolvedStatus = resolveInvoiceStatus({
    currentStatus: requestedStatus,
    totalAmount: totals.totalAmount,
    amountPaid: totals.amountPaid,
    dueDate: input.dueDate,
  });

  const items = input.items.map((item, index) => {
    const calculation = calculateInvoiceItem(item);

    return {
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unit_price: roundMoney(Number(item.unitPrice)),
      discount_type: item.discountType ?? "fixed",
      discount_value: Math.max(0, Number(item.discountValue ?? 0)),
      discount_amount: calculation.discountAmount,
      tax_rate: Math.min(100, Math.max(0, Number(item.taxRate ?? 0))),
      tax_amount: calculation.taxAmount,
      line_subtotal: calculation.lineSubtotal,
      line_total: calculation.lineTotal,
      sort_order: item.sortOrder ?? index,
    };
  });

  return {
    invoice: {
      customer_id: input.customerId ?? null,
      customer_name: input.customerName.trim(),
      customer_company: optionalText(input.customerCompany),
      customer_email: input.customerEmail.trim().toLowerCase(),
      customer_phone: optionalText(input.customerPhone),
      billing_address: optionalText(input.billingAddress),
      currency: input.currency.trim().toUpperCase(),
      issue_date: input.issueDate,
      due_date: input.dueDate,
      status: resolvedStatus,
      discount_type: discountType,
      discount_value: discountValue,
      subtotal_amount: totals.subtotalAmount,
      discount_amount: totals.invoiceDiscountAmount,
      tax_amount: totals.taxAmount,
      total_amount: totals.totalAmount,
      amount_paid: totals.amountPaid,
      amount_due: totals.amountDue,
      notes: optionalText(input.notes),
      terms: optionalText(input.terms),
      internal_notes: optionalText(input.internalNotes),
      purchase_order_number: optionalText(input.purchaseOrderNumber),
    },
    items,
  };
}

/**
 * Mark unpaid past-due invoices as overdue before returning dashboard data.
 */
export async function synchronizeOverdueInvoices() {
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "overdue",
    })
    .lt("due_date", today)
    .gt("amount_due", 0)
    .in("status", ["sent", "viewed", "partially_paid"]);

  if (error) {
    throw error;
  }
}

/**
 * Retrieve one paginated and filtered invoice list.
 */
export async function listInvoices({
  page = 1,
  pageSize = 10,
  filters = {},
  sortBy = "created_at",
  sortDirection = "desc",
}: ListInvoicesOptions = {}): Promise<InvoiceListResult> {
  await synchronizeOverdueInvoices();

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let query = supabase
    .from("invoices")
    .select("*", {
      count: "exact",
    });

  const search = filters.search?.trim();

  if (search) {
    const escapedSearch = search.replace(/[%_,]/g, "");
    query = query.or(
      `invoice_number.ilike.%${escapedSearch}%,customer_name.ilike.%${escapedSearch}%,customer_company.ilike.%${escapedSearch}%,customer_email.ilike.%${escapedSearch}%,purchase_order_number.ilike.%${escapedSearch}%`
    );
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.deliveryStatus && filters.deliveryStatus !== "all") {
    query = query.eq("delivery_status", filters.deliveryStatus);
  }

  if (filters.currency?.trim()) {
    query = query.eq("currency", filters.currency.trim().toUpperCase());
  }

  if (filters.issueDateFrom) {
    query = query.gte("issue_date", filters.issueDateFrom);
  }

  if (filters.issueDateTo) {
    query = query.lte("issue_date", filters.issueDateTo);
  }

  if (filters.dueDateFrom) {
    query = query.gte("due_date", filters.dueDateFrom);
  }

  if (filters.dueDateTo) {
    query = query.lte("due_date", filters.dueDateTo);
  }

  if (!filters.includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error, count } = await query
    .order(sortBy, {
      ascending: sortDirection === "asc",
    })
    .range(from, to);

  if (error) {
    throw error;
  }

  const total = count ?? 0;

  return {
    invoices: (data ?? []) as Invoice[],
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

/**
 * Retrieve every invoice matching the supplied filters for exports.
 */
export async function exportInvoices(
  filters: InvoiceFilters = {}
): Promise<Invoice[]> {
  const result: Invoice[] = [];
  const pageSize = 500;
  let page = 1;
  let totalPages = 1;

  do {
    const response = await listInvoices({
      page,
      pageSize,
      filters,
      sortBy: "created_at",
      sortDirection: "desc",
    });

    result.push(...response.invoices);
    totalPages = response.totalPages;
    page += 1;
  } while (page <= totalPages);

  return result;
}

/**
 * Retrieve one invoice together with all of its line items.
 */
export async function getInvoiceById(id: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      *,
      items:invoice_items(*)
    `
    )
    .eq("id", id)
    .order("sort_order", {
      referencedTable: "invoice_items",
      ascending: true,
    })
    .single();

  if (error) {
    throw error;
  }

  return data as Invoice;
}

/**
 * Create one invoice and all line items inside a database transaction.
 */
export async function createInvoice(
  input: CreateInvoiceInput
): Promise<Invoice> {
  const payload = buildInvoicePayload(input);

  const { data: invoiceId, error } = await supabase.rpc(
    "create_invoice_with_items",
    {
      p_invoice: payload.invoice,
      p_items: payload.items,
    }
  );

  if (error) {
    throw error;
  }

  return getInvoiceById(invoiceId as string);
}

/**
 * Replace the editable values and line items of one draft invoice atomically.
 */
export async function updateDraftInvoice(
  invoiceId: string,
  input: CreateInvoiceInput
): Promise<Invoice> {
  const currentInvoice = await getInvoiceById(invoiceId);

  if (currentInvoice.status !== "draft") {
    throw new Error("Only draft invoices can have their line items replaced.");
  }

  if (currentInvoice.archived_at) {
    throw new Error("Restore the invoice before editing it.");
  }

  const payload = buildInvoicePayload(input, currentInvoice.amount_paid);

  const { error } = await supabase.rpc("replace_draft_invoice", {
    p_invoice_id: invoiceId,
    p_invoice: payload.invoice,
    p_items: payload.items,
  });

  if (error) {
    throw error;
  }

  return getInvoiceById(invoiceId);
}

/**
 * Update non-item invoice metadata without replacing its line items.
 */
export async function updateInvoice(
  invoiceId: string,
  updates: UpdateInvoiceInput
): Promise<Invoice> {
  const currentInvoice = await getInvoiceById(invoiceId);

  if (currentInvoice.archived_at) {
    throw new Error("Restore the invoice before updating it.");
  }

  const databaseUpdates: Record<string, unknown> = {};

  if (updates.customerId !== undefined) {
    databaseUpdates.customer_id = updates.customerId;
  }

  if (updates.customerName !== undefined) {
    databaseUpdates.customer_name = updates.customerName.trim();
  }

  if (updates.customerCompany !== undefined) {
    databaseUpdates.customer_company = optionalText(updates.customerCompany);
  }

  if (updates.customerEmail !== undefined) {
    databaseUpdates.customer_email = updates.customerEmail.trim().toLowerCase();
  }

  if (updates.customerPhone !== undefined) {
    databaseUpdates.customer_phone = optionalText(updates.customerPhone);
  }

  if (updates.billingAddress !== undefined) {
    databaseUpdates.billing_address = optionalText(updates.billingAddress);
  }

  if (updates.deliveryStatus !== undefined) {
    databaseUpdates.delivery_status = updates.deliveryStatus;
  }

  if (updates.notes !== undefined) {
    databaseUpdates.notes = optionalText(updates.notes);
  }

  if (updates.terms !== undefined) {
    databaseUpdates.terms = optionalText(updates.terms);
  }

  if (updates.internalNotes !== undefined) {
    databaseUpdates.internal_notes = optionalText(updates.internalNotes);
  }

  if (updates.purchaseOrderNumber !== undefined) {
    databaseUpdates.purchase_order_number = optionalText(
      updates.purchaseOrderNumber
    );
  }

  if (updates.paymentReference !== undefined) {
    databaseUpdates.payment_reference = optionalText(updates.paymentReference);
  }

  if (updates.revenueTransactionId !== undefined) {
    databaseUpdates.revenue_transaction_id = updates.revenueTransactionId;
  }

  const { data, error } = await supabase
    .from("invoices")
    .update(databaseUpdates)
    .eq("id", invoiceId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Invoice;
}

/**
 * Mark one invoice as sent and store its delivery timestamp.
 */
export async function markInvoiceSent(invoiceId: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "sent",
      delivery_status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .is("archived_at", null)
    .neq("status", "cancelled")
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Invoice;
}

/**
 * Mark one invoice as viewed without changing completed states.
 */
export async function markInvoiceViewed(invoiceId: string): Promise<Invoice> {
  const currentInvoice = await getInvoiceById(invoiceId);

  if (
    currentInvoice.status === "paid" ||
    currentInvoice.status === "cancelled" ||
    currentInvoice.status === "refunded"
  ) {
    return currentInvoice;
  }

  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "viewed",
      viewed_at: currentInvoice.viewed_at ?? new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Invoice;
}

/**
 * Record an invoice payment atomically and resolve its payment status.
 */
export async function recordInvoicePayment(
  invoiceId: string,
  input: RecordInvoicePaymentInput
): Promise<Invoice> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const { data, error } = await supabase.rpc("record_invoice_payment", {
    p_invoice_id: invoiceId,
    p_amount: roundMoney(input.amount),
    p_payment_reference: optionalText(input.paymentReference),
    p_revenue_transaction_id: input.revenueTransactionId ?? null,
  });

  if (error) {
    throw error;
  }

  return data as Invoice;
}

/**
 * Cancel one unpaid invoice while preserving it for the audit trail.
 */
export async function cancelInvoice(invoiceId: string): Promise<Invoice> {
  const currentInvoice = await getInvoiceById(invoiceId);

  if (currentInvoice.amount_paid > 0) {
    throw new Error(
      "An invoice with recorded payments cannot be cancelled directly."
    );
  }

  if (currentInvoice.status === "refunded") {
    throw new Error("A refunded invoice cannot be cancelled.");
  }

  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .is("archived_at", null)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Invoice;
}

/**
 * Archive one invoice without deleting its accounting history.
 */
export async function archiveInvoice(invoiceId: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .is("archived_at", null)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Invoice;
}

/**
 * Restore one archived invoice.
 */
export async function restoreInvoice(invoiceId: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    .update({
      archived_at: null,
    })
    .eq("id", invoiceId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Invoice;
}

/**
 * Permanently delete one draft invoice that has no recorded payment.
 */
export async function deleteDraftInvoice(invoice: Invoice) {
  if (invoice.status !== "draft") {
    throw new Error("Only draft invoices can be permanently deleted.");
  }

  if (invoice.amount_paid > 0) {
    throw new Error("Invoices with recorded payments cannot be deleted.");
  }

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoice.id)
    .eq("status", "draft")
    .eq("amount_paid", 0);

  if (error) {
    throw error;
  }
}

/**
 * Calculate summary values used by the Invoice dashboard.
 */
export async function getInvoiceStatistics(
  currency = "NGN"
): Promise<InvoiceStatistics> {
  await synchronizeOverdueInvoices();

  const normalizedCurrency = currency.trim().toUpperCase();

  const { data, error } = await supabase
    .from("invoices")
    .select("status,total_amount,amount_paid,amount_due")
    .eq("currency", normalizedCurrency)
    .is("archived_at", null);

  if (error) {
    throw error;
  }

  const invoices = data ?? [];

  return invoices.reduce<InvoiceStatistics>(
    (statistics, invoice) => {
      statistics.totalInvoices += 1;
      statistics.totalInvoiceValue += Number(invoice.total_amount ?? 0);
      statistics.outstandingValue += Number(invoice.amount_due ?? 0);
      statistics.paidValue += Number(invoice.amount_paid ?? 0);

      if (invoice.status === "draft") {
        statistics.draftInvoices += 1;
      }

      if (
        invoice.status === "sent" ||
        invoice.status === "viewed" ||
        invoice.status === "partially_paid"
      ) {
        statistics.sentInvoices += 1;
      }

      if (invoice.status === "overdue") {
        statistics.overdueInvoices += 1;
        statistics.overdueValue += Number(invoice.amount_due ?? 0);
      }

      if (invoice.status === "paid") {
        statistics.paidInvoices += 1;
      }

      return statistics;
    },
    {
      totalInvoices: 0,
      totalInvoiceValue: 0,
      outstandingValue: 0,
      overdueValue: 0,
      paidValue: 0,
      draftInvoices: 0,
      sentInvoices: 0,
      overdueInvoices: 0,
      paidInvoices: 0,
      currency: normalizedCurrency,
    }
  );
}
