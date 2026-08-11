import type {
  QuotationDiscountType,
  QuotationStatus,
} from "../types/quotation";

export const DEFAULT_QUOTATION_CURRENCY = "NGN";

export const DEFAULT_QUOTATION_TAX_RATE = 7.5;

export const DEFAULT_QUOTATION_VALIDITY_DAYS = 30;

export const DEFAULT_QUOTATION_TERMS =
  "This quotation is valid until the stated expiry date. Pricing and delivery timelines may be reviewed after expiry.";

export const QUOTATION_STATUSES: Array<{
  value: QuotationStatus;
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
    value: "accepted",
    label: "Accepted",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
  {
    value: "expired",
    label: "Expired",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

export const QUOTATION_DISCOUNT_TYPES: Array<{
  value: QuotationDiscountType;
  label: string;
}> = [
  {
    value: "fixed",
    label: "Fixed",
  },
  {
    value: "percentage",
    label: "Percentage",
  },
];
