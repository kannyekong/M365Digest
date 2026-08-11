import type { LucideIcon } from "lucide-react";

interface ClientStatisticsCardProps {
  title: string;
  value?: number;
  amount?: number;
  currency?: string;
  helperText: string;
  icon: LucideIcon;
  iconClasses: string;
}

/**
 * Format one monetary value using its ISO currency code.
 */
function formatClientCurrency(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Render one Client statistics card.
 */
export default function ClientStatisticsCard({
  title,
  value,
  amount,
  currency = "NGN",
  helperText,
  icon: Icon,
  iconClasses,
}: ClientStatisticsCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 sm:p-5">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-2xl ${iconClasses}`}
      >
        <Icon size={18} />
      </div>

      <p className="mt-2 text-md font-medium text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-1 break-words text-xl font-bold text-slate-950 dark:text-white">
        {amount !== undefined
          ? formatClientCurrency(amount, currency)
          : (value ?? 0)}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {helperText}
      </p>
    </article>
  );
}
