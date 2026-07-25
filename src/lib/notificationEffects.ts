import { toast } from "react-toastify";
import type { Notification } from "../types/notification";
import type { NotificationPreferences } from "./notificationPreferences";

let audioContext: AudioContext | null = null;

// Check whether the current browser supports native notifications.
export function supportsBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

// Return the current native browser-notification permission.
export function getBrowserNotificationPermission():
  NotificationPermission | "unsupported" {
  // Return an unsupported state outside the browser or in unsupported browsers.
  if (!supportsBrowserNotifications()) {
    return "unsupported";
  }

  return window.Notification.permission;
}

// Request native browser-notification permission after a user interaction.
export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  // Return an unsupported state when the browser does not implement notifications.
  if (!supportsBrowserNotifications()) {
    return "unsupported";
  }

  // Return the existing choice when the user has already accepted or denied permission.
  if (window.Notification.permission !== "default") {
    return window.Notification.permission;
  }

  try {
    // Ask the browser to display its notification permission prompt.
    return await window.Notification.requestPermission();
  } catch (error) {
    // Log permission errors and treat the request as denied.
    console.error("Failed to request browser notification permission:", error);

    return "denied";
  }
}

// Create or retrieve the shared Web Audio context.
function getAudioContext() {
  // Return null outside the browser.
  if (typeof window === "undefined") {
    return null;
  }

  // Resolve the standard Web Audio constructor.
  const AudioContextConstructor = window.AudioContext;

  // Return null when Web Audio is unsupported.
  if (!AudioContextConstructor) {
    return null;
  }

  // Create one shared context instead of creating a new one per notification.
  if (!audioContext) {
    audioContext = new AudioContextConstructor();
  }

  return audioContext;
}

// Play a short two-tone notification sound.
export async function playNotificationSound() {
  // Retrieve the shared browser audio context.
  const context = getAudioContext();

  // Stop when Web Audio is not available.
  if (!context) {
    return;
  }

  try {
    // Resume an audio context previously suspended by browser autoplay rules.
    if (context.state === "suspended") {
      await context.resume();
    }

    // Determine when the generated notification sound should begin.
    const startTime = context.currentTime;

    // Create the sound generator and volume controller.
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    // Configure a soft, short notification tone.
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, startTime);
    oscillator.frequency.setValueAtTime(880, startTime + 0.12);

    // Fade the sound in and out to avoid clicks or harsh volume.
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.16, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

    // Connect the generated sound to the device speakers.
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Start and stop the sound after a short duration.
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.3);
  } catch (error) {
    // Ignore sound failures caused by browser autoplay or device restrictions.
    console.error("Failed to play notification sound:", error);
  }
}

// Display a React Toastify notification for a new database notification.
function showToastNotification(notification: Notification) {
  // Avoid showing the same notification more than once.
  if (toast.isActive(notification.id)) {
    return;
  }

  // Display the notification title and message.
  toast.info(
    notification.message
      ? `${notification.title}: ${notification.message}`
      : notification.title,
    {
      toastId: notification.id,
      autoClose: 6000,
      closeButton: true,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,

      // Navigate to the relevant dashboard page when the toast is clicked.
      onClick: () => {
        if (notification.link) {
          window.location.href = notification.link;
        }
      },
    }
  );
}

// Display a native operating-system notification.
function showNativeBrowserNotification(notification: Notification) {
  // Stop when native browser notifications are unavailable.
  if (!supportsBrowserNotifications()) {
    return;
  }

  // Stop when the administrator has not granted notification permission.
  if (window.Notification.permission !== "granted") {
    return;
  }

  try {
    // Create the browser notification using the database title and message.
    const browserNotification = new window.Notification(notification.title, {
      body: notification.message || "A new submission was received.",
      icon: "/favicon.png",
      tag: notification.id,
    });

    // Focus the dashboard or navigate to the notification link when clicked.
    browserNotification.onclick = () => {
      // Bring the dashboard tab to the foreground.
      window.focus();

      // Navigate to the related dashboard page when a link is available.
      if (notification.link) {
        window.location.href = notification.link;
      }

      // Close the native notification after it has been handled.
      browserNotification.close();
    };
  } catch (error) {
    // Log browser-notification errors without disrupting Realtime updates.
    console.error("Failed to display browser notification:", error);
  }
}

// Run the enabled visual, audio and browser effects for a new notification.
export async function showNotificationEffects(
  notification: Notification,
  preferences: NotificationPreferences
) {
  // Display the React Toastify notification when enabled.
  if (preferences.toastEnabled) {
    showToastNotification(notification);
  }

  // Play the generated notification sound when enabled.
  if (preferences.soundEnabled) {
    await playNotificationSound();
  }

  // Display the operating-system notification when enabled.
  if (preferences.browserEnabled) {
    showNativeBrowserNotification(notification);
  }
}
