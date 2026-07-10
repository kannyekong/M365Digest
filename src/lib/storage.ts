import { supabase } from "./superbase";

export async function uploadCoverImage(file: File, bucket: string) {
  const path = `${Date.now()}-${file.name}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file);

  if (error) {
    return {
      data: null,
      error,
    };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    data: data.publicUrl,
    error: null,
  };
}

export async function deleteCoverImage(imageUrl: string, bucket: string) {
  // Extract the filename from the public URL
  const path = imageUrl.split("/").pop();

  if (!path) {
    return {
      error: new Error("Invalid image URL."),
    };
  }

  const { error } = await supabase.storage.from(bucket).remove([path]);

  return { error };
}
