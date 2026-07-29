import { supabase } from "./superbase";
import type {
  AcademyInstructor,
  AcademyProgramInstructor,
} from "../types/academy";

export interface AssignProgramInstructorInput {
  program_id: string;
  instructor_id: string;
  is_lead: boolean;
  display_order: number;
}

export type UpdateProgramInstructorInput = Partial<
  Pick<AssignProgramInstructorInput, "is_lead" | "display_order">
>;

/**
 * Retrieve all active Academy instructors available for assignment.
 */
export async function getAvailableAcademyInstructors() {
  const { data, error } = await supabase
    .from("academy_instructors")
    .select("*")
    .eq("is_active", true)
    .order("display_order", {
      ascending: true,
    })
    .order("full_name", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyInstructor[];
}

/**
 * Retrieve every instructor assigned to one Academy program.
 */
export async function getAcademyProgramInstructors(programId: string) {
  const { data, error } = await supabase
    .from("academy_program_instructors")
    .select(
      `
      *,
      instructor:academy_instructors(*)
      `
    )
    .eq("program_id", programId)
    .order("is_lead", {
      ascending: false,
    })
    .order("display_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyProgramInstructor[];
}

/**
 * Assign an existing Academy instructor to a program.
 */
export async function assignAcademyProgramInstructor(
  values: AssignProgramInstructorInput
) {
  const { data, error } = await supabase
    .from("academy_program_instructors")
    .insert(values)
    .select(
      `
      *,
      instructor:academy_instructors(*)
      `
    )
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyProgramInstructor;
}

/**
 * Update an instructor assignment within a program.
 */
export async function updateAcademyProgramInstructor(
  assignmentId: string,
  updates: UpdateProgramInstructorInput
) {
  const { data, error } = await supabase
    .from("academy_program_instructors")
    .update(updates)
    .eq("id", assignmentId)
    .select(
      `
      *,
      instructor:academy_instructors(*)
      `
    )
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyProgramInstructor;
}

/**
 * Remove an instructor assignment from a program.
 */
export async function removeAcademyProgramInstructor(assignmentId: string) {
  const { error } = await supabase
    .from("academy_program_instructors")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    throw error;
  }
}

/**
 * Set one assigned instructor as the program lead.
 */
export async function setLeadAcademyProgramInstructor(
  programId: string,
  assignmentId: string
) {
  const { error: clearLeadError } = await supabase
    .from("academy_program_instructors")
    .update({
      is_lead: false,
    })
    .eq("program_id", programId);

  if (clearLeadError) {
    throw clearLeadError;
  }

  const { data, error } = await supabase
    .from("academy_program_instructors")
    .update({
      is_lead: true,
    })
    .eq("id", assignmentId)
    .eq("program_id", programId)
    .select(
      `
      *,
      instructor:academy_instructors(*)
      `
    )
    .single();

  if (error) {
    throw error;
  }

  return data as AcademyProgramInstructor;
}
