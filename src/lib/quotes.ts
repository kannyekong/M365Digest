// THIS GETS ALL THE QUOTE SUBMISSIONS FROM SUPABASE QUOTES_SUBMISSION TABLE

import { supabase } from "./superbase";

export async function listQuotes() {
  const { data, error } = await supabase
    .from("quote_submissions")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) throw error;

  return data;
}

export async function deleteQuote(id: string) {
  return await supabase
    .from("quote_submissions")
    .delete()
    .eq("id", id);
}