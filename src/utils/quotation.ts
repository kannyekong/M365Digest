import type {
  CreateQuotationItemInput,
  QuotationDiscountType,
} from "../types/quotation";

/* Rounds one monetary value to two decimal places. */
export function roundQuotationMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/* Calculates one quotation line item. */
export function calculateQuotationItem(item: CreateQuotationItemInput) {
  const quantity = Number(item.quantity);

  const unitPrice = Number(item.unitPrice);

  const discountType = item.discountType ?? "fixed";

  const discountValue = Math.max(0, Number(item.discountValue ?? 0));

  const taxRate = Math.max(0, Number(item.taxRate ?? 0));

  const lineSubtotal = roundQuotationMoney(quantity * unitPrice);

  let discountAmount = 0;

  if (discountType === "percentage") {
    discountAmount = roundQuotationMoney(
      (lineSubtotal * Math.min(discountValue, 100)) / 100
    );
  } else {
    discountAmount = roundQuotationMoney(Math.min(discountValue, lineSubtotal));
  }

  const taxableAmount = Math.max(0, lineSubtotal - discountAmount);

  const taxAmount = roundQuotationMoney((taxableAmount * taxRate) / 100);

  const lineTotal = roundQuotationMoney(taxableAmount + taxAmount);

  return {
    lineSubtotal,
    discountAmount,
    taxAmount,
    lineTotal,
  };
}

/* Calculates the complete quotation totals. */
export function calculateQuotationTotals({
  items,
  discountType = "fixed",
  discountValue = 0,
}: {
  items: CreateQuotationItemInput[];

  discountType?: QuotationDiscountType;

  discountValue?: number;
}) {
  const calculatedItems = items.map(calculateQuotationItem);

  const subtotalAmount = roundQuotationMoney(
    calculatedItems.reduce((total, item) => total + item.lineSubtotal, 0)
  );

  const lineDiscountAmount = roundQuotationMoney(
    calculatedItems.reduce((total, item) => total + item.discountAmount, 0)
  );

  const amountAfterLineDiscounts = Math.max(
    0,
    subtotalAmount - lineDiscountAmount
  );

  let quotationDiscountAmount = 0;

  if (discountType === "percentage") {
    quotationDiscountAmount = roundQuotationMoney(
      (amountAfterLineDiscounts * Math.min(Math.max(discountValue, 0), 100)) /
        100
    );
  } else {
    quotationDiscountAmount = roundQuotationMoney(
      Math.min(Math.max(discountValue, 0), amountAfterLineDiscounts)
    );
  }

  const taxBeforeQuotationDiscount = roundQuotationMoney(
    calculatedItems.reduce((total, item) => total + item.taxAmount, 0)
  );

  const discountRatio =
    amountAfterLineDiscounts > 0
      ? quotationDiscountAmount / amountAfterLineDiscounts
      : 0;

  const adjustedTaxAmount = roundQuotationMoney(
    taxBeforeQuotationDiscount * (1 - discountRatio)
  );

  const totalAmount = roundQuotationMoney(
    amountAfterLineDiscounts - quotationDiscountAmount + adjustedTaxAmount
  );

  return {
    subtotalAmount,
    lineDiscountAmount,
    quotationDiscountAmount,
    taxAmount: adjustedTaxAmount,
    totalAmount,
  };
}

/* Calculates the default validity date for a quotation. */
export function getDefaultQuotationValidUntil(
  issueDate: Date,
  validityDays = 30
) {
  const validUntil = new Date(issueDate);

  validUntil.setDate(validUntil.getDate() + validityDays);

  return validUntil.toISOString().slice(0, 10);
}

/* Formats one quotation amount using the supplied currency. */
export function formatQuotationCurrency(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
