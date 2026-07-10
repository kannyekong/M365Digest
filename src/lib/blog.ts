import { supabase } from "./superbase";

// This gets all the POSTS

export async function getAllPosts() {
  return await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });
}

export async function getPublishedPosts() {
  return await supabase
    .from("blog_posts")
    .select("*")
    .eq("published", true)
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
  category: string;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
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
      category: post.category,
      seo_title: post.seo_title,
      seo_description: post.seo_description,
      canonical_url: post.canonical_url,
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
    category: string;
    seo_title: string;
    seo_description: string;
    canonical_url: string;
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

export async function togglePublished(id: string, published: boolean) {
  return await supabase
    .from("blog_posts")
    .update({
      published: !published,
    })
    .eq("id", id)
    .select()
    .single();
}

//GET DASHBOARD ANALYTICS:

export async function getDashboardAnalytics() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id,title,category,views,published,created_at");

  if (error) {
    return { data: null, error };
  }

  const posts = data ?? [];

  const totalViews = posts.reduce((sum, post) => sum + (post.views ?? 0), 0);

  const mostViewedArticle =
    [...posts].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0] ?? null;

  const latestArticle =
    [...posts].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0] ?? null;

  const categoryMap = new Map<string, number>();

  posts.forEach((post) => {
    const category = post.category ?? "General";

    categoryMap.set(
      category,
      (categoryMap.get(category) ?? 0) + (post.views ?? 0)
    );
  });

  const categoryViews = [...categoryMap.entries()]
    .map(([category, views]) => ({
      category,
      views,
    }))
    .sort((a, b) => b.views - a.views);

  const mostViewedCategory = categoryViews[0] ?? null;

  return {
    data: {
      totalViews,
      mostViewedArticle,
      latestArticle,
      mostViewedCategory,
      categoryViews,
    },
    error: null,
  };
}
