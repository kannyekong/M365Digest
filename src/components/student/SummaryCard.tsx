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
  // Render a consistent summary card with an optional watermark, description, and navigation link.
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="group relative isolate overflow-hidden">
          {WatermarkIcon && (
            <WatermarkIcon
              size={120}
              strokeWidth={1.5}
              aria-hidden="true"
              className={`pointer-events-none absolute -top-3 -z-10 ${accentColor} opacity-10 dark:text-white/5`}
            />
          )}

          <p
            className={`relative text-xs font-semibold uppercase tracking-wide ${accentColor}`}
          >
            {title}
          </p>

          <p
            id={valueId}
            className={`relative mt-3 text-3xl font-bold ${valueColor || "text-primary"} dark:text-white`}
          >
            {value}
          </p>

          {description && (
            <p className="relative mt-1 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}

          {href && (
            <a
              href={href}
              className={`relative mt-4 flex items-center gap-1 text-sm font-semibold ${accentColor} dark:text-green-400`}
            >
              {linkLabel}
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-1"
              />
            </a>
          )}
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBackgroundColor} ${iconColor}`}
        >
          <Icon size={20} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
