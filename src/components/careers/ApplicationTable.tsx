import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  FileSearch,
  LoaderCircle,
  Mail,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getJobApplications } from "../../lib/jobApplications";
import type {
  JobApplicationStatus,
  JobApplicationWithOpening,
} from "../..//types/jobApplication";
import ApplicationStatusBadge from "./ApplicationStatusBadge";

type StatusFilter = JobApplicationStatus | "all";

interface JobFilterOption {
  id: string;
  title: string;
}

const APPLICATION_STATUSES: Array<{
  value: StatusFilter;
  label: string;
}> = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "in_review", label: "In review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "assessment", label: "Assessment" },
  { value: "offered", label: "Offered" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

/**
 * Formats an ISO date into a concise, readable application date.
 */
function formatApplicationDate(date: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Formats a candidate's location while providing a fallback value.
 */
function formatLocation(location: string | null): string {
  return location?.trim() || "Not provided";
}

/**
 * Produces a list of unique jobs represented in the loaded applications.
 */
function getJobFilterOptions(
  applications: JobApplicationWithOpening[]
): JobFilterOption[] {
  const uniqueJobs = new Map<string, string>();

  applications.forEach((application) => {
    if (application.job_opening) {
      uniqueJobs.set(application.job_opening.id, application.job_opening.title);
    }
  });

  return Array.from(uniqueJobs.entries())
    .map(([id, title]) => ({
      id,
      title,
    }))
    .sort((firstJob, secondJob) =>
      firstJob.title.localeCompare(secondJob.title)
    );
}

/**
 * Displays and filters all job applications available to an administrator.
 */
export default function ApplicationTable() {
  const [applications, setApplications] = useState<JobApplicationWithOpening[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Loads all applications required by the dashboard.
   */
  async function loadApplications() {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const applicationData = await getJobApplications();

      setApplications(applicationData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load job applications.";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Loads applications when the component first becomes active.
   */
  useEffect(() => {
    void loadApplications();
  }, []);

  /**
   * Builds the available job filter options from existing applications.
   */
  const jobFilterOptions = useMemo(
    () => getJobFilterOptions(applications),
    [applications]
  );

  /**
   * Filters applications locally using the current search and filter values.
   */
  const filteredApplications = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return applications.filter((application) => {
      const jobTitle = application.job_opening?.title.toLowerCase() ?? "";

      const matchesSearch =
        !normalizedSearchTerm ||
        application.full_name.toLowerCase().includes(normalizedSearchTerm) ||
        application.email.toLowerCase().includes(normalizedSearchTerm) ||
        application.phone.toLowerCase().includes(normalizedSearchTerm) ||
        application.current_job_title
          ?.toLowerCase()
          .includes(normalizedSearchTerm) ||
        jobTitle.includes(normalizedSearchTerm);

      const matchesStatus =
        statusFilter === "all" || application.status === statusFilter;

      const matchesJob =
        jobFilter === "all" || application.job_opening_id === jobFilter;

      return matchesSearch && matchesStatus && matchesJob;
    });
  }, [applications, jobFilter, searchTerm, statusFilter]);

  /**
   * Calculates the dashboard totals displayed above the application table.
   */
  const applicationStatistics = useMemo(() => {
    return {
      total: applications.length,
      new: applications.filter((application) => application.status === "new")
        .length,
      interviewing: applications.filter((application) =>
        ["interview", "assessment"].includes(application.status)
      ).length,
      hired: applications.filter(
        (application) => application.status === "hired"
      ).length,
    };
  }, [applications]);

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-box-border bg-white/70 p-8 backdrop-blur-xl dark:bg-box-bg/70">
        <div className="flex flex-col items-center gap-3 text-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Loading job applications...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50/80 p-8 text-center dark:border-red-900/60 dark:bg-red-950/30">
        <CircleAlert className="mx-auto h-10 w-10 text-red-600 dark:text-red-400" />

        <h2 className="mt-4 text-lg font-semibold text-red-900 dark:text-red-200">
          Applications could not be loaded
        </h2>

        <p className="mx-auto mt-2 max-w-xl text-sm text-red-700 dark:text-red-300">
          {errorMessage}
        </p>

        <button
          type="button"
          onClick={() => void loadApplications()}
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-box-border bg-white/70 p-5 backdrop-blur-xl dark:bg-box-bg/70">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total applications
              </p>

              <p className="mt-2 text-3xl font-bold text-heading">
                {applicationStatistics.total}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-box-border bg-white/70 p-5 backdrop-blur-xl dark:bg-box-bg/70">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                New applications
              </p>

              <p className="mt-2 text-3xl font-bold text-heading">
                {applicationStatistics.new}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Mail className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-box-border bg-white/70 p-5 backdrop-blur-xl dark:bg-box-bg/70">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Interviewing
              </p>

              <p className="mt-2 text-3xl font-bold text-heading">
                {applicationStatistics.interviewing}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-box-border bg-white/70 p-5 backdrop-blur-xl dark:bg-box-bg/70">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Hired candidates
              </p>

              <p className="mt-2 text-3xl font-bold text-heading">
                {applicationStatistics.hired}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-box-border bg-white/70 p-5 backdrop-blur-xl dark:bg-box-bg/70">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_260px]">
          <label className="relative block">
            <span className="sr-only">Search applications</span>

            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search candidate, email, role or job..."
              className="w-full rounded-xl border border-box-border bg-transparent py-3 pl-11 pr-4 text-sm text-heading outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>

          <label>
            <span className="sr-only">Filter by status</span>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="w-full rounded-xl border border-box-border bg-white px-4 py-3 text-sm text-heading outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 dark:bg-box-bg"
            >
              {APPLICATION_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Filter by job opening</span>

            <select
              value={jobFilter}
              onChange={(event) => setJobFilter(event.target.value)}
              className="w-full rounded-xl border border-box-border bg-white px-4 py-3 text-sm text-heading outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 dark:bg-box-bg"
            >
              <option value="all">All job openings</option>

              {jobFilterOptions.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-box-border bg-white/50 px-6 py-16 text-center dark:bg-box-bg/50">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileSearch className="h-7 w-7" />
          </div>

          <h2 className="mt-5 text-xl font-semibold text-heading">
            No applications yet
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-600 dark:text-gray-400">
            Candidate applications will appear here after the public application
            form is connected.
          </p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-box-border bg-white/50 px-6 py-14 text-center dark:bg-box-bg/50">
          <Search className="mx-auto h-8 w-8 text-gray-400" />

          <h2 className="mt-4 text-lg font-semibold text-heading">
            No matching applications
          </h2>

          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Adjust the search term or filters to see more candidates.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-box-border bg-white/70 backdrop-blur-xl dark:bg-box-bg/70">
          <div className="border-b border-box-border px-5 py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing{" "}
              <span className="font-semibold text-heading">
                {filteredApplications.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-heading">
                {applications.length}
              </span>{" "}
              applications
            </p>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[960px]">
              <thead className="border-b border-box-border bg-gray-50/70 text-left dark:bg-white/[0.03]">
                <tr>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Candidate
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Position
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Applied
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-box-border">
                {filteredApplications.map((application) => (
                  <tr
                    key={application.id}
                    className="transition hover:bg-gray-50/70 dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-heading">
                          {application.full_name}
                        </p>

                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {application.email}
                        </p>

                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {formatLocation(application.location)}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-heading">
                        {application.job_opening?.title ??
                          "Deleted job opening"}
                      </p>

                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {application.current_job_title ||
                          "Current title not provided"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <ApplicationStatusBadge status={application.status} />
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatApplicationDate(application.created_at)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <a
                        href={`/admin/careers/applications/${application.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
                      >
                        View
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-box-border lg:hidden">
            {filteredApplications.map((application) => (
              <article key={application.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-heading">
                      {application.full_name}
                    </h2>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {application.email}
                    </p>
                  </div>

                  <ApplicationStatusBadge status={application.status} />
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start gap-2">
                    <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0" />

                    <span>
                      {application.job_opening?.title ?? "Deleted job opening"}
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />

                    <span>{formatLocation(application.location)}</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />

                    <span>
                      Applied {formatApplicationDate(application.created_at)}
                    </span>
                  </div>
                </div>

                <a
                  href={`/admin/careers/applications/${application.id}`}
                  className="mt-5 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-box-border px-4 py-2.5 text-sm font-semibold text-heading transition hover:border-primary hover:text-primary"
                >
                  View application
                  <ChevronRight className="h-4 w-4" />
                </a>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
