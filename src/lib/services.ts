// THIS FILE LISTS ALL THE SERVICES IN THE LANDING PAGE HTTPS://CLOUDTWEAK.NET

import { supabase } from "./superbase";

export interface Service {
  id: string;
  title: string;
  description: string;
  badge: string | null;
  button_text: string;
  button_url: string;
  highlight: boolean;
  display_order: number;
  is_active: boolean;
}

export async function listServices() {
  return await supabase.from("services").select("*").order("display_order", {
    ascending: true,
  });
}

export async function getService(id: string) {
  return await supabase.from("services").select("*").eq("id", id).single();
}

export async function createService(values: Partial<Service>) {
  return await supabase.from("services").insert(values);
}

export async function updateService(id: string, values: Partial<Service>) {
  return await supabase.from("services").update(values).eq("id", id);
}

export async function deleteService(id: string) {
  return await supabase.from("services").delete().eq("id", id);
}
