// THIS GETS ALL THE CONTACT SUBMISSIONS FROM SUPABASE CONTACT_SUBMISSION TABLE

import { supabase } from "./superbase";

export async function listContacts() {
  const { data, error } = await supabase
    .from("contact_submissions")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) throw error;

  return data;
}

export async function deleteContact(id: string) {
  return await supabase
    .from("contact_submissions")
    .delete()
    .eq("id", id)
    .select();
}