import type { CareerStatus } from "../../../types/careers";

interface CareerStatusBadgeProps {
  status: CareerStatus;
}

// Return the user-facing label for a career status.
function getStatusLabel(status: CareerStatus) {
  const labels: Record<CareerStatus, string> = {
    draft: "Draft",
    published: "Published",
    closed: "Closed",
  };

  return labels[status];
}

// Return the appropriate theme-aware styling for a career status.
function getStatusClasses(status: CareerStatus) {
  const classes: Record<CareerStatus, string> = {
    draft:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",

    published:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",

    closed:
      "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return classes[status];
}

// Display the publishing status of a job opening.
export default function CareerStatusBadge({ status }: CareerStatusBadgeProps) {
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
