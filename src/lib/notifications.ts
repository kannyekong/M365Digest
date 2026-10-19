import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./superbase";
import type { Notification } from "../types/notification";

/** Resolve the currently signed-in administrator for recipient-scoped notification access. */
async function getRecipientId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Please sign in to view notifications.");
  return data.user.id;
}

/**
 * Retrieve the latest notifications ordered by newest first.
 */
export async function getNotifications(limit = 30) {
  const recipientId = await getRecipientId();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", recipientId)
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
  const recipientId = await getRecipientId();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("recipient_id", recipientId)
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
  const recipientId = await getRecipientId();
  const readAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: readAt,
    })
    .eq("id", id)
    .eq("recipient_id", recipientId)
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
  const recipientId = await getRecipientId();
  const readAt = new Date().toISOString();

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: readAt,
    })
    .eq("recipient_id", recipientId)
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
  const recipientId = await getRecipientId();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("recipient_id", recipientId);

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
  const channel = supabase.channel(`notifications-${crypto.randomUUID()}`);

  // Restrict realtime events to the signed-in administrator's own notifications.
  void getRecipientId().then((recipientId) => {
    channel
      .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${recipientId}`,
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
        filter: `recipient_id=eq.${recipientId}`,
      },
      (payload) => {
        onUpdate(payload.new as Notification);
      }
    )
      .subscribe();
  }).catch((error) => {
    console.error("Could not initialize admin notification subscription:", error);
  });

  return channel;
}

/**
 * Remove the realtime notification subscription.
 */
export async function unsubscribeFromNotifications(channel: RealtimeChannel) {
  await supabase.removeChannel(channel);
}
