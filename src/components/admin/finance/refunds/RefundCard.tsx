import { AlertTriangle, CheckCircle2, Clock3, RotateCcw } from "lucide-react";

interface RefundCardProps {
  title: string;
  amount?: number;
  value?: number;
  currency?: string;
  helperText: string;
  variant: "requested" | "pending" | "successful" | "failed";
}

/**
 * Format one monetary value using its ISO currency code.
 */
function formatRefundCurrency(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Return the icon and theme-aware styles for one Refund card.
 */
function getRefundCardVariant(variant: RefundCardProps["variant"]) {
  switch (variant) {
    case "pending":
      return {
        icon: Clock3,
        iconClasses:
          "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
      };

    case "successful":
      return {
        icon: CheckCircle2,
        iconClasses:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      };

    case "failed":
      return {
        icon: AlertTriangle,
        iconClasses:
          "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
      };

    case "requested":
    default:
      return {
        icon: RotateCcw,
        iconClasses:
          "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
      };
  }
}

/**
 * Render one Refund statistics card.
 */
export default function RefundCard({
  title,
  amount,
  value,
  currency = "NGN",
  helperText,
  variant,
}: RefundCardProps) {
  const cardVariant = getRefundCardVariant(variant);

  const Icon = cardVariant.icon;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 sm:p-5">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${cardVariant.iconClasses}`}
      >
        <Icon size={20} />
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-1 break-words text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
        {amount !== undefined
          ? formatRefundCurrency(amount, currency)
          : (value ?? 0)}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {helperText}
      </p>
    </article>
  );
}
