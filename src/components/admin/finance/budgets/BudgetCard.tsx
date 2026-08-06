import {
  AlertTriangle,
  Banknote,
  CircleDollarSign,
  ShieldCheck,
} from "lucide-react";

interface BudgetCardProps {
  title: string;
  amount?: number;
  value?: number;
  currency?: string;
  helperText: string;
  variant: "budgeted" | "used" | "remaining" | "warning";
}

/**
 * Format one Budget monetary value.
 */
function formatBudgetCurrency(amount: number, currency = "NGN") {
  return `${currency.toUpperCase()} ${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/**
 * Return the icon and theme-aware classes for one Budget card.
 */
function getBudgetCardVariant(variant: BudgetCardProps["variant"]) {
  switch (variant) {
    case "used":
      return {
        icon: CircleDollarSign,
        iconClasses:
          "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
      };

    case "remaining":
      return {
        icon: ShieldCheck,
        iconClasses:
          "bg-yellow-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      };

    case "warning":
      return {
        icon: AlertTriangle,
        iconClasses:
          "bg-red-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
      };

    case "budgeted":
    default:
      return {
        icon: Banknote,
        iconClasses:
          "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
      };
  }
}

/**
 * Render one Budget statistics card.
 */
export default function BudgetCard({
  title,
  amount,
  value,
  currency = "NGN",
  helperText,
  variant,
}: BudgetCardProps) {
  const cardVariant = getBudgetCardVariant(variant);

  const Icon = cardVariant.icon;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${cardVariant.iconClasses}`}
      >
        <Icon size={20} />
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
        {amount !== undefined
          ? formatBudgetCurrency(amount, currency)
          : (value ?? 0)}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {helperText}
      </p>
    </article>
  );
}
