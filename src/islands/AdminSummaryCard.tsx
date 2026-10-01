import type { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string | number | boolean;
  iconColor?: string;
  iconBackgroundColor?: string;
}

/**
 * Renders a reusable admin report card with configurable icon styling.
 */
export function SummaryCard({
  label,
  value,
  icon: Icon,
  description,
  iconColor = "text-slate-700 dark:text-slate-300",
  iconBackgroundColor = "bg-slate-100 dark:bg-slate-800",
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBackgroundColor}`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
