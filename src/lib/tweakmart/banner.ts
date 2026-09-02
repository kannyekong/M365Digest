import { tweakMartAdminSupabase } from "./supabase-server";

export interface TweakMartBanner {
  id: string;
  title: string;
  image_url: string;
  alt_text: string | null;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TweakMartBannerInput {
  title: string;
  image_url: string;
  alt_text?: string | null;
  link_url?: string | null;
  display_order: number;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

/* Loads all TweakMart featured banners for administrative management. */
export async function getTweakMartBanners(): Promise<TweakMartBanner[]> {
  const { data, error } = await tweakMartAdminSupabase
    .from("featured_banners")
    .select(
      `
        id,
        title,
        image_url,
        alt_text,
        link_url,
        display_order,
        is_active,
        starts_at,
        ends_at,
        created_at,
        updated_at,
        storage_path
      `
    )
    .order("display_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Failed to load TweakMart featured banners:", error);

    throw new Error("Unable to load TweakMart featured banners.");
  }

  return (data ?? []) as TweakMartBanner[];
}

/* Loads one TweakMart featured banner by its unique identifier. */
export async function getTweakMartBanner(
  id: string
): Promise<TweakMartBanner | null> {
  const { data, error } = await tweakMartAdminSupabase
    .from("featured_banners")
    .select(
      `
        id,
        title,
        image_url,
        alt_text,
        link_url,
        display_order,
        is_active,
        starts_at,
        ends_at,
        created_at,
        updated_at,
        storage_path
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load TweakMart featured banner:", error);

    throw new Error("Unable to load TweakMart featured banner.");
  }

  return data as TweakMartBanner | null;
}

/* Creates a new TweakMart featured banner. */
export async function createTweakMartBanner(
  values: TweakMartBannerInput
): Promise<TweakMartBanner> {
  const { data, error } = await tweakMartAdminSupabase
    .from("featured_banners")
    .insert({
      title: values.title.trim(),
      image_url: values.image_url.trim(),
      alt_text: values.alt_text?.trim() || null,
      link_url: values.link_url?.trim() || null,
      display_order: values.display_order,
      is_active: values.is_active,
      starts_at: values.starts_at || null,
      ends_at: values.ends_at || null,
      updated_at: new Date().toISOString(),
      storage_path: values.storage_path ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create TweakMart featured banner:", error);

    throw new Error("Unable to create TweakMart featured banner.");
  }

  return data as TweakMartBanner;
}

/* Updates an existing TweakMart featured banner. */
export async function updateTweakMartBanner(
  id: string,
  values: TweakMartBannerInput
): Promise<TweakMartBanner> {
  const { data, error } = await tweakMartAdminSupabase
    .from("featured_banners")
    .update({
      title: values.title.trim(),
      image_url: values.image_url.trim(),
      alt_text: values.alt_text?.trim() || null,
      link_url: values.link_url?.trim() || null,
      display_order: values.display_order,
      is_active: values.is_active,
      starts_at: values.starts_at || null,
      ends_at: values.ends_at || null,
      updated_at: new Date().toISOString(),
      storage_path: values.storage_path ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update TweakMart featured banner:", error);

    throw new Error("Unable to update TweakMart featured banner.");
  }

  return data as TweakMartBanner;
}

/* Changes whether a TweakMart featured banner is available on the storefront. */
export async function setTweakMartBannerActive(
  id: string,
  isActive: boolean
): Promise<void> {
  const { error } = await tweakMartAdminSupabase
    .from("featured_banners")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to change TweakMart banner status:", error);

    throw new Error("Unable to change banner status.");
  }
}

/* Permanently removes a featured banner database record. */
export async function deleteTweakMartBanner(id: string): Promise<void> {
  const { error } = await tweakMartAdminSupabase
    .from("featured_banners")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete TweakMart featured banner:", error);

    throw new Error("Unable to delete TweakMart featured banner.");
  }
}

export interface TweakMartBanner {
  id: string;
  title: string;
  image_url: string;
  storage_path: string | null;
  alt_text: string | null;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TweakMartBannerInput {
  title: string;
  image_url: string;
  storage_path?: string | null;
  alt_text?: string | null;
  link_url?: string | null;
  display_order: number;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}
