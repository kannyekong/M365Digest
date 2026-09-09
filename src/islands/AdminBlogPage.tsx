import { useEffect, useMemo, useState } from "react";
import { deletePost, getAllPosts, togglePublished } from "../lib/blog";
import ConfirmModal from "./ConfirmModal";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  CirclePlus,
  Download,
  Edit,
  Heart,
  LoaderCircle,
  Power,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import StatCard from "../components/admin/Statcard";

type BlogDestination = "cloudtweak" | "tweakmart";
type SourceFilter = "all" | BlogDestination;
type SortField = "title" | "category" | "published" | "created_at";
type SortDirection = "asc" | "desc";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  published: boolean;
  created_at: string;
  views: number | null;
  likes_count: number | null;
  destination: BlogDestination;
}

interface TweakMartArticlesResponse {
  success?: boolean;
  posts?: Omit<BlogPost, "destination">[];
  error?: string;
}

interface PendingAction {
  type: "toggle" | "delete";
  post: BlogPost;
}

/* Returns a readable publication name for a blog destination. */
function getDestinationLabel(destination: BlogDestination) {
  return destination === "tweakmart" ? "TweakMart" : "CloudTweak";
}

/* Manages CloudTweak and TweakMart articles from one administration screen. */
export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );

  /* Loads CloudTweak and TweakMart articles and combines them into one list. */
  async function loadPosts() {
    setLoading(true);

    try {
      const [cloudTweakResult, tweakMartResponse] = await Promise.all([
        getAllPosts(),
        fetch("/api/admin/tweakmart/blog/articles"),
      ]);

      if (cloudTweakResult.error) {
        throw new Error(cloudTweakResult.error.message);
      }

      const responseText = await tweakMartResponse.text();

      let tweakMartResult: TweakMartArticlesResponse;

      try {
        tweakMartResult = JSON.parse(responseText) as TweakMartArticlesResponse;
      } catch {
        throw new Error(
          "The TweakMart articles endpoint returned an invalid response."
        );
      }

      if (!tweakMartResponse.ok || !tweakMartResult.success) {
        throw new Error(
          tweakMartResult.error || "Unable to load TweakMart articles."
        );
      }

      const cloudTweakPosts = (cloudTweakResult.data ?? []).map((post) => ({
        ...post,
        destination: "cloudtweak" as const,
      }));

      const tweakMartPosts = (tweakMartResult.posts ?? []).map((post) => ({
        ...post,
        destination: "tweakmart" as const,
      }));

      setPosts([...cloudTweakPosts, ...tweakMartPosts]);
    } catch (error) {
      console.error("Unable to load blog articles:", error);

      toast.error(
        error instanceof Error ? error.message : "Unable to load blog articles."
      );
    } finally {
      setLoading(false);
    }
  }

  /* Opens the confirmation modal for an article status change. */
  function requestToggle(post: BlogPost) {
    setPendingAction({
      type: "toggle",
      post,
    });
  }

  /* Opens the confirmation modal before deleting an article. */
  function requestDelete(post: BlogPost) {
    setPendingAction({
      type: "delete",
      post,
    });
  }

  /* Updates the selected article's status in its owning database. */
  async function toggleArticle(post: BlogPost) {
    if (post.destination === "cloudtweak") {
      const { data, error } = await togglePublished(post.id, post.published);

      if (error) {
        throw new Error(error.message);
      }

      return Boolean(data?.published);
    }

    const response = await fetch("/api/admin/tweakmart/blog/articles", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: post.id,
        published: post.published,
      }),
    });

    const responseText = await response.text();

    let result: {
      success?: boolean;
      post?: {
        published?: boolean;
      };
      error?: string;
    };

    try {
      result = JSON.parse(responseText) as typeof result;
    } catch {
      throw new Error(
        "The TweakMart status endpoint returned an invalid response."
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Unable to update article status.");
    }

    return Boolean(result.post?.published);
  }

  /* Deletes the selected article from its owning database. */
  async function deleteArticle(post: BlogPost) {
    if (post.destination === "cloudtweak") {
      const { error } = await deletePost(post.id);

      if (error) {
        throw new Error(error.message);
      }

      return;
    }

    const response = await fetch("/api/admin/tweakmart/blog/articles", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: post.id,
      }),
    });

    const responseText = await response.text();

    let result: {
      success?: boolean;
      error?: string;
    };

    try {
      result = JSON.parse(responseText) as typeof result;
    } catch {
      throw new Error(
        "The TweakMart delete endpoint returned an invalid response."
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Unable to delete the article.");
    }
  }

  /* Executes the critical article operation after confirmation. */
  async function confirmPendingAction() {
    if (!pendingAction) {
      return;
    }

    const { post, type } = pendingAction;

    setActionLoading(true);

    try {
      if (type === "toggle") {
        const published = await toggleArticle(post);

        setPosts((current) =>
          current.map((item) =>
            item.id === post.id && item.destination === post.destination
              ? {
                  ...item,
                  published,
                }
              : item
          )
        );

        toast.success(
          published
            ? `${getDestinationLabel(post.destination)} article published.`
            : `${getDestinationLabel(post.destination)} article moved to draft.`
        );
      } else {
        await deleteArticle(post);

        setPosts((current) =>
          current.filter(
            (item) =>
              !(item.id === post.id && item.destination === post.destination)
          )
        );

        toast.success(
          `${getDestinationLabel(post.destination)} article deleted.`
        );
      }

      setPendingAction(null);
    } catch (error) {
      console.error("Article action failed:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to complete the article action."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* Changes the active table sorting field and direction. */
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));

      return;
    }

    setSortField(field);
    setSortDirection("asc");
    setCurrentPage(1);
  }

  /* Exports the currently filtered article list to CSV. */
  function exportToCSV() {
    const headers = [
      "Title",
      "Slug",
      "Source",
      "Category",
      "Status",
      "Created Date",
      "Views",
      "Likes",
    ];

    const rows = sortedPosts.map((post) => [
      post.title,
      post.slug,
      getDestinationLabel(post.destination),
      post.category ?? "General",
      post.published ? "Published" : "Draft",
      new Date(post.created_at).toLocaleDateString(),
      post.views ?? 0,
      post.likes_count ?? 0,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "blog-articles.csv";

    link.click();

    URL.revokeObjectURL(url);

    toast.success("Article export created.");
  }

  /* Renders the current sorting state for a sortable table column. */
  function renderSortIcon(field: SortField) {
    if (sortField === field) {
      return sortDirection === "asc" ? (
        <ArrowUp size={14} />
      ) : (
        <ArrowDown size={14} />
      );
    }

    return <ArrowUpDown size={14} />;
  }

  /* Returns compact pagination numbers around the active page. */
  function getPaginationItems() {
    const items: Array<number | "ellipsis"> = [];

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    items.push(1);

    if (currentPage > 4) {
      items.push("ellipsis");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let page = start; page <= end; page += 1) {
      items.push(page);
    }

    if (currentPage < totalPages - 3) {
      items.push("ellipsis");
    }

    items.push(totalPages);

    return items;
  }

  /* Loads both publications when the administration screen mounts. */
  useEffect(() => {
    void loadPosts();
  }, []);

  /* Returns to page one whenever the visible article query changes. */
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sourceFilter, categoryFilter, statusFilter, pageSize]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          posts
            .map((post) => post.category)
            .filter((category): category is string => Boolean(category))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [posts]
  );

  const totalPosts = posts.length;

  const publishedPosts = posts.filter((post) => post.published).length;

  const draftPosts = posts.filter((post) => !post.published).length;

  const totalViews = posts.reduce((sum, post) => sum + (post.views ?? 0), 0);

  const filteredPosts = posts.filter((post) => {
    const normalizedSearch = search.trim().toLowerCase();

    const matchesSearch =
      !normalizedSearch ||
      post.title.toLowerCase().includes(normalizedSearch) ||
      post.slug.toLowerCase().includes(normalizedSearch);

    const matchesSource =
      sourceFilter === "all" || post.destination === sourceFilter;

    const matchesCategory =
      categoryFilter === "All" || post.category === categoryFilter;

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Published" && post.published) ||
      (statusFilter === "Draft" && !post.published);

    return matchesSearch && matchesSource && matchesCategory && matchesStatus;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    const firstValue = a[sortField];
    const secondValue = b[sortField];

    if (sortField === "published") {
      const firstPublished = firstValue ? 1 : 0;
      const secondPublished = secondValue ? 1 : 0;

      return sortDirection === "asc"
        ? firstPublished - secondPublished
        : secondPublished - firstPublished;
    }

    if (sortField === "created_at") {
      const firstDate = new Date(String(firstValue)).getTime();

      const secondDate = new Date(String(secondValue)).getTime();

      return sortDirection === "asc"
        ? firstDate - secondDate
        : secondDate - firstDate;
    }

    const firstText = String(firstValue ?? "").toLowerCase();

    const secondText = String(secondValue ?? "").toLowerCase();

    return sortDirection === "asc"
      ? firstText.localeCompare(secondText)
      : secondText.localeCompare(firstText);
  });

  const totalPages = Math.ceil(sortedPosts.length / pageSize);

  const safeCurrentPage =
    totalPages === 0 ? 1 : Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;

  const currentPosts = sortedPosts.slice(startIndex, startIndex + pageSize);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
        <LoaderCircle size={20} className="animate-spin" />
        Loading articles...
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Articles"
          value={totalPosts}
          icon="articles"
          color="bg-pink-300"
        />

        <StatCard
          title="Published"
          value={publishedPosts}
          icon="published"
          color="bg-green-500"
        />

        <StatCard
          title="Drafts"
          value={draftPosts}
          icon="drafts"
          color="bg-amber-500"
        />

        <StatCard
          title="Views"
          value={totalViews}
          icon="views"
          color="bg-black"
        />
      </div>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            All Articles
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage CloudTweak and TweakMart editorial content.
          </p>
        </div>

        <a
          href="/admin/blog/new"
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-white shadow-[0_0_15px_rgba(37,99,235,0.45)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(37,99,235,0.8)]"
        >
          <CirclePlus size={19} />
          New Article
        </a>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["cloudtweak", "CloudTweak"],
              ["tweakmart", "TweakMart"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSourceFilter(value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                sourceFilter === value
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_220px_180px]">
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
            >
              <option value="All">All Categories</option>

              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
            >
              <option value="All">All Status</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          <button
            type="button"
            onClick={exportToCSV}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => handleSort("title")}
                    className="flex items-center gap-2"
                  >
                    Post Title
                    {renderSortIcon("title")}
                  </button>
                </th>

                <th className="px-6 py-4 text-left">Source</th>

                <th className="px-6 py-4 text-left">Status</th>

                <th className="px-6 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => handleSort("created_at")}
                    className="flex items-center gap-2"
                  >
                    Created
                    {renderSortIcon("created_at")}
                  </button>
                </th>

                <th className="px-6 py-4 text-left">Views</th>

                <th className="px-6 py-4 text-left">Likes</th>

                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentPosts.length > 0 ? (
                currentPosts.map((post) => (
                  <tr
                    key={`${post.destination}-${post.id}`}
                    className="border-b border-slate-200 transition last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-6 py-5">
                      <p className="max-w-xs truncate font-semibold text-slate-900">
                        {post.title}
                      </p>

                      <p className="mt-1 max-w-xs truncate text-sm text-slate-500">
                        /{post.slug}
                      </p>
                      <p className="text-xs font-bold">
                        Post category: <span className="font-light">{post.category ?? "General"}</span>
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          post.destination === "tweakmart"
                            ? "bg-orange-50 text-orange-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {getDestinationLabel(post.destination)}
                      </span>
                    </td>

                    {/* <td className="px-6 py-5 text-sm text-slate-600">
                    </td> */}

                    <td className="px-6 py-5">
                      <button
                        type="button"
                        onClick={() => requestToggle(post)}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          post.published
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        }`}
                      >
                        {post.published ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <Power size={14} />
                        )}

                        {post.published ? "Published" : "Draft"}
                      </button>
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-600">
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-5">{post.views ?? 0}</td>

                    <td className="px-6 py-5">
                      <div className="inline-flex items-center gap-2">
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />

                        <span className="font-semibold">
                          {post.likes_count ?? 0}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <a
                          href={`/admin/blog/edit?id=${post.id}&destination=${post.destination}`}
                          title="Edit article"
                          className="rounded-lg p-2 text-green-600 transition hover:bg-green-50"
                        >
                          <Edit size={19} />
                        </a>

                        <button
                          type="button"
                          title="Delete article"
                          onClick={() => requestDelete(post)}
                          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 size={19} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    No blog posts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold">
                {sortedPosts.length === 0 ? 0 : startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold">
                {Math.min(startIndex + pageSize, sortedPosts.length)}
              </span>{" "}
              of <span className="font-semibold">{sortedPosts.length}</span>{" "}
              articles
            </p>

            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="rounded-lg border px-3 py-2 text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              First
            </button>

            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="rounded-lg border p-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ArrowLeft size={18} />
            </button>

            {getPaginationItems().map((item, index) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="px-1 text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCurrentPage(item)}
                  className={`h-9 min-w-9 rounded-lg px-2 text-sm transition ${
                    safeCurrentPage === item
                      ? "bg-blue-600 text-white"
                      : "border hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>
              )
            )}

            <button
              type="button"
              disabled={totalPages === 0 || safeCurrentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              className="rounded-lg border p-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              disabled={totalPages === 0 || safeCurrentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="rounded-lg border px-3 py-2 text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Last
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={pendingAction !== null}
        title={
          pendingAction?.type === "delete"
            ? "Delete article?"
            : pendingAction?.post.published
              ? "Move article to draft?"
              : "Publish article?"
        }
        message={
          pendingAction?.type === "delete"
            ? `This will permanently delete "${pendingAction.post.title}" from ${getDestinationLabel(
                pendingAction.post.destination
              )}. This action cannot be undone.`
            : pendingAction?.post.published
              ? `"${pendingAction.post.title}" will no longer be visible to visitors.`
              : `"${pendingAction?.post.title ?? ""}" will become publicly visible on ${pendingAction ? getDestinationLabel(pendingAction.post.destination) : "the selected publication"}.`
        }
        confirmText={
          pendingAction?.type === "delete"
            ? "Delete article"
            : pendingAction?.post.published
              ? "Move to draft"
              : "Publish article"
        }
        variant={
          pendingAction?.type === "delete"
            ? "danger"
            : pendingAction?.post.published
              ? "warning"
              : "primary"
        }
        loading={actionLoading}
        onConfirm={confirmPendingAction}
        onCancel={() => {
          if (!actionLoading) {
            setPendingAction(null);
          }
        }}
      />
    </>
  );
}
