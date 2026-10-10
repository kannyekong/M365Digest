import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase/client";
import { toast } from "react-toastify";
type SessionPlatform = "teams" | "zoom" | "google_meet" | "other";

type SessionStatus = "scheduled" | "cancelled" | "completed";

interface ProgramOption {
  id: string;
  title: string;
}

interface LiveSession {
  id: string;
  program_id: string;
  module_id: string | null;
  lesson_id: string | null;
  resource_id: string | null;
  title: string;
  description: string | null;
  platform: SessionPlatform;
  meeting_url: string;
  start_at: string;
  end_at: string | null;
  is_published: boolean;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  program: {
    title: string;
  } | null;
}

interface SessionForm {
  programId: string;
  title: string;
  description: string;
  platform: SessionPlatform;
  meetingUrl: string;
  startAt: string;
  endAt: string;
  isPublished: boolean;
}

const PAGE_SIZE = 10;

const emptyForm: SessionForm = {
  programId: "",
  title: "",
  description: "",
  platform: "teams",
  meetingUrl: "",
  startAt: "",
  endAt: "",
  isPublished: true,
};

/**
 * Convert a database timestamp into the value expected by a datetime-local input.
 */
function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

/**
 * Convert a datetime-local value into an ISO timestamp for Supabase.
 */
function toIsoTimestamp(value: string) {
  return new Date(value).toISOString();
}

/**
 * Format a live-session date and time for the admin interface.
 */
function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Return the human-readable platform label.
 */
function getPlatformLabel(platform: SessionPlatform) {
  const labels: Record<SessionPlatform, string> = {
    teams: "Microsoft Teams",
    zoom: "Zoom",
    google_meet: "Google Meet",
    other: "Other",
  };

  return labels[platform];
}

/**
 * Return the appropriate visual treatment for a session status.
 */
function getStatusClasses(status: SessionStatus) {
  const classes: Record<SessionStatus, string> = {
    scheduled:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    completed:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    cancelled: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };

  return classes[status];
}

/**
 * Display the complete live-session management workspace.
 */
export default function AcademyLiveSessionsPage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | SessionStatus>("");

  const [page, setPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveSession | null>(
    null
  );
  const [deletingSession, setDeletingSession] = useState<LiveSession | null>(
    null
  );

  const [form, setForm] = useState<SessionForm>(emptyForm);

  /**
   * Load available Academy programs for the session form and filter.
   */
  const loadPrograms = useCallback(async () => {
    const { data, error } = await supabase
      .from("academy_programs")
      .select("id, title")
      .order("title", { ascending: true });

    if (error) {
      throw error;
    }

    setPrograms(data ?? []);
  }, []);

  /**
   * Load live sessions using the current search and filter state.
   */
  const loadSessions = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      let query = supabase
        .from("academy_live_sessions")
        .select(
          `
            id,
            program_id,
            module_id,
            lesson_id,
            resource_id,
            title,
            description,
            platform,
            meeting_url,
            start_at,
            end_at,
            is_published,
            status,
            created_at,
            updated_at,
            program:academy_programs (
              title
            )
          `,
          { count: "exact" }
        )
        .order("start_at", { ascending: true });

      if (programFilter) {
        query = query.eq("program_id", programFilter);
      }

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      if (search.trim()) {
        query = query.ilike("title", `%${search.trim()}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      query = query.range(from, to);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setSessions(
        (data ?? []).map((session) => ({
          id: session.id,
          program_id: session.program_id,
          module_id: session.module_id,
          lesson_id: session.lesson_id,
          resource_id: session.resource_id,
          title: session.title,
          description: session.description,
          platform: session.platform as SessionPlatform,
          meeting_url: session.meeting_url,
          start_at: session.start_at,
          end_at: session.end_at,
          is_published: session.is_published,
          status: session.status as SessionStatus,
          created_at: session.created_at,
          updated_at: session.updated_at,
          program: Array.isArray(session.program)
            ? (session.program[0] ?? null)
            : (session.program ?? null),
        }))
      );
    } catch (error) {
      console.error("Failed to load Academy live sessions:", error);
      setErrorMessage("Live sessions could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, programFilter, search, statusFilter]);

  /**
   * Load the programs and first session page when the component mounts.
   */
  useEffect(() => {
    void Promise.all([loadPrograms(), loadSessions()]);
  }, [loadPrograms, loadSessions]);

  /**
   * Reset the current page when filters change.
   */
  useEffect(() => {
    setPage(1);
  }, [programFilter, statusFilter, search]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage);
    }
  }, [errorMessage]);

  /**
   * Open the create-session modal with a clean form.
   */
  function openCreateModal() {
    setForm(emptyForm);
    setEditingSession(null);
    setShowCreateModal(true);
  }

  /**
   * Open the edit modal and populate it from an existing session.
   */
  function openEditModal(session: LiveSession) {
    setEditingSession(session);
    setShowCreateModal(false);

    setForm({
      programId: session.program_id,
      title: session.title,
      description: session.description ?? "",
      platform: session.platform,
      meetingUrl: session.meeting_url,
      startAt: toDateTimeLocal(session.start_at),
      endAt: toDateTimeLocal(session.end_at),
      isPublished: session.is_published,
    });
  }

  /**
   * Close the session form modal and reset its state.
   */
  function closeFormModal() {
    setShowCreateModal(false);
    setEditingSession(null);
    setForm(emptyForm);
  }

  /**
   * Save either a new session or an existing session.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.programId) {
      setErrorMessage("Please select an Academy program.");
      return;
    }

    if (!form.title.trim()) {
      setErrorMessage("Please enter a session title.");
      return;
    }

    if (!form.meetingUrl.trim()) {
      setErrorMessage("Please enter the meeting URL.");
      return;
    }

    if (!form.startAt) {
      setErrorMessage("Please select a start date and time.");
      return;
    }

    if (form.endAt && new Date(form.endAt) < new Date(form.startAt)) {
      setErrorMessage("The end time cannot be before the start time.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const payload = {
        program_id: form.programId,
        module_id: null,
        lesson_id: null,
        resource_id: null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        platform: form.platform,
        meeting_url: form.meetingUrl.trim(),
        start_at: toIsoTimestamp(form.startAt),
        end_at: form.endAt ? toIsoTimestamp(form.endAt) : null,
        is_published: form.isPublished,
        status: editingSession?.status ?? "scheduled",
      };

      if (editingSession) {
        const { error } = await supabase
          .from("academy_live_sessions")
          .update(payload)
          .eq("id", editingSession.id);

        if (error) {
          throw error;
        }

        setSuccessMessage("Live session updated successfully.");
      } else {
        const { error } = await supabase
          .from("academy_live_sessions")
          .insert(payload);

        if (error) {
          throw error;
        }

        setSuccessMessage("Live session scheduled successfully.");
      }

      closeFormModal();
      await loadSessions();
    } catch (error) {
      console.error("Failed to save Academy live session:", error);
      setErrorMessage("The live session could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  /**
   * Delete the selected live session.
   */
  async function handleDelete() {
    if (!deletingSession) {
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("academy_live_sessions")
        .delete()
        .eq("id", deletingSession.id);

      if (error) {
        throw error;
      }

      setDeletingSession(null);
      setSuccessMessage("Live session deleted successfully.");

      if (sessions.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await loadSessions();
      }
    } catch (error) {
      console.error("Failed to delete Academy live session:", error);
      setErrorMessage("The live session could not be deleted.");
    } finally {
      setSaving(false);
    }
  }

  const totalPages = useMemo(() => {
    // Pagination metadata is intentionally kept simple here.
    // The component uses page-size boundaries and disables navigation when a page is incomplete.
    return sessions.length < PAGE_SIZE ? page : page + 1;
  }, [page, sessions.length]);

  const hasNextPage = sessions.length === PAGE_SIZE;
  const hasPreviousPage = page > 1;

  return (
    <div className="mx-auto max-w-full space-y-6">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
            Live Sessions
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Schedule and manage live Academy classes, workshops and virtual
            sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Plus size={17} />
          Schedule Session
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
          <label className="relative block">
            <span className="sr-only">Search sessions</span>

            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search sessions..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-950"
            />
          </label>

          <select
            value={programFilter}
            onChange={(event) => setProgramFilter(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">All programs</option>

            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.title}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "" | SessionStatus)
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <div className="text-center">
              <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-primary" />

              <p className="mt-3 text-sm text-slate-500">
                Loading live sessions...
              </p>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Video className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />

            <h2 className="mt-4 font-semibold text-slate-900 dark:text-white">
              No live sessions found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Schedule your first Academy live session to get started.
            </p>

            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus size={16} />
              Schedule Session
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Session
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Program
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Schedule
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Platform
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sessions.map((session) => (
                    <tr
                      key={session.id}
                      className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-xs text-slate-900 dark:text-white">
                          {session.title}
                        </p>

                        {session.description ? (
                          <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {session.description}
                          </p>
                        ) : null}

                        {!session.is_published ? (
                          <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                            Unpublished
                          </span>
                        ) : null}
                      </td>

                      <td className="min-w-32 px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {session.program?.title ?? "Unknown program"}
                      </td>

                      <td className="px-2 py-4">
                        <div className="gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <div className="min-w-62 w-full">
                            <p>
                              {" "}
                              <span className="p-0.5 px-1 rounded-full text-white bg-green-500">
                                Start time:
                              </span>{" "}
                              {"  "}
                              {formatSessionDate(session.start_at)}
                            </p>

                            {session.end_at ? (
                              <p className="mt-3 items-center gap-1 text-xs text-slate-400">
                                <span className="p-0.5 px-1 rounded-full text-white bg-orange-500">
                                  End time:
                                </span>
                                {"  "}
                                {formatSessionDate(session.end_at)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="py-4">
                        <p className="text-xs">
                          {getPlatformLabel(session.platform)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            session.status
                          )}`}
                        >
                          {session.status.charAt(0).toUpperCase() +
                            session.status.slice(1)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(session)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                            aria-label={`Edit ${session.title}`}
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingSession(session)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            aria-label={`Delete ${session.title}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <p className="text-sm text-slate-500">
                Page {page}
                {totalPages > page ? ` of ${totalPages}` : ""}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!hasPreviousPage}
                  onClick={() => setPage((currentPage) => currentPage - 1)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={!hasNextPage}
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      {(showCreateModal || editingSession) && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 p-6 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                  {editingSession
                    ? "Edit Live Session"
                    : "Schedule Live Session"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Configure the Academy session details and meeting link.
                </p>
              </div>

              <button
                type="button"
                onClick={closeFormModal}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <label
                  htmlFor="live-session-program"
                  className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  Academy Program
                </label>

                <select
                  id="live-session-program"
                  value={form.programId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      programId: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950"
                  required
                >
                  <option value="">Select program</option>

                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="live-session-title"
                  className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  Session title
                </label>

                <input
                  id="live-session-title"
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="e.g. Microsoft 365 Administration Live Class"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="live-session-description"
                  className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  Description
                </label>

                <textarea
                  id="live-session-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Optional description for students."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="live-session-platform"
                    className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Platform
                  </label>

                  <select
                    id="live-session-platform"
                    value={form.platform}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        platform: event.target.value as SessionPlatform,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="teams">Microsoft Teams</option>
                    <option value="zoom">Zoom</option>
                    <option value="google_meet">Google Meet</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="live-session-url"
                    className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Meeting URL
                  </label>

                  <input
                    id="live-session-url"
                    type="url"
                    value={form.meetingUrl}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        meetingUrl: event.target.value,
                      }))
                    }
                    placeholder="https://..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="live-session-start"
                    className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Start
                  </label>

                  <input
                    id="live-session-start"
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startAt: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="live-session-end"
                    className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    End
                  </label>

                  <input
                    id="live-session-end"
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        endAt: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isPublished: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />

                <span>
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Publish session
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    Published sessions are visible to enrolled students.
                  </span>
                </span>
              </label>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : null}

                  {editingSession ? "Save Changes" : "Schedule Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingSession ? (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <Trash2 size={20} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
              Delete live session?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This will permanently delete{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {deletingSession.title}
              </span>
              .
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeletingSession(null)}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleDelete();
                }}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : null}
                Delete Session
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
