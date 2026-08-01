import type {
  InvoiceDeliveryStatus,
  InvoiceDiscountType,
  InvoiceStatus,
} from "../types/invoice";

export const INVOICE_PAGE_SIZE = 10;

export const DEFAULT_INVOICE_CURRENCY = "NGN";

export const DEFAULT_INVOICE_TAX_RATE = 7.5;

export const DEFAULT_INVOICE_PAYMENT_TERMS_DAYS = 14;

export const INVOICE_NUMBER_PREFIX = "INV";

export const INVOICE_STATUSES: Array<{
  value: InvoiceStatus;

  label: string;
}> = [
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "sent",
    label: "Sent",
  },
  {
    value: "viewed",
    label: "Viewed",
  },
  {
    value: "partially_paid",
    label: "Partially Paid",
  },
  {
    value: "paid",
    label: "Paid",
  },
  {
    value: "overdue",
    label: "Overdue",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
  {
    value: "refunded",
    label: "Refunded",
  },
];

export const INVOICE_DELIVERY_STATUSES: Array<{
  value: InvoiceDeliveryStatus;

  label: string;
}> = [
  {
    value: "not_sent",
    label: "Not Sent",
  },
  {
    value: "queued",
    label: "Queued",
  },
  {
    value: "sent",
    label: "Sent",
  },
  {
    value: "delivered",
    label: "Delivered",
  },
  {
    value: "failed",
    label: "Failed",
  },
];

export const INVOICE_DISCOUNT_TYPES: Array<{
  value: InvoiceDiscountType;

  label: string;
}> = [
  {
    value: "fixed",
    label: "Fixed Amount",
  },
  {
    value: "percentage",
    label: "Percentage",
  },
];

export const DEFAULT_INVOICE_TERMS =
  "Payment is due on or before the stated due date. Please include the invoice number as the payment reference.";
