import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates or returns the active student enrollment for a paid Academy registration.
 *
 * This function is intentionally idempotent so the payment webhook,
 * callback verification, or a recovery/sync process can safely call it
 * more than once without creating duplicate enrollments.
 */
export async function ensureStudentEnrollment(
  supabase: SupabaseClient,
  {
    studentId,
    programId,
    registrationId,
    startDate,
    endDate,
  }: {
    studentId: string;
    programId: string;
    registrationId: string;
    startDate?: string | null;
    endDate?: string | null;
  }
) {
  // Check whether the student already has an active enrollment for this program.
  const { data: existingEnrollment, error: existingEnrollmentError } =
    await supabase
      .from("student_enrollments")
      .select("*")
      .eq("student_id", studentId)
      .eq("program_id", programId)
      .in("status", ["pending", "active", "paused"])
      .maybeSingle();

  if (existingEnrollmentError) {
    throw existingEnrollmentError;
  }

  // Return the existing enrollment instead of creating a duplicate.
  if (existingEnrollment) {
    if (
      existingEnrollment.status !== "active" ||
      existingEnrollment.registration_id !== registrationId
    ) {
      const { data: updatedEnrollment, error: updateError } = await supabase
        .from("student_enrollments")
        .update({
          status: "active",
          registration_id: registrationId,
          start_date: startDate ?? existingEnrollment.start_date,
          end_date: endDate ?? existingEnrollment.end_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingEnrollment.id)
        .select("*")
        .single();

      if (updateError) {
        throw updateError;
      }

      return updatedEnrollment;
    }

    return existingEnrollment;
  }

  // Create the student's active enrollment when no existing enrollment exists.
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("student_enrollments")
    .insert({
      student_id: studentId,
      program_id: programId,
      registration_id: registrationId,
      status: "active",
      start_date: startDate ?? null,
      end_date: endDate ?? null,
      enrolled_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (enrollmentError) {
    // A concurrent webhook/request may have created the enrollment first.
    if (enrollmentError.code === "23505") {
      const { data: concurrentEnrollment, error: concurrentLookupError } =
        await supabase
          .from("student_enrollments")
          .select("*")
          .eq("student_id", studentId)
          .eq("program_id", programId)
          .in("status", ["pending", "active", "paused"])
          .maybeSingle();

      if (concurrentLookupError) {
        throw concurrentLookupError;
      }

      if (concurrentEnrollment) {
        return concurrentEnrollment;
      }
    }

    throw enrollmentError;
  }

  return enrollment;
}
