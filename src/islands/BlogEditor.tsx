import { useEffect, useState } from "react";
import { createPost, updatePost, getPost } from "../lib/blog";
import TiptapEditor from "../components/editor/TiptapEditor";
import ImageUploader from "../blog/ImageUploader";
import toast from "react-hot-toast";
import PreviewModal from "../components/admin/PreviewModal";
import { ArrowLeftCircle } from "lucide-react";

interface BlogEditorProps {
  editMode?: boolean;
}

export default function BlogEditor({ editMode = false }: BlogEditorProps) {
  const [category, setCategory] = useState("General");
  const [postId, setPostId] = useState("");

  const [title, setTitle] = useState("");

  const [slug, setSlug] = useState("");

  const [slugEdited, setSlugEdited] = useState(false);

  const [excerpt, setExcerpt] = useState("");

  const [seoTitle, setSeoTitle] = useState("");

  const [seoDescription, setSeoDescription] = useState("");

  const [canonicalUrl, setCanonicalUrl] = useState("");

  const [loading, setLoading] = useState(false);

  const [loadingPost, setLoadingPost] = useState(editMode);

  const [coverImage, setCoverImage] = useState("");

  const [published, setPublished] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);

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
        toast.error("No article ID found.");
        return;
      }

      setPostId(id);

      const { data, error } = await getPost(id);

      if (error) {
        toast.error(error.message);
        return;
      }

      if (!data) {
        toast.error("Article not found.");
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
      setCategory(data.category || "General");

      setCoverImage(data.cover_image ?? "");

      setSeoTitle(data.seo_title ?? "");
      setSeoDescription(data.seo_description ?? "");
      setCanonicalUrl(data.canonical_url ?? "");

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
        category,
        seo_title: seoTitle,
        seo_description: seoDescription,
        canonical_url: canonicalUrl,
      }));
    } else {
      ({ error } = await createPost({
        title,
        slug,
        excerpt,
        content,
        cover_image: coverImage,
        published,
        category,
        seo_title: seoTitle,
        seo_description: seoDescription,
        canonical_url: canonicalUrl,
      }));
    }

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(editMode ? "Article Updated!" : "Article Created!");

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
    <div>
      <div className="flex flex-row justify-between">
        <div className="mb-10">
          <h1 className="text-xl font-bold">New article</h1>
          <p className="mt-2 text-slate-500 text-xs">Create a new article.</p>
        </div>
        <a href="/admin/blog/articles">
          <ArrowLeftCircle size={50} className="text-orange-500" />
        </a>
      </div>
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="space-y-6">
          {/* Image Uploader Field */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Cover Image
            </label>

            <ImageUploader
              value={coverImage}
              onChange={setCoverImage}
              bucket="blog-images"
            />
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
          <div>
            <mark className="text-xs text-white bg-orange-700 pr-2 pl-2 rounded-full">
              Select a post category
            </mark>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3"
            >
              <option>General</option>
              <option>Microsoft 365</option>
              <option>Exchange Online</option>
              <option>SharePoint</option>
              <option>Microsoft Teams</option>
              <option>Microsoft Entra ID</option>
              <option>Microsoft Defender</option>
              <option>Microsoft Intune</option>
              <option>Power Platform</option>
              <option>Copilot</option>
            </select>
          </div>
          <input
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(e.target.value);
            }}
            placeholder="Slug"
            className="w-full rounded-xl border p-4"
          />

          <div className="rounded-xl border border-slate-300 p-6 space-y-4">
            <h3 className="text-lg font-semibold">SEO Settings</h3>

            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="SEO Title"
              className="w-full rounded-xl border p-3"
            />

            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Meta Description"
              rows={3}
              className="w-full rounded-xl border p-3"
            />

            <input
              value={canonicalUrl}
              onChange={(e) => setCanonicalUrl(e.target.value)}
              placeholder="Canonical URL (optional)"
              className="w-full rounded-xl border p-3"
            />
          </div>
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
          <div className="space-x-5">
            <button
              onClick={() => setPreviewOpen(true)}
              className="rounded-xl border border-green-300 bg-white px-3 py-2 font-medium text-slate-700 transition hover:border-red-400 hover:text-red-600"
            >
              Preview
            </button>
            <button
              onClick={publish}
              className="rounded-xl bg-green-600 px-3 py-2 text-white"
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
        <PreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          article={{
            title,
            excerpt,
            cover_image: coverImage,
            category,
            content,
            slug,
          }}
        />
      </div>
    </div>
  );
}
