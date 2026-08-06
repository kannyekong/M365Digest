export type ReconciliationStatus = "unreconciled" | "reconciled" | "disputed";

export type ReconciliationAction = "reconcile" | "dispute" | "undo" | "update";

export interface ReconciliationTransaction {
  id: string;

  transaction_type: string;

  transaction_category: string;

  description: string;

  customer_name: string | null;

  customer_email: string | null;

  customer_phone: string | null;

  internal_reference: string;

  provider_reference: string | null;

  reconciliation_reference: string | null;

  invoice_number: string | null;

  receipt_number: string | null;

  provider: string;

  payment_method: string | null;

  bank_account: string | null;

  amount: number;

  fee_amount: number;

  tax_amount: number;

  refunded_amount: number;

  external_amount: number | null;

  amount_difference: number | null;

  currency: string;

  base_currency: string;

  exchange_rate: number;

  base_amount: number;

  status: string;

  reconciliation_status: ReconciliationStatus;

  transaction_date: string;

  paid_at: string | null;

  settlement_date: string | null;

  reconciled_at: string | null;

  reconciled_by: string | null;

  reconciliation_notes: string | null;

  dispute_reason: string | null;

  source_table: string | null;

  source_id: string | null;

  created_at: string;

  updated_at: string;
}

export interface ReconciliationHistoryItem {
  id: string;

  transaction_id: string;

  previous_status: ReconciliationStatus | null;

  new_status: ReconciliationStatus;

  internal_amount: number;

  external_amount: number | null;

  amount_difference: number | null;

  internal_reference: string | null;

  external_reference: string | null;

  provider: string | null;

  settlement_date: string | null;

  dispute_reason: string | null;

  notes: string | null;

  evidence_url: string | null;

  action: ReconciliationAction;

  performed_by: string | null;

  performed_at: string;

  metadata: Record<string, unknown>;
}

export interface ReconcileTransactionInput {
  external_reference: string;

  external_amount: number;

  settlement_date: string;

  notes?: string | null;

  evidence_url?: string | null;

  metadata?: Record<string, unknown>;
}

export interface DisputeTransactionInput {
  dispute_reason: string;

  external_reference?: string | null;

  external_amount?: number | null;

  settlement_date?: string | null;

  notes?: string | null;

  evidence_url?: string | null;

  metadata?: Record<string, unknown>;
}

export interface UndoReconciliationInput {
  notes?: string | null;

  metadata?: Record<string, unknown>;
}

export interface ReconciliationFilters {
  search?: string;

  reconciliationStatus?: ReconciliationStatus | "all";

  transactionType?: string | "all";

  transactionStatus?: string | "all";

  provider?: string | "all";

  currency?: string;

  dateFrom?: string;

  dateTo?: string;
}

export interface ListReconciliationOptions {
  page?: number;

  pageSize?: number;

  filters?: ReconciliationFilters;

  sortBy?: keyof ReconciliationTransaction;

  sortDirection?: "asc" | "desc";
}

export interface ReconciliationListResponse {
  transactions: ReconciliationTransaction[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
}

export interface ReconciliationStatistics {
  totalTransactions: number;

  unreconciledCount: number;

  reconciledCount: number;

  disputedCount: number;

  unreconciledAmount: number;

  reconciledAmount: number;

  disputedAmount: number;

  totalDifference: number;

  reconciliationRate: number;

  currency: string;
}

export interface ReconciliationDetails extends ReconciliationTransaction {
  history: ReconciliationHistoryItem[];
}
