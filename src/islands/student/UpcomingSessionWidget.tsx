import { CalendarDays, Video } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getNextStudentLiveSession,
  getStudentLiveSessions,
} from "../../lib/academy";
import type { UpcomingSession } from "../../types/academy";

type DashboardSession = UpcomingSession & {
  status?: "scheduled" | "cancelled" | "completed";
};

// Displays the next scheduled session and session counts in the dashboard header.
export default function UpcomingSessionWidget() {
  const [session, setSession] = useState<UpcomingSession | null>(null);
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Loads the next session and the complete session list.
  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        setLoading(true);
        setError(null);

        const [nextSession, allSessions] = await Promise.all([
          getNextStudentLiveSession(),
          getStudentLiveSessions(),
        ]);

        if (isMounted) {
          setSession(nextSession);
          setSessions(allSessions);
        }
      } catch (err) {
        console.error("Failed to load upcoming sessions:", err);

        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load upcoming sessions."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Formats dates and times in the browser's local timezone.
  const formatSessionDate = (date: Date) =>
    new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
    }).format(date);

  const formatSessionTime = (date: Date) =>
    new Intl.DateTimeFormat("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);

  const now = Date.now();

  const upcomingCount = sessions.filter((item) => {
    const start = new Date(item.startAt).getTime();

    return item.status === "scheduled" && Number.isFinite(start) && start > now;
  }).length;

  const liveCount = sessions.filter((item) => {
    const start = new Date(item.startAt).getTime();
    const end = item.endAt ? new Date(item.endAt).getTime() : NaN;

    return (
      item.status === "scheduled" &&
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      start <= now &&
      now <= end
    );
  }).length;

  const startDate = session?.startAt ? new Date(session.startAt) : null;

  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
      <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 sm:flex">
        <CalendarDays className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1 mr-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
          Live sessions
        </p>

        {loading ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Loading session...
          </p>
        ) : error ? (
          <p
            className="max-w-[200px] truncate text-xs text-red-600 dark:text-red-400"
            title={error}
          >
            Session unavailable
          </p>
        ) : !session ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No upcoming session
          </p>
        ) : (
          <>
            <p
              className="max-w-[190px] truncate text-xs font-semibold text-slate-900 dark:text-white"
              title={session.title}
            >
              {session.title}
            </p>

            {startDate && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {formatSessionDate(startDate)} · {formatSessionTime(startDate)}
              </p>
            )}
            <div className="flex shrink-0 items-center gap-2">
              <a
                href="/student/live-sessions"
                className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950"
                aria-label={`View upcoming sessions: ${upcomingCount}`}
              >
                Upcoming ({loading || error ? "—" : upcomingCount})
              </a>

              <a
                href="/student/live-sessions"
                className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 transition hover:bg-green-100 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-950"
                aria-label={`View live sessions: ${liveCount}`}
              >
                Live ({loading || error ? "—" : liveCount})
              </a>
              {session && !loading && !error && (
                <a
                  href={session.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Join ${session.title}`}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white transition hover:opacity-90"
                >
                  <Video className="h-3.5 w-3.5" />
                  Join
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
