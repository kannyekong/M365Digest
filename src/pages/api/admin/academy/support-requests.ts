import type { APIRoute } from "astro";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const prerender = false;

type SupportStatus = "open" | "resolved";

type AdminClientResult = { client: SupabaseClient } | { error: Response };

type SupportRequestBody = {
  id?: unknown;
  status?: unknown;
};

/** Return a JSON response that must not be cached. */
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      Vary: "Authorization",
    },
  });
}

/** Authenticate the request and restrict access to explicitly authorized admin emails. */
async function getAdminClient(request: Request): Promise<AdminClientResult> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      error: jsonResponse(
        {
          success: false,
          message: "Admin authentication is required.",
        },
        401
      ),
    };
  }

  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  const allowedEmails = String(import.meta.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!supabaseUrl || !serviceRoleKey || allowedEmails.length === 0) {
    console.error(
      "Admin support API requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ADMIN_EMAILS."
    );

    return {
      error: jsonResponse(
        {
          success: false,
          message: "Admin support service is not configured.",
        },
        500
      ),
    };
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return {
      error: jsonResponse(
        {
          success: false,
          message: "Admin authentication is required.",
        },
        401
      ),
    };
  }

  const client: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user?.email) {
    return {
      error: jsonResponse(
        {
          success: false,
          message: "Your admin session is invalid. Please sign in again.",
        },
        401
      ),
    };
  }

  if (!allowedEmails.includes(user.email.toLowerCase())) {
    return {
      error: jsonResponse(
        {
          success: false,
          message: "You are not authorized to manage support requests.",
        },
        403
      ),
    };
  }

  return { client };
}

// Fetch support requests together with the student's profile details.
export const GET: APIRoute = async ({ request }): Promise<Response> => {
  try {
    const context = await getAdminClient(request);

    if ("error" in context) {
      return context.error;
    }

    const { data, error } = await context.client
      .from("student_support_requests")
      .select(
        `
        id,
        student_id,
        subject,
        category,
        description,
        priority,
        status,
        created_at,
        updated_at,
        student:student_profiles!student_support_requests_student_id_fkey (
          id,
          user_id,
          first_name,
          last_name,
          display_name,
          phone,
          country,
          avatar_url
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load support requests:", error);

      return jsonResponse(
        {
          success: false,
          message: "Support requests could not be loaded.",
        },
        500
      );
    }

    // Return the requests with their associated student profile.
    const requests = (data ?? []).map((request) => ({
      ...request,
      student: Array.isArray(request.student)
        ? (request.student[0] ?? null)
        : request.student,
    }));

    return jsonResponse({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Admin support list error:", error);

    return jsonResponse(
      {
        success: false,
        message: "Support requests could not be loaded.",
      },
      500
    );
  }
};

/** Close or reopen a support request and notify the student when it is resolved. */
export const PATCH: APIRoute = async ({ request }): Promise<Response> => {
  try {
    const context = await getAdminClient(request);

    if ("error" in context) {
      return context.error;
    }

    let body: SupportRequestBody;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          message: "The request body must contain valid JSON.",
        },
        400
      );
    }

    const id = String(body.id ?? "").trim();
    const status = body.status;

    if (!id || (status !== "open" && status !== "resolved")) {
      return jsonResponse(
        {
          success: false,
          message: "A valid ticket ID and status are required.",
        },
        400
      );
    }

    const nextStatus: SupportStatus = status;

    // Read the current status before updating so notifications are only
    // attempted for an actual open-to-resolved transition.
    const { data: existing, error: existingError } = await context.client
      .from("student_support_requests")
      .select("id, student_id, subject, status")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      console.error("Failed to load support request:", existingError);

      return jsonResponse(
        {
          success: false,
          message: "The support request could not be loaded.",
        },
        500
      );
    }

    if (!existing) {
      return jsonResponse(
        {
          success: false,
          message: "Support request not found.",
        },
        404
      );
    }

    // Update the ticket using the requested status.
    const { data, error } = await context.client
      .from("student_support_requests")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id, student_id, subject, category, description, priority, status, created_at, updated_at"
      )
      .maybeSingle();

    if (error) {
      console.error("Failed to update support request:", error);

      return jsonResponse(
        {
          success: false,
          message: "Ticket status could not be updated.",
        },
        500
      );
    }

    if (!data) {
      return jsonResponse(
        {
          success: false,
          message: "Support request not found.",
        },
        404
      );
    }

    // Notify the student only when the previous status was open and the
    // requested status is resolved.
    const shouldNotifyStudent =
      existing.status === "open" && nextStatus === "resolved";

    let notificationSent = false;

    if (shouldNotifyStudent) {
      // Resolve the authentication user ID from the student's profile ID.
      const { data: student, error: studentError } = await context.client
        .from("student_profiles")
        .select("user_id")
        .eq("id", existing.student_id)
        .maybeSingle();

      if (studentError || !student?.user_id) {
        console.error(
          "Support request was resolved, but the student's user ID could not be found:",
          studentError
        );
      } else {
        // Create a recipient-specific notification using the existing
        // academy_announcement type to avoid requiring a type migration.
        const { error: notificationError } = await context.client
          .from("notifications")
          .insert({
            recipient_id: student.user_id,
            type: "academy_announcement",
            title: "Your support request has been resolved",
            message: `Your support request "${existing.subject}" has been resolved by our support team.`,
            source_table: "student_support_requests",
            source_id: existing.id,
            is_read: false,
            metadata: {
              support_request_id: existing.id,
              category: data.category,
            },
            link: null,
          });

        if (notificationError) {
          console.error(
            "Support request was resolved, but its student notification could not be created:",
            notificationError
          );
        } else {
          notificationSent = true;
        }
      }
    }

    return jsonResponse({
      success: true,
      request: data,
      notificationSent,
    });
  } catch (error) {
    console.error("Admin support update error:", error);

    return jsonResponse(
      {
        success: false,
        message: "Ticket status could not be updated.",
      },
      500
    );
  }
};
