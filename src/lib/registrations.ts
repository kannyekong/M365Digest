// THIS GETS ALL THE REGISTRATION SUBMISSIONS FROM SUPABASE BOOTCAMP_REGISTRATION TABLE

import { supabase } from "./superbase";

export async function listRegistrations() {
  const { data, error } = await supabase
    .from("bootcamp_registrations")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) throw error;

  return data;
}