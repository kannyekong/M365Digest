import { supabase } from "./superbase";
import type {
  AcademyInstructor,
  AcademyInstructorWithProgramCount,
} from "../types/academy";

// Lists all instructors for ADMIN view

export async function listInstructors() {
  return await supabase
    .from("academy_instructors")
    .select("*")
    .order("display_order", {
      ascending: true,
    });
}

// This lists active instructors for the public view ONLY

export async function listActiveInstructors() {
  const { data, error } = await supabase
    .from("academy_instructors")
    .select("*")
    .eq("is_active", true)
    .order("display_order", {
      ascending: true,
    });

  if (error) throw error;

  return data;
}

// This gets instructors by ID so it can be modified by Admin

export async function getInstructorById(id: string) {
  return await supabase
    .from("academy_instructors")
    .select("*")
    .eq("id", id)
    .single();
}

// This creates an instructor

export async function createInstructor(values: Partial<AcademyInstructor>) {
  return await supabase.from("academy_instructors").insert(values);
}

// This updates an Instructor

export async function updateInstructor(
  id: string,
  values: Partial<AcademyInstructor>
) {
  return await supabase.from("academy_instructors").update(values).eq("id", id);
}

// This deletes an Instructor

export async function deleteInstructor(id: string) {
  return await supabase.from("academy_instructors").delete().eq("id", id);
}

export async function listInstructorsWithProgramCount() {
  const [
    { data: instructors, error: instructorsError },
    { data: assignments, error: assignmentsError },
  ] = await Promise.all([
    supabase.from("academy_instructors").select("*").order("display_order", {
      ascending: true,
    }),

    supabase.from("academy_program_instructors").select("instructor_id"),
  ]);

  if (instructorsError) {
    throw instructorsError;
  }

  if (assignmentsError) {
    throw assignmentsError;
  }

  /* Counts program assignments for every instructor without making one query per instructor. */
  const programCountByInstructor = (assignments ?? []).reduce<
    Record<string, number>
  >((counts, assignment) => {
    counts[assignment.instructor_id] =
      (counts[assignment.instructor_id] ?? 0) + 1;

    return counts;
  }, {});

  return (instructors ?? []).map(
    (instructor): AcademyInstructorWithProgramCount => ({
      ...(instructor as AcademyInstructor),
      assigned_program_count: programCountByInstructor[instructor.id] ?? 0,
    })
  );
}
