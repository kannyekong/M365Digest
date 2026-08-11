import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  FolderKanban,
  Loader2,
  Pencil,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getProjectWorkspace } from "../../../lib/server/projects";
import type { ProjectStatus, ProjectWorkspace } from "../../../types/project";

/* Formats one Project financial value. */
function formatCurrency(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/* Formats one Project date for display. */
function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

/* Converts one internal label into readable text. */
function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/* Returns theme-aware classes for one Project status. */
function getStatusClasses(status: ProjectStatus) {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";

    case "planning":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-300";

    case "on_hold":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-300";

    case "completed":
      return "bg-violet-500/10 text-violet-600 dark:text-violet-300";

    case "archived":
      return "bg-slate-500/10 text-slate-600 dark:text-slate-300";

    default:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-300";
  }
}

/* Returns theme-aware classes for one task status badge. */
function getTaskStatusClasses(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

    case "in_progress":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

    case "completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/* Displays one Project workspace summary card. */
function SummaryCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: typeof FolderKanban;
}) {
  return (
    <article className="rounded-2xl border border-box-border bg-box-bg/70 p-4 shadow-sm backdrop-blur-xl sm:p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon size={18} />
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </p>

      <p className="mt-1 break-words text-xl font-bold text-heading">{value}</p>

      <p className="mt-1 text-xs text-text-muted">{helper}</p>
    </article>
  );
}

interface ProjectDetailsDashboardProps {
  projectId: string;
}

/* Displays the operational workspace for one Project. */
export default function ProjectDetailsDashboard({
  projectId,
}: ProjectDetailsDashboardProps) {
  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(null);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  /* Loads the Project workspace when the page opens. */
  useEffect(() => {
    async function loadWorkspace() {
      setLoading(true);
      setErrorMessage("");

      try {
        const result = await getProjectWorkspace(projectId);

        setWorkspace(result);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The Project could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadWorkspace();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (errorMessage || !workspace) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-600 dark:text-red-300">
          {errorMessage || "The Project could not be loaded."}
        </div>
      </div>
    );
  }

  const { project } = workspace;

  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <a
              href="/admin/projects"
              className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted transition hover:text-primary"
            >
              <ArrowLeft size={16} />
              Back to projects
            </a>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-primary">
                {project.project_code}
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                  project.status
                )}`}
              >
                {formatLabel(project.status)}
              </span>
            </div>

            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-heading sm:text-3xl">
              {project.name}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
              {project.description ||
                "No Project description has been provided."}
            </p>
          </div>

          <a
            href={`/admin/projects/edit/${project.id}`}
            className="inline-flex w-max items-center justify-center gap-2 rounded-xl border border-box-border bg-body px-4 py-2.5 text-sm font-semibold text-heading transition hover:border-primary/40 hover:text-primary"
          >
            <Pencil size={16} />
            Edit Project
          </a>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Tasks"
          value={`${workspace.completed_tasks} / ${workspace.total_tasks}`}
          helper={`${workspace.task_progress}% completed`}
          icon={CheckCircle2}
        />

        <SummaryCard
          title="Total Invoiced"
          value={formatCurrency(workspace.total_invoiced, workspace.currency)}
          helper={`${workspace.invoices.length} invoice${
            workspace.invoices.length === 1 ? "" : "s"
          }`}
          icon={FileText}
        />

        <SummaryCard
          title="Received"
          value={formatCurrency(workspace.total_paid, workspace.currency)}
          helper="Payments recorded"
          icon={CircleDollarSign}
        />

        <SummaryCard
          title="Outstanding"
          value={formatCurrency(
            workspace.total_outstanding,
            workspace.currency
          )}
          helper="Still awaiting payment"
          icon={ReceiptText}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-2xl border border-box-border bg-box-bg/70 p-5 shadow-sm backdrop-blur-xl lg:col-span-2">
          <h2 className="font-semibold text-heading">Project overview</h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Client
                </p>

                <p className="mt-1 font-semibold text-heading">
                  {project.project_type === "client"
                    ? project.client_name || "Client not assigned"
                    : "Internal Project"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FolderKanban className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Project type
                </p>

                <p className="mt-1 font-semibold text-heading">
                  {formatLabel(project.project_type)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Start date
                </p>

                <p className="mt-1 font-semibold text-heading">
                  {formatDate(project.start_date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Due date
                </p>

                <p className="mt-1 font-semibold text-heading">
                  {formatDate(project.due_date)}
                </p>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-box-border bg-box-bg/70 p-5 shadow-sm backdrop-blur-xl">
          <h2 className="font-semibold text-heading">Task progress</h2>

          <div className="mt-5">
            <div className="flex items-end justify-between gap-4">
              <p className="text-3xl font-bold text-heading">
                {workspace.task_progress}%
              </p>

              <p className="text-xs text-text-muted">
                {workspace.completed_tasks} of {workspace.total_tasks}
              </p>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${workspace.task_progress}%`,
                }}
              />
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-box-border bg-box-bg/70 shadow-sm backdrop-blur-xl">
          <div className="border-b border-box-border p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-heading">Tasks</h2>

                <p className="mt-1 text-xs text-text-muted">
                  Showing 5 most recent tasks for this project.
                </p>
              </div>

              <span className="text-xs font-semibold text-text-muted space-y-2">
                <p>{workspace.total_tasks} total</p>
                <a href="/admin/tasks" className="text-blue-500 underline">
                  View all
                </a>
              </span>
            </div>
          </div>

          {workspace.tasks.length > 0 ? (
            <div className="divide-y divide-box-border">
              {workspace.tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-heading">
                      {task.title}
                    </p>

                    <p className="mt-1 text-xs text-text-muted">
                      Due {formatDate(task.due_date)}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getTaskStatusClasses(
                      task.status
                    )}`}
                  >
                    {formatLabel(task.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-text-muted">
              No tasks have been added to this Project.
            </p>
          )}
        </article>

        <article className="overflow-hidden rounded-2xl border border-box-border bg-box-bg/70 shadow-sm backdrop-blur-xl">
          <div className="border-b border-box-border p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-heading">Invoices</h2>

                <p className="mt-1 text-xs text-text-muted">
                  Invoices linked to this Project.
                </p>
              </div>

              <span className="text-xs font-semibold text-text-muted">
                {workspace.invoices.length} total
              </span>
            </div>
          </div>

          {workspace.invoices.length > 0 ? (
            <div className="divide-y divide-box-border">
              {workspace.invoices.slice(0, 6).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-start justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-heading">
                      {invoice.invoice_number}
                    </p>

                    <p className="mt-1 text-xs text-text-muted">
                      Due {formatDate(invoice.due_date)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-heading">
                      {formatCurrency(
                        Number(invoice.total_amount),
                        invoice.currency
                      )}
                    </p>

                    <p className="mt-1 text-xs text-text-muted">
                      {formatLabel(invoice.status)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-text-muted">
              No invoices are linked to this Project.
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
