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
