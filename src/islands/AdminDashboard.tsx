import { useEffect, useState } from "react";
import { getAllPosts } from "../lib/blog";
import { getDashboardAnalytics } from "../lib/blog";
import { Briefcase, CirclePlus, Cog, PencilIcon, Users } from "lucide-react";
import CategoryLeaderboard from "../components/admin/CategoryLeaderBoard";
import SingleStatCard from "../components/admin/SingleStatCard";

export default function AdminDashboard() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  const totalPosts = posts.length;

  const publishedPosts = posts.filter((p) => p.published).length;

  const draftPosts = posts.filter((p) => !p.published).length;

  const totalCategories = new Set(posts.map((p) => p.category)).size;

  const recentPosts = [...posts].slice(0, 3);

  const totalViews = analytics?.totalViews ?? 0;

  const mostViewedArticle = analytics?.mostViewedArticle;

  const latestArticle = analytics?.latestArticle;

  const mostViewedCategory = analytics?.mostViewedCategory;

  const categoryViews = analytics?.categoryViews ?? [];

  async function loadDashboard() {
    const [{ data: posts }, { data: analytics }] = await Promise.all([
      getAllPosts(),
      getDashboardAnalytics(),
    ]);

    setPosts(posts || []);

    setAnalytics(analytics);

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <div className="py-20 text-center">Loading dashboard...</div>;
  }
  return (
    <>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <SingleStatCard
          title="Articles Overview"
          value1={totalPosts}
          subtitle="total articles"
          value2={publishedPosts}
          subtitleTwo="Published"
          value3={draftPosts}
          subtitleThree="Draft"
          value4={totalViews}
          subtitleFour="Views"
          value5={totalCategories}
          subtitleFive="Categories"
          icon="articles"
          color="bg-pink-300"
        />

        <SingleStatCard
          title="Company Overview"
          subtitle="Total Staff"
          value1={0}
          value2={0}
          subtitleTwo="Testimonials"
          value3={0}
          subtitleThree="Services"
          value4={0}
          subtitleFour="Admin staff"
          value5={0}
          subtitleFive="Regular staff"
          icon="drafts"
          color="bg-green-500"
        />

        <SingleStatCard
          title="Bootcamp"
          value1={0}
          subtitle="Active Bootcamp(s)"
          value2={0}
          subtitleTwo="Instructors"
          value3={0}
          subtitleThree="Students"
          value4={0}
          subtitleFour="Certs Issued"
          value5={0}
          subtitleFive="Regular staff"
          icon="articles"
          color="bg-orange-500"
        />

        <SingleStatCard
          title="User Engagements"
          value1={0}
          subtitle="Total User(s)"
          value2={0}
          subtitleTwo="Contact Form"
          value3={0}
          subtitleThree="Feedback Form"
          value4={0}
          subtitleFour="Reg Form"
          value5={0}
          subtitleFive="Quote Requests"
          icon="drafts"
          color="bg-blue-500"
        />
      </div>

      <div className="mt-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Category Performance */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Category Performance
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Reader engagement by technology.
                </p>
              </div>

              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                {categoryViews.length} Categories
              </span>
            </div>

            <CategoryLeaderboard data={categoryViews} />
          </section>

          <section className="grid gap-6">
            <div>
              <mark className="mb-2 text-xs p-1 rounded-r-full bg-orange-700 text-white">
                Quick Actions
              </mark>
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-3">
                <a
                  href="/admin/blog/new"
                  className="flex flex-col items-center rounded-r-2xl border border-orange-700 p-6 shadow-sm bg-white hover:border-blue-500 hover:shadow-lg transition"
                >
                  <p className="text-center text-xs">Create new article</p>

                  <CirclePlus
                    size={40}
                    className="text-orange-700 animate-[pulse_3s_ease-in-out_infinite]"
                  />
                </a>

                <a
                  href="/admin/blog/articles"
                  className="flex flex-col items-center rounded-2xl border border-slate-200 bg-blue-100 p-6 shadow-sm hover:border-blue-500 hover:shadow-lg transition"
                >
                  <p className="text-center text-xs">Manage articles</p>

                  <PencilIcon size={40} className="text-blue-700" />
                </a>

                <a
                  href="/admin/bootcamp/bootcamp"
                  className="flex flex-col items-center rounded-2xl border border-slate-200 bg-green-100 p-6 shadow-sm hover:border-blue-500 hover:shadow-lg transition"
                >
                  <p className="text-center text-xs">Manage Bootcamp</p>

                  <Users size={40} className="text-green-700" />
                </a>

                <a
                  href="/admin/settings"
                  className="flex flex-col items-center rounded-2xl border border-slate-200 bg-yellow-50 p-6 shadow-sm hover:border-blue-500 hover:shadow-lg transition"
                >
                  <p className="text-xs text-center">Manage Settings</p>

                  <Cog size={40} className="text-yellow-700" />
                </a>

                <a
                  href="/admin/services"
                  className="flex flex-col items-center rounded-2xl border border-slate-200 bg-purple-50 p-6 shadow-sm hover:border-blue-500 hover:shadow-lg transition"
                >
                  <p className="text-xs text-center">Manage Services</p>

                  <Briefcase size={40} className="text-purple-700" />
                </a>

                <a
                  href="/admin/bootcamp/instructors"
                  className="flex flex-col items-center rounded-2xl border border-slate-200 bg-pink-50 p-6 shadow-sm hover:border-blue-500 hover:shadow-lg transition"
                >
                  <p className="text-xs text-center">Manage Instructors</p>

                  <Users size={40} className="text-pink-700" />
                </a>
              </div>
            </div>
          </section>

          {/* MOST RECENT ARTICLES */}
        </div>
        {/* Insights */}

        <section className="grid gap-5 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              🏆 Most Viewed Article
            </p>

            <h3 className="mt-3 line-clamp-2 text-sm font-semibold">
              {mostViewedArticle?.title}
            </h3>

            <p className="mt-3 text-xs text-red-600">
              {mostViewedArticle?.views} views
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              📂 Top Category
            </p>

            <h3 className="mt-3 text-sm font-semibold">
              {mostViewedCategory?.category}
            </h3>

            <p className="mt-3 text-xs text-red-600">
              {mostViewedCategory?.views} views
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              🆕 Latest Article
            </p>

            <h3 className="mt-3 line-clamp-2 text-sm font-semibold">
              {latestArticle?.title}
            </h3>

            <p className="mt-3 text-xs text-red-600">
              {latestArticle?.views} views
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-pink-500 p-5 text-white shadow-lg">
            <p className="text-sm opacity-80">Total Views</p>

            <h2 className="mt-2 text-5xl font-bold">
              {totalViews.toLocaleString()}
            </h2>

            <p className="mt-2 text-sm opacity-80">
              Across all published articles
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-white shadow-lg border border-slate-200">
          <div className="flex items-center justify-between space-x-4 border-b border-slate-200 p-6">
            <div>
              <h2 className="text-xl font-semibold">Top 3 Recent Articles</h2>
              <p className="text-xs">
                Manage all articles on the articles page.
              </p>
            </div>

            <a
              href="/admin/blog/articles"
              className="items-center rounded-full bg-gradient-to-r from-red-500 via-pink-500 to-orange-400 px-2 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              Manage
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </a>
          </div>

          <div>
            {recentPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between border-b last:border-0 px-6 py-5 border-slate-200 hover:bg-slate-50 transition"
              >
                <div>
                  <h3 className="font-semibold">{post.title}</h3>

                  <p className="mt-1 text-sm text-slate-500">
                    <span className="text-black text-xs bg-blue-300 rounded-l-2xl pl-2 pr-0.5">
                      category
                    </span>
                    {post.category}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-sm ${
                    post.published
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {post.published ? "Published" : "Draft"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
