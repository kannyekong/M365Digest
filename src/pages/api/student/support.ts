import type { APIRoute } from "astro";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const prerender = false;

type StudentContextResult =
  | {
      supabase: SupabaseClient;
      profileId: string;
    }
  | {
      error: Response;
    };

type SupportRequestBody = {
  subject?: unknown;
  category?: unknown;
  description?: unknown;
};

/**
 * Returns a JSON response using the supplied HTTP status.
 */
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Authenticates the student and returns their student profile ID.
 */
async function getStudentContext(
  request: Request
): Promise<StudentContextResult> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      error: jsonResponse(
        {
          success: false,
          message: "Authentication is required.",
        },
        401
      ),
    };
  }

  const token = authorization.slice("Bearer ".length).trim();
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!token || !supabaseUrl || !serviceRoleKey) {
    return {
      error: jsonResponse(
        {
          success: false,
          message: "Support is temporarily unavailable.",
        },
        token ? 500 : 401
      ),
    };
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      error: jsonResponse(
        {
          success: false,
          message: "Your session is invalid. Please sign in again.",
        },
        401
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    return {
      error: jsonResponse(
        {
          success: false,
          message: "Student profile not found.",
        },
        404
      ),
    };
  }

  return {
    supabase,
    profileId: profile.id,
  };
}

/**
 * Returns the authenticated student's support requests.
 */
export const GET: APIRoute = async ({ request }): Promise<Response> => {
  try {
    const context = await getStudentContext(request);

    if ("error" in context) {
      return context.error;
    }

    const { supabase, profileId } = context;

    const { data, error } = await supabase
      .from("student_support_requests")
      .select("id, subject, category, status, created_at")
      .eq("student_id", profileId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      throw error;
    }

    return jsonResponse({
      success: true,
      requests: data ?? [],
    });
  } catch (error) {
    console.error("Student support GET error:", error);

    return jsonResponse(
      {
        success: false,
        message: "Support requests could not be loaded.",
      },
      500
    );
  }
};

/**
 * Creates a support request and notifies the admin notification system.
 */
export const POST: APIRoute = async ({ request }): Promise<Response> => {
  try {
    const context = await getStudentContext(request);

    if ("error" in context) {
      return context.error;
    }

    const { supabase, profileId } = context;

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

    const subject = String(body.subject ?? "").trim();
    const category = String(body.category ?? "Other").trim();
    const description = String(body.description ?? "").trim();

    if (!subject || subject.length > 160) {
      return jsonResponse(
        {
          success: false,
          message: "Enter a valid support subject.",
        },
        400
      );
    }

    if (!description || description.length > 5000) {
      return jsonResponse(
        {
          success: false,
          message: "Please describe the problem in more detail.",
        },
        400
      );
    }

    const allowedCategories = [
      "Course access",
      "Payment",
      "Technical issue",
      "Certificate",
      "Account",
      "Other",
    ];

    if (!allowedCategories.includes(category)) {
      return jsonResponse(
        {
          success: false,
          message: "Invalid support category.",
        },
        400
      );
    }

    const { data, error } = await supabase
      .from("student_support_requests")
      .insert({
        student_id: profileId,
        subject,
        category,
        description,
        status: "open",
        priority: "normal",
      })
      .select("id, subject, category, status, created_at")
      .single();

    if (error) {
      throw error;
    }

    // Create a notification for the existing admin notification bell.
    // A notification failure must not undo a successfully created request.
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        type: "system",
        title: "New Academy support request",
        message: `${category}: ${subject}`,
        source_table: "student_support_requests",
        source_id: data.id,
        link: "/admin/academy/support-requests",
        metadata: {
          support_request_id: data.id,
          student_id: profileId,
          category,
          subject,
        },
        is_read: false,
      });

    if (notificationError) {
      console.error(
        "Support request was created, but its admin notification failed:",
        notificationError
      );
    }

    return jsonResponse(
      {
        success: true,
        request: data,
      },
      201
    );
  } catch (error) {
    console.error("Student support POST error:", error);

    return jsonResponse(
      {
        success: false,
        message: "Your support request could not be submitted.",
      },
      500
    );
  }
};
