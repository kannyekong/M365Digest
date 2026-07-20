import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./superbase";
import type { Notification } from "../types/notification";

/**
 * Retrieve the latest notifications ordered by newest first.
 */
export async function getNotifications(limit = 30) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as Notification[];
}

/**
 * Return the number of unread notifications.
 */
export async function getUnreadNotificationCount() {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("is_read", false);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

/**
 * Mark one notification as read.
 */
export async function markNotificationAsRead(id: string) {
  const readAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: readAt,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Notification;
}

/**
 * Mark every unread notification as read.
 */
export async function markAllNotificationsAsRead() {
  const readAt = new Date().toISOString();

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: readAt,
    })
    .eq("is_read", false);

  if (error) {
    throw error;
  }

  return readAt;
}

/**
 * Delete a notification.
 */
export async function deleteNotification(id: string) {
  const { error } = await supabase.from("notifications").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

/**
 * Listen for realtime notification inserts and updates.
 */
export function subscribeToNotifications(
  onInsert: (notification: Notification) => void,
  onUpdate: (notification: Notification) => void
): RealtimeChannel {
  return supabase
    .channel("notifications")

    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      },
      (payload) => {
        onInsert(payload.new as Notification);
      }
    )

    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
      },
      (payload) => {
        onUpdate(payload.new as Notification);
      }
    )

    .subscribe();
}

/**
 * Remove the realtime notification subscription.
 */
export async function unsubscribeFromNotifications(channel: RealtimeChannel) {
  await supabase.removeChannel(channel);
}
