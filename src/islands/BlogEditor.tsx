import { useEffect, useState } from "react";

import { createPost, updatePost, getPost } from "../lib/blog";

import TiptapEditor from "../components/editor/TiptapEditor";
import ImageUploader from "../blog/ImageUploader";
import toast from "react-hot-toast";
import PreviewModal from "../components/admin/PreviewModal";

import {
  ArrowLeftCircle,
  Check,
  LoaderCircle,
  Search,
  Share2,
} from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaThreads,
  FaXTwitter,
} from "react-icons/fa6";

interface BlogEditorProps {
  editMode?: boolean;
}

interface BufferChannel {
  id: string;
  name: string;
  displayName: string | null;
  service: string;
  avatar: string | null;
  isQueuePaused: boolean;
}

interface SocialPublishingResult {
  channelId: string;
  platform?: string;
  channelName?: string;
  success: boolean;
  error?: string;
}

/* Returns the appropriate social brand icon for a connected Buffer channel. */
function SocialChannelIcon({ service }: { service: string }) {
  const normalizedService = service.toLowerCase();

  switch (normalizedService) {
    case "linkedin":
      return <FaLinkedinIn size={17} />;

    case "facebook":
      return <FaFacebookF size={17} />;

    case "instagram":
      return <FaInstagram size={17} />;

    case "twitter":
    case "x":
      return <FaXTwitter size={17} />;

    case "threads":
      return <FaThreads size={17} />;

    default:
      return <Share2 size={17} />;
  }
}

/* Creates and edits CloudTweak blog articles and optionally distributes published articles through Buffer. */
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

  const [bufferChannels, setBufferChannels] = useState<BufferChannel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [socialCaption, setSocialCaption] = useState("");

  const [content, setContent] = useState({
    type: "doc",
    content: [
      {
        type: "paragraph",
      },
    ],
  });

  /* Loads the article data when editing an existing article. */
  useEffect(() => {
    if (!editMode) {
      return;
    }

    async function loadPost() {
      const id = new URLSearchParams(window.location.search).get("id");

      if (!id) {
        toast.error("No article ID found.");
        setLoadingPost(false);
        return;
      }

      setPostId(id);

      const { data, error } = await getPost(id);

      if (error) {
        toast.error(error.message);
        setLoadingPost(false);
        return;
      }

      if (!data) {
        toast.error("Article not found.");
        setLoadingPost(false);
        return;
      }

      setTitle(data.title);
      setSlug(data.slug);
      setSlugEdited(true);
      setExcerpt(data.excerpt ?? "");
      setPublished(data.published ?? false);

      setContent(
        data.content ?? {
          type: "doc",
          content: [
            {
              type: "paragraph",
            },
          ],
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

  /* Loads all social channels currently connected through Buffer. */
  useEffect(() => {
    async function loadBufferChannels() {
      setLoadingChannels(true);

      try {
        const response = await fetch("/api/admin/buffer/channels");

        const responseText = await response.text();

        let result: {
          channels?: BufferChannel[];
          error?: string;
        };

        try {
          result = JSON.parse(responseText) as typeof result;
        } catch {
          throw new Error(
            "The Buffer channels endpoint returned an invalid response."
          );
        }

        if (!response.ok) {
          throw new Error(result.error || "Unable to load Buffer channels.");
        }

        setBufferChannels(result.channels ?? []);
      } catch (error) {
        console.error("Unable to load Buffer channels:", error);

        setBufferChannels([]);
      } finally {
        setLoadingChannels(false);
      }
    }

    loadBufferChannels();
  }, []);

  /* Converts an article title into a URL-safe slug. */
  function generateSlug(text: string) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  /* Returns the public CloudTweak URL for the current article. */
  function getArticleUrl() {
    return `https://cloudtweak.net/blog/${slug}`;
  }

  /* Creates a default social caption from the current article information. */
  function generateSocialCaption() {
    if (!title.trim()) {
      toast.error("Add an article title before generating the social caption.");

      return;
    }

    if (!slug.trim()) {
      toast.error("Add an article slug before generating the social caption.");

      return;
    }

    const captionParts = [
      title.trim(),
      excerpt.trim(),
      `Read more: ${getArticleUrl()}`,
      "#CloudTweak #Technology",
    ].filter(Boolean);

    setSocialCaption(captionParts.join("\n\n"));
  }

  /* Selects or deselects a Buffer channel for social distribution. */
  function toggleSocialChannel(channelId: string) {
    setSelectedChannels((currentChannels) => {
      if (currentChannels.includes(channelId)) {
        return currentChannels.filter((id) => id !== channelId);
      }

      return [...currentChannels, channelId];
    });
  }

  /* Sends the published article to the selected Buffer social channels. */
  async function distributeArticle() {
    if (selectedChannels.length === 0) {
      return;
    }

    const response = await fetch("/api/admin/buffer/publish-article", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        slug,
        excerpt,
        coverImage: coverImage.trim() || undefined,
        caption: socialCaption.trim() || undefined,
        channelIds: selectedChannels,
      }),
    });

    const responseText = await response.text();

    let result: {
      success?: boolean;
      error?: string;
      results?: SocialPublishingResult[];
    };

    try {
      result = JSON.parse(responseText) as typeof result;
    } catch {
      throw new Error(
        "The social publishing server returned an invalid response."
      );
    }

    if (!response.ok) {
      throw new Error(result.error || "Social publishing failed.");
    }

    const failedResults = result.results?.filter((item) => !item.success) ?? [];

    if (failedResults.length > 0) {
      throw new Error(
        failedResults
          .map((item) => {
            const channelName =
              item.channelName || item.platform || "Social channel";

            return `${channelName}: ${item.error || "Publishing failed."}`;
          })
          .join(", ")
      );
    }
  }

  /* Validates the minimum article information required before saving. */
  function validateArticle() {
    if (!title.trim()) {
      toast.error("Article title is required.");

      return false;
    }

    if (!slug.trim()) {
      toast.error("Article slug is required.");

      return false;
    }

    return true;
  }

  /* Saves the article before attempting optional Buffer distribution. */
  async function publish() {
    if (!validateArticle()) {
      return;
    }

    setLoading(true);

    try {
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

      if (error) {
        toast.error(error.message);

        return;
      }

      /*
       * Social distribution only runs after the article has been saved.
       * A Buffer failure does not undo the article publication.
       */
      if (published && selectedChannels.length > 0) {
        try {
          await distributeArticle();

          toast.success(
            selectedChannels.length === 1
              ? "Article added to social queue!"
              : `Article added to ${selectedChannels.length} social queues!`
          );
        } catch (error) {
          console.error("Social distribution failed:", error);

          toast.error(
            error instanceof Error
              ? `Article saved, but social sharing failed: ${error.message}`
              : "Article saved, but social sharing failed."
          );

          return;
        }
      }

      toast.success(editMode ? "Article Updated!" : "Article Created!");

      window.location.href = "/admin/blog/articles";
    } catch (error) {
      console.error("Unable to save article:", error);

      toast.error(
        error instanceof Error ? error.message : "Unable to save the article."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loadingPost) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        Loading article...
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="mb-8 flex items-start justify-between gap-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {editMode ? "Edit article" : "New article"}
          </h1>

          <p className="mt-2 text-xs text-slate-500">
            {editMode
              ? "Update article content, SEO and publishing settings."
              : "Create and publish a new CloudTweak article."}
          </p>
        </div>

        <a href="/admin/blog/articles">
          <ArrowLeftCircle
            size={42}
            className="text-orange-500 transition hover:text-orange-600"
          />
        </a>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0 space-y-6">
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Article title
              </label>

              <input
                value={title}
                onChange={(e) => {
                  const value = e.target.value;

                  setTitle(value);

                  if (!slugEdited) {
                    setSlug(generateSlug(value));
                  }
                }}
                placeholder="Give your article a clear, compelling title"
                className="w-full rounded-xl border border-slate-300 p-3 text-md outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Category
                </label>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10"
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

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Slug
                </label>

                <input
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);

                    setSlug(e.target.value);
                  }}
                  placeholder="article-url-slug"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Article Excerpt
              </label>

              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Write a short summary that introduces the article..."
                rows={3}
                className="w-full resize-y rounded-xl border border-slate-300 p-4 text-sm leading-6 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-slate-900">Article Content</h2>

              <p className="mt-1 text-xs text-slate-500">
                Write and format the main content of your article.
              </p>
            </div>

            <TiptapEditor value={content} onChange={setContent} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="flex cursor-pointer items-center justify-between gap-5">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Publish Article
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Draft articles remain hidden from visitors until published.
                </p>
              </div>

              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-blue-600"
              />
            </label>
          </section>

          {published && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Share2 size={18} />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    Social Distribution
                  </h3>

                  <p className="text-xs text-slate-500">
                    Add this article to your connected Buffer queues.
                  </p>
                </div>
              </div>

              <div className="space-y-5 p-5">
                {loadingChannels ? (
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    <LoaderCircle size={17} className="animate-spin" />
                    Loading connected social channels...
                  </div>
                ) : bufferChannels.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center">
                    <p className="text-sm font-semibold text-slate-800">
                      No social channels connected
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Connect a social account in Buffer to enable social
                      distribution.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {bufferChannels.map((channel) => {
                      const selected = selectedChannels.includes(channel.id);

                      return (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => toggleSocialChannel(channel.id)}
                          disabled={channel.isQueuePaused}
                          className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                            channel.isQueuePaused
                              ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                              : selected
                                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/10"
                                : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                                selected
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              <SocialChannelIcon service={channel.service} />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {channel.displayName || channel.name}
                              </p>

                              <p className="mt-0.5 text-xs capitalize text-slate-500">
                                {channel.service}

                                {channel.isQueuePaused
                                  ? " · Queue paused"
                                  : " · Connected"}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`ml-3 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                              selected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {selected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedChannels.length > 0 && (
                  <div className="border-t border-slate-200 pt-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <label className="text-sm font-semibold text-slate-700">
                          Social Caption
                        </label>

                        <p className="mt-1 text-xs text-slate-500">
                          Customize the message that accompanies your article.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={generateSocialCaption}
                        className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                      >
                        Generate from article
                      </button>
                    </div>

                    <textarea
                      value={socialCaption}
                      onChange={(e) => setSocialCaption(e.target.value)}
                      placeholder="Write your social caption..."
                      rows={6}
                      className="w-full resize-y rounded-xl border border-slate-300 p-4 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />

                    <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
                      <span>
                        {selectedChannels.length}{" "}
                        {selectedChannels.length === 1 ? "channel" : "channels"}{" "}
                        selected
                      </span>

                      <span>{socialCaption.length} characters</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={loading}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Preview
            </button>

            <button
              type="button"
              onClick={publish}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <LoaderCircle size={16} className="animate-spin" />}

              {loading
                ? editMode
                  ? "Updating..."
                  : "Publishing..."
                : editMode
                  ? "Update Article"
                  : "Publish Article"}
            </button>

            <p className="ml-auto hidden text-xs text-slate-400 sm:block">
              {published
                ? "This article will be visible to visitors."
                : "This article will be saved as a draft."}
            </p>
          </div>
        </main>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Cover Image
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Featured image for this article.
              </p>
            </div>

            <div className="p-4">
              <ImageUploader
                value={coverImage}
                onChange={setCoverImage}
                bucket="blog-images"
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <Search size={15} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  SEO Settings
                </h3>

                <p className="text-xs text-slate-500">
                  Search visibility and metadata.
                </p>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  SEO Title
                </label>

                <input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Search title"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10"
                />

                <p className="mt-1 text-[11px] text-slate-400">
                  {seoTitle.length} characters
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Meta Description
                </label>

                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Short search engine description"
                  rows={5}
                  className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm leading-5 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10"
                />

                <p className="mt-1 text-[11px] text-slate-400">
                  {seoDescription.length} characters
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Canonical URL
                </label>

                <input
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10"
                />

                <p className="mt-1 text-[11px] leading-4 text-slate-400">
                  Optional. Leave blank unless this content has another
                  preferred URL.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-700">Article URL</p>

            <p className="mt-2 break-all text-xs leading-5 text-slate-500">
              {slug
                ? `cloudtweak.net/blog/${slug}`
                : "cloudtweak.net/blog/article-slug"}
            </p>
          </section>
        </aside>
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
  );
}
