import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit3,
  FolderKanban,
  ListTodo,
  Loader2,
} from "lucide-react";
import { getProjectById } from "../../../lib/server/projects";
import type { Project } from "../../../types/project";
import ProjectStatusBadge from "./ProjectStatusBadge";

interface ProjectWorkspaceProps {
  projectId: string;
}

/* Formats a project date for display in the workspace. */
const formatProjectDate = (date: string | null) => {
  if (!date) {
    return "Not specified";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
};

/* Displays the overview workspace for one project. */
export default function ProjectWorkspace({ projectId }: ProjectWorkspaceProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  /* Retrieves the selected project when the workspace opens. */
  useEffect(() => {
    const loadProject = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const projectData = await getProjectById(projectId);

        setProject(projectData);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "We could not load this project."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (errorMessage || !project) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-600">
        {errorMessage || "Project not found."}
      </div>
    );
  }

  return (
    <div>
      <a
        href="/admin/projects"
        className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </a>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {project.project_code}
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-heading">
            {project.name}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
            {project.description || "No project description has been added."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ProjectStatusBadge status={project.status} />

          <a
            href={`/admin/projects/edit/${project.id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-box-border bg-body px-4 py-2.5 text-sm font-semibold text-heading transition hover:border-primary/40 hover:text-primary"
          >
            <Edit3 className="h-4 w-4" />
            Edit Project
          </a>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-box-border bg-box-bg/70 p-5">
          <div className="flex items-center gap-2 text-text-muted">
            <FolderKanban className="h-4 w-4 text-primary" />
            <span className="text-sm">Project type</span>
          </div>

          <p className="mt-3 font-semibold capitalize text-heading">
            {project.project_type}
          </p>
        </div>

        <div className="rounded-2xl border border-box-border bg-box-bg/70 p-5">
          <div className="flex items-center gap-2 text-text-muted">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm">Client</span>
          </div>

          <p className="mt-3 font-semibold text-heading">
            {project.project_type === "client"
              ? project.client_name || "Not specified"
              : "CloudTweak"}
          </p>
        </div>

        <div className="rounded-2xl border border-box-border bg-box-bg/70 p-5">
          <div className="flex items-center gap-2 text-text-muted">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm">Start date</span>
          </div>

          <p className="mt-3 font-semibold text-heading">
            {formatProjectDate(project.start_date)}
          </p>
        </div>

        <div className="rounded-2xl border border-box-border bg-box-bg/70 p-5">
          <div className="flex items-center gap-2 text-text-muted">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm">Due date</span>
          </div>

          <p className="mt-3 font-semibold text-heading">
            {formatProjectDate(project.due_date)}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-3xl border border-box-border bg-box-bg/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-heading">
                Project tasks
              </h2>

              <p className="mt-1 text-sm text-text-muted">
                Tasks connected to this project will appear here.
              </p>
            </div>

            <a
              href={`/admin/tasks?project=${project.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <ListTodo className="h-4 w-4" />
              View Tasks
            </a>
          </div>

          <div className="mt-8 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-box-border bg-body/40 p-6 text-center">
            <ListTodo className="h-8 w-8 text-primary" />

            <h3 className="mt-4 font-semibold text-heading">
              Task integration is next
            </h3>

            <p className="mt-2 max-w-md text-sm leading-7 text-text-muted">
              We will connect the existing task form and task list to this
              project using the new project_id field.
            </p>
          </div>
        </section>

        <aside className="rounded-3xl border border-box-border bg-box-bg/70 p-6">
          <h2 className="text-xl font-semibold text-heading">
            Project progress
          </h2>

          <div className="mt-8 flex flex-col items-center text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-8 border-primary/10">
              <span className="text-2xl font-bold text-heading">0%</span>
            </div>

            <div className="mt-6 grid w-full grid-cols-2 gap-3">
              <div className="rounded-2xl bg-body/60 p-4">
                <ListTodo className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2 text-xl font-bold text-heading">0</p>
                <p className="text-xs text-text-muted">Total tasks</p>
              </div>

              <div className="rounded-2xl bg-body/60 p-4">
                <CheckCircle2 className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2 text-xl font-bold text-heading">0</p>
                <p className="text-xs text-text-muted">Completed</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
