import { supabase } from "./superbase";

// This gets all the POSTS

export async function getPosts() {
  return await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });
}

// This Creates all POSTS

export async function createPost(post: {
  title: string;
  slug: string;
  excerpt: string;
  content: any;
  cover_image: string;
  published: boolean;
}) {
  return await supabase
    .from("blog_posts")
    .insert({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      cover_image: post.cover_image,
      published: post.published,
    })
    .select()
    .single();
}

// This Deletes POSTS

export async function deletePost(id: string) {
  return await supabase.from("blog_posts").delete().eq("id", id);
}

export async function getPost(id: string) {
  return await supabase.from("blog_posts").select("*").eq("id", id).single();
}

// This FXN updates POSTS

export async function updatePost(
  id: string,
  updates: {
    title: string;
    slug: string;
    excerpt: string;
    content: any;
    published: boolean;
    cover_image: string;
  }
) {
  return await supabase.from("blog_posts").update(updates).eq("id", id);
}

// Fetches BLOG posts by slug

export async function getPostBySlug(slug: string) {
  return await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .single();
}

export async function getRelatedPosts(currentSlug: string, limit = 3) {
  return await supabase
    .from("blog_posts")
    .select("*")
    .neq("slug", currentSlug)
    .order("created_at", { ascending: false })
    .limit(limit);
}
