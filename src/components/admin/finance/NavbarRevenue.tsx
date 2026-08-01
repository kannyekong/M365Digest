import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  LoaderCircle,
  Minus,
} from "lucide-react";
import { useCompanyFinancialSummary } from "../../../hooks/useCompanyFinancialSummary";
import {
  formatCompactFinancialCurrency,
  formatGrowthPercentage,
} from "../../../lib/financialFormatting";

/**
 * Display the current month's company revenue inside the admin navbar.
 */
export default function NavbarRevenue() {
  const { summary, loading, errorMessage } = useCompanyFinancialSummary();

  const growthPercentage = summary?.growthPercentage ?? 0;

  const GrowthIcon =
    growthPercentage > 0
      ? ArrowUpRight
      : growthPercentage < 0
        ? ArrowDownRight
        : Minus;

  const growthClasses =
    growthPercentage > 0
      ? "text-emerald-600"
      : growthPercentage < 0
        ? "text-red-600"
        : "text-slate-500";

  if (loading) {
    return (
      <div className="flex min-w-[180px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <LoaderCircle className="h-4 w-4 animate-spin" />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">Revenue</p>

          <p className="mt-0.5 text-sm font-bold text-slate-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !summary) {
    return (
      <div className="flex min-w-[180px] items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-red-600">
          <CircleDollarSign className="h-4 w-4" />
        </div>

        <div>
          <p className="text-xs font-medium text-red-600">Revenue</p>

          <p className="mt-0.5 text-xs font-semibold text-red-700">
            Unavailable
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-[195px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        <CircleDollarSign className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">Revenue this month</p>

        <div className="mt-0.5 flex items-center gap-2">
          <p className="truncate text-sm font-bold text-slate-950">
            {formatCompactFinancialCurrency(
              summary.currentMonthRevenue,
              summary.currency
            )}
          </p>

          <span
            className={`inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold ${growthClasses}`}
          >
            <GrowthIcon className="h-3 w-3" />

            {formatGrowthPercentage(growthPercentage)}
          </span>
        </div>
      </div>
    </div>
  );
}
