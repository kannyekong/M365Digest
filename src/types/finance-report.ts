export interface FinanceReportFilters {
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
}

export interface FinanceReportTransaction {
  id: string;
  transaction_type: "income" | "expense";
  transaction_category: string;
  provider: string;
  amount: number;
  base_amount: number | null;
  currency: string;
  status: string;
  transaction_date: string;
  paid_at: string | null;
  description: string;
  customer_name: string | null;
  provider_reference: string | null;
  archived_at: string | null;
}

export interface FinanceReportBreakdownItem {
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface FinanceMonthlyPerformance {
  month: string;
  monthLabel: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface FinanceReportSummary {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  profitMargin: number;
  paidRevenueTransactions: number;
  paidExpenseTransactions: number;
  currency: string;
  revenueByCategory: FinanceReportBreakdownItem[];
  expensesByCategory: FinanceReportBreakdownItem[];
  revenueByProvider: FinanceReportBreakdownItem[];
  monthlyPerformance: FinanceMonthlyPerformance[];
  transactions: FinanceReportTransaction[];
}
