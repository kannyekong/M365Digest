import type { ProjectStatus } from "../../../types/project";

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}

/* Stores the label and theme-aware classes used by every project status. */
const statusStyles: Record<
  ProjectStatus,
  {
    label: string;
    className: string;
  }
> = {
  planning: {
    label: "Planning",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  active: {
    label: "Active",
    className:
      "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300",
  },
  on_hold: {
    label: "On Hold",
    className:
      "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  completed: {
    label: "Completed",
    className:
      "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  archived: {
    label: "Archived",
    className:
      "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  },
};

/* Displays a project status using its matching label and visual style. */
export default function ProjectStatusBadge({
  status,
}: ProjectStatusBadgeProps) {
  const style = statusStyles[status];

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${style.className}`}
    >
      {style.label}
    </span>
  );
}
