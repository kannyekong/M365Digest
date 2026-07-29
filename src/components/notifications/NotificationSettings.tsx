import { useEffect, useState } from "react";
import { Bell, BellRing, Check, Monitor, Volume2, VolumeX } from "lucide-react";
import {
  getBrowserNotificationPermission,
  playNotificationSound,
  requestBrowserNotificationPermission,
} from "../../lib/notificationEffects";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "../../lib/notificationPreferences";

type BrowserPermission = NotificationPermission | "unsupported";

export default function NotificationSettings() {
  // Store the editable administrator notification preferences.
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );

  // Store the browser's current native notification permission.
  const [browserPermission, setBrowserPermission] =
    useState<BrowserPermission>("default");

  // Track whether the browser permission prompt is currently running.
  const [requestingPermission, setRequestingPermission] = useState(false);

  // Load saved settings and browser permission after hydration.
  useEffect(() => {
    // Retrieve preferences previously saved on this browser.
    setPreferences(getNotificationPreferences());

    // Retrieve the current browser-notification permission.
    setBrowserPermission(getBrowserNotificationPermission());
  }, []);

  // Save one updated notification preference.
  const updatePreference = (
    preferenceName: keyof NotificationPreferences,
    enabled: boolean
  ) => {
    // Build the updated notification preference object.
    const updatedPreferences = {
      ...preferences,
      [preferenceName]: enabled,
    };

    // Update the local interface immediately.
    setPreferences(updatedPreferences);

    // Persist the change and notify the notification hook.
    saveNotificationPreferences(updatedPreferences);
  };

  // Enable or disable notification sounds.
  const handleSoundToggle = async () => {
    // Determine the next sound preference value.
    const soundEnabled = !preferences.soundEnabled;

    // Save the new sound preference.
    updatePreference("soundEnabled", soundEnabled);

    // Play a short test sound when the preference is enabled.
    if (soundEnabled) {
      await playNotificationSound();
    }
  };

  // Enable or disable native operating-system notifications.
  const handleBrowserToggle = async () => {
    // Disable browser notifications immediately when currently enabled.
    if (preferences.browserEnabled) {
      updatePreference("browserEnabled", false);
      return;
    }

    // Stop when browser notifications are unsupported.
    if (browserPermission === "unsupported") {
      return;
    }

    // Start the browser permission request state.
    setRequestingPermission(true);

    try {
      // Request permission from the browser after this button click.
      const permission = await requestBrowserNotificationPermission();

      // Store the latest permission for the settings interface.
      setBrowserPermission(permission);

      // Enable browser notifications only after permission is granted.
      updatePreference("browserEnabled", permission === "granted");
    } finally {
      // End the browser permission request state.
      setRequestingPermission(false);
    }
  };

  return (
    <div className="w-[min(26rem,calc(100vw-2rem))]">
      <section className="rounded-3xl border border-box-border bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:bg-box-bg/95">
        <div className="mb-6 flex items-start gap-3 pb-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <BellRing className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-heading-1">
              Notification settings
            </h2>

            <p className="mt-1 text-sm text-heading-3">
              Choose how the dashboard alerts you about new submissions.
            </p>
          </div>
        </div>

        <div className="divide-y divide-box-border">
          <SettingRow
            icon={<Bell className="h-5 w-5" />}
            title="Toast notifications"
            description="Show an in-dashboard message when a new submission arrives."
            enabled={preferences.toastEnabled}
            onToggle={() =>
              updatePreference("toastEnabled", !preferences.toastEnabled)
            }
          />

          <SettingRow
            icon={
              preferences.soundEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )
            }
            title="Notification sound"
            description="Play a short sound when a new notification is received."
            enabled={preferences.soundEnabled}
            onToggle={() => void handleSoundToggle()}
          />

          <SettingRow
            icon={<Monitor className="h-5 w-5" />}
            title="Browser notifications"
            description={
              browserPermission === "denied"
                ? "Permission is blocked. Enable notifications for this site in your browser settings."
                : browserPermission === "unsupported"
                  ? "This browser does not support native notifications."
                  : "Show a native device notification while the admin dashboard is open."
            }
            enabled={
              preferences.browserEnabled && browserPermission === "granted"
            }
            disabled={
              requestingPermission ||
              browserPermission === "denied" ||
              browserPermission === "unsupported"
            }
            loading={requestingPermission}
            onToggle={() => void handleBrowserToggle()}
          />
        </div>
      </section>
    </div>
  );
}

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  loading?: boolean;
  onToggle: () => void;
}

// Render one reusable notification-setting row.
function SettingRow({
  icon,
  title,
  description,
  enabled,
  disabled = false,
  loading = false,
  onToggle,
}: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-5 py-5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 text-heading-3">{icon}</div>

        <div>
          <h3 className="font-medium text-heading-1">{title}</h3>

          <p className="mt-1 text-sm leading-6 text-heading-3">{description}</p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${enabled ? "Disable" : "Enable"} ${title}`}
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        >
          {loading ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          ) : enabled ? (
            <Check className="h-3 w-3 text-primary" />
          ) : null}
        </span>
      </button>
    </div>
  );
}
