export type BudgetType = "monthly" | "quarterly" | "annual" | "custom";

export type BudgetStatus = "draft" | "active" | "completed" | "cancelled";

export type BudgetHealthStatus = "healthy" | "warning" | "exceeded";

export type BudgetExpenseCategory =
  | "operations"
  | "marketing"
  | "salary"
  | "tax"
  | "equipment"
  | "reimbursement"
  | "other";

export interface FinanceBudget {
  id: string;

  name: string;

  description: string | null;

  budget_type: BudgetType;

  department: string | null;

  project_code: string | null;

  currency: string;

  total_amount: number;

  start_date: string;

  end_date: string;

  status: BudgetStatus;

  warning_threshold: number;

  created_by: string | null;

  updated_by: string | null;

  created_at: string;

  updated_at: string;

  archived_at: string | null;
}

export interface FinanceBudgetAllocation {
  id: string;

  budget_id: string;

  transaction_category: BudgetExpenseCategory;

  allocated_amount: number;

  notes: string | null;

  created_at: string;

  updated_at: string;
}

export interface BudgetAllocationSummary {
  allocation_id: string;

  budget_id: string;

  budget_name: string;

  currency: string;

  start_date: string;

  end_date: string;

  budget_status: BudgetStatus;

  warning_threshold: number;

  transaction_category: BudgetExpenseCategory;

  allocated_amount: number;

  used_amount: number;

  remaining_amount: number;

  usage_percentage: number;

  health_status: BudgetHealthStatus;
}

export interface BudgetAllocationInput {
  transaction_category: BudgetExpenseCategory;

  allocated_amount: number;

  notes?: string | null;
}

export interface CreateBudgetInput {
  name: string;

  description?: string | null;

  budget_type: BudgetType;

  department?: string | null;

  project_code?: string | null;

  currency?: string;

  total_amount: number;

  start_date: string;

  end_date: string;

  status?: BudgetStatus;

  warning_threshold?: number;

  allocations: BudgetAllocationInput[];
}

export interface UpdateBudgetInput {
  name?: string;

  description?: string | null;

  budget_type?: BudgetType;

  department?: string | null;

  project_code?: string | null;

  currency?: string;

  total_amount?: number;

  start_date?: string;

  end_date?: string;

  status?: BudgetStatus;

  warning_threshold?: number;

  allocations?: BudgetAllocationInput[];
}

export interface BudgetFilters {
  search?: string;

  budgetType?: BudgetType | "all";

  status?: BudgetStatus | "all";

  currency?: string;

  department?: string;

  dateFrom?: string;

  dateTo?: string;

  archived?: boolean;
}

export interface ListBudgetsOptions {
  page?: number;

  pageSize?: number;

  filters?: BudgetFilters;

  sortBy?: keyof FinanceBudget;

  sortDirection?: "asc" | "desc";
}

export interface BudgetListItem extends FinanceBudget {
  allocated_amount: number;

  used_amount: number;

  remaining_amount: number;

  usage_percentage: number;

  health_status: BudgetHealthStatus;

  allocations_count: number;
}

export interface BudgetListResponse {
  budgets: BudgetListItem[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
}

export interface BudgetDetails extends FinanceBudget {
  allocations: BudgetAllocationSummary[];

  allocated_amount: number;

  used_amount: number;

  remaining_amount: number;

  usage_percentage: number;

  health_status: BudgetHealthStatus;
}

export interface BudgetStatistics {
  totalBudgeted: number;

  totalAllocated: number;

  totalUsed: number;

  totalRemaining: number;

  activeBudgets: number;

  draftBudgets: number;

  warningBudgets: number;

  exceededBudgets: number;

  averageUsagePercentage: number;

  currency: string;
}
