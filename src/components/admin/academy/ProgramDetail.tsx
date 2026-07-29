import type { ReactNode } from "react";

interface ProgramDetailProps {
  icon: ReactNode;
  label: string;
}

/**
 * Display one icon and value inside an Academy program card.
 */
export default function ProgramDetail({ icon, label }: ProgramDetailProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
      <span className="shrink-0 text-slate-400">{icon}</span>

      <span className="truncate" title={label}>
        {label}
      </span>
    </div>
  );
}
