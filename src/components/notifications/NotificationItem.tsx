import {
  Bell,
  FileUser,
  GraduationCap,
  Mail,
  MessageSquareText,
  Trash2,
  UserStar,
} from "lucide-react";
import { useState } from "react";
import type { Notification, NotificationType } from "../../types/notification";

interface NotificationItemProps {
  notification: Notification;
  markAsRead: (notificationId: string) => Promise<Notification>;
  removeNotification: (notificationId: string) => Promise<void>;
  closeDropdown: () => void;
}

export default function NotificationItem({
  notification,
  markAsRead,
  removeNotification,
  closeDropdown,
}: NotificationItemProps) {
  // Track whether this notification is currently being deleted.
  const [deleting, setDeleting] = useState(false);

  // Return the icon associated with a notification type.
  function getNotificationIcon(type: NotificationType) {
    const iconClasses = "h-4 w-4";
    const icons: Record<NotificationType, React.ReactNode> = {
      registration: <GraduationCap className={iconClasses} />,
      job_application: <FileUser className={iconClasses} />,
      review: <UserStar className={iconClasses} />,
      quote: <Mail className={iconClasses} />,
      contact: <MessageSquareText className={iconClasses} />,
      system: <Bell className={iconClasses} />,
    };

    return icons[type];
  }

  // Return the icon container styling associated with a notification type.
  function getNotificationIconClasses(type: NotificationType) {
    const classes: Record<NotificationType, string> = {
      registration: "bg-blue-100 text-blue-700",
      job_application: "bg-pink-100 text-pink-700",
      review: "bg-amber-100 text-amber-700",
      quote: "bg-emerald-100 text-emerald-700",
      contact: "bg-violet-100 text-violet-700",
      system: "bg-yellow-100 text-slate-700",
    };

    return classes[type];
  }

  // Convert the notification timestamp into a relative time label.
  function formatRelativeTime(date: string) {
    const createdAt = new Date(date);
    const now = new Date();
    const differenceInSeconds = Math.floor(
      (now.getTime() - createdAt.getTime()) / 1000
    );

    if (differenceInSeconds < 60) {
      return "Just now";
    }

    const differenceInMinutes = Math.floor(differenceInSeconds / 60);

    if (differenceInMinutes < 60) {
      return `${differenceInMinutes} minute${
        differenceInMinutes === 1 ? "" : "s"
      } ago`;
    }

    const differenceInHours = Math.floor(differenceInMinutes / 60);

    if (differenceInHours < 24) {
      return `${differenceInHours} hour${
        differenceInHours === 1 ? "" : "s"
      } ago`;
    }

    const differenceInDays = Math.floor(differenceInHours / 24);

    if (differenceInDays < 7) {
      return `${differenceInDays} day${differenceInDays === 1 ? "" : "s"} ago`;
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(createdAt);
  }

  // Mark the notification as read and navigate to its related admin page.
  async function handleNotificationClick() {
    try {
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }

      if (notification.link) {
        closeDropdown();
        window.location.href = notification.link;
      }
    } catch (error) {
      console.error("Unable to open notification:", error);
    }
  }

  // Delete the notification without triggering the parent click action.
  async function handleDeleteNotification(
    event: React.MouseEvent<HTMLButtonElement>
  ) {
    event.stopPropagation();

    if (deleting) {
      return;
    }

    setDeleting(true);

    try {
      await removeNotification(notification.id);
    } catch (error) {
      console.error("Unable to delete notification:", error);
      setDeleting(false);
    }
  }

  return (
    <div
      className={`group relative border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50 ${
        notification.is_read ? "bg-white" : "bg-blue-50/60"
      }`}
    >
      <button
        type="button"
        onClick={handleNotificationClick}
        className="block w-full px-5 py-4 pr-14 text-left"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${getNotificationIconClasses(
              notification.type
            )}`}
          >
            {getNotificationIcon(notification.type)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <p
                className={`min-w-0 flex-1 text-sm text-slate-900 ${
                  notification.is_read ? "font-medium" : "font-semibold"
                }`}
              >
                {notification.title}
              </p>

              {!notification.is_read && (
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                  aria-label="Unread notification"
                />
              )}
            </div>

            {notification.message && (
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                {notification.message}
              </p>
            )}

            <p className="mt-2 text-xs text-slate-400">
              {formatRelativeTime(notification.created_at)}
            </p>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={handleDeleteNotification}
        disabled={deleting}
        className="absolute right-4 top-4 rounded-full p-2 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Delete notification"
      >
        {deleting ? (
          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        ) : (
          <Trash2 size={16} />
        )}
      </button>
    </div>
  );
}
