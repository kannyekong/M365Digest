import type { JobApplicationStatus } from "../../types/jobApplication";

interface ApplicationStatusBadgeProps {
  status: JobApplicationStatus;
}

interface StatusConfiguration {
  label: string;
  className: string;
}

/**
 * Maps each application status to its display label and theme-aware classes.
 */
function getStatusConfiguration(
  status: JobApplicationStatus
): StatusConfiguration {
  const configurations: Record<JobApplicationStatus, StatusConfiguration> = {
    new: {
      label: "New",
      className:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/50 dark:text-blue-300",
    },
    in_review: {
      label: "In review",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-300",
    },
    shortlisted: {
      label: "Shortlisted",
      className:
        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/50 dark:text-violet-300",
    },
    interview: {
      label: "Interview",
      className:
        "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/70 dark:bg-cyan-950/50 dark:text-cyan-300",
    },
    assessment: {
      label: "Assessment",
      className:
        "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/70 dark:bg-indigo-950/50 dark:text-indigo-300",
    },
    offered: {
      label: "Offered",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300",
    },
    hired: {
      label: "Hired",
      className:
        "border-green-200 bg-green-50 text-green-700 dark:border-green-900/70 dark:bg-green-950/50 dark:text-green-300",
    },
    rejected: {
      label: "Rejected",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-300",
    },
    withdrawn: {
      label: "Withdrawn",
      className:
        "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
    },
  };

  return configurations[status];
}

/**
 * Displays a recruitment status using a consistent visual badge.
 */
export default function ApplicationStatusBadge({
  status,
}: ApplicationStatusBadgeProps) {
  const configuration = getStatusConfiguration(status);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${configuration.className}`}
    >
      {configuration.label}
    </span>
  );
}
