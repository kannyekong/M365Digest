import { supabase } from "./superbase";

export async function uploadCoverImage(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const path = `covers/${filename}`;

  const { error } = await supabase.storage
    .from("blog-images")
    .upload(path, file);

  if (error) {
    return { error };
  }

  const { data } = supabase.storage.from("blog-images").getPublicUrl(path);

  return {
    data: data.publicUrl,
    error: null,
  };
}
