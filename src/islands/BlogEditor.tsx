import { useEffect, useState } from "react";
import { createPost, updatePost, getPost } from "../lib/blog";
import TiptapEditor from "../components/editor/TiptapEditor";
import CoverImageUploader from "../blog/CoverImageUploader";

interface BlogEditorProps {
  editMode?: boolean;
}

export default function BlogEditor({ editMode = false }: BlogEditorProps) {
  const [postId, setPostId] = useState("");

  const [title, setTitle] = useState("");

  const [slug, setSlug] = useState("");

  const [slugEdited, setSlugEdited] = useState(false);

  const [excerpt, setExcerpt] = useState("");

  const [loading, setLoading] = useState(false);

  const [loadingPost, setLoadingPost] = useState(editMode);

  const [coverImage, setCoverImage] = useState("");

  const [published, setPublished] = useState(false);

  const [content, setContent] = useState({
    type: "doc",
    content: [
      {
        type: "paragraph",
      },
    ],
  });

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
      setPublished(data.published ?? false);
      setContent(
        data.content ?? {
          type: "doc",
          content: [{ type: "paragraph" }],
        }
      );

      setCoverImage(data.cover_image ?? "");

      setLoadingPost(false);
    }

    loadPost();
  }, [editMode]);

  function generateSlug(text: string) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  async function publish() {
    setLoading(true);

    let error;

    if (editMode) {
      ({ error } = await updatePost(postId, {
        title,
        slug,
        excerpt,
        content,
        cover_image: coverImage,
        published,
      }));
    } else {
      ({ error } = await createPost({
        title,
        slug,
        excerpt,
        content,
        cover_image: coverImage,
        published,
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
        {/* Image Uploader Field */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Cover Image
          </label>

          <CoverImageUploader value={coverImage} onChange={setCoverImage} />
        </div>

        {/* Title Field */}
        <input
          value={title}
          onChange={(e) => {
            const value = e.target.value;

            setTitle(value);

            if (!slugEdited) {
              setSlug(generateSlug(value));
            }
          }}
          placeholder="Article Title"
          className="w-full rounded-xl border p-4 text-3xl font-bold"
        />

        <input
          value={slug}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(e.target.value);
          }}
          placeholder="Slug"
          className="w-full rounded-xl border p-4"
        />
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Article Content
          </label>

          <TiptapEditor value={content} onChange={setContent} />
        </div>
        <div className="rounded-xl border border-slate-300 p-5">
          <label className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Publish Article</h3>

              <p className="text-sm text-slate-500">
                Draft articles are hidden from visitors.
              </p>
            </div>

            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-5 w-5 accent-red-600"
            />
          </label>
        </div>
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
