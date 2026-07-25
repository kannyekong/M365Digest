import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  JobApplicationStatus,
  JobApplicationWithOpening,
} from "../../../types/jobApplication";
import ApplicationStatusBadge from "../../careers/ApplicationStatusBadge";

interface ApplicationDetailsProps {
  application: JobApplicationWithOpening;
}

const APPLICATION_STATUSES: Array<{
  value: JobApplicationStatus;
  label: string;
}> = [
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
 * Formats an ISO date into a readable date and time.
 */
function formatApplicationDate(date: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Converts an application status into its readable label.
 */
function getStatusLabel(status: JobApplicationStatus): string {
  return (
    APPLICATION_STATUSES.find((option) => option.value === status)?.label ??
    status
  );
}

/**
 * Returns a trimmed text value or a fallback when no value was supplied.
 */
function getDisplayValue(value: unknown, fallback = "Not provided"): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    return value.trim() || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

/**
 * Ensures external URLs have a supported protocol before being used as links.
 */
function normalizeExternalUrl(url: string): string {
  const trimmedUrl = url.trim();

  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

/**
 * Extracts the stored resume file name from a Supabase storage path.
 */
function getResumeFileName(resumePath: string | null | undefined): string {
  if (!resumePath) {
    return "Resume file";
  }

  const pathSegments = resumePath.split("/");
  const fileName = pathSegments[pathSegments.length - 1];

  return decodeURIComponent(fileName || "Resume file");
}

/**
 * Renders an administrator-facing view of an individual job application.
 */
export default function ApplicationDetails({
  application,
}: ApplicationDetailsProps) {
  const [status, setStatus] = useState<JobApplicationStatus>(
    application.status
  );
  const [savedStatus, setSavedStatus] = useState<JobApplicationStatus>(
    application.status
  );
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  /**
   * Determines whether the selected status differs from the saved status.
   */
  const hasStatusChanged = useMemo(
    () => status !== savedStatus,
    [savedStatus, status]
  );

  /**
   * Builds the protected endpoint used to retrieve the candidate's resume.
   */
  const resumeDownloadUrl = useMemo(
    () => `/api/admin/careers/applications/${application.id}/resume`,
    [application.id]
  );

  /**
   * Saves the selected application status through the protected API route.
   */
  async function handleStatusSave() {
    if (!hasStatusChanged || isSavingStatus) {
      return;
    }

    try {
      setIsSavingStatus(true);
      setStatusError(null);
      setStatusMessage(null);

      const response = await fetch(
        `/api/admin/careers/applications/${application.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to update the application status."
        );
      }

      setSavedStatus(status);
      setStatusMessage(
        `Application moved to ${getStatusLabel(status).toLowerCase()}.`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update the application status.";

      setStatusError(message);
    } finally {
      setIsSavingStatus(false);
    }
  }

  return (
    <div className="space-y-6 p-6 md:p-8 xl:p-12">
      <div>
        <a
          href="/admin/careers/applications"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-primary dark:text-gray-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to applications
        </a>
      </div>

      <section className="overflow-hidden rounded-3xl border border-box-border bg-white/70 backdrop-blur-xl dark:bg-box-bg/70">
        <div className="border-b border-box-border p-6 md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserRound className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="wrap-break-word text-2xl font-bold text-heading md:text-3xl">
                    {application.full_name}
                  </h1>

                  <ApplicationStatusBadge status={savedStatus} />
                </div>

                <p className="mt-2 text-base font-medium text-gray-700 dark:text-gray-300">
                  {application.job_opening?.title ?? "Deleted job opening"}
                </p>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Applied {formatApplicationDate(application.created_at)}
                  </span>

                  {application.reference && (
                    <span className="inline-flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {application.reference}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={`mailto:${application.email}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-box-border px-4 py-2.5 text-sm font-semibold text-heading transition hover:border-primary hover:text-primary"
              >
                <Mail className="h-4 w-4" />
                Email candidate
              </a>

              {application.resume_path && (
                <a
                  href={resumeDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  <Download className="h-4 w-4" />
                  Download resume
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid divide-y divide-box-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Email address
            </p>

            <a
              href={`mailto:${application.email}`}
              className="mt-2 block break-all text-sm font-semibold text-heading transition hover:text-primary"
            >
              {application.email}
            </a>
          </div>

          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Phone number
            </p>

            <a
              href={`tel:${application.phone}`}
              className="mt-2 block text-sm font-semibold text-heading transition hover:text-primary"
            >
              {application.phone}
            </a>
          </div>

          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Location
            </p>

            <p className="mt-2 text-sm font-semibold text-heading">
              {getDisplayValue(application.location)}
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Experience
            </p>

            <p className="mt-2 text-sm font-semibold text-heading">
              {application.years_experience !== null &&
              application.years_experience !== undefined
                ? `${application.years_experience} year${
                    application.years_experience === 1 ? "" : "s"
                  }`
                : "Not provided"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-6">
          <section className="rounded-3xl border border-box-border bg-white/70 p-6 backdrop-blur-xl dark:bg-box-bg/70 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserRound className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-heading">
                  Candidate information
                </h2>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Professional and contact details provided by the applicant.
                </p>
              </div>
            </div>

            <dl className="mt-7 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-box-border p-4">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <Building2 className="h-4 w-4" />
                  Current company
                </dt>

                <dd className="mt-2 text-sm font-semibold text-heading">
                  {getDisplayValue(application.current_company)}
                </dd>
              </div>

              <div className="rounded-2xl border border-box-border p-4">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <BriefcaseBusiness className="h-4 w-4" />
                  Current job title
                </dt>

                <dd className="mt-2 text-sm font-semibold text-heading">
                  {getDisplayValue(application.current_job_title)}
                </dd>
              </div>

              <div className="rounded-2xl border border-box-border p-4">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <Clock3 className="h-4 w-4" />
                  Notice period
                </dt>

                <dd className="mt-2 text-sm font-semibold text-heading">
                  {getDisplayValue(application.notice_period)}
                </dd>
              </div>

              <div className="rounded-2xl border border-box-border p-4">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <WalletCards className="h-4 w-4" />
                  Salary expectation
                </dt>

                <dd className="mt-2 text-sm font-semibold text-heading">
                  {getDisplayValue(application.salary_expectation)}
                </dd>
              </div>

              <div className="rounded-2xl border border-box-border p-4 sm:col-span-2">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <ShieldCheck className="h-4 w-4" />
                  Work authorization
                </dt>

                <dd className="mt-2 text-sm font-semibold text-heading">
                  {getDisplayValue(application.work_authorization)}
                </dd>
              </div>
            </dl>

            {(application.linkedin_url || application.portfolio_url) && (
              <div className="mt-5 flex flex-wrap gap-3">
                {application.linkedin_url && (
                  <a
                    href={normalizeExternalUrl(application.linkedin_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-box-border px-4 py-2.5 text-sm font-semibold text-heading transition hover:border-primary hover:text-primary"
                  >
                    LinkedIn
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                {application.portfolio_url && (
                  <a
                    href={normalizeExternalUrl(application.portfolio_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-box-border px-4 py-2.5 text-sm font-semibold text-heading transition hover:border-primary hover:text-primary"
                  >
                    <Globe2 className="h-4 w-4" />
                    Portfolio
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-box-border bg-white/70 p-6 backdrop-blur-xl dark:bg-box-bg/70 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-heading">
                  Cover letter
                </h2>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The candidate&apos;s introduction and supporting statement.
                </p>
              </div>
            </div>

            <div className="mt-6 whitespace-pre-wrap wrap-break-word text-sm leading-7 text-gray-700 dark:text-gray-300">
              {getDisplayValue(
                application.cover_letter,
                "No cover letter was provided."
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-box-border bg-white/70 p-6 backdrop-blur-xl dark:bg-box-bg/70 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-heading">
                  Interest in the position
                </h2>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Why the candidate wants to join the organisation.
                </p>
              </div>
            </div>

            <div className="mt-6 whitespace-pre-wrap wrap-break-word text-sm leading-7 text-gray-700 dark:text-gray-300">
              {getDisplayValue(
                application.interest_reason,
                "No interest statement was provided."
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-box-border bg-white/70 p-6 backdrop-blur-xl dark:bg-box-bg/70">
            <h2 className="text-lg font-semibold text-heading">
              Recruiter actions
            </h2>

            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Review and update the candidate&apos;s recruitment stage.
            </p>

            <label className="mt-6 block">
              <span className="text-sm font-semibold text-heading">
                Application status
              </span>

              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as JobApplicationStatus);
                  setStatusError(null);
                  setStatusMessage(null);
                }}
                className="mt-2 w-full rounded-xl border border-box-border bg-white px-4 py-3 text-sm text-heading outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 dark:bg-box-bg"
              >
                {APPLICATION_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={!hasStatusChanged || isSavingStatus}
              onClick={() => void handleStatusSave()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingStatus ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Saving status...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save status
                </>
              )}
            </button>

            {statusMessage && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {statusError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{statusError}</span>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-box-border bg-white/70 p-6 backdrop-blur-xl dark:bg-box-bg/70">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileText className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="font-semibold text-heading">Resume</h2>

                <p className="mt-1 break-all text-sm text-gray-600 dark:text-gray-400">
                  {application.resume_path
                    ? getResumeFileName(application.resume_path)
                    : "No resume uploaded"}
                </p>
              </div>
            </div>

            {application.resume_path && (
              <a
                href={resumeDownloadUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-box-border px-4 py-2.5 text-sm font-semibold text-heading transition hover:border-primary hover:text-primary"
              >
                <Download className="h-4 w-4" />
                Open resume
              </a>
            )}
          </section>

          <section className="rounded-3xl border border-box-border bg-white/70 p-6 backdrop-blur-xl dark:bg-box-bg/70">
            <h2 className="font-semibold text-heading">Position details</h2>

            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Job title
                </dt>

                <dd className="mt-1 text-sm font-semibold text-heading">
                  {application.job_opening?.title ?? "Deleted job opening"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Department
                </dt>

                <dd className="mt-1 text-sm font-semibold text-heading">
                  {getDisplayValue(application.job_opening?.department)}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Opening status
                </dt>

                <dd className="mt-1 text-sm font-semibold capitalize text-heading">
                  {getDisplayValue(application.job_opening?.status)}
                </dd>
              </div>
            </dl>

            {application.job_opening?.slug && (
              <a
                href={`/careers/${application.job_opening.slug}`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                View public job page
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </section>

          <section className="rounded-3xl border border-box-border bg-white/70 p-6 backdrop-blur-xl dark:bg-box-bg/70">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

              <div>
                <h2 className="font-semibold text-heading">
                  Candidate location
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                  {getDisplayValue(application.location)}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

              <div>
                <h2 className="font-semibold text-heading">Phone number</h2>

                <a
                  href={`tel:${application.phone}`}
                  className="mt-1 block text-sm text-gray-600 transition hover:text-primary dark:text-gray-400"
                >
                  {application.phone}
                </a>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

              <div className="min-w-0">
                <h2 className="font-semibold text-heading">Email address</h2>

                <a
                  href={`mailto:${application.email}`}
                  className="mt-1 block break-all text-sm text-gray-600 transition hover:text-primary dark:text-gray-400"
                >
                  {application.email}
                </a>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
