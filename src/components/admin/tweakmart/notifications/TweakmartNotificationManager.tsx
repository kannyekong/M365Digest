import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  BellRingIcon,
  CalendarClock,
  Edit3,
  ExternalLink,
  Megaphone,
  Plus,
  Power,
  PowerOff,
  Radio,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";

import ConfirmModal from "../../../../islands/ConfirmModal";
import TweakMartNotificationForm, {
  type NotificationFormValues,
  type SiteNotification,
} from "./TweakmartNotificationForm";

interface TweakMartNotificationsManagerProps {
  initialNotifications: SiteNotification[];
}

interface PendingConfirmation {
  type: "save" | "status" | "delete";
  title: string;
  message: string;
  confirmText: string;
  variant: "danger" | "primary" | "warning";
  notification?: SiteNotification;
  formValues?: NotificationFormValues;
}

/*
 * Converts datetime-local values from the administrator's browser into
 * ISO timestamps before sending them to the server.
 */
function toIsoDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/*
 * Determines the operational state of a notification from its active
 * flag and configured scheduling window.
 */
function getNotificationStatus(notification: SiteNotification) {
  if (!notification.is_active) {
    return {
      label: "Disabled",
      className: "bg-slate-100 text-slate-600",
    };
  }

  const now = Date.now();
  const startsAt = notification.starts_at
    ? new Date(notification.starts_at).getTime()
    : null;
  const endsAt = notification.ends_at
    ? new Date(notification.ends_at).getTime()
    : null;

  if (startsAt && startsAt > now) {
    return {
      label: "Scheduled",
      className: "bg-blue-50 text-blue-700",
    };
  }

  if (endsAt && endsAt <= now) {
    return {
      label: "Expired",
      className: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Live",
    className: "bg-emerald-50 text-emerald-700",
  };
}

/*
 * Formats an optional notification date for the administration UI.
 */
function formatDate(value: string | null) {
  if (!value) {
    return "No limit";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/*
 * Sends a notification-management request and returns the parsed
 * response while preserving server validation messages.
 */
async function requestNotificationApi(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body: Record<string, unknown>
) {
  const response = await fetch("/api/admin/tweakmart/notifications", {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message ?? "Unable to complete notification action."
    );
  }

  return result;
}

/*
 * Manages TweakMart storefront notifications and routes critical
 * changes through the shared confirmation modal.
 */
export default function TweakMartNotificationsManager({
  initialNotifications,
}: TweakMartNotificationsManagerProps) {
  const [notifications, setNotifications] =
    useState<SiteNotification[]>(initialNotifications);
  const [formOpen, setFormOpen] = useState(false);
  const [editingNotification, setEditingNotification] =
    useState<SiteNotification | null>(null);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(
    null
  );
  const [processing, setProcessing] = useState(false);

  const liveCount = useMemo(
    () =>
      notifications.filter(
        (notification) => getNotificationStatus(notification).label === "Live"
      ).length,
    [notifications]
  );

  const scheduledCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          getNotificationStatus(notification).label === "Scheduled"
      ).length,
    [notifications]
  );

  /*
   * Opens an empty form for a new notification.
   */
  function openCreateForm() {
    setEditingNotification(null);
    setFormOpen(true);
  }

  /*
   * Opens the form with an existing notification.
   */
  function openEditForm(notification: SiteNotification) {
    setEditingNotification(notification);
    setFormOpen(true);
  }

  /*
   * Closes and clears the notification editor.
   */
  function closeForm() {
    if (processing) {
      return;
    }

    setFormOpen(false);
    setEditingNotification(null);
  }

  /*
   * Validates the most important client-side form requirements and
   * opens the confirmation modal before saving.
   */
  function requestSave(values: NotificationFormValues) {
    if (!values.title) {
      toast.error("Enter a notification title.");
      return;
    }

    if (!values.message) {
      toast.error("Enter a notification message.");
      return;
    }

    if (
      (values.link_text && !values.link_url) ||
      (!values.link_text && values.link_url)
    ) {
      toast.error(
        "Provide both the CTA label and destination, or leave both empty."
      );
      return;
    }

    if (
      values.starts_at &&
      values.ends_at &&
      new Date(values.ends_at).getTime() <= new Date(values.starts_at).getTime()
    ) {
      toast.error("The end time must be later than the start time.");
      return;
    }

    setConfirmation({
      type: "save",
      title: editingNotification
        ? "Update notification?"
        : "Create notification?",
      message: editingNotification
        ? `Save the changes to "${values.title}"?`
        : `Create "${values.title}" and make it available to the TweakMart storefront?`,
      confirmText: editingNotification ? "Save changes" : "Create notification",
      variant: "primary",
      notification: editingNotification ?? undefined,
      formValues: values,
    });
  }

  /*
   * Requests confirmation before enabling or disabling a notification.
   */
  function requestStatusChange(notification: SiteNotification) {
    const enabling = !notification.is_active;

    setConfirmation({
      type: "status",
      title: enabling ? "Enable notification?" : "Disable notification?",
      message: enabling
        ? `"${notification.title}" will become eligible to appear on the TweakMart storefront.`
        : `"${notification.title}" will stop appearing on the TweakMart storefront.`,
      confirmText: enabling ? "Enable" : "Disable",
      variant: enabling ? "primary" : "warning",
      notification,
    });
  }

  /*
   * Requests confirmation before permanently deleting a notification.
   */
  function requestDelete(notification: SiteNotification) {
    setConfirmation({
      type: "delete",
      title: "Delete notification?",
      message: `"${notification.title}" will be permanently deleted. This action cannot be undone.`,
      confirmText: "Delete notification",
      variant: "danger",
      notification,
    });
  }

  /*
   * Creates or updates a notification after administrator confirmation.
   */
  async function saveNotification(
    values: NotificationFormValues,
    notification?: SiteNotification
  ) {
    const payload = {
      ...(notification ? { id: notification.id } : {}),
      title: values.title,
      message: values.message,
      link_text: values.link_text || null,
      link_url: values.link_url || null,
      notification_type: values.notification_type,
      is_active: values.is_active,
      starts_at: toIsoDate(values.starts_at),
      ends_at: toIsoDate(values.ends_at),
      priority: values.priority,
    };

    const result = await requestNotificationApi(
      notification ? "PUT" : "POST",
      payload
    );

    const savedNotification = result.notification as SiteNotification;

    /*
     * Replaces the edited notification or inserts the newly-created
     * notification into local state without requiring a page refresh.
     */
    setNotifications((current) => {
      if (notification) {
        return current.map((item) =>
          item.id === savedNotification.id ? savedNotification : item
        );
      }

      return [savedNotification, ...current];
    });

    setFormOpen(false);
    setEditingNotification(null);

    toast.success(
      notification
        ? "Notification updated successfully."
        : "Notification created successfully."
    );
  }

  /*
   * Enables or disables a notification after administrator confirmation.
   */
  async function changeNotificationStatus(notification: SiteNotification) {
    const result = await requestNotificationApi("PATCH", {
      id: notification.id,
      is_active: !notification.is_active,
    });

    const updatedNotification = result.notification as SiteNotification;

    setNotifications((current) =>
      current.map((item) =>
        item.id === updatedNotification.id ? updatedNotification : item
      )
    );

    toast.success(
      updatedNotification.is_active
        ? "Notification enabled."
        : "Notification disabled."
    );
  }

  /*
   * Permanently removes a notification after administrator confirmation.
   */
  async function deleteNotification(notification: SiteNotification) {
    await requestNotificationApi("DELETE", {
      id: notification.id,
    });

    setNotifications((current) =>
      current.filter((item) => item.id !== notification.id)
    );

    toast.success("Notification deleted successfully.");
  }

  /*
   * Executes whichever critical notification operation is currently
   * awaiting administrator confirmation.
   */
  async function handleConfirm() {
    if (!confirmation) {
      return;
    }

    setProcessing(true);

    try {
      if (confirmation.type === "save" && confirmation.formValues) {
        await saveNotification(
          confirmation.formValues,
          confirmation.notification
        );
      }

      if (confirmation.type === "status" && confirmation.notification) {
        await changeNotificationStatus(confirmation.notification);
      }

      if (confirmation.type === "delete" && confirmation.notification) {
        await deleteNotification(confirmation.notification);
      }

      setConfirmation(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to complete the notification action."
      );
    } finally {
      setProcessing(false);
    }
  }

  const expiredCount = useMemo(() => {
    const now = Date.now();

    return notifications.filter((notification) => {
      if (!notification.ends_at) {
        return false;
      }

      return new Date(notification.ends_at).getTime() <= now;
    }).length;
  }, [notifications]);

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Notifications
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {notifications.length}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Total notifications
                </p>
              </div>

              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pink-500 text-white">
                <BellRing size={19} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Live now
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {liveCount}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Visible on TweakMart
                </p>
              </div>

              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <Radio size={19} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Scheduled
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {scheduledCount}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Waiting to go live
                </p>
              </div>

              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
                <CalendarClock size={19} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Expired
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {expiredCount}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Expired storefront notifications
                </p>
              </div>

              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white">
                <AlertTriangle size={19} />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-blue-600" />

                <h2 className="font-bold text-slate-950">
                  Storefront notifications
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Messages available to the TweakMart site ribbon.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-950"
            >
              <Plus size={17} />
              Add notification
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <BellRing size={21} />
              </div>

              <h3 className="mt-4 font-bold text-slate-950">
                No notifications yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Create your first notification to communicate promotions,
                updates and important messages through the TweakMart storefront
                ribbon.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {notifications.map((notification) => {
                const status = getNotificationStatus(notification);

                return (
                  <div key={notification.id} className="p-5">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-950">
                            {notification.title}
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status.className}`}
                          >
                            {status.label}
                          </span>

                          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold capitalize text-violet-700">
                            {notification.notification_type}
                          </span>
                        </div>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                          {notification.message}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarClock size={14} />
                            Starts: {formatDate(notification.starts_at)}
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <CalendarClock size={14} />
                            Ends: {formatDate(notification.ends_at)}
                          </span>

                          <span>
                            Priority:{" "}
                            <strong className="text-slate-700">
                              {notification.priority}
                            </strong>
                          </span>
                        </div>

                        {notification.link_url && notification.link_text && (
                          <a
                            href={notification.link_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 transition hover:text-blue-700"
                          >
                            {notification.link_text}
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(notification)}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          title="Edit notification"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => requestStatusChange(notification)}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                          title={
                            notification.is_active
                              ? "Disable notification"
                              : "Enable notification"
                          }
                        >
                          {notification.is_active ? (
                            <PowerOff size={16} />
                          ) : (
                            <Power size={16} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => requestDelete(notification)}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          title="Delete notification"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <TweakMartNotificationForm
        open={formOpen}
        notification={editingNotification}
        saving={processing}
        onClose={closeForm}
        onSubmit={requestSave}
      />

      <ConfirmModal
        open={Boolean(confirmation)}
        title={confirmation?.title ?? ""}
        message={confirmation?.message ?? ""}
        confirmText={confirmation?.confirmText}
        variant={confirmation?.variant}
        loading={processing}
        onConfirm={handleConfirm}
        onCancel={() => {
          if (!processing) {
            setConfirmation(null);
          }
        }}
      />
    </>
  );
}
