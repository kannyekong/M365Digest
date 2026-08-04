export interface FinanceOverviewMonthlyPoint {
  month: string;
  monthLabel: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface FinanceOverviewBreakdownItem {
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface FinanceOverviewData {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  profitMargin: number;
  outstandingInvoices: number;

  currentMonthRevenue: number;
  previousMonthRevenue: number;
  currentMonthExpenses: number;
  previousMonthExpenses: number;

  revenueGrowth: number;
  expenseGrowth: number;

  paidInvoices: number;
  pendingInvoices: number;
  issuedReceipts: number;

  currency: string;

  monthlyPerformance: FinanceOverviewMonthlyPoint[];

  revenueByCategory: FinanceOverviewBreakdownItem[];
  expenseByCategory: FinanceOverviewBreakdownItem[];
  revenueByProvider: FinanceOverviewBreakdownItem[];
}
