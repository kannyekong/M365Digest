/**
 * Lifecycle state of one invoice.
 */
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled"
  | "refunded";

/**
 * Delivery state of one invoice.
 */
export type InvoiceDeliveryStatus =
  | "not_sent"
  | "queued"
  | "sent"
  | "delivered"
  | "failed";

/**
 * Supported invoice discount modes.
 */
export type InvoiceDiscountType = "fixed" | "percentage";

/**
 * Fields supported by invoice sorting.
 */
export type InvoiceSortField =
  | "invoice_number"
  | "customer_name"
  | "issue_date"
  | "due_date"
  | "total_amount"
  | "amount_due"
  | "status"
  | "created_at";

/**
 * One persisted invoice line item.
 */
export interface InvoiceItem {
  id: string;

  invoice_id: string;

  description: string;

  quantity: number;

  unit_price: number;

  discount_type: InvoiceDiscountType;

  discount_value: number;

  discount_amount: number;

  tax_rate: number;

  tax_amount: number;

  line_subtotal: number;

  line_total: number;

  sort_order: number;

  created_at: string;

  updated_at: string;
}

/**
 * One persisted customer invoice.
 */
export interface Invoice {
  id: string;

  invoice_number: string;

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

  delivery_status: InvoiceDeliveryStatus;

  subtotal_amount: number;

  discount_type: InvoiceDiscountType;

  discount_value: number;

  discount_amount: number;

  tax_amount: number;

  total_amount: number;

  amount_paid: number;

  amount_due: number;

  notes: string | null;

  terms: string | null;

  internal_notes: string | null;

  purchase_order_number: string | null;

  payment_reference: string | null;

  revenue_transaction_id: string | null;

  sent_at: string | null;

  viewed_at: string | null;

  paid_at: string | null;

  cancelled_at: string | null;

  archived_at: string | null;

  created_by: string | null;

  created_at: string;

  updated_at: string;

  items?: InvoiceItem[];
}

/**
 * Invoice filters accepted by the invoice service.
 */
export interface InvoiceFilters {
  search?: string;

  status?: InvoiceStatus | "all";

  deliveryStatus?: InvoiceDeliveryStatus | "all";

  currency?: string;

  issueDateFrom?: string;

  issueDateTo?: string;

  dueDateFrom?: string;

  dueDateTo?: string;

  includeArchived?: boolean;
}

/**
 * Values required to create one invoice line item.
 */
export interface CreateInvoiceItemInput {
  description: string;

  quantity: number;

  unitPrice: number;

  discountType?: InvoiceDiscountType;

  discountValue?: number;

  taxRate?: number;

  sortOrder?: number;
}

/**
 * Values required to create one invoice.
 */
export interface CreateInvoiceInput {
  customerId?: string | null;

  customerName: string;

  customerCompany?: string | null;

  customerEmail: string;

  customerPhone?: string | null;

  billingAddress?: string | null;

  currency: string;

  issueDate: string;

  dueDate: string;

  status?: InvoiceStatus;

  discountType?: InvoiceDiscountType;

  discountValue?: number;

  notes?: string | null;

  terms?: string | null;

  internalNotes?: string | null;

  purchaseOrderNumber?: string | null;

  items: CreateInvoiceItemInput[];
}

/**
 * Values that can be changed on one existing invoice.
 */
export interface UpdateInvoiceInput extends Partial<CreateInvoiceInput> {
  deliveryStatus?: InvoiceDeliveryStatus;

  amountPaid?: number;

  paymentReference?: string | null;

  revenueTransactionId?: string | null;
}

/**
 * Paginated invoice list response.
 */
export interface InvoiceListResult {
  invoices: Invoice[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
}

/**
 * Invoice summary values shown on the dashboard.
 */
export interface InvoiceStatistics {
  totalInvoices: number;

  totalInvoiceValue: number;

  outstandingValue: number;

  overdueValue: number;

  paidValue: number;

  draftInvoices: number;

  sentInvoices: number;

  overdueInvoices: number;

  paidInvoices: number;

  currency: string;
}

/**
 * Calculated amounts for one invoice item.
 */
export interface InvoiceItemCalculation {
  lineSubtotal: number;

  discountAmount: number;

  taxableAmount: number;

  taxAmount: number;

  lineTotal: number;
}

/**
 * Calculated totals for a complete invoice.
 */
export interface InvoiceCalculation {
  subtotalAmount: number;

  lineDiscountAmount: number;

  invoiceDiscountAmount: number;

  taxAmount: number;

  totalAmount: number;

  amountPaid: number;

  amountDue: number;
}
