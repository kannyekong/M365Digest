export type ExpenseStatus =
  "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded";

export type ExpenseReconciliationStatus =
  "unreconciled" | "reconciled" | "disputed";

export type ExpenseCategory =
  | "operations"
  | "marketing"
  | "salary"
  | "tax"
  | "equipment"
  | "reimbursement"
  | "other";

export type ExpenseProvider =
  "manual" | "bank_transfer" | "cash" | "paystack" | "other";

export interface ExpenseTransaction {
  id: string;

  transaction_type: "expense";

  transaction_category: ExpenseCategory;

  provider: string;

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

  status: ExpenseStatus;

  reconciliation_status: ExpenseReconciliationStatus;

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

export interface CreateExpenseInput {
  transaction_category: ExpenseCategory;

  provider: string;

  payment_method?: string | null;

  description: string;

  internal_notes?: string | null;

  provider_reference?: string | null;

  receipt_number?: string | null;

  bank_account?: string | null;

  amount: number;

  fee_amount?: number;

  tax_amount?: number;

  currency?: string;

  status?: ExpenseStatus;

  reconciliation_status?: ExpenseReconciliationStatus;

  transaction_date: string;

  paid_at?: string | null;

  metadata?: Record<string, unknown>;
}

export interface UpdateExpenseInput {
  transaction_category?: ExpenseCategory;

  provider?: string;

  payment_method?: string | null;

  description?: string;

  internal_notes?: string | null;

  provider_reference?: string | null;

  receipt_number?: string | null;

  bank_account?: string | null;

  amount?: number;

  fee_amount?: number;

  tax_amount?: number;

  currency?: string;

  status?: ExpenseStatus;

  reconciliation_status?: ExpenseReconciliationStatus;

  transaction_date?: string;

  paid_at?: string | null;

  metadata?: Record<string, unknown>;
}

export interface ExpenseFilters {
  search?: string;

  category?: ExpenseCategory | "all";

  provider?: string | "all";

  status?: ExpenseStatus | "all";

  reconciliationStatus?: ExpenseReconciliationStatus | "all";

  currency?: string;

  dateFrom?: string;

  dateTo?: string;

  archived?: boolean;
}

export interface ListExpensesOptions {
  page?: number;

  pageSize?: number;

  filters?: ExpenseFilters;

  sortBy?: keyof ExpenseTransaction;

  sortDirection?: "asc" | "desc";
}

export interface ExpenseListResponse {
  expenses: ExpenseTransaction[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
}

export interface ExpenseStatistics {
  totalExpenses: number;

  currentMonthExpenses: number;

  previousMonthExpenses: number;

  percentageChange: number;

  pendingExpenses: number;

  paidExpenses: number;

  unreconciledExpenses: number;

  refundedExpenses: number;

  currency: string;
}
