import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Bell,
  BookOpen,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CreditCard,
  LoaderCircle,
  Megaphone,
  RefreshCw,
} from "lucide-react";
import { studentSupabase } from "../../lib/superbase";
import {
  getStudentNotifications,
  markAllStudentNotificationsAsRead,
  markStudentNotificationAsRead,
  subscribeToStudentNotifications,
  unsubscribeFromStudentNotifications,
  type StudentNotification,
  type StudentNotificationType,
} from "../../lib/studentNotifications";

type FilterType = "all" | "unread" | "read";

const notificationConfig: Record<
  StudentNotificationType,
  { label: string; icon: typeof Bell; color: string }
> = {
  academy_payment: {
    label: "Payment",
    icon: CreditCard,
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  academy_course: {
    label: "Course",
    icon: BookOpen,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  academy_session: {
    label: "Session",
    icon: CalendarClock,
    color:
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
  academy_certificate: {
    label: "Certificate",
    icon: Award,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  academy_announcement: {
    label: "Announcement",
    icon: Megaphone,
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  },
};

// Format notification dates consistently with the student's locale.
function formatNotificationDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

// Group notifications into readable date sections.
function getDateGroup(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(true);
  // Track the current notification page, showing 10 notifications per page.
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        if (filter === "unread") return !notification.is_read;
        if (filter === "read") return notification.is_read;
        return true;
      }),
    [notifications, filter]
  );

  // Calculate the total number of pages for the active notification filter.
  const totalPages = Math.max(
    1,
    Math.ceil(visibleNotifications.length / pageSize)
  );

  // Keep the current page valid when notifications or filters change.
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  // Return only the 10 notifications belonging to the current page.
  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return visibleNotifications.slice(startIndex, startIndex + pageSize);
  }, [visibleNotifications, currentPage]);
  // Fetch the signed-in student's notifications from the existing service.
  const loadNotifications = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const records = await getStudentNotifications(100);
      setNotifications(records);
    } catch (err) {
      console.error("Unable to load student notifications:", err);
      setError("We couldn't load your notifications. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load the feed and subscribe to changes for the authenticated student only.
  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof subscribeToStudentNotifications> | null =
      null;

    /** Initialize the student notification page and its realtime subscription. */
    async function initialize() {
      try {
        const { data, error: authError } = await studentSupabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!active) return;

        if (!data.user) {
          setSignedIn(false);
          setLoading(false);
          return;
        }

        setSignedIn(true);

        // Load the existing notifications independently of realtime setup.
        await loadNotifications();

        if (!active) return;

        // Set up realtime separately so a subscription issue does not
        // incorrectly imply that the initial notification fetch failed.
        try {
          channel = subscribeToStudentNotifications(
            data.user.id,
            (notification) => {
              if (!active) return;

              setNotifications((current) => [
                notification,
                ...current.filter((item) => item.id !== notification.id),
              ]);
            },
            (notification) => {
              if (!active) return;

              setNotifications((current) =>
                current.map((item) =>
                  item.id === notification.id ? notification : item
                )
              );
            }
          );
        } catch (realtimeError) {
          console.error(
            "Unable to initialize notification realtime subscription:",
            realtimeError
          );
        }
      } catch (err) {
        console.error("Unable to initialize notifications:", err);

        if (active) {
          setError("We couldn't connect to your notifications.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      active = false;
      if (channel) void unsubscribeFromStudentNotifications(channel);
    };
  }, [loadNotifications]);

  // Mark one notification as read and update the displayed record.
  async function handleMarkRead(id: string) {
    setUpdatingId(id);
    setError("");

    try {
      const updated = await markStudentNotificationAsRead(id);

      setNotifications((current) =>
        current.map((item) => (item.id === id ? updated : item))
      );
    } catch (err) {
      console.error("Unable to mark notification as read:", err);
      setError("This notification could not be updated. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  // Mark every unread notification as read using the existing service.
  async function handleMarkAllRead() {
    if (!unreadCount || markingAll) return;

    setMarkingAll(true);
    setError("");

    try {
      const readAt = await markAllStudentNotificationsAsRead();

      setNotifications((current) =>
        current.map((item) =>
          item.is_read ? item : { ...item, is_read: true, read_at: readAt }
        )
      );
    } catch (err) {
      console.error("Unable to mark all notifications as read:", err);
      setError("We couldn't mark all notifications as read. Please try again.");
    } finally {
      setMarkingAll(false);
    }
  }

  // Mark a notification as read before opening its associated destination.
  async function handleOpenNotification(notification: StudentNotification) {
    if (!notification.is_read) {
      await handleMarkRead(notification.id);
    }

    if (notification.link) {
      window.location.assign(notification.link);
    }
  }

  // Render one notification with its category, message, timestamp, and actions.
  function renderNotification(notification: StudentNotification) {
    const config = notificationConfig[notification.type] ?? {
      label: "Notification",
      icon: Bell,
      color:
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    };

    const Icon = config.icon;
    const isUpdating = updatingId === notification.id;

    return (
      <article
        key={notification.id}
        className={`group flex gap-4 border-b border-slate-100 p-4 transition-colors last:border-b-0 dark:border-slate-800 sm:p-5 ${
          notification.is_read
            ? "bg-white dark:bg-slate-900"
            : "bg-sky-50/70 dark:bg-sky-950/20"
        }`}
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.color}`}
        >
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {config.label}
            </span>

            {!notification.is_read && (
              <span
                className="h-2 w-2 rounded-full bg-sky-500"
                aria-label="Unread"
              />
            )}
          </div>

          <h3
            className={`text-sm ${
              notification.is_read
                ? "font-medium text-slate-800 dark:text-slate-200"
                : "font-semibold text-slate-950 dark:text-white"
            }`}
          >
            {notification.title}
          </h3>

          {notification.message && (
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-400">
              {notification.message}
            </p>
          )}

          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            {formatNotificationDate(notification.created_at)}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {notification.link && (
              <button
                type="button"
                onClick={() => void handleOpenNotification(notification)}
                disabled={isUpdating}
                className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:text-sky-800 disabled:opacity-50 dark:text-sky-400 dark:hover:text-sky-300"
              >
                {notification.is_read ? "View details" : "Read notification"}
                <ChevronRight size={16} />
              </button>
            )}

            {!notification.is_read && (
              <button
                type="button"
                onClick={() => void handleMarkRead(notification.id)}
                disabled={isUpdating}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:text-white"
              >
                {isUpdating ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Mark as read
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  // Keep the list grouped by date without changing the notification order.
  const groupedNotifications = paginatedNotifications.reduce<
    { date: string; items: StudentNotification[] }[]
  >((groups, notification) => {
    const date = getDateGroup(notification.created_at);
    const existingGroup = groups.find((group) => group.date === date);

    if (existingGroup) existingGroup.items.push(notification);
    else groups.push({ date, items: [notification] });

    return groups;
  }, []);

  return (
    <main className="mx-auto w-full max-w-full p-5 space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div
            className="flex flex-wrap gap-1"
            role="tablist"
            aria-label="Notification filters"
          >
            {(
              [
                { value: "all", label: "All" },
                { value: "unread", label: "Unread" },
                { value: "read", label: "Read" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                onClick={() => {
                  setFilter(option.value);
                  setCurrentPage(1);
                }}

                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  filter === option.value
                    ? "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                {option.label}
                {option.value === "unread" && unreadCount > 0 && (
                  <span className="ml-2 rounded-full bg-sky-600 px-1.5 py-0.5 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex flex-row items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                disabled={unreadCount === 0 || markingAll || loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markingAll ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <CheckCheck size={15} />
                )}
                Mark all read
              </button>
              <button
                type="button"
                onClick={() => void loadNotifications(true)}
                disabled={refreshing || loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RefreshCw
                  size={15}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {visibleNotifications.length}{" "}
              {visibleNotifications.length === 1
                ? "notification"
                : "notifications"}
            </span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="m-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
          >
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-slate-500 dark:text-slate-400">
            <LoaderCircle size={28} className="animate-spin text-sky-600" />
            <p className="text-sm">Loading your notifications...</p>
          </div>
        ) : !signedIn ? (
          <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <Bell size={32} className="text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
              Sign in to view notifications
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Your student notifications are available after you sign in.
            </p>
            <a
              href="/student/login"
              className="mt-4 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Sign in
            </a>
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Bell size={25} />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
              {filter === "unread"
                ? "You're all caught up"
                : filter === "read"
                  ? "No read notifications yet"
                  : "No notifications yet"}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
              {filter === "unread"
                ? "New updates will appear here when you receive them."
                : "We'll show your course, payment, session, certificate, and announcement updates here."}
            </p>
          </div>
        ) : (
          <div>
            {groupedNotifications.map((group) => (
              <section key={group.date} aria-label={group.date}>
                <h3 className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-400 sm:px-5">
                  {group.date}
                </h3>
                {group.items.map(renderNotification)}
                {/* Pagination controls */}
                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Showing{" "}
                    {visibleNotifications.length === 0
                      ? 0
                      : (currentPage - 1) * pageSize + 1}{" "}
                    to{" "}
                    {Math.min(
                      currentPage * pageSize,
                      visibleNotifications.length
                    )}{" "}
                    of {visibleNotifications.length} notifications
                  </p>

                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>

                    <span
                      className="whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-300"
                      aria-live="polite"
                    >
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                      disabled={currentPage >= totalPages}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
