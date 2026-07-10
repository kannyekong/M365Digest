import { supabase } from "./superbase";

export async function incrementViews(id: string) {
  return await supabase.rpc("increment_post_views", {
    post_id: id,
  });
}
