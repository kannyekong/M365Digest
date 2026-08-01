import {
  DEFAULT_INVOICE_PAYMENT_TERMS_DAYS,
  INVOICE_NUMBER_PREFIX,
} from "../config/invoice";
import type {
  CreateInvoiceItemInput,
  InvoiceCalculation,
  InvoiceDiscountType,
  InvoiceItemCalculation,
  InvoiceStatus,
} from "../types/invoice";

/**
 * Round one monetary value to two decimal places.
 */
export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Convert an unknown numeric value into a safe non-negative number.
 */
export function normalizeInvoiceNumber(value: unknown, fallback = 0) {
  const normalizedValue = Number(value);

  if (!Number.isFinite(normalizedValue)) {
    return fallback;
  }

  return Math.max(0, normalizedValue);
}

/**
 * Calculate one discount amount while preventing it from exceeding its base.
 */
export function calculateDiscountAmount(
  baseAmount: number,
  discountType: InvoiceDiscountType,
  discountValue: number
) {
  const safeBaseAmount = normalizeInvoiceNumber(baseAmount);
  const safeDiscountValue = normalizeInvoiceNumber(discountValue);

  const rawDiscount =
    discountType === "percentage"
      ? safeBaseAmount * (Math.min(safeDiscountValue, 100) / 100)
      : safeDiscountValue;

  return roundMoney(Math.min(rawDiscount, safeBaseAmount));
}

/**
 * Calculate subtotal, discount, tax, and total for one invoice item.
 */
export function calculateInvoiceItem(
  item: CreateInvoiceItemInput
): InvoiceItemCalculation {
  const quantity = normalizeInvoiceNumber(item.quantity);
  const unitPrice = normalizeInvoiceNumber(item.unitPrice);
  const discountType = item.discountType ?? "fixed";
  const discountValue = normalizeInvoiceNumber(item.discountValue);
  const taxRate = Math.min(normalizeInvoiceNumber(item.taxRate), 100);

  const lineSubtotal = roundMoney(quantity * unitPrice);
  const discountAmount = calculateDiscountAmount(
    lineSubtotal,
    discountType,
    discountValue
  );
  const taxableAmount = roundMoney(lineSubtotal - discountAmount);
  const taxAmount = roundMoney(taxableAmount * (taxRate / 100));
  const lineTotal = roundMoney(taxableAmount + taxAmount);

  return {
    lineSubtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    lineTotal,
  };
}

/**
 * Calculate the complete totals for an invoice and its line items.
 */
export function calculateInvoiceTotals({
  items,
  discountType = "fixed",
  discountValue = 0,
  amountPaid = 0,
}: {
  items: CreateInvoiceItemInput[];
  discountType?: InvoiceDiscountType;
  discountValue?: number;
  amountPaid?: number;
}): InvoiceCalculation {
  const itemCalculations = items.map(calculateInvoiceItem);

  const subtotalAmount = roundMoney(
    itemCalculations.reduce((total, item) => total + item.lineSubtotal, 0)
  );

  const lineDiscountAmount = roundMoney(
    itemCalculations.reduce((total, item) => total + item.discountAmount, 0)
  );

  const subtotalAfterLineDiscounts = roundMoney(
    subtotalAmount - lineDiscountAmount
  );

  const invoiceDiscountAmount = calculateDiscountAmount(
    subtotalAfterLineDiscounts,
    discountType,
    discountValue
  );

  const taxBeforeInvoiceDiscount = roundMoney(
    itemCalculations.reduce((total, item) => total + item.taxAmount, 0)
  );

  const invoiceDiscountRatio =
    subtotalAfterLineDiscounts > 0
      ? invoiceDiscountAmount / subtotalAfterLineDiscounts
      : 0;

  const taxAmount = roundMoney(
    taxBeforeInvoiceDiscount * (1 - invoiceDiscountRatio)
  );

  const totalAmount = roundMoney(
    subtotalAfterLineDiscounts - invoiceDiscountAmount + taxAmount
  );

  const safeAmountPaid = roundMoney(
    Math.min(normalizeInvoiceNumber(amountPaid), totalAmount)
  );

  return {
    subtotalAmount,
    lineDiscountAmount,
    invoiceDiscountAmount,
    taxAmount,
    totalAmount,
    amountPaid: safeAmountPaid,
    amountDue: roundMoney(totalAmount - safeAmountPaid),
  };
}

/**
 * Build the default invoice due date using the configured payment period.
 */
export function getDefaultInvoiceDueDate(
  issueDate = new Date(),
  paymentTermsDays = DEFAULT_INVOICE_PAYMENT_TERMS_DAYS
) {
  const dueDate = new Date(issueDate);

  dueDate.setDate(dueDate.getDate() + paymentTermsDays);

  return dueDate.toISOString().slice(0, 10);
}

/**
 * Generate a readable temporary invoice number for client-side drafts.
 */
export function generateTemporaryInvoiceNumber() {
  const year = new Date().getFullYear();
  const randomCode = crypto.randomUUID().split("-")[0].toUpperCase();

  return `${INVOICE_NUMBER_PREFIX}-${year}-${randomCode}`;
}

/**
 * Format one invoice value with its stored currency.
 */
export function formatInvoiceCurrency(value: number, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-NG", {
      maximumFractionDigits: 2,
    })}`;
  }
}

/**
 * Determine whether an invoice is currently overdue.
 */
export function isInvoiceOverdue({
  dueDate,
  status,
  amountDue,
  referenceDate = new Date(),
}: {
  dueDate: string;
  status: InvoiceStatus;
  amountDue: number;
  referenceDate?: Date;
}) {
  if (
    status === "paid" ||
    status === "cancelled" ||
    status === "refunded" ||
    amountDue <= 0
  ) {
    return false;
  }

  const dueDateValue = new Date(`${dueDate}T23:59:59`);

  return (
    !Number.isNaN(dueDateValue.getTime()) &&
    dueDateValue.getTime() < referenceDate.getTime()
  );
}

/**
 * Resolve the effective invoice status from payment and due-date information.
 */
export function resolveInvoiceStatus({
  currentStatus,
  totalAmount,
  amountPaid,
  dueDate,
}: {
  currentStatus: InvoiceStatus;
  totalAmount: number;
  amountPaid: number;
  dueDate: string;
}): InvoiceStatus {
  if (currentStatus === "cancelled" || currentStatus === "refunded") {
    return currentStatus;
  }

  const safeTotalAmount = normalizeInvoiceNumber(totalAmount);
  const safeAmountPaid = normalizeInvoiceNumber(amountPaid);

  if (safeTotalAmount > 0 && safeAmountPaid >= safeTotalAmount) {
    return "paid";
  }

  if (safeAmountPaid > 0 && safeAmountPaid < safeTotalAmount) {
    return "partially_paid";
  }

  if (
    isInvoiceOverdue({
      dueDate,
      status: currentStatus,
      amountDue: safeTotalAmount - safeAmountPaid,
    })
  ) {
    return "overdue";
  }

  return currentStatus;
}
