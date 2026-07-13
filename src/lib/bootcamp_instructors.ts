import { supabase } from "./superbase";

export interface BootcampInstructor {
  id: string;
  full_name: string;
  title: string;
  bio: string;
  image_url: string;
  skills: string[];
  linkedin_url: string;
  github_url: string;
  email: string;
  phone: string;
  website: string;
  display_order: number;
  is_active: boolean;
}

// Lists all instructors for ADMIN view

export async function listInstructors() {
  return await supabase
    .from("bootcamp_instructors")
    .select("*")
    .order("display_order", {
      ascending: true,
    });
}

// This lists active instructors for the public view ONLY

export async function listActiveInstructors() {
  const { data, error } = await supabase
    .from("bootcamp_instructors")
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
    .from("bootcamp_instructors")
    .select("*")
    .eq("id", id)
    .single();
}

// This creates an instructor

export async function createInstructor(
  values: Partial<BootcampInstructor>
) {
  return await supabase.from("bootcamp_instructors").insert(values);
}


// This updates an Instructor

export async function updateInstructor(
  id: string,
  values: Partial<BootcampInstructor>
) {
  return await supabase
    .from("bootcamp_instructors")
    .update(values)
    .eq("id", id);
}

// This deletes an Instructor

export async function deleteInstructor(id: string) {
  return await supabase.from("bootcamp_instructors").delete().eq("id", id);
}
