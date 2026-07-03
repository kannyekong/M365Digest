import { useEffect, useState } from "react";
import { createPost, updatePost, getPost } from "../lib/blog";

interface BlogEditorProps {
  editMode?: boolean;
}

export default function BlogEditor({ editMode = false }: BlogEditorProps) {
  const [postId, setPostId] = useState("");

  const [title, setTitle] = useState("");

  const [slug, setSlug] = useState("");

  const [excerpt, setExcerpt] = useState("");

  const [loading, setLoading] = useState(false);

  const [loadingPost, setLoadingPost] = useState(editMode);

  useEffect(() => {
    if (!editMode) return;

    async function loadPost() {
      const id = new URLSearchParams(window.location.search).get("id");

      if (!id) {
        alert("No article ID found.");
        return;
      }

      setPostId(id);

      const { data, error } = await getPost(id);

      if (error) {
        alert(error.message);
        return;
      }

      if (!data) {
        alert("Article not found.");
        return;
      }

      setTitle(data.title);
      setSlug(data.slug);
      setExcerpt(data.excerpt ?? "");

      setLoadingPost(false);
    }

    loadPost();
  }, [editMode]);

  async function publish() {
    setLoading(true);

    let error;

    if (editMode) {
      ({ error } = await updatePost(postId, {
        title,
        slug,
        excerpt,
        content: {},
        published: false,
      }));
    } else {
      ({ error } = await createPost({
        title,
        slug,
        excerpt,
      }));
    }

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert(editMode ? "Article Updated!" : "Article Created!");

    window.location.href = "/admin/blog";
  }

  if (loadingPost) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        Loading article...
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <div className="space-y-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article Title"
          className="w-full rounded-xl border p-4 text-3xl font-bold"
        />

        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="Slug"
          className="w-full rounded-xl border p-4"
        />

        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={4}
          placeholder="Excerpt..."
          className="w-full rounded-xl border p-4"
        />

        <button
          onClick={publish}
          className="rounded-xl bg-red-600 px-6 py-3 text-white"
        >
          {loading
            ? editMode
              ? "Updating..."
              : "Publishing..."
            : editMode
              ? "Update Article"
              : "Publish Article"}
        </button>
      </div>
    </div>
  );
}
