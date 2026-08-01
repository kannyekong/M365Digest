import type {
  RevenueCategory,
  RevenueProvider,
  RevenueReconciliationStatus,
  RevenueStatus,
  RevenueTransaction,
} from "../types/revenue";
import type { RevenueFormState } from "../types/revenuetable";
import {
  Landmark,
  WalletCards,
  Banknote,
  ReceiptText,
  CircleDollarSign,
} from "lucide-react";

/**
 * Convert an underscore-separated value into a readable label.
 */
export function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Format a Revenue value using its currency.
 */
export function formatCurrency(value: number, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",

      currency,

      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-NG")}`;
  }
}

/**
 * Format a Revenue value using compact notation.
 */
export function formatCompactCurrency(value: number, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",

      currency,

      notation: "compact",

      compactDisplay: "short",

      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return formatCurrency(value, currency);
  }
}

/**
 * Format a stored Revenue date.
 */
export function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",

    month: "short",

    year: "numeric",
  }).format(date);
}

/**
 * Format a stored Revenue date and time.
 */
export function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",

    month: "short",

    year: "numeric",

    hour: "numeric",

    minute: "2-digit",
  }).format(date);
}

/**
 * Convert a datetime-local field value into an ISO timestamp.
 */
export function toIsoDateTime(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Convert an ISO timestamp into a datetime-local input value.
 */
export function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

/**
 * Convert a numeric form value into a safe number.
 */
export function parseFinancialNumber(value: string, fallback = 0) {
  const normalizedValue = Number(value);

  return Number.isFinite(normalizedValue) ? normalizedValue : fallback;
}

/**
 * Format a percentage and preserve its direction.
 */
export function formatPercentage(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;

  const sign = safeValue > 0 ? "+" : "";

  return `${sign}${safeValue.toLocaleString("en-NG", {
    maximumFractionDigits: 1,
  })}%`;
}

/**
 * Generate a unique internal Revenue reference.
 */
export function generateRevenueReference(category: RevenueCategory) {
  const categoryCode = category
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 8)
    .toUpperCase();

  const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const randomCode = crypto.randomUUID().split("-")[0].toUpperCase();

  return `FIN-${categoryCode}-${dateCode}-${randomCode}`;
}

/**
 * Convert one Revenue transaction into editable form values.
 */
export function revenueTransactionToForm(
  transaction: RevenueTransaction
): RevenueFormState {
  return {
    transactionCategory: transaction.transaction_category,

    provider: transaction.provider,

    paymentMethod: transaction.payment_method ?? "",

    sourceTable: transaction.source_table ?? "",

    sourceId: transaction.source_id ?? "",

    customerName: transaction.customer_name ?? "",

    customerEmail: transaction.customer_email ?? "",

    customerPhone: transaction.customer_phone ?? "",

    description: transaction.description,

    internalNotes: transaction.internal_notes ?? "",

    internalReference: transaction.internal_reference,

    providerReference: transaction.provider_reference ?? "",

    invoiceNumber: transaction.invoice_number ?? "",

    receiptNumber: transaction.receipt_number ?? "",

    bankAccount: transaction.bank_account ?? "",

    amount: String(transaction.amount),

    feeAmount: String(transaction.fee_amount),

    taxAmount: String(transaction.tax_amount),

    refundedAmount: String(transaction.refunded_amount),

    currency: transaction.currency,

    baseCurrency: transaction.base_currency,

    exchangeRate: String(transaction.exchange_rate),

    status: transaction.status,

    reconciliationStatus: transaction.reconciliation_status,

    transactionDate: transaction.transaction_date,

    paidAt: toDateTimeLocalValue(transaction.paid_at),

    reconciledAt: toDateTimeLocalValue(transaction.reconciled_at),
  };
}

/**
 * Return the Revenue payment-status badge classes.
 */
export function getRevenueStatusClasses(status: RevenueStatus) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

    case "processing":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

    case "failed":
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    case "refunded":
    case "partially_refunded":
      return "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300";

    case "draft":
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/**
 * Return the reconciliation-status badge classes.
 */
export function getReconciliationClasses(status: RevenueReconciliationStatus) {
  switch (status) {
    case "reconciled":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "partially_reconciled":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

    case "disputed":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    case "unreconciled":
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }
}

/**
 * Return the icon used for one Revenue provider.
 */
export function getProviderIcon(provider: RevenueProvider) {
  switch (provider) {
    case "providus":
    case "bank_transfer":
      return Landmark;

    case "paystack":
    case "stripe":
    case "flutterwave":
      return WalletCards;

    case "cash":
      return Banknote;

    case "manual":
      return ReceiptText;

    default:
      return CircleDollarSign;
  }
}

/**
 * Escape one value before adding it to a CSV document.
 */
export function escapeCsvCell(value: unknown) {
  const normalizedValue =
    value === null || value === undefined ? "" : String(value);

  return `"${normalizedValue.replace(/"/g, '""')}"`;
}

/**
 * Download Revenue transactions as a CSV file.
 */
export function downloadRevenueCsv(transactions: RevenueTransaction[]) {
  const headers = [
    "Transaction ID",
    "Internal Reference",
    "Provider Reference",
    "Category",
    "Provider",
    "Payment Method",
    "Customer",
    "Customer Email",
    "Customer Phone",
    "Description",
    "Amount",
    "Currency",
    "Base Amount",
    "Base Currency",
    "Fee",
    "Tax",
    "Refunded Amount",
    "Status",
    "Reconciliation Status",
    "Transaction Date",
    "Paid At",
    "Reconciled At",
    "Invoice Number",
    "Receipt Number",
    "Bank Account",
    "Source Table",
    "Source ID",
    "Archived At",
    "Created At",
  ];

  const rows = transactions.map((transaction) => [
    transaction.id,
    transaction.internal_reference,
    transaction.provider_reference,
    transaction.transaction_category,
    transaction.provider,
    transaction.payment_method,
    transaction.customer_name,
    transaction.customer_email,
    transaction.customer_phone,
    transaction.description,
    transaction.amount,
    transaction.currency,
    transaction.base_amount,
    transaction.base_currency,
    transaction.fee_amount,
    transaction.tax_amount,
    transaction.refunded_amount,
    transaction.status,
    transaction.reconciliation_status,
    transaction.transaction_date,
    transaction.paid_at,
    transaction.reconciled_at,
    transaction.invoice_number,
    transaction.receipt_number,
    transaction.bank_account,
    transaction.source_table,
    transaction.source_id,
    transaction.archived_at,
    transaction.created_at,
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(","),

    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = objectUrl;

  anchor.download = `company-revenue-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(objectUrl);
}
