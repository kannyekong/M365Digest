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
}) {
  return await supabase
    .from("blog_posts")
    .insert({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: {},
      published: false,
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
  }
) {
  return await supabase.from("blog_posts").update(updates).eq("id", id);
}
