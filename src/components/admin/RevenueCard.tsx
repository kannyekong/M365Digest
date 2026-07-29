import { ArrowUpRight, BadgeDollarSign, TrendingUp } from "lucide-react";

interface RevenueCardProps {
  totalRevenue: number;
  monthlyRevenue: number;
  outstandingRevenue: number;
  percentageChange?: number;
  manageHref?: string;
}

/* Formats revenue values in Nigerian naira. */
function formatRevenue(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

/* Displays a compact summary of revenue activity. */
export default function RevenueCard({
  totalRevenue,
  monthlyRevenue,
  outstandingRevenue,
  percentageChange = 0,
  manageHref = "/admin/finance",
}: RevenueCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-600 via-blue-500 to-pink-500 p-4 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white">
            Revenue
          </p>

          <h2 className="mt-3 text-md font-bold text-white">
            {formatRevenue(totalRevenue)}
          </h2>
        </div>

        <div className="flex h-8 w-8 items-center mt-2 justify-center rounded-xl bg-white shadow-lg">
          <BadgeDollarSign className="h-4 w-4 text-blue-500" />
        </div>
      </div>

      <div className="my-3 border-t border-blue-100" />

      <div className="flex items-center justify-between gap-4 text-xs">
        <div>
          <div className="inline-flex items-center gap-1 font-semibold text-white px-2 border bg-green-500 rounded-full">
            <TrendingUp className="h-3.5 w-3.5" />
            {percentageChange}%
          </div>

          <span className="ml-1 text-white">this month</span>
        </div>

        <div className="flex items-center justify-between gap-4 text-xs">
          <a
            href={manageHref}
            className="inline-flex items-center gap-1 rounded-full border border-blue-500 px-1 font-medium text-white transition hover:bg-blue-500 hover:text-white"
          >
            Manage
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
