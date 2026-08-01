import type { ReactNode } from "react";
import type { RevenueMetric } from "../../../../types/revenuetable";

/**
 * Display one reusable Revenue details row.
 */
export function RevenueDetailRow({
  label,
  value,
}: {
  label: string;

  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-200 py-3 last:border-b-0 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {label}
      </span>

      <span className="max-w-xl break-words text-sm font-semibold text-slate-900 dark:text-white sm:text-right">
        {value || "Not available"}
      </span>
    </div>
  );
}

/**
 * Display one Revenue dashboard metric.
 */
export function RevenueMetricCard({ metric }: { metric: RevenueMetric }) {
  const Icon = metric.icon;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${metric.iconClasses}`}
      >
        <Icon size={21} />
      </div>

      <p className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">
        {metric.value}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {metric.label}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {metric.description}
      </p>
    </article>
  );
}
