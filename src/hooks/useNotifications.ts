import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
  unsubscribeFromNotifications,
} from "../lib/notifications";
import { showNotificationEffects } from "../lib/notificationEffects";
import {
  getNotificationPreferences,
  NOTIFICATION_PREFERENCES_EVENT,
  type NotificationPreferences,
} from "../lib/notificationPreferences";
import type { Notification } from "../types/notification";

export function useNotifications() {
  // Store the notification records currently available to the interface.
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Track whether the initial notification request is still running.
  const [loading, setLoading] = useState(true);

  // Track whether all unread notifications are being marked as read.
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  // Store a user-facing error message when a request fails.
  const [errorMessage, setErrorMessage] = useState("");

  // Store the administrator's current local notification preferences.
  const notificationPreferencesRef = useRef<NotificationPreferences>(
    getNotificationPreferences()
  );

  // Track Realtime records already handled by this hook instance.
  const displayedNotificationIdsRef = useRef<Set<string>>(new Set());

  // Calculate the current unread notification count from local state.
  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.is_read).length;
  }, [notifications]);

  // Load the latest notifications from Supabase.
  const loadNotifications = useCallback(async () => {
    // Start the loading state and clear any previous error.
    setLoading(true);
    setErrorMessage("");

    try {
      // Retrieve the latest notification records.
      const notificationRecords = await getNotifications();

      // Store the returned records in local state.
      setNotifications(notificationRecords);

      // Mark existing records as known so page loading does not produce alerts.
      displayedNotificationIdsRef.current = new Set(
        notificationRecords.map((notification) => notification.id)
      );
    } catch (error) {
      // Log the full request error for debugging.
      console.error("Failed to load notifications:", error);

      // Display a safe message in the notification interface.
      setErrorMessage("Notifications could not be loaded.");
    } finally {
      // End the loading state after the request completes.
      setLoading(false);
    }
  }, []);

  // Mark one notification as read.
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Update the selected notification in Supabase.
      const updatedNotification = await markNotificationAsRead(notificationId);

      // Replace the old notification with the updated record.
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === updatedNotification.id
            ? updatedNotification
            : notification
        )
      );

      // Return the updated record for optional navigation or UI handling.
      return updatedNotification;
    } catch (error) {
      // Log the update error for debugging.
      console.error("Failed to mark notification as read:", error);

      // Rethrow the error so the consuming component can react if necessary.
      throw error;
    }
  }, []);

  // Mark every unread notification as read.
  const markAllAsRead = useCallback(async () => {
    // Avoid duplicate requests and unnecessary database updates.
    if (markingAllAsRead || unreadCount === 0) {
      return;
    }

    // Start the bulk update state.
    setMarkingAllAsRead(true);

    try {
      // Update all unread notifications in Supabase.
      const readAt = await markAllNotificationsAsRead();

      // Update all unread notification records in local state.
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.is_read
            ? notification
            : {
                ...notification,
                is_read: true,
                read_at: readAt,
              }
        )
      );
    } catch (error) {
      // Log the bulk update error for debugging.
      console.error("Failed to mark all notifications as read:", error);

      // Rethrow the error so the consuming component can react if necessary.
      throw error;
    } finally {
      // End the bulk update state.
      setMarkingAllAsRead(false);
    }
  }, [markingAllAsRead, unreadCount]);

  // Delete one notification.
  const removeNotification = useCallback(async (notificationId: string) => {
    try {
      // Delete the selected notification from Supabase.
      await deleteNotification(notificationId);

      // Remove the deleted notification from local state.
      setNotifications((currentNotifications) =>
        currentNotifications.filter(
          (notification) => notification.id !== notificationId
        )
      );

      // Remove the notification from the duplicate-protection cache.
      displayedNotificationIdsRef.current.delete(notificationId);
    } catch (error) {
      // Log the delete error for debugging.
      console.error("Failed to delete notification:", error);

      // Rethrow the error so the consuming component can react if necessary.
      throw error;
    }
  }, []);

  // Find a notification by its unique identifier.
  const getNotificationById = useCallback(
    (notificationId: string) => {
      return notifications.find(
        (notification) => notification.id === notificationId
      );
    },
    [notifications]
  );

  // Keep the hook synchronized with notification preference changes.
  useEffect(() => {
    // Refresh preferences when another browser tab changes local storage.
    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === "cloudtweak_notification_preferences"
      ) {
        notificationPreferencesRef.current = getNotificationPreferences();
      }
    };

    // Refresh preferences when the settings component changes them.
    const handlePreferenceChange = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationPreferences>;

      notificationPreferencesRef.current = customEvent.detail;
    };

    // Subscribe to local preference changes.
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(
      NOTIFICATION_PREFERENCES_EVENT,
      handlePreferenceChange
    );

    // Remove preference event listeners when the hook unmounts.
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        NOTIFICATION_PREFERENCES_EVENT,
        handlePreferenceChange
      );
    };
  }, []);

  // Load notifications and subscribe to Supabase Realtime changes.
  useEffect(() => {
    // Track whether this hook instance has already been cleaned up.
    let isActive = true;

    // Load the existing notification records.
    void loadNotifications();

    // Listen for inserted and updated notification records.
    const channel = subscribeToNotifications(
      (newNotification) => {
        // Stop handling events after this hook has unmounted.
        if (!isActive) {
          return;
        }

        // Ignore Realtime duplicates caused by channel reconnections.
        if (displayedNotificationIdsRef.current.has(newNotification.id)) {
          return;
        }

        // Remember the notification before starting asynchronous effects.
        displayedNotificationIdsRef.current.add(newNotification.id);

        // Add the newest notification to the beginning of the list.
        setNotifications((currentNotifications) => [
          newNotification,
          ...currentNotifications.filter(
            (notification) => notification.id !== newNotification.id
          ),
        ]);

        // Run the enabled toast, sound and browser effects.
        void showNotificationEffects(
          newNotification,
          notificationPreferencesRef.current
        );
      },
      (updatedNotification) => {
        // Stop handling events after this hook has unmounted.
        if (!isActive) {
          return;
        }

        // Replace the existing notification with its latest database state.
        setNotifications((currentNotifications) =>
          currentNotifications.map((notification) =>
            notification.id === updatedNotification.id
              ? updatedNotification
              : notification
          )
        );
      }
    );

    // Remove the Realtime subscription when the hook unmounts.
    return () => {
      isActive = false;
      void unsubscribeFromNotifications(channel);
    };
  }, [loadNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markingAllAsRead,
    errorMessage,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    getNotificationById,
  };
}
