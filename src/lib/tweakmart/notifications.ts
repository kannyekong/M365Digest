import { tweakMartAdminSupabase } from "./supabase-server";

export type TweakMartNotificationType =
  "info" | "success" | "warning" | "promotion";

export interface TweakMartSiteNotification {
  id: string;
  title: string;
  message: string;
  link_text: string | null;
  link_url: string | null;
  notification_type: TweakMartNotificationType;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface TweakMartNotificationInput {
  title: string;
  message: string;
  link_text?: string | null;
  link_url?: string | null;
  notification_type: TweakMartNotificationType;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  priority: number;
}

/*
 * Normalizes optional notification strings before they are written
 * to the TweakMart database.
 */
function normalizeOptionalString(value?: string | null) {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

/*
 * Loads every TweakMart storefront notification for the administration
 * interface, including inactive and scheduled notifications.
 */
export async function getTweakMartNotifications() {
  const { data, error } = await tweakMartAdminSupabase
    .from("site_notifications")
    .select("*")
    .order("priority", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(`Unable to load TweakMart notifications: ${error.message}`);
  }

  return (data ?? []) as TweakMartSiteNotification[];
}

/*
 * Creates a new storefront notification in the TweakMart database.
 */
export async function createTweakMartNotification(
  input: TweakMartNotificationInput
) {
  const { data, error } = await tweakMartAdminSupabase
    .from("site_notifications")
    .insert({
      title: input.title.trim(),
      message: input.message.trim(),
      link_text: normalizeOptionalString(input.link_text),
      link_url: normalizeOptionalString(input.link_url),
      notification_type: input.notification_type,
      is_active: input.is_active,
      starts_at: input.starts_at || null,
      ends_at: input.ends_at || null,
      priority: input.priority,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Unable to create TweakMart notification: ${error.message}`
    );
  }

  return data as TweakMartSiteNotification;
}

/*
 * Updates an existing TweakMart storefront notification.
 */
export async function updateTweakMartNotification(
  id: string,
  input: TweakMartNotificationInput
) {
  const { data, error } = await tweakMartAdminSupabase
    .from("site_notifications")
    .update({
      title: input.title.trim(),
      message: input.message.trim(),
      link_text: normalizeOptionalString(input.link_text),
      link_url: normalizeOptionalString(input.link_url),
      notification_type: input.notification_type,
      is_active: input.is_active,
      starts_at: input.starts_at || null,
      ends_at: input.ends_at || null,
      priority: input.priority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Unable to update TweakMart notification: ${error.message}`
    );
  }

  return data as TweakMartSiteNotification;
}

/*
 * Enables or disables an existing storefront notification.
 */
export async function setTweakMartNotificationActive(
  id: string,
  isActive: boolean
) {
  const { data, error } = await tweakMartAdminSupabase
    .from("site_notifications")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Unable to change TweakMart notification status: ${error.message}`
    );
  }

  return data as TweakMartSiteNotification;
}

/*
 * Permanently deletes a storefront notification.
 */
export async function deleteTweakMartNotification(id: string) {
  const { error } = await tweakMartAdminSupabase
    .from("site_notifications")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      `Unable to delete TweakMart notification: ${error.message}`
    );
  }
}
