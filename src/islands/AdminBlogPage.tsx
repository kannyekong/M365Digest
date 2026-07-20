import { useEffect, useState } from "react";
import { getAllPosts } from "../lib/blog";
import DeleteButton from "./DeleteButton";
import PublishToggle from "./PublishToggle";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CirclePlus,
  Download,
  Edit,
} from "lucide-react";
import StatCard from "../components/admin/Statcard";

// Define the available sorting fields for the articles table.
type SortField = "title" | "category" | "published" | "created_at";

// Define the sorting direction used by the articles table.
type SortDirection = "asc" | "desc";

// Manage the admin blog page, article filters, sorting, export and pagination.
export default function AdminBlogPage() {
  // Store all blog posts loaded from Supabase.
  const [posts, setPosts] = useState<any[]>([]);

  // Track whether the blog posts are still loading.
  const [loading, setLoading] = useState(true);

  // Store the current article search value.
  const [search, setSearch] = useState("");

  // Define the number of articles displayed per page.
  const POSTS_PER_PAGE = 10;

  // Store the current pagination page.
  const [currentPage, setCurrentPage] = useState(1);

  // Store the selected article category filter.
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Store the selected article status filter.
  const [statusFilter, setStatusFilter] = useState("All");

  // Store the currently selected sorting field.
  const [sortField, setSortField] = useState<SortField>("created_at");

  // Store the current sorting direction.
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Load all articles from Supabase.
  async function loadPosts() {
    // Request all blog posts from the blog service.
    const { data } = await getAllPosts();

    // Store the returned articles or an empty array.
    setPosts(data || []);

    // Stop displaying the loading state.
    setLoading(false);
  }

  // Remove a deleted article from the local article list.
  function handleDelete(id: string) {
    // Remove the article with the matching ID from the current state.
    setPosts((current) => current.filter((post) => post.id !== id));
  }

  // Update the published state of an article locally.
  function handleToggle(id: string, published: boolean) {
    // Update only the article whose ID matches the supplied ID.
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

  // Handle sorting when a table column is clicked.
  function handleSort(field: SortField) {
    // Reverse the sorting direction when the same field is clicked again.
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    // Change the active sorting field.
    setSortField(field);

    // Start a new sorting field in ascending order.
    setSortDirection("asc");

    // Reset pagination when the sorting field changes.
    setCurrentPage(1);
  }

  // Export the currently filtered articles to a CSV file.
  function exportToCSV() {
    // Define the CSV column headers.
    const headers = [
      "Title",
      "Slug",
      "Category",
      "Status",
      "Published Date",
      "Views",
    ];

    // Convert every filtered article into a CSV row.
    const rows = filteredPosts.map((post) => [
      post.title,
      post.slug,
      post.category,
      post.published ? "Published" : "Draft",
      new Date(post.created_at).toLocaleDateString(),
      post.views ?? 0,
    ]);

    // Combine the headers and rows into CSV content.
    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    // Create a downloadable CSV file from the generated content.
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    // Create a temporary browser URL for the CSV file.
    const url = URL.createObjectURL(blob);

    // Create a temporary download link.
    const link = document.createElement("a");

    // Assign the generated CSV URL to the download link.
    link.href = url;

    // Define the name of the downloaded CSV file.
    link.download = "articles.csv";

    // Trigger the browser download.
    link.click();

    // Release the temporary browser URL.
    URL.revokeObjectURL(url);
  }

  // Load articles when the admin page first mounts.
  useEffect(() => {
    loadPosts();
  }, []);

  // Reset the current page whenever filters or search values change.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter]);

  // Display the loading state while articles are being fetched.
  if (loading) {
    return <div className="py-20 text-center">Loading articles...</div>;
  }

  // Calculate the total number of articles.
  const totalPosts = posts.length;

  // Calculate the total number of published articles.
  const publishedPosts = posts.filter((post) => post.published).length;

  // Calculate the total number of draft articles.
  const draftPosts = posts.filter((post) => !post.published).length;

  // Calculate the total article views.
  const totalViews = posts.reduce((sum, post) => sum + (post.views ?? 0), 0);

  // Filter articles using the search, category and status filters.
  const filteredPosts = posts.filter((post) => {
    // Check whether the article title or slug matches the search value.
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.slug.toLowerCase().includes(search.toLowerCase());

    // Check whether the article matches the selected category.
    const matchesCategory =
      categoryFilter === "All" || post.category === categoryFilter;

    // Check whether the article matches the selected status.
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Published" && post.published) ||
      (statusFilter === "Draft" && !post.published);

    // Return only articles that satisfy every active filter.
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort the filtered articles according to the selected table column.
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    // Extract the values used for sorting.
    const firstValue = a[sortField];
    const secondValue = b[sortField];

    // Convert boolean published values into sortable numbers.
    if (sortField === "published") {
      const firstPublished = firstValue ? 1 : 0;
      const secondPublished = secondValue ? 1 : 0;

      return sortDirection === "asc"
        ? firstPublished - secondPublished
        : secondPublished - firstPublished;
    }

    // Convert date values into timestamps for accurate sorting.
    if (sortField === "created_at") {
      const firstDate = new Date(firstValue).getTime();
      const secondDate = new Date(secondValue).getTime();

      return sortDirection === "asc"
        ? firstDate - secondDate
        : secondDate - firstDate;
    }

    // Convert text values to lowercase before comparing them.
    const firstText = String(firstValue ?? "").toLowerCase();
    const secondText = String(secondValue ?? "").toLowerCase();

    // Sort text values according to the selected direction.
    return sortDirection === "asc"
      ? firstText.localeCompare(secondText)
      : secondText.localeCompare(firstText);
  });

  // Calculate the total number of pagination pages.
  const totalPages = Math.ceil(sortedPosts.length / POSTS_PER_PAGE);

  // Calculate the starting index for the current page.
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;

  // Get only the articles for the current page.
  const currentPosts = sortedPosts.slice(
    startIndex,
    startIndex + POSTS_PER_PAGE
  );

  // Render the sorting icon for a table column.
  function renderSortIcon(field: SortField) {
    // Display the active sorting direction for the selected field.
    if (sortField === field) {
      return sortDirection === "asc" ? (
        <ArrowUp size={14} />
      ) : (
        <ArrowDown size={14} />
      );
    }

    // Display the neutral sorting icon for inactive fields.
    return <ArrowUpDown size={14} />;
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

      <div className="mt-10 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">All Articles</h2>

          <p className="mt-1">Create and edit blog posts</p>
        </div>

        <a
          href="/admin/blog/new"
          className="flex flex-row gap-2 animate-soft-glow rounded-xl bg-blue-500 px-4 py-2 text-white shadow-[0_0_15px_rgba(37,99,235,0.45)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(37,99,235,0.8)]"
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
            onChange={(e) => setSearch(e.target.value)}
            className="w-70 rounded-xl border px-4"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border px-4"
          >
            <option value="All">All Status</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
          </select>
        </div>

        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100"
        >
          <Download size={17} />
          Export CSV
        </button>
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort("title")}
                  className="flex items-center gap-2"
                >
                  Post Title
                  {renderSortIcon("title")}
                </button>
              </th>

              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort("category")}
                  className="flex items-center gap-2"
                >
                  Category
                  {renderSortIcon("category")}
                </button>
              </th>

              <th className="px-6 py-4 text-left">Status</th>

              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort("published")}
                  className="flex items-center gap-2"
                >
                  Published
                  {renderSortIcon("published")}
                </button>
              </th>

              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {currentPosts.length > 0 ? (
              currentPosts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b transition hover:bg-slate-50"
                >
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-semibold">{post.title}</p>

                      <p className="text-sm text-slate-500">/{post.slug}</p>
                    </div>
                  </td>

                  <td className="px-6">{post.category}</td>

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
                      className="p-2 hover:rounded-2xl hover:bg-blue-500"
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
                  No blog posts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between p-4">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold">
              {sortedPosts.length === 0 ? 0 : startIndex + 1}
            </span>{" "}
            –{" "}
            <span className="font-semibold">
              {Math.min(startIndex + POSTS_PER_PAGE, sortedPosts.length)}
            </span>{" "}
            of <span className="font-semibold">{sortedPosts.length}</span>{" "}
            articles
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              className="rounded-full border p-1 transition hover:bg-slate-100 disabled:opacity-40"
            >
              <ArrowLeft />
            </button>

            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                className={`h-10 w-10 rounded-lg transition ${
                  currentPage === index + 1
                    ? "bg-blue-600 text-white"
                    : "border hover:bg-slate-100"
                }`}
              >
                {index + 1}
              </button>
            ))}

            <button
              disabled={totalPages === 0 || currentPage === totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              className="rounded-full border p-1 transition hover:bg-slate-100 disabled:opacity-40"
            >
              <ArrowRight />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
