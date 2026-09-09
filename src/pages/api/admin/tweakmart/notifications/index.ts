import type { APIRoute } from "astro";

import {
  createTweakMartNotification,
  deleteTweakMartNotification,
  getTweakMartNotifications,
  setTweakMartNotificationActive,
  updateTweakMartNotification,
  type TweakMartNotificationInput,
  type TweakMartNotificationType,
} from "../../../../../lib/tweakmart/notifications";

const allowedNotificationTypes: TweakMartNotificationType[] = [
  "info",
  "success",
  "warning",
  "promotion",
];

/*
 * Returns a consistent JSON response from the notification API.
 */
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/*
 * Converts an unknown value into a trimmed string.
 */
function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/*
 * Converts an optional string value into either a normalized string
 * or null.
 */
function getOptionalString(value: unknown) {
  const normalizedValue = getString(value);

  return normalizedValue || null;
}

/*
 * Validates and normalizes notification data received from the admin
 * interface before it reaches the TweakMart database.
 */
function parseNotificationInput(
  body: Record<string, unknown>
): TweakMartNotificationInput {
  const title = getString(body.title);
  const message = getString(body.message);

  if (!title) {
    throw new Error("Notification title is required.");
  }

  if (!message) {
    throw new Error("Notification message is required.");
  }

  const notificationType = getString(
    body.notification_type
  ) as TweakMartNotificationType;

  if (!allowedNotificationTypes.includes(notificationType)) {
    throw new Error("Select a valid notification type.");
  }

  const priority = Number(body.priority ?? 0);

  if (!Number.isFinite(priority)) {
    throw new Error("Priority must be a valid number.");
  }

  const startsAt = getOptionalString(body.starts_at);
  const endsAt = getOptionalString(body.ends_at);

  /*
   * Prevents administrators from creating an invalid notification
   * schedule where the end occurs before the start.
   */
  if (
    startsAt &&
    endsAt &&
    new Date(endsAt).getTime() <= new Date(startsAt).getTime()
  ) {
    throw new Error("Notification end time must be later than its start time.");
  }

  const linkText = getOptionalString(body.link_text);
  const linkUrl = getOptionalString(body.link_url);

  /*
   * Requires both CTA fields when either one has been provided.
   */
  if ((linkText && !linkUrl) || (!linkText && linkUrl)) {
    throw new Error(
      "Provide both the link text and link URL for the notification CTA."
    );
  }

  /*
   * Restricts storefront CTA links to internal routes or secure
   * external destinations.
   */
  if (linkUrl && !linkUrl.startsWith("/") && !linkUrl.startsWith("https://")) {
    throw new Error("Notification link must be an internal path or HTTPS URL.");
  }

  return {
    title,
    message,
    link_text: linkText,
    link_url: linkUrl,
    notification_type: notificationType,
    is_active: body.is_active !== false,
    starts_at: startsAt,
    ends_at: endsAt,
    priority: Math.trunc(priority),
  };
}

/*
 * Returns all storefront notifications for the TweakMart admin center.
 */
export const GET: APIRoute = async () => {
  try {
    const notifications = await getTweakMartNotifications();

    return jsonResponse({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Unable to load TweakMart notifications:", error);

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load notifications.",
      },
      500
    );
  }
};

/*
 * Creates a new TweakMart storefront notification.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const input = parseNotificationInput(body);

    const notification = await createTweakMartNotification(input);

    return jsonResponse(
      {
        success: true,
        message: "Notification created successfully.",
        notification,
      },
      201
    );
  } catch (error) {
    console.error("Unable to create TweakMart notification:", error);

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create notification.",
      },
      400
    );
  }
};

/*
 * Updates an existing TweakMart storefront notification.
 */
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = getString(body.id);

    if (!id) {
      return jsonResponse(
        {
          success: false,
          message: "Notification ID is required.",
        },
        400
      );
    }

    const input = parseNotificationInput(body);

    const notification = await updateTweakMartNotification(id, input);

    return jsonResponse({
      success: true,
      message: "Notification updated successfully.",
      notification,
    });
  } catch (error) {
    console.error("Unable to update TweakMart notification:", error);

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to update notification.",
      },
      400
    );
  }
};

/*
 * Enables or disables an existing TweakMart storefront notification.
 */
export const PATCH: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = getString(body.id);

    if (!id) {
      return jsonResponse(
        {
          success: false,
          message: "Notification ID is required.",
        },
        400
      );
    }

    if (typeof body.is_active !== "boolean") {
      return jsonResponse(
        {
          success: false,
          message: "A valid notification status is required.",
        },
        400
      );
    }

    const notification = await setTweakMartNotificationActive(
      id,
      body.is_active
    );

    return jsonResponse({
      success: true,
      message: body.is_active
        ? "Notification enabled successfully."
        : "Notification disabled successfully.",
      notification,
    });
  } catch (error) {
    console.error("Unable to change TweakMart notification status:", error);

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to change notification status.",
      },
      400
    );
  }
};

/*
 * Permanently deletes an existing TweakMart storefront notification.
 */
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = getString(body.id);

    if (!id) {
      return jsonResponse(
        {
          success: false,
          message: "Notification ID is required.",
        },
        400
      );
    }

    await deleteTweakMartNotification(id);

    return jsonResponse({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error("Unable to delete TweakMart notification:", error);

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete notification.",
      },
      400
    );
  }
};
