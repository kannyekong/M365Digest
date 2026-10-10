import { supabase } from "./superbase";
import type {
  AcademyCategory,
  AcademyCertificate,
  AcademyCertificateTemplate,
  AcademyLesson,
  AcademyModule,
  AcademyProgram,
  AcademyProgramStatus,
  AcademyRegistration,
  AcademyResource,
  AcademyResourceInput,
  StudentResourceProgress,
  AcademyLiveSession,
  AcademyLiveSessionInput,
  StudentResourceProgressStatus,
  UpcomingSession,
  AcademyQuiz,
  AcademyQuizInput,
  AcademyQuizQuestion,
  AcademyQuizQuestionInput,
  AcademyQuizOption,
  AcademyQuizOptionInput,
  StudentQuizResult,
  StudentQuizStartResponse,
  StudentQuizReview,
  StudentQuizSubmissionAnswer,
  StudentQuizAttemptPayload,
} from "../types/academy";

export type AcademyProgramInput = Omit<
  AcademyProgram,
  | "id"
  | "created_at"
  | "updated_at"
  | "published_at"
  | "category"
  | "certificate_template"
>;

/**
 * Represents the calculated learning progress for one enrolled Academy course.
 */
export interface StudentCourseProgressSummary {
  enrollmentId: string;
  programId: string;
  title: string;
  slug: string;
  status: string;
  completedAt: string | null;
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  progressPercent: number;
  nextLessonId: string | null;
  lastAccessedAt: string | null;
}

export type AcademyProgramUpdate = Partial<AcademyProgramInput>;

export type AcademyCategoryInput = Omit<
  AcademyCategory,
  "id" | "created_at" | "updated_at"
>;

export type AcademyModuleInput = Omit<
  AcademyModule,
  "id" | "created_at" | "updated_at"
>;

export type AcademyLessonInput = Omit<
  AcademyLesson,
  "id" | "created_at" | "updated_at"
>;

export type AcademyRegistrationInput = Omit<
  AcademyRegistration,
  "id" | "created_at" | "updated_at" | "program" | "paid_at" | "completed_at"
>;

export type AcademyCertificateTemplateInput = Omit<
  AcademyCertificateTemplate,
  "id" | "created_at" | "updated_at"
>;

/**
 * Calculates authoritative course-level progress for the authenticated student.
 *
 * Progress is calculated against every lesson in the enrolled program,
 * including lessons the student has not started.
 */
export async function getStudentCourseProgress(
  programId?: string
): Promise<StudentCourseProgressSummary[]> {
  // Resolve the currently authenticated Supabase session.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  // Stop when authentication lookup fails.
  if (sessionError) {
    throw sessionError;
  }

  // Require an authenticated student session.
  if (!session) {
    throw new Error("You must be signed in to view course progress.");
  }

  // Resolve the student profile belonging to the authenticated user.
  const { data: student, error: studentError } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  // Stop when the student profile lookup fails.
  if (studentError) {
    throw studentError;
  }

  // Require a provisioned student profile.
  if (!student) {
    throw new Error("Your student profile could not be found.");
  }

  // Load the student's enrollments and their Academy programs.
  let enrollmentQuery = supabase
    .from("student_enrollments")
    .select(
      `
        id,
        status,
        completed_at,
        created_at,
        academy_programs (
          id,
          title,
          slug
        )
      `
    )
    .eq("student_id", student.id)
    .order("created_at", { ascending: false });

  // Limit the query to one Academy program when requested.
  if (programId) {
    enrollmentQuery = enrollmentQuery.eq("program_id", programId);
  }

  const { data: enrollmentData, error: enrollmentError } =
    await enrollmentQuery;

  // Stop when enrollment data cannot be loaded.
  if (enrollmentError) {
    throw enrollmentError;
  }

  // Normalize Supabase's nested program relationship.
  const enrollments = (enrollmentData ?? [])
    .map((enrollment) => ({
      id: enrollment.id,
      status: enrollment.status,
      completed_at: enrollment.completed_at,
      program: Array.isArray(enrollment.academy_programs)
        ? (enrollment.academy_programs[0] ?? null)
        : enrollment.academy_programs,
    }))
    .filter((enrollment) => enrollment.program !== null);

  // Return an empty result when the student has no matching enrollment.
  if (enrollments.length === 0) {
    return [];
  }

  // Collect the Academy program IDs represented by the enrollments.
  const programIds = enrollments.map((enrollment) => enrollment.program!.id);

  // Load every module belonging to the enrolled programs.
  const { data: moduleData, error: moduleError } = await supabase
    .from("academy_program_modules")
    .select("id, program_id")
    .in("program_id", programIds)
    .order("module_number", { ascending: true })
    .order("display_order", { ascending: true });

  // Stop when the curriculum modules cannot be loaded.
  if (moduleError) {
    throw moduleError;
  }

  // Collect the module IDs needed to load the complete curriculum.
  const moduleIds = (moduleData ?? []).map((module) => module.id);

  // Load every lesson in the enrolled programs.
  const { data: lessonData, error: lessonError } =
    moduleIds.length > 0
      ? await supabase
          .from("academy_program_lessons")
          .select("id, module_id, display_order")
          .in("module_id", moduleIds)
          .order("display_order", { ascending: true })
      : { data: [], error: null };

  // Stop when the curriculum lessons cannot be loaded.
  if (lessonError) {
    throw lessonError;
  }

  // Build a lookup that resolves each module to its Academy program.
  const moduleProgramMap = new Map(
    (moduleData ?? []).map((module) => [module.id, module.program_id])
  );

  // Normalize every lesson with its parent program.
  const lessons = (lessonData ?? []).map((lesson) => ({
    id: lesson.id,
    moduleId: lesson.module_id,
    programId: moduleProgramMap.get(lesson.module_id) ?? null,
    displayOrder: lesson.display_order,
  }));

  // Collect the enrollment IDs used to load student progress.
  const enrollmentIds = enrollments.map((enrollment) => enrollment.id);

  // Load every existing lesson-progress record for these enrollments.
  const { data: progressData, error: progressError } = await supabase
    .from("student_lesson_progress")
    .select(
      `
        enrollment_id,
        lesson_id,
        status,
        progress_percent,
        last_accessed_at
      `
    )
    .in("enrollment_id", enrollmentIds);

  // Stop when lesson progress cannot be loaded.
  if (progressError) {
    throw progressError;
  }

  // Create a quick lookup for lesson progress.
  const progressMap = new Map(
    (progressData ?? []).map((progress) => [
      `${progress.enrollment_id}:${progress.lesson_id}`,
      progress,
    ])
  );

  // Calculate the final course summaries.
  return enrollments.map((enrollment) => {
    const currentProgramId = enrollment.program!.id;

    // Select every lesson belonging to this specific program.
    const programLessons = lessons.filter(
      (lesson) => lesson.programId === currentProgramId
    );

    // Resolve progress records for this enrollment.
    const courseProgress = programLessons.map((lesson) => ({
      lesson,
      progress: progressMap.get(`${enrollment.id}:${lesson.id}`) ?? null,
    }));

    // Count the complete curriculum, not only tracked lessons.
    const totalLessons = courseProgress.length;

    // Count completed lessons.
    const completedLessons = courseProgress.filter(
      ({ progress }) => progress?.status === "completed"
    ).length;

    // Count lessons currently in progress.
    const inProgressLessons = courseProgress.filter(
      ({ progress }) => progress?.status === "in_progress"
    ).length;

    // Calculate progress across every lesson in the curriculum.
    const totalProgress = courseProgress.reduce(
      (total, { progress }) => total + Number(progress?.progress_percent ?? 0),
      0
    );

    // Convert total lesson progress into a percentage.
    const calculatedProgress =
      totalLessons > 0 ? Math.round(totalProgress / totalLessons) : 0;

    // Completed enrollments always display 100%.
    const progressPercent =
      enrollment.status === "completed" ? 100 : calculatedProgress;

    // Find the most recently accessed incomplete lesson.
    const recentlyAccessedIncomplete = courseProgress
      .filter(
        ({ progress }) =>
          progress?.status === "in_progress" && progress.last_accessed_at
      )
      .sort(
        (a, b) =>
          new Date(b.progress!.last_accessed_at!).getTime() -
          new Date(a.progress!.last_accessed_at!).getTime()
      )[0];

    // Fall back to the first lesson that has not been completed.
    const firstIncomplete = courseProgress.find(
      ({ progress }) => progress?.status !== "completed"
    );

    // Prefer the student's most recently accessed lesson when available.
    const nextLessonId =
      recentlyAccessedIncomplete?.lesson.id ??
      firstIncomplete?.lesson.id ??
      null;

    // Find the latest access time across the course.
    const lastAccessedAt =
      courseProgress
        .map(({ progress }) => progress?.last_accessed_at)
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ??
      null;

    return {
      enrollmentId: enrollment.id,
      programId: currentProgramId,
      title: enrollment.program!.title,
      slug: enrollment.program!.slug,
      status: enrollment.status,
      completedAt: enrollment.completed_at,
      totalLessons,
      completedLessons,
      inProgressLessons,
      progressPercent,
      nextLessonId,
      lastAccessedAt,
    };
  });
}

/**
 * Generates a URL-friendly slug from a program or category name.
 */
export function generateAcademySlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Retrieves every Academy program for the admin dashboard.
 */
export async function getAcademyPrograms() {
  const { data, error } = await supabase
    .from("academy_programs")
    .select(
      `
      *,
      category:academy_categories(*),
      certificate_template:academy_certificate_templates(*)
    `
    )
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyProgram[];
}

/**
 * Retrieves published Academy programs for the public website.
 */
export async function getPublishedAcademyPrograms() {
  const { data, error } = await supabase
    .from("academy_programs")
    .select(
      `
      *,
      category:academy_categories(*),
      certificate_template:academy_certificate_templates(*)
    `
    )
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("published_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyProgram[];
}

/**
 * Retrieves published programs currently accepting registrations.
 */
export async function getOpenAcademyPrograms() {
  const currentDate = new Date().toISOString();

  const { data, error } = await supabase
    .from("academy_programs")
    .select(
      `
      *,
      category:academy_categories(*),
      certificate_template:academy_certificate_templates(*)
    `
    )
    .eq("status", "published")
    .eq("registration_open", true)
    .or(
      `registration_deadline.is.null,registration_deadline.gte.${currentDate}`
    )
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyProgram[];
}

/**
 * Retrieves published featured programs for the homepage.
 */
export async function getFeaturedAcademyPrograms(limit = 3) {
  const { data, error } = await supabase
    .from("academy_programs")
    .select(
      `
      *,
      category:academy_categories(*),
      certificate_template:academy_certificate_templates(*)
    `
    )
    .eq("status", "published")
    .eq("featured", true)
    .order("display_order", { ascending: true })
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyProgram[];
}

/**
 * Retrieves one Academy program using its database ID.
 */
export async function getAcademyProgramById(id: string) {
  const { data, error } = await supabase
    .from("academy_programs")
    .select(
      `
      *,
      category:academy_categories(*),
      certificate_template:academy_certificate_templates(*)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyProgram;
}

/**
 * Retrieves one published Academy program using its slug.
 */
export async function getAcademyProgramBySlug(slug: string) {
  const { data, error } = await supabase
    .from("academy_programs")
    .select(
      `
      *,
      category:academy_categories(*),
      certificate_template:academy_certificate_templates(*)
    `
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyProgram;
}

/**
 * Creates a new Academy program.
 */
export async function createAcademyProgram(program: AcademyProgramInput) {
  const { data, error } = await supabase
    .from("academy_programs")
    .insert(program)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyProgram;
}

/**
 * Updates an existing Academy program.
 */
export async function updateAcademyProgram(
  id: string,
  updates: AcademyProgramUpdate
) {
  const { data, error } = await supabase
    .from("academy_programs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyProgram;
}

/**
 * Changes the publishing status of an Academy program.
 */
export async function updateAcademyProgramStatus(
  id: string,
  status: AcademyProgramStatus
) {
  const updates: {
    status: AcademyProgramStatus;
    published_at?: string | null;
  } = {
    status,
  };

  // Store the first or most recent publishing date when publishing.
  if (status === "published") {
    updates.published_at = new Date().toISOString();
  }

  // Remove the publishing date when returning the program to draft.
  if (status === "draft") {
    updates.published_at = null;
  }

  const { data, error } = await supabase
    .from("academy_programs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyProgram;
}

/**
 * Publishes an Academy program.
 */
export async function publishAcademyProgram(id: string) {
  return updateAcademyProgramStatus(id, "published");
}

/**
 * Returns an Academy program to draft status.
 */
export async function draftAcademyProgram(id: string) {
  return updateAcademyProgramStatus(id, "draft");
}

/**
 * Archives an Academy program.
 */
export async function archiveAcademyProgram(id: string) {
  return updateAcademyProgramStatus(id, "archived");
}

/**
 * Updates whether registration is open for a program.
 */
export async function updateAcademyRegistrationAvailability(
  id: string,
  registrationOpen: boolean
) {
  const { data, error } = await supabase
    .from("academy_programs")
    .update({
      registration_open: registrationOpen,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyProgram;
}

/**
 * Updates whether a program is featured.
 */
export async function updateAcademyProgramFeaturedStatus(
  id: string,
  featured: boolean
) {
  const { data, error } = await supabase
    .from("academy_programs")
    .update({
      featured,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyProgram;
}

/**
 * Permanently deletes an Academy program.
 *
 * Supabase will reject this operation when dependent registrations or
 * certificates exist because those relationships use restricted deletion.
 */
export async function deleteAcademyProgram(id: string) {
  const { error } = await supabase
    .from("academy_programs")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

/**
 * Retrieves every Academy category for the admin dashboard.
 */
export async function getAcademyCategories() {
  const { data, error } = await supabase
    .from("academy_categories")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyCategory[];
}

/**
 * Retrieves active Academy categories for the public website.
 */
export async function getActiveAcademyCategories() {
  const { data, error } = await supabase
    .from("academy_categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyCategory[];
}

/**
 * Creates a new Academy category.
 */
export async function createAcademyCategory(category: AcademyCategoryInput) {
  const { data, error } = await supabase
    .from("academy_categories")
    .insert(category)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyCategory;
}

/**
 * Updates an Academy category.
 */
export async function updateAcademyCategory(
  id: string,
  updates: Partial<AcademyCategoryInput>
) {
  const { data, error } = await supabase
    .from("academy_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyCategory;
}

/**
 * Deletes an Academy category.
 *
 * Programs assigned to this category will retain their records and have
 * category_id set to null.
 */
export async function deleteAcademyCategory(id: string) {
  const { error } = await supabase
    .from("academy_categories")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

/**
 * Retrieves the curriculum modules belonging to a program.
 */
export async function getAcademyProgramModules(programId: string) {
  const { data, error } = await supabase
    .from("academy_program_modules")
    .select("*")
    .eq("program_id", programId)
    .order("display_order", { ascending: true })
    .order("module_number", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyModule[];
}

/**
 * Creates a curriculum module for a program.
 */
export async function createAcademyModule(module: AcademyModuleInput) {
  const { data, error } = await supabase
    .from("academy_program_modules")
    .insert(module)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyModule;
}

/**
 * Updates an Academy curriculum module.
 */
export async function updateAcademyModule(
  id: string,
  updates: Partial<AcademyModuleInput>
) {
  const { data, error } = await supabase
    .from("academy_program_modules")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyModule;
}

/**
 * Deletes an Academy curriculum module and its lessons.
 */
export async function deleteAcademyModule(id: string) {
  const { error } = await supabase
    .from("academy_program_modules")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

/**
 * Retrieves the lessons belonging to a curriculum module.
 */
export async function getAcademyModuleLessons(moduleId: string) {
  const { data, error } = await supabase
    .from("academy_program_lessons")
    .select("*")
    .eq("module_id", moduleId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyLesson[];
}

/**
 * Creates a lesson inside an Academy curriculum module.
 */
export async function createAcademyLesson(lesson: AcademyLessonInput) {
  const { data, error } = await supabase
    .from("academy_program_lessons")
    .insert(lesson)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyLesson;
}

/**
 * Updates an Academy curriculum lesson.
 */
export async function updateAcademyLesson(
  id: string,
  updates: Partial<AcademyLessonInput>
) {
  const { data, error } = await supabase
    .from("academy_program_lessons")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyLesson;
}

/**
 * Deletes an Academy curriculum lesson.
 */
export async function deleteAcademyLesson(id: string) {
  const { error } = await supabase
    .from("academy_program_lessons")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

/**
 * Retrieves all Academy registrations for the admin dashboard.
 */
export async function getAcademyRegistrations() {
  const { data, error } = await supabase
    .from("academy_registrations")
    .select(
      `
      *,
      program:academy_programs(*)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyRegistration[];
}

/**
 * Retrieves registrations belonging to one Academy program.
 */
export async function getAcademyRegistrationsByProgram(programId: string) {
  const { data, error } = await supabase
    .from("academy_registrations")
    .select(
      `
      *,
      program:academy_programs(*)
    `
    )
    .eq("program_id", programId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyRegistration[];
}

/**
 * Retrieves one Academy registration using its ID.
 */
export async function getAcademyRegistrationById(id: string) {
  const { data, error } = await supabase
    .from("academy_registrations")
    .select(
      `
      *,
      program:academy_programs(*)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyRegistration;
}

/**
 * Creates a student registration for an Academy program.
 */
export async function createAcademyRegistration(
  registration: AcademyRegistrationInput
) {
  const { data, error } = await supabase
    .from("academy_registrations")
    .insert(registration)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyRegistration;
}

/**
 * Updates an Academy registration.
 */
export async function updateAcademyRegistration(
  id: string,
  updates: Partial<AcademyRegistrationInput>
) {
  const { data, error } = await supabase
    .from("academy_registrations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyRegistration;
}

/**
 * Deletes an Academy registration.
 *
 * Supabase will reject deletion when a certificate already references it.
 */
export async function deleteAcademyRegistration(id: string) {
  const { error } = await supabase
    .from("academy_registrations")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

/**
 * Retrieves every certificate template.
 */
export async function getAcademyCertificateTemplates() {
  const { data, error } = await supabase
    .from("academy_certificate_templates")
    .select("*")
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyCertificateTemplate[];
}

/**
 * Creates an Academy certificate template.
 */
export async function createAcademyCertificateTemplate(
  template: AcademyCertificateTemplateInput
) {
  const { data, error } = await supabase
    .from("academy_certificate_templates")
    .insert(template)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyCertificateTemplate;
}

/**
 * Updates an Academy certificate template.
 */
export async function updateAcademyCertificateTemplate(
  id: string,
  updates: Partial<AcademyCertificateTemplateInput>
) {
  const { data, error } = await supabase
    .from("academy_certificate_templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyCertificateTemplate;
}

/**
 * Retrieves all Academy certificates for the admin dashboard.
 */
export async function getAcademyCertificates() {
  const { data, error } = await supabase
    .from("academy_certificates")
    .select(
      `
      *,
      program:academy_programs(*),
      registration:academy_registrations(*),
      template:academy_certificate_templates(*)
    `
    )
    .order("generated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyCertificate[];
}

/**
 * Retrieves one Academy certificate using its verification code.
 */
export async function getAcademyCertificateByVerificationCode(
  verificationCode: string
) {
  const { data, error } = await supabase
    .from("academy_certificates")
    .select(
      `
      *,
      program:academy_programs(*),
      template:academy_certificate_templates(*)
    `
    )
    .eq("verification_code", verificationCode)
    .eq("status", "generated")
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyCertificate;
}

/**
 * Revokes an Academy certificate.
 */
export async function revokeAcademyCertificate(id: string, reason: string) {
  const { data, error } = await supabase
    .from("academy_certificates")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revocation_reason: reason.trim(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyCertificate;
}

/**
 * Retrieves all resources attached to an Academy lesson.
 */
export async function getAcademyLessonResources(lessonId: string) {
  const { data, error } = await supabase
    .from("academy_program_resources")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyResource[];
}

/**
 * Creates a resource attached to an Academy lesson.
 */
export async function createAcademyResource(resource: AcademyResourceInput) {
  const { data, error } = await supabase
    .from("academy_program_resources")
    .insert(resource)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyResource;
}

/**
 * Updates an Academy curriculum resource.
 */
export async function updateAcademyResource(
  id: string,
  updates: Partial<AcademyResourceInput>
) {
  const { data, error } = await supabase
    .from("academy_program_resources")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyResource;
}

/**
 * Deletes an Academy curriculum resource.
 */
export async function deleteAcademyResource(id: string) {
  const { error } = await supabase
    .from("academy_program_resources")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

/**
 * Retrieves the resources attached to multiple Academy lessons.
 */
export async function getAcademyResourcesByLessonIds(lessonIds: string[]) {
  if (!lessonIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("academy_program_resources")
    .select("*")
    .in("lesson_id", lessonIds)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyResource[];
}

/**
 * Retrieves live classes belonging to an Academy program.
 */
export async function getAcademyLiveSessions(programId: string) {
  const { data, error } = await supabase
    .from("academy_live_sessions")
    .select("*")
    .eq("program_id", programId)
    .order("start_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyLiveSession[];
}

/**
 * Creates an Academy live class.
 */
export async function createAcademyLiveSession(
  session: AcademyLiveSessionInput
) {
  const { data, error } = await supabase
    .from("academy_live_sessions")
    .insert(session)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyLiveSession;
}

/**
 * Updates an Academy live class.
 */
export async function updateAcademyLiveSession(
  id: string,
  updates: Partial<AcademyLiveSessionInput>
) {
  const { data, error } = await supabase
    .from("academy_live_sessions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyLiveSession;
}

/**
 * Deletes an Academy live class.
 */
export async function deleteAcademyLiveSession(id: string) {
  const { error } = await supabase
    .from("academy_live_sessions")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

/**
 * Retrieves a student's progress for a specific enrollment.
 */
export async function getStudentResourceProgress(enrollmentId: string) {
  const { data, error } = await supabase
    .from("student_resource_progress")
    .select("*")
    .eq("enrollment_id", enrollmentId);

  if (error) {
    throw error;
  }

  return (data ?? []) as StudentResourceProgress[];
}

/**
 * Retrieves progress for a specific student resource.
 */
export async function getStudentResourceProgressByResource(
  enrollmentId: string,
  resourceId: string
) {
  const { data, error } = await supabase
    .from("student_resource_progress")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("resource_id", resourceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as StudentResourceProgress | null;
}

/**
 * Creates or updates the authenticated student's progress for an Academy resource.
 *
 * The student's profile ID is resolved from the enrollment so callers do not
 * need to expose or pass student_id through the student-facing UI.
 */
export async function upsertStudentResourceProgress(progress: {
  enrollment_id: string;
  resource_id: string;
  status: StudentResourceProgressStatus;
}) {
  // Resolve the authenticated Supabase session.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  // Stop when no authenticated session exists.
  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    throw new Error("You must be signed in to update resource progress.");
  }

  // Find the student's profile associated with the supplied enrollment.
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("student_enrollments")
    .select("id, student_id")
    .eq("id", progress.enrollment_id)
    .single();

  // Stop when the enrollment cannot be resolved.
  if (enrollmentError) {
    throw enrollmentError;
  }

  // Confirm that the enrollment belongs to the authenticated student.
  const { data: studentProfile, error: profileError } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("id", enrollment.student_id)
    .eq("user_id", session.user.id)
    .single();

  // Stop when the enrollment does not belong to the signed-in student.
  if (profileError) {
    throw new Error("You are not authorized to update this resource progress.");
  }

  // Check whether this resource already has a progress record.
  const { data: existingProgress, error: existingProgressError } =
    await supabase
      .from("student_resource_progress")
      .select("*")
      .eq("enrollment_id", progress.enrollment_id)
      .eq("resource_id", progress.resource_id)
      .maybeSingle();

  // Stop when the existing progress lookup fails.
  if (existingProgressError) {
    throw existingProgressError;
  }

  // Never downgrade a resource that the student has already completed.
  if (existingProgress?.status === "completed") {
    return existingProgress as StudentResourceProgress;
  }

  // Prepare timestamps according to the requested progress state.
  const now = new Date().toISOString();

  const payload = {
    student_id: studentProfile.id,
    enrollment_id: progress.enrollment_id,
    resource_id: progress.resource_id,
    status: progress.status,
    started_at:
      existingProgress?.started_at ??
      (progress.status === "not_started" ? null : now),
    completed_at: progress.status === "completed" ? now : null,
    last_accessed_at: now,
  };

  // Create or update the student's resource progress record.
  const { data, error } = await supabase
    .from("student_resource_progress")
    .upsert(payload, {
      onConflict: "enrollment_id,resource_id",
    })
    .select()
    .single();

  // Stop when Supabase rejects the progress update.
  if (error) {
    throw error;
  }

  // Return the persisted resource progress record.
  return data as StudentResourceProgress;
}

/**
 * Retrieves the authenticated student's active enrollment for an Academy program.
 */
export async function getStudentEnrollmentForProgram(programId: string) {
  // Resolve the currently authenticated Supabase session.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  // Stop when the authentication lookup fails.
  if (sessionError) {
    throw sessionError;
  }

  // Require an authenticated student session.
  if (!session) {
    throw new Error("You must be signed in to access this course.");
  }

  // Find the student profile belonging to the authenticated user.
  const { data: student, error: studentError } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  // Stop when the student profile lookup fails.
  if (studentError) {
    throw studentError;
  }

  // Return no enrollment when the student profile does not exist yet.
  if (!student) {
    return null;
  }

  // Find the student's enrollment for the requested program.
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("student_enrollments")
    .select("id, student_id, program_id, status, start_date, end_date")
    .eq("student_id", student.id)
    .eq("program_id", programId)
    .in("status", ["active", "paused", "completed"])
    .maybeSingle();

  // Stop when the enrollment lookup fails.
  if (enrollmentError) {
    throw enrollmentError;
  }

  // Return the student's enrollment or null when none exists.
  return enrollment;
}

/**
 * Retrieves the authenticated student's progress for one Academy lesson.
 */
export async function getStudentLessonProgress(
  enrollmentId: string,
  lessonId: string
) {
  // Resolve the authenticated Supabase session.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  // Stop when the session lookup fails.
  if (sessionError) {
    throw sessionError;
  }

  // Require an authenticated student.
  if (!session) {
    throw new Error("You must be signed in to view lesson progress.");
  }

  // Retrieve the requested lesson progress record.
  const { data, error } = await supabase
    .from("student_lesson_progress")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  // Stop when Supabase rejects the request.
  if (error) {
    throw error;
  }

  // Return the existing progress record when one exists.
  return data;
}

/**
 * Marks an Academy lesson as completed for the authenticated student.
 */
export async function completeStudentLesson(
  enrollmentId: string,
  lessonId: string
) {
  // Resolve the currently authenticated Supabase session.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  // Stop when the authentication lookup itself fails.
  if (sessionError) {
    throw sessionError;
  }

  // Require an authenticated student session.
  if (!session) {
    throw new Error("You must be signed in to complete this lesson.");
  }

  // Resolve the student profile belonging to the authenticated user.
  const { data: student, error: studentError } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  // Stop when the student profile query fails.
  if (studentError) {
    throw new Error(
      `Unable to load your student profile. ${studentError.message}`
    );
  }

  // Require a provisioned student profile.
  if (!student) {
    throw new Error(
      "Your student profile could not be found. Please complete your profile first."
    );
  }

  // Confirm that the enrollment belongs to the authenticated student.
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("student_enrollments")
    .select("id, student_id, program_id, status")
    .eq("id", enrollmentId)
    .eq("student_id", student.id)
    .maybeSingle();

  // Stop when the enrollment query fails.
  if (enrollmentError) {
    throw new Error(
      `Unable to verify your course enrollment. ${enrollmentError.message}`
    );
  }

  // Prevent a student from completing a lesson through an unrelated enrollment.
  if (!enrollment) {
    throw new Error("Your enrollment could not be verified for this lesson.");
  }

  // Only valid learning enrollment states may record lesson completion.
  if (!["active", "paused", "completed"].includes(enrollment.status)) {
    throw new Error(
      "Your current enrollment does not allow lesson completion."
    );
  }

  // Verify that the lesson belongs to the student's enrolled program.
  const { data: lesson, error: lessonError } = await supabase
    .from("academy_program_lessons")
    .select(
      `
        id,
        academy_program_modules (
          program_id
        )
      `
    )
    .eq("id", lessonId)
    .maybeSingle();

  // Stop when the lesson lookup fails.
  if (lessonError) {
    throw new Error(`Unable to verify this lesson. ${lessonError.message}`);
  }

  // Prevent completion of a lesson outside the enrolled program.
  if (!lesson) {
    throw new Error("This lesson could not be found.");
  }

  // Normalize the parent module returned by Supabase.
  const moduleData = Array.isArray(lesson.academy_program_modules)
    ? lesson.academy_program_modules[0]
    : lesson.academy_program_modules;

  // Verify the lesson/program relationship.
  if (!moduleData || moduleData.program_id !== enrollment.program_id) {
    throw new Error("This lesson does not belong to your enrolled course.");
  }

  // Generate one consistent completion timestamp.
  const completedAt = new Date().toISOString();

  // Create or update the student's lesson progress record.
  const { data, error } = await supabase
    .from("student_lesson_progress")
    .upsert(
      {
        student_id: student.id,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        status: "completed",
        progress_percent: 100,
        started_at: completedAt,
        completed_at: completedAt,
        last_accessed_at: completedAt,
      },
      {
        onConflict: "enrollment_id,lesson_id",
      }
    )
    .select()
    .single();

  // Surface the actual Supabase error instead of hiding it behind a generic message.
  if (error) {
    console.error("Failed to save lesson completion:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    throw new Error(`Unable to save lesson completion. ${error.message}`);
  }

  // Return the persisted lesson progress record.
  return data;
}
/**
 * Represents the normalized program data required by reusable program carousels.
 */
export interface AcademyProgramCarouselItem {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  thumbnailImageUrl: string | null;
  heroImageUrl: string | null;
  durationValue: number | null;
  durationUnit: string | null;
  price: number | null;
  discountPrice: number | null;
  currency: string | null;
}
/**
 * Loads published Academy programs and normalizes them for reusable UI components.
 */
export async function getAvailableAcademyPrograms(): Promise<
  AcademyProgramCarouselItem[]
> {
  const { data, error } = await supabase
    .from("academy_programs")
    .select(
      `
      id,
      title,
      slug,
      short_description,
      description,
      thumbnail_image_url,
      hero_image_url,
      duration_value,
      duration_unit,
      price,
      discount_price,
      currency
    `
    )
    .eq("status", "published")
    .eq("registration_open", true)
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((program) => ({
    id: program.id,
    title: program.title,
    slug: program.slug,
    shortDescription: program.short_description,
    description: program.description,
    thumbnailImageUrl: program.thumbnail_image_url,
    heroImageUrl: program.hero_image_url,
    durationValue: program.duration_value,
    durationUnit: program.duration_unit,
    price: program.price,
    discountPrice: program.discount_price,
    currency: program.currency,
  }));
}

/**
 * Retrieves the next published live session for the authenticated student.
 */
export async function getNextStudentLiveSession(): Promise<UpcomingSession | null> {
  // Get the currently authenticated Supabase session.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    throw new Error("You must be signed in to view upcoming sessions.");
  }

  // Resolve the student's profile from the authenticated user.
  const { data: student, error: studentError } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", session.user.id)
    .single();

  if (studentError) {
    throw studentError;
  }

  // Load the student's currently active learning enrollments.
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("student_enrollments")
    .select("program_id")
    .eq("student_id", student.id)
    .in("status", ["active", "paused"]);

  if (enrollmentError) {
    throw enrollmentError;
  }

  // Extract the program IDs associated with the student's enrollments.
  const programIds =
    enrollments
      ?.map((enrollment) => enrollment.program_id)
      .filter((programId): programId is string => Boolean(programId)) ?? [];

  // There is no session to retrieve if the student has no enrolled programs.
  if (programIds.length === 0) {
    return null;
  }

  // Use the current timestamp so only future sessions are returned.
  const now = new Date().toISOString();

  // Retrieve the earliest published and scheduled session
  // belonging to one of the student's enrolled programs.
  const { data, error } = await supabase
    .from("academy_live_sessions")
    .select(
      `
      id,
      title,
      description,
      platform,
      meeting_url,
      start_at,
      end_at
    `
    )
    .in("program_id", programIds)
    .eq("is_published", true)
    .eq("status", "scheduled")
    .gte("start_at", now)
    .order("start_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // Return null when there are currently no upcoming sessions.
  if (!data) {
    return null;
  }

  // Convert the database field names into the UI-friendly Academy type.
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    platform: data.platform,
    meetingUrl: data.meeting_url,
    startAt: data.start_at,
    endAt: data.end_at,
  };
}

/**
 * Retrieves quizzes belonging to an Academy program.
 */
export async function getAcademyProgramQuizzes(programId: string) {
  const { data, error } = await supabase
    .from("academy_quizzes")
    .select("*")
    .eq("program_id", programId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyQuiz[];
}

/**
 * Retrieves quizzes attached to an Academy module.
 */
export async function getAcademyModuleQuizzes(moduleId: string) {
  const { data, error } = await supabase
    .from("academy_quizzes")
    .select("*")
    .eq("module_id", moduleId)
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyQuiz[];
}

/**
 * Retrieves quizzes attached to an Academy lesson.
 */
export async function getAcademyLessonQuizzes(lessonId: string) {
  const { data, error } = await supabase
    .from("academy_quizzes")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyQuiz[];
}

/**
 * Creates a new Academy quiz.
 */
export async function createAcademyQuiz(input: AcademyQuizInput) {
  const { data, error } = await supabase
    .from("academy_quizzes")
    .insert({
      ...input,
      passing_score: input.passing_score ?? 80,
      max_attempts: input.max_attempts ?? null,
      is_required: input.is_required ?? true,
      is_published: input.is_published ?? false,
      display_order: input.display_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyQuiz;
}

/**
 * Updates an existing Academy quiz.
 */
export async function updateAcademyQuiz(
  quizId: string,
  updates: Partial<AcademyQuizInput>
) {
  const { data, error } = await supabase
    .from("academy_quizzes")
    .update(updates)
    .eq("id", quizId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyQuiz;
}

/**
 * Deletes an Academy quiz and its related questions and options.
 */
export async function deleteAcademyQuiz(quizId: string) {
  const { error } = await supabase
    .from("academy_quizzes")
    .delete()
    .eq("id", quizId);

  if (error) {
    throw error;
  }
}

/**
 * Retrieves all questions belonging to a quiz.
 */
export async function getAcademyQuizQuestions(quizId: string) {
  const { data, error } = await supabase
    .from("academy_quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyQuizQuestion[];
}

/**
 * Creates a question inside an Academy quiz.
 */
export async function createAcademyQuizQuestion(
  input: AcademyQuizQuestionInput
) {
  const { data, error } = await supabase
    .from("academy_quiz_questions")
    .insert({
      ...input,
      points: input.points ?? 1,
      display_order: input.display_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyQuizQuestion;
}

/**
 * Updates an Academy quiz question.
 */
export async function updateAcademyQuizQuestion(
  questionId: string,
  updates: Partial<AcademyQuizQuestionInput>
) {
  const { data, error } = await supabase
    .from("academy_quiz_questions")
    .update(updates)
    .eq("id", questionId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyQuizQuestion;
}

/**
 * Deletes an Academy quiz question and its answer options.
 */
export async function deleteAcademyQuizQuestion(questionId: string) {
  const { error } = await supabase
    .from("academy_quiz_questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    throw error;
  }
}

/**
 * Retrieves all options belonging to a quiz question.
 */
export async function getAcademyQuizOptions(questionId: string) {
  const { data, error } = await supabase
    .from("academy_quiz_options")
    .select("*")
    .eq("question_id", questionId)
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyQuizOption[];
}

/**
 * Creates an answer option for a quiz question.
 */
export async function createAcademyQuizOption(input: AcademyQuizOptionInput) {
  const { data, error } = await supabase
    .from("academy_quiz_options")
    .insert({
      ...input,
      is_correct: input.is_correct ?? false,
      display_order: input.display_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyQuizOption;
}

/**
 * Updates an Academy quiz answer option.
 */
export async function updateAcademyQuizOption(
  optionId: string,
  updates: Partial<AcademyQuizOptionInput>
) {
  const { data, error } = await supabase
    .from("academy_quiz_options")
    .update(updates)
    .eq("id", optionId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyQuizOption;
}

/**
 * Deletes an Academy quiz answer option.
 */
export async function deleteAcademyQuizOption(optionId: string) {
  const { error } = await supabase
    .from("academy_quiz_options")
    .delete()
    .eq("id", optionId);

  if (error) {
    throw error;
  }
}

/**
 * Loads the exact question and option ordering stored for a quiz attempt.
 *
 * The server returns only the safe quiz payload required by the student player.
 * Correct answers are never exposed while the student is taking the quiz.
 */
export async function getStudentQuizAttempt(
  attemptId: string
): Promise<StudentQuizAttemptPayload> {
  const { data, error } = await supabase.rpc("academy_get_quiz_attempt", {
    p_attempt_id: attemptId,
  });

  if (error) {
    throw error;
  }

  return data as StudentQuizAttemptPayload;
}

/**
 * Retrieves the immutable historical review for a completed quiz attempt.
 *
 * The server returns the original question order, option order,
 * selected answers, correct answers, explanations, and awarded points.
 */
export async function reviewStudentQuizAttempt(
  attemptId: string
): Promise<StudentQuizReview> {
  const { data, error } = await supabase.rpc("academy_review_quiz_attempt", {
    p_attempt_id: attemptId,
  });

  if (error) {
    throw error;
  }

  return data as StudentQuizReview;
}

/**
 * Retrieves the quiz attached to a specific module or lesson target.
 *
 * A lesson target takes precedence when both identifiers are supplied.
 */
export async function getAcademyQuizForTarget(
  programId: string,
  moduleId?: string | null,
  lessonId?: string | null
): Promise<AcademyQuiz | null> {
  let query = supabase
    .from("academy_quizzes")
    .select("*")
    .eq("program_id", programId);

  if (lessonId) {
    query = query.eq("lesson_id", lessonId);
  } else if (moduleId) {
    query = query.eq("module_id", moduleId).is("lesson_id", null);
  } else {
    throw new Error("A module or lesson target is required.");
  }

  const { data, error } = await query
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as AcademyQuiz | null;
}

/**
 * Starts or resumes a student's quiz attempt.
 *
 * The database RPC is responsible for authentication, enrollment validation,
 * attempt creation, question randomization, and option randomization.
 */
export async function startStudentQuiz(
  quizId: string,
  enrollmentId: string
): Promise<StudentQuizAttemptPayload> {
  const { data, error } = await supabase.rpc("academy_start_quiz", {
    p_quiz_id: quizId,
    p_enrollment_id: enrollmentId,
  });

  if (error) {
    throw error;
  }

  return data as StudentQuizAttemptPayload;
}

/**
 * Submits a student's answers for authoritative server-side grading.
 *
 * The client never calculates correctness, score, or pass/fail status.
 */
export async function submitStudentQuiz(
  attemptId: string,
  answers: StudentQuizSubmissionAnswer[]
): Promise<StudentQuizResult> {
  const { data, error } = await supabase.rpc("academy_submit_quiz", {
    p_attempt_id: attemptId,
    p_answers: answers,
  });

  if (error) {
    throw error;
  }

  return data as StudentQuizResult;
}

/**
 * Finds the published quiz attached directly to a student lesson.
 *
 * This is used by the student lesson page to determine whether
 * the lesson has an assessment that should be displayed.
 */
export async function getStudentLessonQuiz(
  programId: string,
  lessonId: string
): Promise<AcademyQuiz | null> {
  const { data, error } = await supabase
    .from("academy_quizzes")
    .select("*")
    .eq("program_id", programId)
    .eq("lesson_id", lessonId)
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as AcademyQuiz | null;
}
