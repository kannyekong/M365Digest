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

export async function listInstructors() {
  return await supabase
    .from("bootcamp_instructors")
    .select("*")
    .order("display_order", {
      ascending: true,
    });
}

export async function getInstructorById(id: string) {
  return await supabase
    .from("bootcamp_instructors")
    .select("*")
    .eq("id", id)
    .single();
}

export async function createInstructor(
  values: Partial<BootcampInstructor>
) {
  return await supabase.from("bootcamp_instructors").insert(values);
}

export async function updateInstructor(
  id: string,
  values: Partial<BootcampInstructor>
) {
  return await supabase
    .from("bootcamp_instructors")
    .update(values)
    .eq("id", id);
}

export async function deleteInstructor(id: string) {
  return await supabase.from("bootcamp_instructors").delete().eq("id", id);
}
