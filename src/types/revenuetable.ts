import type { ComponentType } from "react";
import type {
  RevenueCategory,
  RevenueProvider,
  RevenueReconciliationStatus,
  RevenueStatus,
} from "../types/revenue";

/**
 * Local filter values used by the Revenue interface.
 */
export interface RevenueFilterState {
  search: string;

  category: RevenueCategory | "all";

  provider: RevenueProvider | "all";

  status: RevenueStatus | "all";

  reconciliationStatus: RevenueReconciliationStatus | "all";

  currency: string;

  dateFrom: string;

  dateTo: string;

  includeArchived: boolean;
}

/**
 * Local form values used when creating or editing Revenue.
 */
export interface RevenueFormState {
  transactionCategory: RevenueCategory;

  provider: RevenueProvider;

  paymentMethod: string;

  sourceTable: string;

  sourceId: string;

  customerName: string;

  customerEmail: string;

  customerPhone: string;

  description: string;

  internalNotes: string;

  internalReference: string;

  providerReference: string;

  invoiceNumber: string;

  receiptNumber: string;

  bankAccount: string;

  amount: string;

  feeAmount: string;

  taxAmount: string;

  refundedAmount: string;

  currency: string;

  baseCurrency: string;

  exchangeRate: string;

  status: RevenueStatus;

  reconciliationStatus: RevenueReconciliationStatus;

  transactionDate: string;

  paidAt: string;

  reconciledAt: string;
}

/**
 * One Revenue dashboard metric.
 */
export interface RevenueMetric {
  label: string;

  value: string;

  description: string;

  icon: ComponentType<{
    size?: number;

    className?: string;
  }>;

  iconClasses: string;
}

/**
 * Response returned by the company finance summary endpoint.
 */
export interface CompanyFinancialSummaryResponse {
  success: boolean;

  message?: string;

  summary?: {
    currentMonthRevenue: number;

    previousMonthRevenue: number;

    totalRevenue: number;

    currentMonthExpenses: number;

    currentMonthRefunds: number;

    currentMonthNetIncome: number;

    pendingIncome: number;

    paidIncomeTransactions: number;

    growthPercentage: number;

    currency: string;
  };
}

export type SortDirection = "asc" | "desc";
