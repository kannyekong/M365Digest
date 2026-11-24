import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string | number;
  valueColor?: string;
  icon: LucideIcon;
  watermarkIcon?: LucideIcon;
  accentColor?: string;
  iconBackgroundColor?: string;
  iconColor?: string;
  href?: string;
  linkLabel?: string;
  valueId?: string;
  description?: string;
}

export default function SummaryCard({
  title,
  value,
  valueColor,
  icon: Icon,
  watermarkIcon: WatermarkIcon,
  accentColor = "text-primary",
  iconBackgroundColor = "bg-blue-50 dark:bg-blue-950/40",
  iconColor = "text-blue-600 dark:text-blue-400",
  href,
  linkLabel = "View details",
  valueId,
  description,
}: SummaryCardProps) {
  // Render a premium dashboard summary card.
  return (
    <div className="group relative isolate overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      {/* Decorative watermark */}
      {WatermarkIcon && (
        <WatermarkIcon
          size={150}
          strokeWidth={1}
          aria-hidden="true"
          className={`pointer-events-none absolute -right-12 -top-12 -z-10 rotate-12 ${iconColor} opacity-10 transition-transform duration-500 group-hover:rotate-6 dark:text-slate-700/20`}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={`text-[12px] font-semibold uppercase ${accentColor}`}>
            {title}
          </p>

          <p
            id={valueId}
            className={`mt-1 text-3xl font-bold tracking-tight ${valueColor ?? "text-slate-900 dark:text-white"}`}
          >
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>

        {/* <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconBackgroundColor} ${iconColor} ring-1 ring-inset ring-black/[0.03] dark:ring-white/[0.04]`}
        >
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
        </div> */}
      </div>

      {href && (
        <a
          href={href}
          className={`mt-2 inline-flex items-center gap-2 text-sm font-light ${accentColor} transition-colors hover:opacity-80`}
        >
          {linkLabel}
          <ArrowRight
            size={15}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </a>
      )}
    </div>
  );
}
