// THIS GETS ALL THE REVIEW SUBMISSIONS FROM SUPABASE REVIEW_SUBMISSIONS TABLE

import { supabase } from "./superbase";

export async function listReviews() {
  const { data, error } = await supabase
    .from("review_submissions")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) throw error;

  return data ?? [];
}

export async function deleteReview(id: string) {
  return await supabase
    .from("review_submissions")
    .delete()
    .eq("id", id);
}