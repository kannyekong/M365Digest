import {
  AlertTriangle,
  CalendarDays,
  CircleDollarSign,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface ExpenseCardProps {
  title: string;
  amount: number;
  currency: string;
  helperText: string;
  trend?: number;
  trendLabel?: string;
  variant: "total" | "monthly" | "pending" | "unreconciled";
}

/**
 * Format one Expense amount using its ISO currency code.
 */
function formatExpenseCurrency(amount: number, currency = "NGN") {
  return `${currency.toUpperCase()} ${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/**
 * Return the icon and theme-aware styles for one Expense card variant.
 */
function getExpenseCardVariant(variant: ExpenseCardProps["variant"]) {
  switch (variant) {
    case "monthly":
      return {
        icon: CalendarDays,
        iconClassName:
          "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
      };

    case "pending":
      return {
        icon: ReceiptText,
        iconClassName:
          "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
      };

    case "unreconciled":
      return {
        icon: AlertTriangle,
        iconClassName:
          "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
      };

    case "total":
    default:
      return {
        icon: CircleDollarSign,
        iconClassName:
          "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
      };
  }
}

/**
 * Render one Expense statistics card.
 */
export default function ExpenseCard({
  title,
  amount,
  currency,
  helperText,
  trend,
  trendLabel,
  variant,
}: ExpenseCardProps) {
  const cardVariant = getExpenseCardVariant(variant);

  const Icon = cardVariant.icon;

  const hasTrend = typeof trend === "number";

  const trendPositive = (trend ?? 0) >= 0;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${cardVariant.iconClassName}`}
        >
          <Icon size={20} />
        </div>

        {hasTrend && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold ${
              trendPositive
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {trendPositive ? (
              <TrendingUp size={14} />
            ) : (
              <TrendingDown size={14} />
            )}
            {Math.abs(trend ?? 0)}%
          </span>
        )}
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
        {formatExpenseCurrency(amount, currency)}
      </p>

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {helperText}

        {trendLabel && <> · {trendLabel}</>}
      </p>
    </article>
  );
}
