import { CalendarDays, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { getNextStudentLiveSession } from "../../lib/academy";
import type { UpcomingSession } from "../../types/academy";

// Displays the next scheduled session in a compact dashboard header.
export default function UpcomingSessionWidget() {
  const [session, setSession] = useState<UpcomingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Loads the next session and preserves errors for visible feedback.
  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        setLoading(true);
        setError(null);

        const nextSession = await getNextStudentLiveSession();

        if (isMounted) {
          setSession(nextSession);
        }
      } catch (err) {
        console.error("Failed to load upcoming session:", err);

        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load the upcoming session."
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

  // Formats the session date and time in the browser's local timezone.
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

  const startDate = session ? new Date(session.startAt) : null;

  return (
    <div className="flex min-w-0 max-w-[320px] items-center gap-3">
      <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 sm:flex">
        <CalendarDays className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
          Upcoming session
        </p>

        {loading ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Loading session...
          </p>
        ) : error ? (
          <p
            className="max-w-[200px] truncate text-xs text-red-600"
            title={error}
          >
            Session unavailable
          </p>
        ) : !session ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No upcoming sessions
          </p>
        ) : (
          <>
            <p
              className="max-w-[190px] truncate text-xs font-semibold text-slate-900 dark:text-white"
              title={session.title}
            >
              {session.title}
            </p>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {startDate && formatSessionDate(startDate)} ·{" "}
              {startDate && formatSessionTime(startDate)}
            </p>
          </>
        )}
      </div>

      {session && !loading && !error && (
        <a
          href={session.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Join ${session.title}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 py-2 text-xs font-semibold text-white transition hover:opacity-90"
        >
          <Video className="h-3.5 w-3.5" />
          Join
        </a>
      )}
    </div>
  );
}
