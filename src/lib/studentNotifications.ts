import type { RealtimeChannel } from "@supabase/supabase-js";
import { studentSupabase } from "./superbase";

export type StudentNotificationType =
  | "academy_payment"
  | "academy_course"
  | "academy_session"
  | "academy_certificate"
  | "academy_announcement";

export interface StudentNotification {
  id: string;
  recipient_id: string;
  type: StudentNotificationType;
  title: string;
  message: string | null;
  source_table: string;
  source_id: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

// Resolve the authenticated user; database RLS remains the actual security boundary.
async function getUserId(): Promise<string> {
  const { data, error } = await studentSupabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Please sign in to view notifications.");
  return data.user.id;
}

/**
 * Generates a UUID v4, using randomUUID when available and a
 * getRandomValues fallback for browsers without randomUUID support.
 */
function generateUUID(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Apply the UUID v4 version and RFC 4122 variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

// Load only notifications assigned to the signed-in student.
export async function getStudentNotifications(
  limit = 30
): Promise<StudentNotification[]> {
  const userId = await getUserId();
  const { data, error } = await studentSupabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as StudentNotification[];
}

// Return this student's unread count.
export async function getStudentUnreadNotificationCount(): Promise<number> {
  const userId = await getUserId();
  const { count, error } = await studentSupabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

// Mark one owned notification as read.
export async function markStudentNotificationAsRead(
  id: string
): Promise<StudentNotification> {
  const userId = await getUserId();
  const { data, error } = await studentSupabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as StudentNotification;
}

// Mark all of this student's unread notifications as read.
export async function markAllStudentNotificationsAsRead(): Promise<string> {
  const userId = await getUserId();
  const readAt = new Date().toISOString();
  const { error } = await studentSupabase
    .from("notifications")
    .update({ is_read: true, read_at: readAt })
    .eq("recipient_id", userId)
    .eq("is_read", false);
  if (error) throw error;
  return readAt;
}

// Subscribe to recipient-filtered inserts and updates on a fresh channel.
export function subscribeToStudentNotifications(
  userId: string,
  onInsert: (notification: StudentNotification) => void,
  onUpdate: (notification: StudentNotification) => void
): RealtimeChannel {
  // Create a distinct channel for each subscription instance.
  const channelName = `student-notifications-${userId}-${generateUUID()}`;

  // Register every handler before subscribing to the channel.
  const channel = studentSupabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => onInsert(payload.new as StudentNotification)
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => onUpdate(payload.new as StudentNotification)
    );

  // Subscribe only after all handlers have been registered.
  return channel.subscribe();
}

// Remove the channel when the bell component unmounts.
export async function unsubscribeFromStudentNotifications(
  channel: RealtimeChannel
) {
  await studentSupabase.removeChannel(channel);
}
