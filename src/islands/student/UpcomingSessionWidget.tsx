import { ArrowRight, CalendarDays, Clock3, Presentation, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { getNextStudentLiveSession } from "../../lib/academy";
import type { UpcomingSession } from "../../types/academy";

export default function UpcomingSessionWidget() {
  const [session, setSession] = useState<UpcomingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads the next available live session for the authenticated student.
   */
  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        setError(null);

        const nextSession = await getNextStudentLiveSession();

        setSession(nextSession);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the upcoming session."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 h-6 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Video className="h-4 w-4 text-primary" />
          Upcoming Session
        </div>

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Unable to load your upcoming session.
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-600">
          <Video className="h-4 w-4 text-orange-600" />
          Upcoming Session
        </div>

        <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          No upcoming sessions
        </p>

        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Your next live class will appear here when scheduled.
        </p>
      </div>
    );
  }

  const startDate = new Date(session.startAt);

  const formattedDate = new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(startDate);

  const formattedTime = new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(startDate);

  const platformLabel = {
    teams: "Microsoft Teams",
    zoom: "Zoom",
    google_meet: "Google Meet",
    other: "Online Session",
  }[session.platform];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-600">
        <Video className="h-4 w-4 text-orange-600" />
        Upcoming Session
      </div>

      <h3 className="mt-3 line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">
        {session.title}
      </h3>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>{formattedTime}</span> • <span>{formattedDate}</span>
        </div>

        <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
          Venue: {platformLabel}
        </div>
      </div>

      <a
        href={session.meetingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
      >
        Join this Session
        <ArrowRight className="h-4 w-4" />
      </a>
      <a
        href={session.meetingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
      >
        View all Sessions
        <Presentation className="h-4 w-4" />
      </a>
    </div>
  );
}
