/**
 * Supported company revenue categories.
 */
export type RevenueCategory =
  | "academy"
  | "contract"
  | "consulting"
  | "cloud_services"
  | "software"
  | "licensing"
  | "operations"
  | "marketing"
  | "salary"
  | "tax"
  | "equipment"
  | "reimbursement"
  | "other";

/**
 * Supported revenue payment providers.
 */
export type RevenueProvider =
  | "paystack"
  | "providus"
  | "bank_transfer"
  | "cash"
  | "manual"
  | "stripe"
  | "flutterwave"
  | "other";

/**
 * Supported financial transaction statuses.
 */
export type RevenueStatus =
  | "draft"
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

/**
 * Supported reconciliation states.
 */
export type RevenueReconciliationStatus =
  "unreconciled" | "partially_reconciled" | "reconciled" | "disputed";

/**
 * Company revenue record stored in the financial ledger.
 */
export interface RevenueTransaction {
  id: string;

  transaction_type: "income" | "expense" | "refund" | "adjustment";

  transaction_category: RevenueCategory;

  provider: RevenueProvider;

  payment_method: string | null;

  source_table: string | null;

  source_id: string | null;

  customer_name: string | null;

  customer_email: string | null;

  customer_phone: string | null;

  description: string;

  internal_notes: string | null;

  internal_reference: string;

  provider_reference: string | null;

  invoice_number: string | null;

  receipt_number: string | null;

  bank_account: string | null;

  amount: number;

  fee_amount: number;

  tax_amount: number;

  refunded_amount: number;

  currency: string;

  base_currency: string;

  exchange_rate: number;

  base_amount: number | null;

  status: RevenueStatus;

  reconciliation_status: RevenueReconciliationStatus;

  transaction_date: string;

  paid_at: string | null;

  reconciled_at: string | null;

  provider_payload: Record<string, unknown>;

  metadata: Record<string, unknown>;

  created_by: string | null;

  updated_by: string | null;

  created_at: string;

  updated_at: string;

  archived_at: string | null;
}

/**
 * Values accepted when creating a revenue transaction.
 */
export interface CreateRevenueTransactionInput {
  transaction_category: RevenueCategory;

  provider: RevenueProvider;

  payment_method?: string | null;

  source_table?: string | null;

  source_id?: string | null;

  customer_name?: string | null;

  customer_email?: string | null;

  customer_phone?: string | null;

  description: string;

  internal_notes?: string | null;

  internal_reference: string;

  provider_reference?: string | null;

  invoice_number?: string | null;

  receipt_number?: string | null;

  bank_account?: string | null;

  amount: number;

  fee_amount?: number;

  tax_amount?: number;

  refunded_amount?: number;

  currency?: string;

  base_currency?: string;

  exchange_rate?: number;

  status?: RevenueStatus;

  reconciliation_status?: RevenueReconciliationStatus;

  transaction_date?: string;

  paid_at?: string | null;

  reconciled_at?: string | null;

  provider_payload?: Record<string, unknown>;

  metadata?: Record<string, unknown>;

  created_by?: string | null;
}

/**
 * Values accepted when updating revenue.
 */
export interface UpdateRevenueTransactionInput {
  transaction_category?: RevenueCategory;

  provider?: RevenueProvider;

  payment_method?: string | null;

  source_table?: string | null;

  source_id?: string | null;

  customer_name?: string | null;

  customer_email?: string | null;

  customer_phone?: string | null;

  description?: string;

  internal_notes?: string | null;

  internal_reference?: string;

  provider_reference?: string | null;

  invoice_number?: string | null;

  receipt_number?: string | null;

  bank_account?: string | null;

  amount?: number;

  fee_amount?: number;

  tax_amount?: number;

  refunded_amount?: number;

  currency?: string;

  base_currency?: string;

  exchange_rate?: number;

  status?: RevenueStatus;

  reconciliation_status?: RevenueReconciliationStatus;

  transaction_date?: string;

  paid_at?: string | null;

  reconciled_at?: string | null;

  provider_payload?: Record<string, unknown>;

  metadata?: Record<string, unknown>;

  updated_by?: string | null;

  archived_at?: string | null;
}

/**
 * Filters supported by the Revenue dashboard.
 */
export interface RevenueFilters {
  search?: string;

  category?: RevenueCategory | "all";

  provider?: RevenueProvider | "all";

  status?: RevenueStatus | "all";

  reconciliationStatus?: RevenueReconciliationStatus | "all";

  currency?: string;

  dateFrom?: string;

  dateTo?: string;

  includeArchived?: boolean;
}

/**
 * Fields supported by Revenue table sorting.
 */
export type RevenueSortField =
  | "created_at"
  | "transaction_date"
  | "paid_at"
  | "amount"
  | "customer_name"
  | "transaction_category"
  | "provider"
  | "status"
  | "reconciliation_status";

/**
 * Options accepted by the Revenue list query.
 */
export interface ListRevenueOptions {
  page?: number;

  pageSize?: number;

  filters?: RevenueFilters;

  sortBy?: RevenueSortField;

  sortDirection?: "asc" | "desc";
}

/**
 * Paginated Revenue query result.
 */
export interface RevenueListResponse {
  transactions: RevenueTransaction[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
}

/**
 * Statistics displayed on the Revenue dashboard.
 */
export interface RevenueStatistics {
  currentMonthRevenue: number;

  previousMonthRevenue: number;

  totalRevenue: number;

  pendingRevenue: number;

  refundedRevenue: number;

  netRevenue: number;

  paidTransactions: number;

  pendingTransactions: number;

  growthPercentage: number;

  currency: string;

  paystackRevenue: number;

  providusRevenue: number;

  manualRevenue: number;

  otherProviderRevenue: number;
}
