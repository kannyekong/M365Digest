import { supabase } from "./superbase";

export interface Testimonial {
  id: string;

  full_name: string;

  position: string;

  company: string | null;

  testimonial: string;

  rating: number;

  display_order: number;

  is_active: boolean;
}

export async function listTestimonials() {
  return await supabase
    .from("testimonials")
    .select("*")
    .order("display_order", {
      ascending: true,
    });
}

export async function getTestimonial(id: string) {
  return await supabase.from("testimonials").select("*").eq("id", id).single();
}

export async function createTestimonial(values: Partial<Testimonial>) {
  return await supabase.from("testimonials").insert(values);
}

export async function updateTestimonial(
  id: string,
  values: Partial<Testimonial>
) {
  return await supabase.from("testimonials").update(values).eq("id", id);
}

export async function deleteTestimonial(id: string) {
  return await supabase.from("testimonials").delete().eq("id", id);
}
