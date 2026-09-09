import { tweakMartAdminSupabase } from "./supabase-server";

export interface TweakMartBlogPostInput {
  title: string;
  slug: string;
  excerpt: string;
  content: unknown;
  cover_image: string;
  published: boolean;
  category: string;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
}

/* Returns all TweakMart blog posts for administration. */
export async function getAllTweakMartPosts() {
  return await tweakMartAdminSupabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });
}

/* Creates a TweakMart article using the same content contract as CloudTweak. */
export async function createTweakMartPost(post: TweakMartBlogPostInput) {
  return await tweakMartAdminSupabase
    .from("blog_posts")
    .insert({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      cover_image: post.cover_image,
      published: post.published,
      category: post.category,
      seo_title: post.seo_title,
      seo_description: post.seo_description,
      canonical_url: post.canonical_url,
      published_at: post.published ? new Date().toISOString() : null,
    })
    .select()
    .single();
}

/* Loads one TweakMart article by ID for editing. */
export async function getTweakMartPost(id: string) {
  return await tweakMartAdminSupabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();
}

/* Updates an existing TweakMart article. */
export async function updateTweakMartPost(
  id: string,
  updates: TweakMartBlogPostInput
) {
  return await tweakMartAdminSupabase
    .from("blog_posts")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      published_at: updates.published ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select()
    .single();
}

/* Deletes a TweakMart article. */
export async function deleteTweakMartPost(id: string) {
  return await tweakMartAdminSupabase.from("blog_posts").delete().eq("id", id);
}

/* Toggles the published state of a TweakMart article. */
export async function toggleTweakMartPostPublished(
  id: string,
  published: boolean
) {
  return await tweakMartAdminSupabase
    .from("blog_posts")
    .update({
      published: !published,
      published_at: !published ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
}
