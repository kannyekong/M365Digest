import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ListTodo,
  Pencil,
  Trash2,
} from "lucide-react";
import { deleteProject } from "../../../lib/server/projects";
import type { ProjectWithTaskStats } from "../../../types/project";
import ProjectStatusBadge from "./ProjectStatusBadge";

interface ProjectCardProps {
  project: ProjectWithTaskStats;
}

/* Formats a database date into a readable project due date. */
const formatProjectDate = (date: string | null) => {
  if (!date) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
};

/* Displays one project as a workspace summary card. */
export default function ProjectCard({ project }: ProjectCardProps) {
  // Track whether this project is currently being deleted.
  const [isDeleting, setIsDeleting] = useState(false);

  /* Confirms and permanently deletes the selected project. */
  const handleDelete = async () => {
    // Ask the administrator to confirm the destructive action.
    const confirmed = window.confirm(
      `Delete "${project.name}" permanently?\n\nTasks assigned to this project will become unassigned.`
    );

    // Stop when the administrator cancels the action.
    if (!confirmed) {
      return;
    }

    // Enable the deleting state while the database request runs.
    setIsDeleting(true);

    try {
      // Delete the project using the existing project service.
      await deleteProject(project.id);

      // Inform the administrator that deletion succeeded.
      toast.success("Project deleted successfully.");

      // Reload the page so the deleted project disappears from the grid.
      window.location.reload();
    } catch (error) {
      // Display the database error when the project cannot be deleted.
      toast.error(
        error instanceof Error
          ? error.message
          : "The project could not be deleted."
      );

      // Restore the delete button after an unsuccessful request.
      setIsDeleting(false);
    }
  };

  return (
    <article className="group flex h-full flex-col rounded-3xl border border-box-border bg-box-bg/70 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {project.project_code}
          </p>

          <h2 className="mt-3 text-xl font-bold text-heading">
            {project.name}
          </h2>
        </div>

        <ProjectStatusBadge status={project.status} />
      </div>

      <p className="mt-4 min-h-14 line-clamp-2 text-sm leading-7 text-text-muted">
        {project.description || "No project description has been added."}
      </p>

      <div className="mt-5 flex items-center gap-2 text-sm text-text-muted">
        <Building2 className="h-4 w-4 text-primary" />

        <span>
          {project.project_type === "client"
            ? project.client_name || "Client project"
            : "CloudTweak internal"}
        </span>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-heading">Progress</span>

          <span className="font-semibold text-primary">
            {project.progress}%
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{
              width: `${project.progress}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-box-border bg-body/60 p-3">
          <div className="flex items-center gap-2 text-text-muted">
            <ListTodo className="h-4 w-4 text-primary" />

            <span className="text-xs font-medium">Tasks</span>
          </div>

          <p className="mt-2 text-lg font-bold text-heading">
            {project.total_tasks}
          </p>
        </div>

        <div className="rounded-2xl border border-box-border bg-body/60 p-3">
          <div className="flex items-center gap-2 text-text-muted">
            <CheckCircle2 className="h-4 w-4 text-primary" />

            <span className="text-xs font-medium">Completed</span>
          </div>

          <p className="mt-2 text-lg font-bold text-heading">
            {project.completed_tasks}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-sm text-text-muted">
        <CalendarDays className="h-4 w-4 text-primary" />

        <span>Due {formatProjectDate(project.due_date)}</span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-6">
        <a
          href={`/admin/projects/edit/${project.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-heading transition hover:text-primary"
        >
          Open project
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>

        <div className="flex items-center gap-2">
          <a
            href={`/admin/projects/edit/${project.id}`}
            title="Edit project"
            aria-label={`Edit ${project.name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-box-border text-text-muted transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          >
            <Pencil className="h-4 w-4" />
          </a>

          <button
            type="button"
            title="Delete project"
            aria-label={`Delete ${project.name}`}
            disabled={isDeleting}
            onClick={() => void handleDelete()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 text-red-500 transition hover:border-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
