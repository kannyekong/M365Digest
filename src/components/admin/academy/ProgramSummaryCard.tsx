import type { ReactNode } from "react";

interface ProgramSummaryCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  color: string;
}

/**
 * Display one summary statistic on the Academy Programs page.
 */
export default function ProgramSummaryCard({
  label,
  value,
  icon,
  color,
}: ProgramSummaryCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>

          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-${color} text-primary`}
        >
          {icon}
        </div>
      </div>
    </article>
  );
}
