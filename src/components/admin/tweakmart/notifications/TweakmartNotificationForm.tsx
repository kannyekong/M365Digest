import { BellRing, CalendarClock, Link2, X } from "lucide-react";
import { useEffect, useState } from "react";

export type NotificationType = "info" | "success" | "warning" | "promotion";

export interface SiteNotification {
  id: string;
  title: string;
  message: string;
  link_text: string | null;
  link_url: string | null;
  notification_type: NotificationType;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationFormValues {
  title: string;
  message: string;
  link_text: string;
  link_url: string;
  notification_type: NotificationType;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  priority: number;
}

interface TweakMartNotificationFormProps {
  open: boolean;
  notification?: SiteNotification | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (values: NotificationFormValues) => void;
}

const initialValues: NotificationFormValues = {
  title: "",
  message: "",
  link_text: "",
  link_url: "",
  notification_type: "info",
  is_active: true,
  starts_at: "",
  ends_at: "",
  priority: 0,
};

/*
 * Converts a stored ISO timestamp into the format expected by a
 * datetime-local form input.
 */
function toDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/*
 * Builds the form state for either a new notification or an existing
 * notification being edited.
 */
function getFormValues(
  notification?: SiteNotification | null
): NotificationFormValues {
  if (!notification) {
    return { ...initialValues };
  }

  return {
    title: notification.title,
    message: notification.message,
    link_text: notification.link_text ?? "",
    link_url: notification.link_url ?? "",
    notification_type: notification.notification_type,
    is_active: notification.is_active,
    starts_at: toDateTimeLocal(notification.starts_at),
    ends_at: toDateTimeLocal(notification.ends_at),
    priority: notification.priority,
  };
}

/*
 * Renders the create/edit form used by the TweakMart storefront
 * notification manager.
 */
export default function TweakMartNotificationForm({
  open,
  notification,
  saving = false,
  onClose,
  onSubmit,
}: TweakMartNotificationFormProps) {
  const [form, setForm] = useState<NotificationFormValues>(
    getFormValues(notification)
  );

  /*
   * Resets the form whenever a different notification is opened.
   */
  useEffect(() => {
    if (open) {
      setForm(getFormValues(notification));
    }
  }, [open, notification]);

  /*
   * Updates a single field in the notification form.
   */
  function updateField<K extends keyof NotificationFormValues>(
    field: K,
    value: NotificationFormValues[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /*
   * Performs basic client-side validation before handing the values
   * to the manager. The API remains the authoritative validation layer.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSubmit({
      ...form,
      title: form.title.trim(),
      message: form.message.trim(),
      link_text: form.link_text.trim(),
      link_url: form.link_url.trim(),
    });
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <BellRing size={20} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-950">
                {notification ? "Edit notification" : "Create notification"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Configure a message for the TweakMart storefront ribbon.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close notification form"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-7 p-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label
                  htmlFor="notification-title"
                  className="text-sm font-semibold text-slate-800"
                >
                  Title
                </label>

                <input
                  id="notification-title"
                  type="text"
                  required
                  maxLength={100}
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="Weekend Deals"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor="notification-message"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Message
                  </label>

                  <span className="text-xs text-slate-400">
                    {form.message.length}/220
                  </span>
                </div>

                <textarea
                  id="notification-message"
                  required
                  maxLength={220}
                  rows={4}
                  value={form.message}
                  onChange={(event) =>
                    updateField("message", event.target.value)
                  }
                  placeholder="Save on selected laptops and accessories."
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="notification-type"
                  className="text-sm font-semibold text-slate-800"
                >
                  Notification type
                </label>

                <select
                  id="notification-type"
                  value={form.notification_type}
                  onChange={(event) =>
                    updateField(
                      "notification_type",
                      event.target.value as NotificationType
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="info">Information</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="promotion">Promotion</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="notification-priority"
                  className="text-sm font-semibold text-slate-800"
                >
                  Priority
                </label>

                <input
                  id="notification-priority"
                  type="number"
                  min={0}
                  step={1}
                  value={form.priority}
                  onChange={(event) =>
                    updateField("priority", Number(event.target.value))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-1.5 text-xs text-slate-500">
                  Higher values appear earlier in the ribbon rotation.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 mt-5">
              <div className="flex items-center gap-2">
                <Link2 size={17} className="text-blue-600" />

                <h3 className="text-sm font-bold text-slate-950">
                  Call to action
                </h3>
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Optional. Leave both fields empty when the notification does not
                need a link.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="notification-link-text"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Button label
                  </label>

                  <input
                    id="notification-link-text"
                    type="text"
                    maxLength={40}
                    value={form.link_text}
                    onChange={(event) =>
                      updateField("link_text", event.target.value)
                    }
                    placeholder="Shop now"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="notification-link-url"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Destination
                  </label>

                  <input
                    id="notification-link-url"
                    type="text"
                    value={form.link_url}
                    onChange={(event) =>
                      updateField("link_url", event.target.value)
                    }
                    placeholder="/deals"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5 mt-5">
              <div className="flex items-center gap-2">
                <CalendarClock size={17} className="text-blue-600" />

                <h3 className="text-sm font-bold text-slate-950">
                  Display schedule
                </h3>
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Leave the dates empty to make the notification available without
                a scheduled window.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="notification-start"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Starts at
                  </label>

                  <input
                    id="notification-start"
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(event) =>
                      updateField("starts_at", event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="notification-end"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Ends at
                  </label>

                  <input
                    id="notification-end"
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(event) =>
                      updateField("ends_at", event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border mt-5 border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/40">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateField("is_active", event.target.checked)
                }
                className="mt-0.5 size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-950">
                  Active notification
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  The notification can appear on TweakMart when its scheduling
                  conditions are met.
                </span>
              </span>
            </label>
          </div>

          <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : notification
                  ? "Save changes"
                  : "Create notification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
