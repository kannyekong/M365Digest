import { useEffect, useState } from "react";
import { getAllPosts } from "../lib/blog";
import DeleteButton from "./DeleteButton";
import PublishToggle from "./PublishToggle";
import { ArrowLeft, ArrowRight, CirclePlus, Edit } from "lucide-react";
import StatCard from "../components/admin/Statcard";

// REACT STATES FOR ADMIN PAGE
export default function AdminBlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const POSTS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  //   THIS FUNCTION LOADS POSTS

  async function loadPosts() {
    const { data } = await getAllPosts();

    setPosts(data || []);
    setLoading(false);
  }

  //   THIS FXN HANDLES DELETION OF POSTS

  function handleDelete(id: string) {
    setPosts((current) => current.filter((post) => post.id !== id));
  }

  //   THIS FUNCTION HANDLES TOOGLE
  function handleToggle(id: string, published: boolean) {
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? {
              ...post,
              published,
            }
          : post
      )
    );
  }
  //   LOADS POSTS ON PAGE MOUNT
  useEffect(() => {
    loadPosts();
  }, []);

  // IF LOADING NOT EMPTY

  if (loading) {
    return <div className="py-20 text-center">Loading articles...</div>;
  }

  //   POST VARS

  const totalPosts = posts.length;
  const publishedPosts = posts.filter((p) => p.published).length;
  const draftPosts = posts.filter((p) => !p.published).length;
  const filteredPosts = posts.filter((post) => {
    const matchesSearch = post.title
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "All" || post.category === categoryFilter;

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Published" && post.published) ||
      (statusFilter === "Draft" && !post.published);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);

  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;

  const currentPosts = filteredPosts.slice(
    startIndex,
    startIndex + POSTS_PER_PAGE
  );
  const totalViews = posts.reduce((sum, post) => sum + (post.views ?? 0), 0);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Articles"
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

      <div className="mt-10 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">All Articles</h2>

          <p className="mt-1">Create and manage blog posts</p>
        </div>

        <a
          href="/admin/blog/new"
          className="flex flex-row gap-2 animate-soft-glow rounded-xl bg-blue-500 text-white px-4 py-2  shadow-[0_0_15px_rgba(37,99,235,0.45)] hover:shadow-[0_0_30px_rgba(37,99,235,0.8)] transition-all duration-300"
        >
          <CirclePlus />
          New Article
        </a>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-70 rounded-xl border px-4"
          />

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border px-4 py-2"
          >
            <option value="All">All Categories</option>
            <option value="General">General</option>
            <option value="Microsoft 365">Microsoft 365</option>
            <option value="Exchange Online">Exchange Online</option>
            <option value="SharePoint">SharePoint</option>
            <option value="Microsoft Teams">Microsoft Teams</option>
            <option value="Microsoft Entra ID">Microsoft Entra ID</option>
            <option value="Microsoft Defender">Microsoft Defender</option>
            <option value="Microsoft Intune">Microsoft Intune</option>
            <option value="Power Platform">Power Platform</option>
            <option value="Copilot">Copilot</option>
          </select>

          {/* CATEGORY FILTER */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border px-4"
          >
            <option value="All">All Status</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl bg-white shadow-sm border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-6 py-4 text-left"> Post Title</th>
              <th className="px-6 py-4 text-left">Category</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-left">Published</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {posts.length > 0 ? (
              currentPosts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b hover:bg-slate-50 transition"
                >
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-semibold">{post.title}</p>
                      <p className="text-sm text-slate-500">/{post.slug}</p>
                    </div>
                  </td>

                  <td>{post.category}</td>

                  <td className="px-6">
                    <PublishToggle
                      id={post.id}
                      published={post.published}
                      onToggle={handleToggle}
                    />
                  </td>

                  <td className="px-6">
                    {new Date(post.created_at).toLocaleDateString()}
                  </td>

                  <td className="flex gap-2 p-6 text-right">
                    <a
                      href={`/admin/blog/edit?id=${post.id}`}
                      className="hover:bg-blue-500 p-2 hover:rounded-2xl"
                    >
                      <Edit className="text-green-500 hover:text-white" />
                    </a>

                    <DeleteButton id={post.id} onDelete={handleDelete} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-16 text-center text-slate-400">
                  No blog posts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mt-8 flex items-center justify-between p-2">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold">
              {filteredPosts.length === 0 ? 0 : startIndex + 1}
            </span>
            –
            <span className="font-semibold">
              {Math.min(startIndex + POSTS_PER_PAGE, filteredPosts.length)}
            </span>{" "}
            of <span className="font-semibold">{filteredPosts.length}</span>{" "}
            articles
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="rounded-full border p-1 disabled:opacity-40 hover:bg-slate-100"
            >
              <ArrowLeft />
            </button>

            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-10 h-10 rounded-lg transition ${
                  currentPage === i + 1
                    ? "bg-blue-600 text-white"
                    : "border hover:bg-slate-100"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-full border p-1 disabled:opacity-40 hover:bg-slate-100"
            >
              <ArrowRight />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
