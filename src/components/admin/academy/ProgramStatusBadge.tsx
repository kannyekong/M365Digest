import type { AcademyProgramStatus } from "../../../types/academy";

interface ProgramStatusBadgeProps {
  status: AcademyProgramStatus;
}

/**
 * Return the readable label for an Academy program status.
 */
function getStatusLabel(status: AcademyProgramStatus) {
  const labels: Record<AcademyProgramStatus, string> = {
    draft: "Draft",
    published: "Published",
    archived: "Archived",
  };

  return labels[status];
}

/**
 * Return the styling used by each Academy program status.
 */
function getStatusClasses(status: AcademyProgramStatus) {
  const classes: Record<AcademyProgramStatus, string> = {
    draft:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",

    published:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",

    archived:
      "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return classes[status];
}

/**
 * Display the publishing status of an Academy program.
 */
export default function ProgramStatusBadge({
  status,
}: ProgramStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
        status
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
