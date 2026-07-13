import { supabase } from "./superbase";

export interface BootcampSettings {
  id: string;

  hero_prefix: string | null;
  hero_suffix: string | null;
  hero_rotating_words: string[] | null;

  hero_subtitle: string;
  hero_image: string;

  cta_text: string;
  cta_url: string;

  registration_open: boolean;

  next_cohort: string;
  registration_deadline: string;

  duration: string;
  delivery_mode: string;
  class_schedule: string;

  price: number;
  discount_price: number;

  seats_remaining: number;

  seo_title: string;
  seo_description: string;
  canonical_url: string;
}

export async function getBootcampSettings() {
  const result = await supabase.from("bootcamp_settings").select("*").single();

  console.log(result);

  return result;
}

export async function updateBootcampSettings(
  id: string,
  values: Partial<BootcampSettings>
) {
  return await supabase.from("bootcamp_settings").update(values).eq("id", id);
}

export async function deleteRegistration(id: string) {
  return await supabase
    .from("bootcamp_registrations")
    .delete()
    .eq("id", id);
}