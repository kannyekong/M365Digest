import { Bell, CheckCheck, LoaderCircle, X } from "lucide-react";
import NotificationItem from "../notifications/NotificationItem";
import type { Notification } from "../../types/notification";

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markingAllAsRead: boolean;
  errorMessage: string;
  markAsRead: (notificationId: string) => Promise<Notification>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (notificationId: string) => Promise<void>;
  closeDropdown: () => void;
}

export default function NotificationDropdown({
  notifications,
  unreadCount,
  loading,
  markingAllAsRead,
  errorMessage,
  markAsRead,
  markAllAsRead,
  removeNotification,
  closeDropdown,
}: NotificationDropdownProps) {
  // Mark all unread notifications as read.
  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Unable to mark all notifications as read:", error);
    }
  }

  return (
    <div className="absolute right-0 z-[100] mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="font-semibold text-slate-900">Notifications</h3>

          <p className="mt-0.5 text-xs text-slate-500">
            {unreadCount} unread notification
            {unreadCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={markingAllAsRead}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {markingAllAsRead ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <CheckCheck size={14} />
              )}
              Mark all read
            </button>
          )}

          <button
            type="button"
            onClick={closeDropdown}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close notifications"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      <div className="max-h-[26rem] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-500">
            <LoaderCircle size={17} className="animate-spin" />
            Loading notifications...
          </div>
        )}

        {!loading && errorMessage && (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-red-600">{errorMessage}</p>

            <p className="mt-1 text-xs text-slate-500">
              Refresh the page to try again.
            </p>
          </div>
        )}

        {!loading && !errorMessage && notifications.length === 0 && (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Bell size={22} className="text-slate-400" />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-700">
              No notifications yet
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              New registrations, reviews and contact submissions will appear
              here.
            </p>
          </div>
        )}

        {!loading &&
          !errorMessage &&
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              markAsRead={markAsRead}
              removeNotification={removeNotification}
              closeDropdown={closeDropdown}
            />
          ))}
      </div>
    </div>
  );
}
