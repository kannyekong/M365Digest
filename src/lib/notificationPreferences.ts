export interface NotificationPreferences {
  toastEnabled: boolean;
  soundEnabled: boolean;
  browserEnabled: boolean;
}

export const NOTIFICATION_PREFERENCES_STORAGE_KEY =
  "cloudtweak_notification_preferences";

export const NOTIFICATION_PREFERENCES_EVENT =
  "cloudtweak-notification-preferences-changed";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  toastEnabled: true,
  soundEnabled: false,
  browserEnabled: false,
};

// Check whether the code is currently running inside the browser.
function isBrowser() {
  return typeof window !== "undefined";
}

// Validate and normalize notification preferences loaded from local storage.
function normalizeNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): NotificationPreferences {
  return {
    toastEnabled:
      typeof preferences.toastEnabled === "boolean"
        ? preferences.toastEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.toastEnabled,

    soundEnabled:
      typeof preferences.soundEnabled === "boolean"
        ? preferences.soundEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.soundEnabled,

    browserEnabled:
      typeof preferences.browserEnabled === "boolean"
        ? preferences.browserEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.browserEnabled,
  };
}

// Retrieve the current notification preferences from local storage.
export function getNotificationPreferences(): NotificationPreferences {
  // Return defaults during server-side rendering.
  if (!isBrowser()) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  try {
    // Read the saved preference value from local storage.
    const savedPreferences = window.localStorage.getItem(
      NOTIFICATION_PREFERENCES_STORAGE_KEY
    );

    // Return defaults when no preferences have been stored.
    if (!savedPreferences) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    // Parse and normalize the stored preference object.
    const parsedPreferences = JSON.parse(
      savedPreferences
    ) as Partial<NotificationPreferences>;

    return normalizeNotificationPreferences(parsedPreferences);
  } catch (error) {
    // Log malformed local-storage values without breaking the dashboard.
    console.error("Failed to read notification preferences:", error);

    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

// Save notification preferences and notify mounted React components.
export function saveNotificationPreferences(
  preferences: NotificationPreferences
): NotificationPreferences {
  // Normalize the supplied preferences before saving them.
  const normalizedPreferences = normalizeNotificationPreferences(preferences);

  // Return the normalized value during server-side rendering.
  if (!isBrowser()) {
    return normalizedPreferences;
  }

  try {
    // Save the preferences for future dashboard visits.
    window.localStorage.setItem(
      NOTIFICATION_PREFERENCES_STORAGE_KEY,
      JSON.stringify(normalizedPreferences)
    );

    // Notify other mounted components that the settings changed.
    window.dispatchEvent(
      new CustomEvent<NotificationPreferences>(NOTIFICATION_PREFERENCES_EVENT, {
        detail: normalizedPreferences,
      })
    );
  } catch (error) {
    // Log storage errors without preventing the UI from updating locally.
    console.error("Failed to save notification preferences:", error);
  }

  return normalizedPreferences;
}
