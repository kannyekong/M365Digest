export type RefundStatus =
  | "requested"
  | "approved"
  | "processing"
  | "successful"
  | "failed"
  | "rejected"
  | "cancelled";

export type RefundProvider =
  "manual" | "paystack" | "bank_transfer" | "cash" | "other";

export interface FinanceRefund {
  id: string;

  refund_reference: string;

  original_transaction_id: string;

  invoice_id: string | null;

  receipt_id: string | null;

  provider: RefundProvider;

  provider_refund_reference: string | null;

  payment_method: string | null;

  requested_amount: number;

  approved_amount: number | null;

  refunded_amount: number;

  currency: string;

  reason: string;

  internal_notes: string | null;

  status: RefundStatus;

  requested_at: string;

  approved_at: string | null;

  processed_at: string | null;

  failed_at: string | null;

  rejected_at: string | null;

  cancelled_at: string | null;

  requested_by: string | null;

  approved_by: string | null;

  processed_by: string | null;

  rejected_by: string | null;

  provider_payload: Record<string, unknown>;

  metadata: Record<string, unknown>;

  created_at: string;

  updated_at: string;

  archived_at: string | null;
}

export interface RefundableTransaction {
  transaction_id: string;

  internal_reference: string;

  provider_reference: string | null;

  invoice_number: string | null;

  receipt_number: string | null;

  customer_name: string | null;

  customer_email: string | null;

  description: string;

  provider: string;

  payment_method: string | null;

  amount: number;

  refunded_amount: number;

  refundable_amount: number;

  currency: string;

  status: string;

  transaction_date: string;

  paid_at: string | null;

  source_table: string | null;

  source_id: string | null;
}

export interface CreateRefundInput {
  original_transaction_id: string;

  requested_amount: number;

  reason: string;

  provider?: RefundProvider;

  payment_method?: string | null;

  invoice_id?: string | null;

  receipt_id?: string | null;

  internal_notes?: string | null;

  metadata?: Record<string, unknown>;
}

export interface ApproveRefundInput {
  approved_amount?: number;

  internal_notes?: string | null;
}

export interface RejectRefundInput {
  reason: string;

  internal_notes?: string | null;
}

export interface ProcessRefundInput {
  refunded_amount?: number;

  provider_refund_reference?: string | null;

  payment_method?: string | null;

  provider_payload?: Record<string, unknown>;

  internal_notes?: string | null;
}

export interface CancelRefundInput {
  reason?: string | null;

  internal_notes?: string | null;
}

export interface RefundFilters {
  search?: string;

  status?: RefundStatus | "all";

  provider?: RefundProvider | "all";

  currency?: string;

  dateFrom?: string;

  dateTo?: string;

  archived?: boolean;
}

export interface ListRefundsOptions {
  page?: number;

  pageSize?: number;

  filters?: RefundFilters;

  sortBy?: keyof FinanceRefund;

  sortDirection?: "asc" | "desc";
}

export interface FinanceRefundListItem extends FinanceRefund {
  transaction_reference: string | null;

  customer_name: string | null;

  customer_email: string | null;

  transaction_description: string | null;

  original_amount: number;

  previous_refunded_amount: number;

  available_refund_amount: number;
}

export interface RefundListResponse {
  refunds: FinanceRefundListItem[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
}

export interface RefundStatistics {
  totalRequested: number;

  totalApproved: number;

  totalRefunded: number;

  requestedCount: number;

  approvedCount: number;

  processingCount: number;

  successfulCount: number;

  failedCount: number;

  rejectedCount: number;

  cancelledCount: number;

  currency: string;
}
