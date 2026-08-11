import { supabase } from "./superbase";
import type {
  CreateQuotationInput,
  Quotation,
  QuotationFilters,
  QuotationListResult,
  QuotationSortField,
  QuotationStatistics,
  UpdateQuotationInput,
} from "../types/quotation";
import {
  calculateQuotationItem,
  calculateQuotationTotals,
  roundQuotationMoney,
} from "../utils/quotation";
import { createInvoice } from "./invoice";
import type { Invoice } from "../types/invoice";

export type QuotationSortDirection = "asc" | "desc";

interface ListQuotationsOptions {
  page?: number;

  pageSize?: number;

  filters?: QuotationFilters;

  sortBy?: QuotationSortField;

  sortDirection?: QuotationSortDirection;
}

interface QuotationDatabasePayload {
  customer_id: string | null;

  project_id: string | null;

  customer_name: string;

  customer_company: string | null;

  customer_email: string | null;

  customer_phone: string | null;

  billing_address: string | null;

  subject: string;

  currency: string;

  issue_date: string;

  valid_until: string;

  status: string;

  discount_type: "fixed" | "percentage";

  discount_value: number;

  subtotal_amount: number;

  discount_amount: number;

  tax_amount: number;

  total_amount: number;

  notes: string | null;

  terms: string | null;

  internal_notes: string | null;
}

interface QuotationItemDatabasePayload {
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

/* Converts blank optional text into null before storing it. */
function optionalText(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

/* Validates values required to create or update a quotation. */
function validateQuotationInput(input: CreateQuotationInput) {
  if (!input.customerName.trim()) {
    throw new Error("Customer name is required.");
  }

  if (!input.subject.trim()) {
    throw new Error("Quotation subject is required.");
  }

  if (!input.currency.trim()) {
    throw new Error("Quotation currency is required.");
  }

  if (!input.issueDate || !input.validUntil) {
    throw new Error("Issue date and valid-until date are required.");
  }

  if (
    new Date(input.validUntil).getTime() < new Date(input.issueDate).getTime()
  ) {
    throw new Error("Valid-until date cannot be earlier than the issue date.");
  }

  if (input.items.length === 0) {
    throw new Error("Add at least one quotation item.");
  }

  input.items.forEach((item, index) => {
    if (!item.description.trim()) {
      throw new Error(`Item ${index + 1} requires a description.`);
    }

    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error(
        `Item ${index + 1} requires a quantity greater than zero.`
      );
    }

    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new Error(`Item ${index + 1} has an invalid unit price.`);
    }
  });
}

/* Builds normalized quotation and line-item payloads for the database RPCs. */
function buildQuotationPayload(input: CreateQuotationInput): {
  quotation: QuotationDatabasePayload;

  items: QuotationItemDatabasePayload[];
} {
  validateQuotationInput(input);

  const discountType = input.discountType ?? "fixed";

  const discountValue = Math.max(0, Number(input.discountValue ?? 0));

  const totals = calculateQuotationTotals({
    items: input.items,
    discountType,
    discountValue,
  });

  const items = input.items.map((item, index) => {
    const calculation = calculateQuotationItem(item);

    return {
      description: item.description.trim(),

      quantity: Number(item.quantity),

      unit_price: roundQuotationMoney(Number(item.unitPrice)),

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
    quotation: {
      customer_id: input.customerId ?? null,

      project_id: input.projectId ?? null,

      customer_name: input.customerName.trim(),

      customer_company: optionalText(input.customerCompany),

      customer_email: optionalText(input.customerEmail)?.toLowerCase() ?? null,

      customer_phone: optionalText(input.customerPhone),

      billing_address: optionalText(input.billingAddress),

      subject: input.subject.trim(),

      currency: input.currency.trim().toUpperCase(),

      issue_date: input.issueDate,

      valid_until: input.validUntil,

      status: input.status ?? "draft",

      discount_type: discountType,

      discount_value: discountValue,

      subtotal_amount: totals.subtotalAmount,

      discount_amount: totals.quotationDiscountAmount,

      tax_amount: totals.taxAmount,

      total_amount: totals.totalAmount,

      notes: optionalText(input.notes),

      terms: optionalText(input.terms),

      internal_notes: optionalText(input.internalNotes),
    },

    items,
  };
}

/* Marks expired quotations before dashboard data is returned. */
export async function synchronizeExpiredQuotations() {
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("quotations")
    .update({
      status: "expired",
    })
    .lt("valid_until", today)
    .in("status", ["draft", "sent"])
    .is("archived_at", null);

  if (error) {
    throw error;
  }
}

/* Retrieves one paginated and filtered quotation list. */
export async function listQuotations({
  page = 1,
  pageSize = 10,
  filters = {},
  sortBy = "created_at",
  sortDirection = "desc",
}: ListQuotationsOptions = {}): Promise<QuotationListResult> {
  await synchronizeExpiredQuotations();

  const safePage = Math.max(1, page);

  const safePageSize = Math.max(1, pageSize);

  const from = (safePage - 1) * safePageSize;

  const to = from + safePageSize - 1;

  let query = supabase.from("quotations").select("*", {
    count: "exact",
  });

  const search = filters.search?.trim();

  if (search) {
    const escapedSearch = search.replace(/[%_,]/g, "");

    query = query.or(
      `quotation_number.ilike.%${escapedSearch}%,customer_name.ilike.%${escapedSearch}%,customer_company.ilike.%${escapedSearch}%,customer_email.ilike.%${escapedSearch}%,subject.ilike.%${escapedSearch}%`
    );
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
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

  if (filters.validUntilFrom) {
    query = query.gte("valid_until", filters.validUntilFrom);
  }

  if (filters.validUntilTo) {
    query = query.lte("valid_until", filters.validUntilTo);
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
    quotations: (data ?? []) as Quotation[],

    total,

    page: safePage,

    pageSize: safePageSize,

    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

/* Retrieves one quotation together with all line items. */
export async function getQuotationById(
  quotationId: string
): Promise<Quotation> {
  const { data, error } = await supabase
    .from("quotations")
    .select(
      `
        *,
        items:quotation_items(*)
        `
    )
    .eq("id", quotationId)
    .order("sort_order", {
      referencedTable: "quotation_items",

      ascending: true,
    })
    .single();

  if (error) {
    throw error;
  }

  return data as Quotation;
}

/* Creates one quotation and all of its line items atomically. */
export async function createQuotation(
  input: CreateQuotationInput
): Promise<Quotation> {
  const payload = buildQuotationPayload(input);

  const { data: quotationId, error } = await supabase.rpc(
    "create_quotation_with_items",
    {
      p_quotation: payload.quotation,

      p_items: payload.items,
    }
  );

  if (error) {
    throw error;
  }

  return getQuotationById(quotationId as string);
}

/* Replaces one editable draft quotation and all of its line items. */
export async function updateDraftQuotation(
  quotationId: string,
  input: CreateQuotationInput
): Promise<Quotation> {
  const currentQuotation = await getQuotationById(quotationId);

  if (currentQuotation.status !== "draft") {
    throw new Error(
      "Only draft quotations can have their line items replaced."
    );
  }

  if (currentQuotation.archived_at) {
    throw new Error("Restore the quotation before editing it.");
  }

  const payload = buildQuotationPayload(input);

  const { error } = await supabase.rpc("replace_draft_quotation", {
    p_quotation_id: quotationId,

    p_quotation: payload.quotation,

    p_items: payload.items,
  });

  if (error) {
    throw error;
  }

  return getQuotationById(quotationId);
}

/* Updates non-item quotation metadata without replacing its line items. */
export async function updateQuotation(
  quotationId: string,
  updates: UpdateQuotationInput
): Promise<Quotation> {
  const currentQuotation = await getQuotationById(quotationId);

  if (currentQuotation.archived_at) {
    throw new Error("Restore the quotation before updating it.");
  }

  const databaseUpdates: Record<string, unknown> = {};

  if (updates.customerId !== undefined) {
    databaseUpdates.customer_id = updates.customerId;
  }

  if (updates.projectId !== undefined) {
    databaseUpdates.project_id = updates.projectId;
  }

  if (updates.customerName !== undefined) {
    databaseUpdates.customer_name = updates.customerName.trim();
  }

  if (updates.customerCompany !== undefined) {
    databaseUpdates.customer_company = optionalText(updates.customerCompany);
  }

  if (updates.customerEmail !== undefined) {
    databaseUpdates.customer_email =
      optionalText(updates.customerEmail)?.toLowerCase() ?? null;
  }

  if (updates.customerPhone !== undefined) {
    databaseUpdates.customer_phone = optionalText(updates.customerPhone);
  }

  if (updates.billingAddress !== undefined) {
    databaseUpdates.billing_address = optionalText(updates.billingAddress);
  }

  if (updates.subject !== undefined) {
    databaseUpdates.subject = updates.subject.trim();
  }

  if (updates.currency !== undefined) {
    databaseUpdates.currency = updates.currency.trim().toUpperCase();
  }

  if (updates.issueDate !== undefined) {
    databaseUpdates.issue_date = updates.issueDate;
  }

  if (updates.validUntil !== undefined) {
    databaseUpdates.valid_until = updates.validUntil;
  }

  if (updates.status !== undefined) {
    databaseUpdates.status = updates.status;
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

  const { data, error } = await supabase
    .from("quotations")
    .update(databaseUpdates)
    .eq("id", quotationId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Quotation;
}

/* Marks one quotation as sent. */
export async function markQuotationSent(
  quotationId: string
): Promise<Quotation> {
  const { data, error } = await supabase
    .from("quotations")
    .update({
      status: "sent",

      sent_at: new Date().toISOString(),
    })
    .eq("id", quotationId)
    .is("archived_at", null)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Quotation;
}

/* Marks one quotation as accepted. */
export async function acceptQuotation(quotationId: string): Promise<Quotation> {
  const { data, error } = await supabase
    .from("quotations")
    .update({
      status: "accepted",

      accepted_at: new Date().toISOString(),

      rejected_at: null,
    })
    .eq("id", quotationId)
    .is("archived_at", null)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Quotation;
}

/* Marks one quotation as rejected. */
export async function rejectQuotation(quotationId: string): Promise<Quotation> {
  const { data, error } = await supabase
    .from("quotations")
    .update({
      status: "rejected",

      rejected_at: new Date().toISOString(),
    })
    .eq("id", quotationId)
    .is("archived_at", null)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Quotation;
}

/* Archives one quotation while preserving its history. */
export async function archiveQuotation(
  quotationId: string
): Promise<Quotation> {
  const { data, error } = await supabase
    .from("quotations")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", quotationId)
    .is("archived_at", null)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Quotation;
}

/* Restores one archived quotation. */
export async function restoreQuotation(
  quotationId: string
): Promise<Quotation> {
  const { data, error } = await supabase
    .from("quotations")
    .update({
      archived_at: null,
    })
    .eq("id", quotationId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Quotation;
}

/* Permanently deletes one draft quotation. */
export async function deleteDraftQuotation(
  quotation: Quotation
): Promise<void> {
  if (quotation.status !== "draft") {
    throw new Error("Only draft quotations can be permanently deleted.");
  }

  const { error } = await supabase
    .from("quotations")
    .delete()
    .eq("id", quotation.id)
    .eq("status", "draft");

  if (error) {
    throw error;
  }
}

/* Calculates summary values used by the quotation dashboard. */
export async function getQuotationStatistics(
  currency = "NGN"
): Promise<QuotationStatistics> {
  await synchronizeExpiredQuotations();

  const normalizedCurrency = currency.trim().toUpperCase();

  const { data, error } = await supabase
    .from("quotations")
    .select(
      `
        status,
        total_amount
        `
    )
    .eq("currency", normalizedCurrency)
    .is("archived_at", null);

  if (error) {
    throw error;
  }

  const quotations = data ?? [];

  return quotations.reduce<QuotationStatistics>(
    (statistics, quotation) => {
      const amount = Number(quotation.total_amount ?? 0);

      statistics.totalQuotations += 1;

      statistics.totalQuotedValue += amount;

      if (quotation.status === "draft") {
        statistics.draftQuotations += 1;
      }

      if (quotation.status === "sent") {
        statistics.sentQuotations += 1;

        statistics.pendingValue += amount;
      }

      if (quotation.status === "accepted") {
        statistics.acceptedQuotations += 1;

        statistics.acceptedValue += amount;
      }

      if (quotation.status === "rejected") {
        statistics.rejectedQuotations += 1;
      }

      if (quotation.status === "expired") {
        statistics.expiredQuotations += 1;
      }

      return statistics;
    },
    {
      totalQuotations: 0,

      draftQuotations: 0,

      sentQuotations: 0,

      acceptedQuotations: 0,

      rejectedQuotations: 0,

      expiredQuotations: 0,

      totalQuotedValue: 0,

      acceptedValue: 0,

      pendingValue: 0,

      currency: normalizedCurrency,
    }
  );
}

/* Converts one accepted quotation into a new draft invoice. */
export async function convertQuotationToInvoice(
  quotationId: string
): Promise<Invoice> {
  const quotation = await getQuotationById(quotationId);

  if (quotation.status !== "accepted") {
    throw new Error("Only accepted quotations can be converted to invoices.");
  }

  if (quotation.converted_invoice_id) {
    throw new Error("This quotation has already been converted to an invoice.");
  }

  if (!quotation.items || quotation.items.length === 0) {
    throw new Error("This quotation does not contain any line items.");
  }

  const invoice = await createInvoice({
    customerId: quotation.customer_id,

    project_id: quotation.project_id,

    customerName: quotation.customer_name,

    customerCompany: quotation.customer_company,

    customerEmail: quotation.customer_email ?? "",

    customerPhone: quotation.customer_phone,

    billingAddress: quotation.billing_address,

    currency: quotation.currency,

    issueDate: new Date().toISOString().slice(0, 10),

    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),

    status: "draft",

    discountType: quotation.discount_type,

    discountValue: Number(quotation.discount_value),

    notes: quotation.notes,

    terms: quotation.terms,

    internalNotes: quotation.internal_notes,

    purchaseOrderNumber: null,

    items: quotation.items.map((item, index) => ({
      description: item.description,

      quantity: Number(item.quantity),

      unitPrice: Number(item.unit_price),

      discountType: item.discount_type,

      discountValue: Number(item.discount_value),

      taxRate: Number(item.tax_rate),

      sortOrder: index,
    })),
  });

  const { error } = await supabase
    .from("quotations")
    .update({
      converted_invoice_id: invoice.id,

      updated_at: new Date().toISOString(),
    })
    .eq("id", quotation.id);

  if (error) {
    throw error;
  }

  return invoice;
}
