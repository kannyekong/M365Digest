export type QuotationStatus =
  "draft" | "sent" | "accepted" | "rejected" | "expired" | "cancelled";

export type QuotationDiscountType = "fixed" | "percentage";

export interface QuotationItem {
  id: string;

  quotation_id: string;

  description: string;

  quantity: number;

  unit_price: number;

  discount_type: QuotationDiscountType;

  discount_value: number;

  discount_amount: number;

  tax_rate: number;

  tax_amount: number;

  line_subtotal: number;

  line_total: number;

  sort_order: number;

  created_at: string;
}

export interface Quotation {
  id: string;

  quotation_number: string;

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

  status: QuotationStatus;

  subtotal_amount: number;

  discount_type: QuotationDiscountType;

  discount_value: number;

  discount_amount: number;

  tax_amount: number;

  total_amount: number;

  notes: string | null;

  terms: string | null;

  internal_notes: string | null;

  accepted_at: string | null;

  rejected_at: string | null;

  sent_at: string | null;

  cancelled_at: string | null;

  converted_invoice_id: string | null;

  created_by: string | null;

  created_at: string;

  updated_at: string;

  archived_at: string | null;

  items?: QuotationItem[];
}

export interface CreateQuotationItemInput {
  description: string;

  quantity: number;

  unitPrice: number;

  discountType?: QuotationDiscountType;

  discountValue?: number;

  taxRate?: number;

  sortOrder?: number;
}

export interface CreateQuotationInput {
  customerId?: string | null;

  projectId?: string | null;

  customerName: string;

  customerCompany?: string | null;

  customerEmail?: string | null;

  customerPhone?: string | null;

  billingAddress?: string | null;

  subject: string;

  currency: string;

  issueDate: string;

  validUntil: string;

  status?: QuotationStatus;

  discountType?: QuotationDiscountType;

  discountValue?: number;

  notes?: string | null;

  terms?: string | null;

  internalNotes?: string | null;

  items: CreateQuotationItemInput[];
}

export interface UpdateQuotationInput {
  customerId?: string | null;

  projectId?: string | null;

  customerName?: string;

  customerCompany?: string | null;

  customerEmail?: string | null;

  customerPhone?: string | null;

  billingAddress?: string | null;

  subject?: string;

  currency?: string;

  issueDate?: string;

  validUntil?: string;

  status?: QuotationStatus;

  notes?: string | null;

  terms?: string | null;

  internalNotes?: string | null;
}

export interface QuotationFilters {
  search?: string;

  status?: QuotationStatus | "all";

  currency?: string;

  issueDateFrom?: string;

  issueDateTo?: string;

  validUntilFrom?: string;

  validUntilTo?: string;

  includeArchived?: boolean;
}

export type QuotationSortField =
  | "created_at"
  | "quotation_number"
  | "customer_name"
  | "issue_date"
  | "valid_until"
  | "status"
  | "total_amount";

export interface QuotationListResult {
  quotations: Quotation[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
}

export interface QuotationStatistics {
  totalQuotations: number;

  draftQuotations: number;

  sentQuotations: number;

  acceptedQuotations: number;

  rejectedQuotations: number;

  expiredQuotations: number;

  totalQuotedValue: number;

  acceptedValue: number;

  pendingValue: number;

  currency: string;
}
