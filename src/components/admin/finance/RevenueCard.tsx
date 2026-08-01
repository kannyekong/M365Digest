import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  Minus,
  TrendingUp,
} from "lucide-react";

interface RevenueCardProps {
  totalRevenue: number;
  percentageChange?: number;
  currency?: string;
  manageHref?: string;
}

/* Formats revenue values using the supplied currency. */
function formatRevenue(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/* Formats a revenue growth percentage with the correct sign. */
function formatPercentageChange(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;

  const sign = safeValue > 0 ? "+" : "";

  return `${sign}${safeValue.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

/* Displays a compact summary of revenue activity. */
export default function RevenueCard({
  totalRevenue,
  percentageChange = 0,
  currency = "NGN",
  manageHref = "/admin/finance",
}: RevenueCardProps) {
  const isPositive = percentageChange > 0;

  const isNegative = percentageChange < 0;

  const percentageClasses = isPositive
    ? "border-green-400 bg-green-500"
    : isNegative
      ? "border-red-400 bg-red-500"
      : "border-slate-400 bg-slate-500";

  return (
    <div className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-600 via-blue-500 to-pink-500 p-4 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white">
            Revenue
          </p>

          <h2 className="mt-3 text-md font-bold text-white">
            {formatRevenue(totalRevenue, currency)}
          </h2>
        </div>

        <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-lg">
          <BadgeDollarSign className="h-4 w-4 text-blue-500" />
        </div>
      </div>

      <div className="my-3 border-t border-blue-100/60" />

      <div className="flex items-center justify-between gap-4 text-xs">
        <div className="flex flex-col items-center">
          <div
            className={`inline-flex items-center gap-1 rounded-full border px-2 font-semibold text-white ${percentageClasses}`}
            title="Revenue change compared with the previous month"
          >
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : isNegative ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}

            {formatPercentageChange(percentageChange)}
          </div>

          <span className="ml-1 text-white">this month</span>
        </div>

        <a
          href={manageHref}
          className="inline-flex items-center gap-1 rounded-full border border-blue-300 px-2 py-0.5 font-medium text-white transition hover:border-blue-500 hover:bg-blue-500 hover:text-white"
        >
          Manage
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
