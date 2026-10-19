import { useCallback, useEffect, useRef, useState } from "react";
import {
  Award,
  Bell,
  BookOpen,
  CalendarClock,
  Check,
  CreditCard,
  LoaderCircle,
  Megaphone,
} from "lucide-react";
import { studentSupabase } from "../../lib/superbase";
import {
  markAllStudentNotificationsAsRead,
  getStudentNotifications,
  markStudentNotificationAsRead,
  subscribeToStudentNotifications,
  unsubscribeFromStudentNotifications,
  type StudentNotificationType,
  type StudentNotification,
} from "../../lib/studentNotifications";

const icons: Record<StudentNotificationType, typeof Bell> = {
  academy_payment: CreditCard,
  academy_course: BookOpen,
  academy_session: CalendarClock,
  academy_certificate: Award,
  academy_announcement: Megaphone,
};

// Format a notification timestamp using the visitor's locale.
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function StudentNotificationBell() {
  const [items, setItems] = useState<StudentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const unread = items.filter((item) => !item.is_read).length;

  // Load the current student's feed.
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await getStudentNotifications());
    } catch (err) {
      console.error("Unable to load student notifications:", err);
      setError("Notifications are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Establish a recipient-filtered Realtime subscription after authentication.
  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof subscribeToStudentNotifications> | null =
      null;

    // Initialize the notification feed and its Realtime subscription independently.
    async function start() {
      try {
        const { data, error: authError } = await studentSupabase.auth.getUser();

        if (authError) throw authError;

        if (!active) return;

        if (!data.user) {
          setItems([]);
          setLoading(false);
          return;
        }

        // Load notifications independently of Realtime.
        await load();

        if (!active) return;

        // Realtime failure should not mark a successfully loaded feed unavailable.
        try {
          channel = subscribeToStudentNotifications(
            data.user.id,
            (next) => {
              if (!active) return;

              setItems((current) => [
                next,
                ...current.filter((item) => item.id !== next.id),
              ]);
            },
            (next) => {
              if (!active) return;

              setItems((current) =>
                current.map((item) => (item.id === next.id ? next : item))
              );
            }
          );
        } catch (realtimeError) {
          console.error(
            "Unable to initialize student notification realtime subscription:",
            realtimeError
          );
        }
      } catch (err) {
        console.error("Unable to initialize student notifications:", err);

        if (active) {
          setError("Notifications are temporarily unavailable.");
          setLoading(false);
        }
      }
    }

    void start();
    return () => {
      active = false;
      if (channel) void unsubscribeFromStudentNotifications(channel);
    };
  }, [load]);

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node))
        setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  // Mark a single notification read and synchronize local state.
  async function markRead(id: string) {
    try {
      const updated = await markStudentNotificationAsRead(id);
      setItems((current) =>
        current.map((item) => (item.id === id ? updated : item))
      );
    } catch (err) {
      console.error("Unable to mark notification as read:", err);
      setError("Could not update that notification.");
    }
  }

  // Mark every unread notification in the student's feed as read.
  async function markAllRead() {
    if (busy || unread === 0) return;
    setBusy(true);
    setError("");
    try {
      const readAt = await markAllStudentNotificationsAsRead();
      setItems((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at ?? readAt,
        }))
      );
    } catch (err) {
      console.error("Unable to mark all notifications as read:", err);
      setError("Could not mark notifications as read.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label={
          unread ? `Notifications, ${unread} unread` : "Notifications"
        }
        aria-expanded={open}
      >
        <Bell size={19} />
        {/* Keep the unread badge visible, including when the count is zero. */}
        <span
          className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ring-2 ring-white dark:ring-slate-900 ${
            unread > 0
              ? "bg-rose-500 text-white"
              : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
          }`}
          aria-label={`${unread} unread notifications`}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      </button>

      {open && (
        <section
          className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
          aria-label="Student notifications"
        >
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Notifications
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {unread ? `${unread} unread` : "You're all caught up"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={busy || unread === 0}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50 dark:text-teal-300 dark:hover:bg-teal-950/50"
            >
              {busy ? (
                <LoaderCircle size={13} className="animate-spin" />
              ) : (
                <Check size={13} />
              )}{" "}
              Mark all read
            </button>
          </header>
          {error && (
            <p className="px-4 py-3 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}
          <div className="max-h-[26rem] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
                <LoaderCircle size={16} className="animate-spin" /> Loading
                notifications…
              </div>
            ) : items.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell size={23} className="mx-auto text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Academy updates will appear here.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const Icon = icons[item.type] ?? Bell;
                const body = (
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 border text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {item.title}
                        </span>
                        {!item.is_read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                        )}
                      </span>
                      {item.message && (
                        <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">
                          {item.message}
                        </span>
                      )}
                      <span className="mt-2 block text-[10px] text-slate-400">
                        {formatDate(item.created_at)}
                      </span>
                    </span>
                  </div>
                );
                return (
                  <article
                    key={item.id}
                    className={`border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800 ${item.is_read ? "" : "bg-orange-50 dark:bg-orange-950/20"}`}
                  >
                    {item.link ? (
                      <a
                        href={item.link}
                        onClick={() => {
                          if (!item.is_read) void markRead(item.id);
                          setOpen(false);
                        }}
                        className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        {body}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!item.is_read) void markRead(item.id);
                        }}
                        className="block w-full rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        {body}
                      </button>
                    )}
                  </article>
                );
              })
            )}
          </div>
          <footer className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <a
              href="/student/notifications"
              className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-300"
            >
              View all notifications
            </a>
          </footer>
        </section>
      )}
    </div>
  );
}
