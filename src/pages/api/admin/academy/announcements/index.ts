import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

type Audience = "organization" | "program" | "student";
type DeliveryMethod = "in-app" | "both";

type AnnouncementBody = {
  id?: string;
  title?: string;
  message?: string;
  link?: string | null;
  audience?: Audience;
  programId?: string | null;
  studentId?: string | null;
  deliveryMethod?: DeliveryMethod;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

// Only returns a service-role client after authenticating and allowlisting the admin.
async function getAdminClient(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token)
    return { error: "Authentication is required.", status: 401 as const };

  const url = import.meta.env.SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  const allowedEmails = (import.meta.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!url || !serviceRoleKey || allowedEmails.length === 0) {
    console.error("Announcement API environment is incomplete.");
    return {
      error: "The announcement service is not configured.",
      status: 500 as const,
    };
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  if (error || !user?.email)
    return { error: "Your admin session is invalid.", status: 401 as const };
  if (!allowedEmails.includes(user.email.toLowerCase()))
    return {
      error: "You are not authorized to manage announcements.",
      status: 403 as const,
    };
  return { client, user, error: null };
}

// Lists durable announcements; legacy notification history is intentionally handled separately.
export const GET: APIRoute = async ({ request }) => {
  try {
    const admin = await getAdminClient(request);
    if (admin.error || !admin.client)
      return jsonResponse(
        { success: false, message: admin.error },
        admin.status
      );

    const { data, error } = await admin.client
      .from("academy_announcements")
      .select(
        "id,title,message,link,audience,program_id,student_id,delivery_method,published_at,published_by,recipients_count,in_app_sent,in_app_failed,email_sent,email_failed,updated_at,deleted_at"
      )
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("Announcement history query failed:", error);
      return jsonResponse(
        {
          success: false,
          message:
            "Announcement history could not be loaded. Confirm the database migration has been applied.",
        },
        500
      );
    }

    const announcements = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      link: row.link,
      audience: row.audience,
      programId: row.program_id,
      studentId: row.student_id,
      delivery: row.delivery_method,
      publishedAt: row.published_at,
      recipients: row.recipients_count,
      inAppSent: row.in_app_sent,
      inAppFailed: row.in_app_failed,
      emailSent: row.email_sent,
      emailFailed: row.email_failed,
      updatedAt: row.updated_at,
      editable: true,
    }));
    return jsonResponse({ success: true, announcements });
  } catch (error) {
    console.error("Unexpected announcement history error:", error);
    return jsonResponse(
      {
        success: false,
        message: "An unexpected error occurred while loading announcements.",
      },
      500
    );
  }
};

// Updates the durable announcement record only; already-delivered notifications and emails are not rewritten.
export const PATCH: APIRoute = async ({ request }) => {
  try {
    const admin = await getAdminClient(request);
    if (admin.error || !admin.client)
      return jsonResponse(
        { success: false, message: admin.error },
        admin.status
      );

    let body: AnnouncementBody;
    try {
      body = (await request.json()) as AnnouncementBody;
    } catch {
      return jsonResponse(
        { success: false, message: "The request body must be valid JSON." },
        400
      );
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const link = typeof body.link === "string" ? body.link.trim() : "";
    const audience = body.audience;
    const deliveryMethod = body.deliveryMethod;

    if (!isUuid(body.id))
      return jsonResponse(
        { success: false, message: "A valid announcement ID is required." },
        400
      );
    if (!title || title.length > 150 || !message || message.length > 5000)
      return jsonResponse(
        {
          success: false,
          message:
            "Enter a title up to 150 characters and a message up to 5,000 characters.",
        },
        400
      );
    if (
      link &&
      (!link.startsWith("/") || link.startsWith("//") || link.includes("\\"))
    )
      return jsonResponse(
        {
          success: false,
          message: "The link must be an internal application path.",
        },
        400
      );
    if (
      !(["organization", "program", "student"] as unknown[]).includes(audience)
    )
      return jsonResponse(
        { success: false, message: "Select a valid audience." },
        400
      );
    if (audience === "program" && !isUuid(body.programId))
      return jsonResponse(
        { success: false, message: "A valid program ID is required." },
        400
      );
    if (audience === "student" && !isUuid(body.studentId))
      return jsonResponse(
        { success: false, message: "A valid student profile ID is required." },
        400
      );
    if (audience === "organization" && (body.programId || body.studentId))
      return jsonResponse(
        {
          success: false,
          message:
            "Organization announcements cannot have a program or student target.",
        },
        400
      );
    if (audience === "program" && body.studentId)
      return jsonResponse(
        {
          success: false,
          message: "Program announcements cannot have a student target.",
        },
        400
      );
    if (audience === "student" && body.programId)
      return jsonResponse(
        {
          success: false,
          message: "Student announcements cannot have a program target.",
        },
        400
      );
    if (!(["in-app", "both"] as unknown[]).includes(deliveryMethod))
      return jsonResponse(
        { success: false, message: "Select a valid delivery method." },
        400
      );

    const { data, error } = await admin.client
      .from("academy_announcements")
      .update({
        title,
        message,
        link: link || null,
        audience,
        program_id: audience === "program" ? body.programId : null,
        student_id: audience === "student" ? body.studentId : null,
        delivery_method: deliveryMethod,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Announcement update failed:", error);
      return jsonResponse(
        { success: false, message: "The announcement could not be updated." },
        500
      );
    }
    if (!data)
      return jsonResponse(
        {
          success: false,
          message: "Announcement not found or already deleted.",
        },
        404
      );
    return jsonResponse({
      success: true,
      message:
        "Announcement record updated. Previously delivered student notifications and emails were not changed.",
    });
  } catch (error) {
    console.error("Unexpected announcement update error:", error);
    return jsonResponse(
      {
        success: false,
        message:
          "An unexpected error occurred while updating the announcement.",
      },
      500
    );
  }
};

// Soft-deletes the announcement record and leaves student notification history untouched.
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const admin = await getAdminClient(request);
    if (admin.error || !admin.client)
      return jsonResponse(
        { success: false, message: admin.error },
        admin.status
      );

    let body: { id?: string };
    try {
      body = (await request.json()) as { id?: string };
    } catch {
      return jsonResponse(
        { success: false, message: "The request body must be valid JSON." },
        400
      );
    }
    if (!isUuid(body.id))
      return jsonResponse(
        { success: false, message: "A valid announcement ID is required." },
        400
      );

    const { data, error } = await admin.client
      .from("academy_announcements")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Announcement soft-delete failed:", error);
      return jsonResponse(
        { success: false, message: "The announcement could not be deleted." },
        500
      );
    }
    if (!data)
      return jsonResponse(
        {
          success: false,
          message: "Announcement not found or already deleted.",
        },
        404
      );
    return jsonResponse({
      success: true,
      message:
        "Announcement removed from the active history. Student notifications and emails already delivered were left untouched.",
    });
  } catch (error) {
    console.error("Unexpected announcement delete error:", error);
    return jsonResponse(
      {
        success: false,
        message:
          "An unexpected error occurred while deleting the announcement.",
      },
      500
    );
  }
};
