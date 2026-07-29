import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Plus, Search } from "lucide-react";
import { getProjects } from "../../../lib/projects";
import type {
  ProjectStatus,
  ProjectType,
  ProjectWithTaskStats,
} from "../../../types/project";
import ProjectCard from "./ProjectCard";
import SitePreloader from "../../shared/Preloader";

/* Displays and filters every project available to the authenticated staff user. */
export default function ProjectsGrid() {
  const [projects, setProjects] = useState<ProjectWithTaskStats[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>(
    "all"
  );
  const [typeFilter, setTypeFilter] = useState<"all" | ProjectType>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  /* Loads project records when the component first mounts. */
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const projectData = await getProjects();

        setProjects(projectData);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "We could not load the projects."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

  /* Filters projects using the selected search, status and type values. */
  const filteredProjects = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !normalizedSearchTerm ||
        project.name.toLowerCase().includes(normalizedSearchTerm) ||
        project.project_code.toLowerCase().includes(normalizedSearchTerm) ||
        project.client_name?.toLowerCase().includes(normalizedSearchTerm);

      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;

      const matchesType =
        typeFilter === "all" || project.project_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [projects, searchTerm, statusFilter, typeFilter]);

  if (isLoading) {
    return <SitePreloader />;
  }

  if (errorMessage) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-600 dark:text-red-300">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="p-12">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-heading">
            Projects
          </h1>

          <p className="mt-2 text-sm text-text-muted">
            Manage CloudTweak internal initiatives and client contracts.
          </p>
        </div>

        <a
          href="/admin/projects/new"
          className="inline-flex w-max items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Project
        </a>
      </div>

      <div className="mt-8 grid gap-4 rounded-3xl backdrop-blur-xl md:grid-cols-[minmax(0,1fr)_180px_180px]">
        <label className="relative">
          <span className="sr-only">Search projects</span>

          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, code or client..."
            className="w-full rounded-xl border border-box-border bg-body py-3 pl-11 pr-4 text-sm text-heading outline-none transition placeholder:text-text-muted focus:border-primary"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "all" | ProjectStatus)
          }
          className="rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading outline-none transition focus:border-primary"
        >
          <option value="all">All statuses</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>

        <select
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(event.target.value as "all" | ProjectType)
          }
          className="rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading outline-none transition focus:border-primary"
        >
          <option value="all">All project types</option>
          <option value="internal">Internal</option>
          <option value="client">Client</option>
        </select>
      </div>

      {filteredProjects.length > 0 ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="mt-8 flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-box-border bg-box-bg/40 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <FolderKanban className="h-7 w-7 text-primary" />
          </div>

          <h2 className="mt-5 text-xl font-semibold text-heading">
            No projects found
          </h2>

          <p className="mt-2 max-w-md text-sm leading-7 text-text-muted">
            Create your first project or adjust the selected filters to find an
            existing project.
          </p>

          <a
            href="/admin/projects/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </a>
        </div>
      )}
    </div>
  );
}
