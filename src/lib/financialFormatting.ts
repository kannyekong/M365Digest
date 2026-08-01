/**
 * Format a monetary value using its transaction currency.
 */
export function formatFinancialCurrency(amount: number, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",

      currency,

      minimumFractionDigits: 0,

      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-NG")}`;
  }
}

/**
 * Format a large monetary value in a compact dashboard form.
 *
 * Examples:
 * ₦150,000
 * ₦1.2M
 * ₦8.5B
 */
export function formatCompactFinancialCurrency(
  amount: number,
  currency = "NGN"
) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",

      currency,

      notation: "compact",

      compactDisplay: "short",

      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return formatFinancialCurrency(amount, currency);
  }
}

/**
 * Format a percentage while preserving positive and negative values.
 */
export function formatGrowthPercentage(percentage: number) {
  const normalizedPercentage = Number.isFinite(percentage) ? percentage : 0;

  const sign = normalizedPercentage > 0 ? "+" : "";

  return `${sign}${normalizedPercentage.toLocaleString("en-NG", {
    maximumFractionDigits: 1,
  })}%`;
}
