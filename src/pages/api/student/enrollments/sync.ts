import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { ensureStudentEnrollment } from "../../../../lib/student/enrollments";

/**
 * Returns a JSON response with the supplied HTTP status.
 */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Synchronizes a student's paid Academy registration into student_enrollments.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Read the server-only Supabase configuration.
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(
        {
          success: false,
          message: "Student enrollment service is unavailable.",
        },
        500
      );
    }

    // Require the student's authenticated Supabase access token.
    const authorizationHeader = request.headers.get("authorization");

    if (!authorizationHeader?.startsWith("Bearer ")) {
      return jsonResponse(
        {
          success: false,
          message: "Authentication is required.",
        },
        401
      );
    }

    const accessToken = authorizationHeader.slice("Bearer ".length).trim();

    // Create a server-side Supabase client.
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Verify the authenticated student's access token.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return jsonResponse(
        {
          success: false,
          message: "Your student session is invalid or has expired.",
        },
        401
      );
    }

    // Read the requested Academy program.
    const body = (await request.json()) as {
      programId?: string;
    };

    const programId = body.programId?.trim();

    if (!programId) {
      return jsonResponse(
        {
          success: false,
          message: "A program ID is required.",
        },
        400
      );
    }

    // Load the student's Academy profile.
    const { data: profile, error: profileError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      return jsonResponse(
        {
          success: false,
          message: "Your Academy student profile could not be found.",
        },
        404
      );
    }

    // Load the trusted Academy program dates.
    const { data: program, error: programError } = await supabase
      .from("academy_programs")
      .select("id, title, slug, start_date, end_date")
      .eq("id", programId)
      .eq("status", "published")
      .maybeSingle();

    if (programError) {
      throw programError;
    }

    if (!program) {
      return jsonResponse(
        {
          success: false,
          message: "The Academy program could not be found.",
        },
        404
      );
    }

    // Find the student's registration using their authenticated email.
    const { data: registration, error: registrationError } = await supabase
      .from("academy_registrations")
      .select(
        `
          id,
          program_id,
          payment_status,
          registration_status,
          payment_reconciliation_status,
          amount_paid
          `
      )
      .eq("program_id", programId)
      .ilike("email", user.email ?? "")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (registrationError) {
      throw registrationError;
    }

    if (!registration) {
      return jsonResponse(
        {
          success: false,
          enrolled: false,
          message: "No Academy registration was found for this program.",
        },
        404
      );
    }

    // Only completed payment states can grant course access.
    const paidRegistration =
      registration.payment_status === "paid" &&
      (registration.payment_reconciliation_status === "matched" ||
        registration.payment_reconciliation_status === "overpaid");

    if (!paidRegistration) {
      return jsonResponse(
        {
          success: false,
          enrolled: false,
          message:
            registration.payment_reconciliation_status === "underpaid"
              ? "Your payment is still awaiting reconciliation."
              : "A completed Academy payment is required before accessing this course.",
        },
        409
      );
    }

    // Create or recover the student's active enrollment.
    const enrollment = await ensureStudentEnrollment(supabase, {
      studentId: profile.id,
      programId: program.id,
      registrationId: registration.id,
      startDate: program.start_date,
      endDate: program.end_date,
    });

    return jsonResponse({
      success: true,
      enrolled: true,
      enrollmentId: enrollment.id,
      programId: program.id,
      programSlug: program.slug,
      status: enrollment.status,
    });
  } catch (error) {
    console.error("Student enrollment synchronization failed:", error);

    return jsonResponse(
      {
        success: false,
        message: "The student enrollment could not be synchronized.",
      },
      500
    );
  }
};
