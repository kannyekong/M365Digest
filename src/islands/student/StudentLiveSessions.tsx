import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  GraduationCap,
  RefreshCw,
  Video,
} from "lucide-react";
import { getStudentLiveSessions } from "../../lib/academy";
import { SiZoom, SiGooglemeet } from "react-icons/si";
import { BsMicrosoftTeams } from "react-icons/bs";

type LiveSession = Awaited<ReturnType<typeof getStudentLiveSessions>>[number];

type SessionFilter = "all" | "upcoming" | "live" | "completed";

// Formats session dates and times in the student's local timezone.
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

// Returns the brand icon and styling for each supported meeting platform.
function getPlatformIcon(platform: string) {
  const normalizedPlatform = platform.toLowerCase().replace(/[\s\_-]+/g, "");

  switch (normalizedPlatform) {
    case "teams":
    case "microsoftteams":
      return {
        Icon: BsMicrosoftTeams,
        className: "text-blue-600",
        label: "Microsoft Teams",
      };

    case "zoom":
      return {
        Icon: SiZoom,
        className: "text-[#2D8CFF]",
        label: "Zoom",
      };

    case "googlemeet":
    case "meet":
      return {
        Icon: SiGooglemeet,
        className: "text-[#00897B]",
        label: "Google Meet",
      };

    default:
      return {
        Icon: Video,
        className: "text-slate-500 dark:text-slate-400",
        label: "Other platform",
      };
  }
}

// Determines the display status from the stored status and schedule.
function getSessionState(session: LiveSession, now: number) {
  const start = new Date(session.startAt).getTime();
  const end = session.endAt ? new Date(session.endAt).getTime() : null;

  if (session.status === "completed" || (end !== null && now > end)) {
    return "completed" as const;
  }

  if (start > now) {
    return "upcoming" as const;
  }

  if (end !== null && now >= start && now <= end) {
    return "live" as const;
  }

  return "started" as const;
}

// Displays all scheduled sessions associated with the student's courses.
export default function StudentLiveSessions() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SessionFilter>("all");
  const [now, setNow] = useState(Date.now());

  // Stores the current page. Each page displays six sessions.
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Reloads sessions without reloading the entire page.
  const loadSessions = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const result = await getStudentLiveSessions();

      setSessions(result);
      setNow(Date.now());
    } catch (err: unknown) {
      // Extract useful details from Supabase and JavaScript errors.
      console.error("Failed to load student live sessions:", err);

      const details =
        typeof err === "object" && err !== null
          ? (err as {
              message?: string;
              details?: string;
              hint?: string;
              code?: string;
            })
          : null;

      setError(
        [
          details?.message,
          details?.details,
          details?.hint,
          details?.code ? `Code: ${details.code}` : null,
        ]
          .filter(Boolean)
          .join(" — ") ||
          (err instanceof Error ? err.message : String(err)) ||
          "Unable to load live sessions. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Loads sessions when the page opens and periodically refreshes their status.
  useEffect(() => {
    void loadSessions();

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [loadSessions]);

  // Filters sessions according to the currently selected tab.
  const visibleSessions = useMemo(() => {
    return sessions.filter((session) => {
      const state = getSessionState(session, now);

      if (filter === "all") return true;
      if (filter === "live") return state === "live";
      if (filter === "upcoming") return state === "upcoming";
      if (filter === "completed") return state === "completed";

      return true;
    });
  }, [sessions, filter, now]);

  // Calculates the number of pages for the selected tab.
  const totalPages = Math.max(1, Math.ceil(visibleSessions.length / pageSize));

  // Returns only the six sessions belonging to the current page.
  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return visibleSessions.slice(startIndex, startIndex + pageSize);
  }, [visibleSessions, currentPage, pageSize]);

  // Keeps the current page valid when sessions change.
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  // Calculates the displayed session range.
  const firstVisibleSession =
    visibleSessions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const lastVisibleSession = Math.min(
    currentPage * pageSize,
    visibleSessions.length
  );

  // Applies contextual colors to each session status.
  function getStatusClasses(state: ReturnType<typeof getSessionState>) {
    switch (state) {
      case "live":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";

      case "upcoming":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";

      case "completed":
        return "bg-green-500 text-white dark:bg-slate-800 dark:text-slate-300";

      default:
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    }
  }

  // Provides readable labels for the session state.
  function getStatusLabel(state: ReturnType<typeof getSessionState>) {
    if (state === "live") return "Live now";
    if (state === "upcoming") return "Upcoming";
    if (state === "completed") return "Completed";

    return "Started";
  }

  const filters: { value: SessionFilter; label: string }[] = [
    { value: "all", label: "All sessions" },
    { value: "upcoming", label: "Upcoming" },
    { value: "live", label: "Live now" },
    { value: "completed", label: "Completed" },
  ];

  // Changes the selected tab and resets pagination to its first page.
  function handleFilterChange(nextFilter: SessionFilter) {
    setFilter(nextFilter);
    setCurrentPage(1);
  }

  // Moves to another page while keeping the page number within valid bounds.
  function goToPage(page: number) {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }

  return (
    <section className="space-y-6">
      {/* Session filters and refresh control. */}
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => handleFilterChange(item.value)}
              aria-pressed={filter === item.value}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filter === item.value
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => void loadSessions(true)}
            disabled={loading || refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading state. */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 p-12 text-center dark:border-slate-800">
          <RefreshCw
            size={24}
            className="mx-auto animate-spin text-orange-500"
          />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Loading your live sessions...
          </p>
        </div>
      ) : error ? (
        /* Error state. */
        <div className="rounded-2xl border border-red-200 p-6 dark:border-red-900">
          <p className="font-semibold text-red-700 dark:text-red-400">
            Unable to load live sessions
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void loadSessions(true)}
            className="mt-4 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Try again
          </button>
        </div>
      ) : visibleSessions.length === 0 ? (
        /* Empty state for the selected tab. */
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-500 dark:bg-orange-950/40">
            <Video size={25} />
          </div>

          <h2 className="mt-4 font-semibold text-slate-900 dark:text-white">
            {filter === "all"
              ? "No live sessions scheduled"
              : `No ${filter === "live" ? "live" : filter} sessions`}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            {filter === "all"
              ? "When a session is published for one of your enrolled courses, it will appear here."
              : "Try another filter or refresh to check for updates."}
          </p>
        </div>
      ) : (
        <>
          {/* Two-column grid on medium and larger screens, one column on mobile. */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {paginatedSessions.map((session) => {
              const state = getSessionState(session, now);

              return (
                <article
                  key={session.id}
                  className="rounded-2xl border border-slate-200  bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between border-b border-slate-200 pb-5 gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                        <GraduationCap size={22} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {session.courseTitle}
                        </p>
                        <h2 className="mt-1 font-semibold text-slate-900 dark:text-white">
                          {session.title}
                        </h2>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getStatusClasses(state)}`}
                    >
                      {getStatusLabel(state)}
                    </span>
                  </div>

                  {session.description && (
                    <p className="mt-4 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                      {session.description}
                    </p>
                  )}

                  <div className="mt-5 space-y-3 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-start gap-2">
                      <CalendarDays
                        size={17}
                        className="mt-0.5 shrink-0 text-blue-500"
                      />
                      <span>{formatDateTime(session.startAt)}</span>
                    </div>

                    {session.endAt && (
                      <div className="flex items-start gap-2">
                        <Clock3
                          size={17}
                          className="mt-0.5 shrink-0 text-orange-500"
                        />
                        <span>Ends {formatDateTime(session.endAt)}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {(() => {
                        const { Icon, className, label } = getPlatformIcon(
                          session.platform
                        );

                        return (
                          <>
                            <Icon
                              size={18}
                              className={`shrink-0 ${className}`}
                            />
                            <span>{label}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {state !== "completed" && (
                    <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                      {state === "upcoming" || state === "live" ? (
                        <a
                          href={session.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                        >
                          <Video size={17} />
                          {state === "live"
                            ? "Join Live Session"
                            : "Join Session"}
                          <ExternalLink size={14} />
                        </a>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          This session has started. Check with your instructor
                          if you need to join late.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* Pagination controls for the currently selected tab. */}
          <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {firstVisibleSession}–{lastVisibleSession}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {visibleSessions.length}
              </span>{" "}
              sessions
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Go to previous page"
                className="inline-flex items-center justify-center gap-1 rounded-full border border-slate-200 p-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ChevronLeft size={16} />
              </button>

              <span
                aria-live="polite"
                className="min-w-[90px] text-center text-sm font-medium text-slate-600 dark:text-slate-300"
              >
                Page {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Go to next page"
                className="inline-flex items-center justify-center gap-1 border border-slate-200 p-3 rounded-full text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
