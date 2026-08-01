import type {
  RevenueCategory,
  RevenueProvider,
  RevenueReconciliationStatus,
  RevenueStatus,
} from "../types/revenue";
import type {
  RevenueFilterState,
  RevenueFormState,
} from "../types/revenuetable";

export const PAGE_SIZE = 10;

export const DEFAULT_FILTERS: RevenueFilterState = {
  search: "",

  category: "all",

  provider: "all",

  status: "all",

  reconciliationStatus: "all",

  currency: "",

  dateFrom: "",

  dateTo: "",

  includeArchived: false,
};

export const DEFAULT_REVENUE_FORM: RevenueFormState = {
  transactionCategory: "other",

  provider: "manual",

  paymentMethod: "",

  sourceTable: "",

  sourceId: "",

  customerName: "",

  customerEmail: "",

  customerPhone: "",

  description: "",

  internalNotes: "",

  internalReference: "",

  providerReference: "",

  invoiceNumber: "",

  receiptNumber: "",

  bankAccount: "",

  amount: "",

  feeAmount: "0",

  taxAmount: "0",

  refundedAmount: "0",

  currency: "NGN",

  baseCurrency: "NGN",

  exchangeRate: "1",

  status: "pending",

  reconciliationStatus: "unreconciled",

  transactionDate: new Date().toISOString().slice(0, 10),

  paidAt: "",

  reconciledAt: "",
};

export const REVENUE_CATEGORIES: Array<{
  value: RevenueCategory;

  label: string;
}> = [
  {
    value: "academy",
    label: "Academy",
  },
  {
    value: "contract",
    label: "Contract",
  },
  {
    value: "consulting",
    label: "Consulting",
  },
  {
    value: "cloud_services",
    label: "Cloud Services",
  },
  {
    value: "software",
    label: "Software",
  },
  {
    value: "licensing",
    label: "Licensing",
  },
  {
    value: "operations",
    label: "Operations",
  },
  {
    value: "marketing",
    label: "Marketing",
  },
  {
    value: "salary",
    label: "Salary",
  },
  {
    value: "tax",
    label: "Tax",
  },
  {
    value: "equipment",
    label: "Equipment",
  },
  {
    value: "reimbursement",
    label: "Reimbursement",
  },
  {
    value: "other",
    label: "Other",
  },
];

export const REVENUE_PROVIDERS: Array<{
  value: RevenueProvider;

  label: string;
}> = [
  {
    value: "paystack",
    label: "Paystack",
  },
  {
    value: "providus",
    label: "Providus Bank",
  },
  {
    value: "bank_transfer",
    label: "Bank Transfer",
  },
  {
    value: "cash",
    label: "Cash",
  },
  {
    value: "manual",
    label: "Manual Entry",
  },
  {
    value: "stripe",
    label: "Stripe",
  },
  {
    value: "flutterwave",
    label: "Flutterwave",
  },
  {
    value: "other",
    label: "Other",
  },
];

export const REVENUE_STATUSES: Array<{
  value: RevenueStatus;

  label: string;
}> = [
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "processing",
    label: "Processing",
  },
  {
    value: "paid",
    label: "Paid",
  },
  {
    value: "failed",
    label: "Failed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
  {
    value: "refunded",
    label: "Refunded",
  },
  {
    value: "partially_refunded",
    label: "Partially Refunded",
  },
];

export const RECONCILIATION_STATUSES: Array<{
  value: RevenueReconciliationStatus;

  label: string;
}> = [
  {
    value: "unreconciled",
    label: "Unreconciled",
  },
  {
    value: "partially_reconciled",
    label: "Partially Reconciled",
  },
  {
    value: "reconciled",
    label: "Reconciled",
  },
  {
    value: "disputed",
    label: "Disputed",
  },
];
