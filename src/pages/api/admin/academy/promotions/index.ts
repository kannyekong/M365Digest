import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

type BackgroundStyle = "ocean" | "sunset" | "forest" | "midnight";

type PromotionInput = {
  id?: string;
  title?: string;
  description?: string;
  eyebrow?: string;
  buttonLabel?: string;
  destinationUrl?: string;
  backgroundStyle?: BackgroundStyle;
  imageUrl?: string | null;
  displayOrder?: number;
  isPublished?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  orderedIds?: string[];
};

const backgroundStyles: BackgroundStyle[] = [
  "ocean",
  "sunset",
  "forest",
  "midnight",
];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

// Validates UUIDs before they are used as database identifiers.
function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

// Validates internal navigation paths and rejects protocol-relative URLs.
function isInternalPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

// Authenticates the bearer token and checks the configured admin allowlist.
async function getAdminClient(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return {
      error: "Authentication is required.",
      status: 401,
    } as const;
  }

  const url = import.meta.env.SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  const allowedEmails = (import.meta.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!url || !serviceRoleKey || allowedEmails.length === 0) {
    console.error("Promotions API environment is incomplete.");

    return {
      error: "The promotions service is not configured.",
      status: 500,
    } as const;
  }

  const client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user?.email) {
    return {
      error: "Your admin session is invalid.",
      status: 401,
    } as const;
  }

  if (!allowedEmails.includes(user.email.toLowerCase())) {
    return {
      error: "You are not authorized to manage promotions.",
      status: 403,
    } as const;
  }

  return { client, user, error: null } as const;
}

// Converts API camelCase fields to the database's snake_case columns.
function toDatabaseRecord(input: PromotionInput) {
  return {
    title: input.title!.trim(),
    description: input.description!.trim(),
    eyebrow: input.eyebrow!.trim(),
    button_label: input.buttonLabel!.trim(),
    destination_url: input.destinationUrl!.trim(),
    background_style: input.backgroundStyle!,
    image_url: input.imageUrl?.trim() || null,
    display_order: input.displayOrder!,
    is_published: input.isPublished!,
    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
    updated_at: new Date().toISOString(),
  };
}

// Validates promotion content consistently before create and update operations.
function validatePromotion(input: PromotionInput): string | null {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const eyebrow = typeof input.eyebrow === "string" ? input.eyebrow.trim() : "";
  const buttonLabel =
    typeof input.buttonLabel === "string" ? input.buttonLabel.trim() : "";
  const destinationUrl =
    typeof input.destinationUrl === "string" ? input.destinationUrl.trim() : "";

  if (!title || title.length > 120) {
    return "Title is required and must not exceed 120 characters.";
  }

  if (description.length > 500) {
    return "Description must not exceed 500 characters.";
  }

  if (eyebrow.length > 80) {
    return "Eyebrow must not exceed 80 characters.";
  }

  if (!buttonLabel || buttonLabel.length > 40) {
    return "Button label is required and must not exceed 40 characters.";
  }

  if (!isInternalPath(destinationUrl)) {
    return "Destination must be a valid internal application path.";
  }

  if (!backgroundStyles.includes(input.backgroundStyle as BackgroundStyle)) {
    return "Select a valid background style.";
  }

  if (
    typeof input.displayOrder !== "number" ||
    !Number.isSafeInteger(input.displayOrder) ||
    input.displayOrder < 0 ||
    input.displayOrder > 100000
  ) {
    return "Display order must be a non-negative whole number.";
  }

  if (typeof input.isPublished !== "boolean") {
    return "Publication status must be specified.";
  }

  if (
    input.imageUrl != null &&
    (typeof input.imageUrl !== "string" ||
      input.imageUrl.length > 2048 ||
      !/^https:\/\//i.test(input.imageUrl.trim()))
  ) {
    return "Image URL must be an HTTPS URL or empty.";
  }

  const startsAt = input.startsAt == null ? null : Date.parse(input.startsAt);
  const endsAt = input.endsAt == null ? null : Date.parse(input.endsAt);

  if (input.startsAt != null && startsAt === null) {
    return "Start date is invalid.";
  }

  if (input.endsAt != null && endsAt === null) {
    return "End date is invalid.";
  }

  if (
    (input.startsAt != null && !Number.isFinite(startsAt)) ||
    (input.endsAt != null && !Number.isFinite(endsAt))
  ) {
    return "Enter valid start and end dates.";
  }

  if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
    return "End date must be later than start date.";
  }

  return null;
}

// Lists every promotion for the authenticated admin, including drafts.
export const GET: APIRoute = async ({ request }) => {
  try {
    const admin = await getAdminClient(request);

    if (admin.error) {
      return jsonResponse(
        { success: false, message: admin.error },
        admin.status
      );
    }

    const { data, error } = await admin.client
      .from("academy_promotions")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Promotions query failed:", error);

      return jsonResponse(
        {
          success: false,
          message:
            "Promotions could not be loaded. Confirm the database schema has been applied.",
        },
        500
      );
    }

    const promotions = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      eyebrow: row.eyebrow,
      buttonLabel: row.button_label,
      destinationUrl: row.destination_url,
      backgroundStyle: row.background_style,
      imageUrl: row.image_url,
      displayOrder: row.display_order,
      isPublished: row.is_published,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return jsonResponse({ success: true, promotions });
  } catch (error) {
    console.error("Unexpected promotions list error:", error);

    return jsonResponse(
      { success: false, message: "An unexpected error occurred." },
      500
    );
  }
};

// Creates a promotion as an authenticated administrator.
export const POST: APIRoute = async ({ request }) => {
  try {
    const admin = await getAdminClient(request);

    if (admin.error) {
      return jsonResponse(
        { success: false, message: admin.error },
        admin.status
      );
    }

    let body: PromotionInput;

    try {
      body = (await request.json()) as PromotionInput;
    } catch {
      return jsonResponse(
        { success: false, message: "The request body must be valid JSON." },
        400
      );
    }

    const validationError = validatePromotion(body);

    if (validationError) {
      return jsonResponse({ success: false, message: validationError }, 400);
    }

    const { data, error } = await admin.client
      .from("academy_promotions")
      .insert({
        ...toDatabaseRecord(body),
        created_by: admin.user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Promotion creation failed:", error);

      return jsonResponse(
        { success: false, message: "The promotion could not be created." },
        500
      );
    }

    return jsonResponse(
      {
        success: true,
        message: "Promotion created.",
        id: data.id,
      },
      201
    );
  } catch (error) {
    console.error("Unexpected promotion creation error:", error);

    return jsonResponse(
      { success: false, message: "An unexpected error occurred." },
      500
    );
  }
};

// Updates a promotion, or reorders the supplied list of promotion IDs.
export const PATCH: APIRoute = async ({ request }) => {
  try {
    const admin = await getAdminClient(request);

    if (admin.error) {
      return jsonResponse(
        { success: false, message: admin.error },
        admin.status
      );
    }

    let body: PromotionInput;

    try {
      body = (await request.json()) as PromotionInput;
    } catch {
      return jsonResponse(
        { success: false, message: "The request body must be valid JSON." },
        400
      );
    }

    // Reordering is handled separately from editing promotion content.
    if (Array.isArray(body.orderedIds)) {
      const ids = body.orderedIds;

      if (
        ids.length > 500 ||
        ids.some((id) => !isUuid(id)) ||
        new Set(ids).size !== ids.length
      ) {
        return jsonResponse(
          { success: false, message: "The promotion order is invalid." },
          400
        );
      }

      // Confirm every submitted ID exists before changing any display order.
      const { data: existing, error: lookupError } = await admin.client
        .from("academy_promotions")
        .select("id")
        .in("id", ids);

      if (lookupError || (existing ?? []).length !== ids.length) {
        return jsonResponse(
          {
            success: false,
            message: "One or more promotions could not be found.",
          },
          400
        );
      }

      // Apply the new order. If any write fails, report failure instead of
      // claiming the whole reorder succeeded.
      for (const [index, id] of ids.entries()) {
        const { error } = await admin.client
          .from("academy_promotions")
          .update({
            display_order: index,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) {
          console.error("Promotion reorder failed:", error);

          return jsonResponse(
            {
              success: false,
              message:
                "Reordering was interrupted. Reload the list and verify the order.",
            },
            500
          );
        }
      }

      return jsonResponse({
        success: true,
        message: "Promotion order updated.",
      });
    }

    if (!isUuid(body.id)) {
      return jsonResponse(
        { success: false, message: "A valid promotion ID is required." },
        400
      );
    }

    const validationError = validatePromotion(body);

    if (validationError) {
      return jsonResponse({ success: false, message: validationError }, 400);
    }

    const { data, error } = await admin.client
      .from("academy_promotions")
      .update(toDatabaseRecord(body))
      .eq("id", body.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Promotion update failed:", error);

      return jsonResponse(
        { success: false, message: "The promotion could not be updated." },
        500
      );
    }

    if (!data) {
      return jsonResponse(
        { success: false, message: "Promotion not found." },
        404
      );
    }

    return jsonResponse({ success: true, message: "Promotion updated." });
  } catch (error) {
    console.error("Unexpected promotion update error:", error);

    return jsonResponse(
      { success: false, message: "An unexpected error occurred." },
      500
    );
  }
};

// Deletes a promotion after confirming the admin session and ID.
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const admin = await getAdminClient(request);

    if (admin.error) {
      return jsonResponse(
        { success: false, message: admin.error },
        admin.status
      );
    }

    let body: { id?: string };

    try {
      body = (await request.json()) as { id?: string };
    } catch {
      return jsonResponse(
        { success: false, message: "The request body must be valid JSON." },
        400
      );
    }

    if (!isUuid(body.id)) {
      return jsonResponse(
        { success: false, message: "A valid promotion ID is required." },
        400
      );
    }

    const { data, error } = await admin.client
      .from("academy_promotions")
      .delete()
      .eq("id", body.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Promotion deletion failed:", error);

      return jsonResponse(
        { success: false, message: "The promotion could not be deleted." },
        500
      );
    }

    if (!data) {
      return jsonResponse(
        { success: false, message: "Promotion not found." },
        404
      );
    }

    return jsonResponse({ success: true, message: "Promotion deleted." });
  } catch (error) {
    console.error("Unexpected promotion deletion error:", error);

    return jsonResponse(
      { success: false, message: "An unexpected error occurred." },
      500
    );
  }
};
