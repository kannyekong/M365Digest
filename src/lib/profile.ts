import { supabase } from "./superbase";

export async function updatePassword(password: string) {
  return await supabase.auth.updateUser({
    password,
  });
}

export async function getCurrentUser() {
  return await supabase.auth.getUser();
}

export async function updateProfileImage(url: string) {
  return await supabase.auth.updateUser({
    data: {
      avatar_url: url,
    },
  });
}