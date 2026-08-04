export type ReceiptStatus = "issued" | "voided" | "refunded";

export interface Receipt {
  id: string;
  receipt_number: string;
  invoice_id: string;
  invoice_payment_attempt_id: string;
  revenue_transaction_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  amount: number;
  currency: string;
  payment_reference: string;
  payment_method: string | null;
  payment_provider: string;
  provider_transaction_id: number | null;
  gateway_response: string | null;
  status: ReceiptStatus;
  paid_at: string;
  issued_at: string;
  voided_at: string | null;
  refunded_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ReceiptFilters {
  search?: string;
  status?: ReceiptStatus | "all";
  provider?: string | "all";
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ListReceiptsOptions {
  page?: number;
  pageSize?: number;
  filters?: ReceiptFilters;
  sortBy?: keyof Receipt;
  sortDirection?: "asc" | "desc";
}

export interface ReceiptListResponse {
  receipts: Receipt[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReceiptStatistics {
  totalAmount: number;
  currentMonthAmount: number;
  issuedReceipts: number;
  refundedReceipts: number;
  voidedReceipts: number;
  currency: string;
}
