import { useEffect, useState } from "react";
import { getAllPosts } from "../lib/blog";
import { getDashboardAnalytics } from "../lib/blog";
import {
  Briefcase,
  CirclePlus,
  Cog,
  ContactRound,
  FolderOpenDot,
  GraduationCap,
  PencilIcon,
  Podium,
  ScanEye,
  StarPlus,
  Trophy,
  Users,
} from "lucide-react";
import CategoryLeaderboard from "../components/admin/CategoryLeaderBoard";
import SingleStatCard from "../components/admin/SingleStatCard";
import { getDashboardStats } from "../lib/getDashboardStats";
import TaskWidget from "../components/admin/tasks/TaskWidget";
import { getTaskCounts } from "../lib/tasks";
import { getStaffSummary } from "../lib/staff";
import RevenueCard from "../components/admin/finance/RevenueCard";

const dashboard = await getDashboardStats();

/**
 * Company financial summary returned by the finance API.
 */
interface FinancialSummary {
  totalRevenue: number | number;
  growthPercentage: number;
  currency: string;
}

export default function AdminDashboard() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [taskCounts, setTaskCounts] = useState({
    pending: 0,
    in_progress: 0,
    completed: 0,
  });
  // Store the staff summary returned from Supabase.
  const [staffSummary, setStaffSummary] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    operations: 0,
  });
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

  const totalStatCount =
    taskCounts.pending + taskCounts.completed + taskCounts.in_progress;

  const [summary, setSummary] = useState<FinancialSummary | null>(null);

  useEffect(() => {
    async function loadSummary() {
      const response = await fetch("/api/admin/finance/summary");
      const result = await response.json();

      if (result.success) {
        setSummary(result.summary);
      }
    }

    void loadSummary();
  }, []);

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

  // Load the task counts when the dashboard first loads.
  useEffect(() => {
    // Create a function for loading task counts.
    async function loadTaskCounts() {
      // Retrieve task counts from Supabase.
      const { data, error } = await getTaskCounts();

      // Log the error when task counts cannot be loaded.
      if (error) {
        console.error(error);

        return;
      }

      // Store the returned task counts in React state.
      setTaskCounts(data);
    }

    // Execute the task count loading function.
    loadTaskCounts();
  }, []);

  // Load the staff summary from Supabase.
  async function loadStaffSummary() {
    // Retrieve the staff summary.
    const { data, error } = await getStaffSummary();

    // Log the database error when the request fails.
    if (error) {
      console.error(error);
      return;
    }

    // Store the returned staff summary.
    if (data) {
      setStaffSummary(data);
    }
  }

  // Load the staff summary when the dashboard mounts.
  useEffect(() => {
    loadStaffSummary();
  }, []);

  if (loading) {
    return <div className="py-20 text-center">Loading dashboard...</div>;
  }
  return (
    <>
      <div className="grid gap-3 md:grid-cols-5 xl:grid-cols-5">
        <SingleStatCard
          title="Articles"
          value1={totalPosts}
          subtitle="total articles"
          value2={publishedPosts}
          subtitleTwo="Published"
          value3={draftPosts}
          subtitleThree="Draft"
          value4={totalViews}
          subtitleFour="Views"
          value5={totalCategories}
          subtitleFive="/admin/blog/articles"
          icon="articles"
          color="pink"
        />

        <SingleStatCard
          title="Company"
          subtitle="Total Staff"
          value1={staffSummary.total}
          value2={staffSummary.active}
          subtitleTwo="Active"
          value3={staffSummary.inactive}
          subtitleThree="Inactive"
          value4={staffSummary.operations}
          subtitleFour="Operations"
          value5={0}
          subtitleFive="/admin/staff"
          icon="drafts"
          color="green"
        />

        <SingleStatCard
          title="To-Dos"
          value1={totalStatCount}
          subtitle="Tasks"
          value2={taskCounts.completed}
          subtitleTwo="Completed"
          value3={taskCounts.pending}
          subtitleThree="Pending"
          value4={taskCounts.in_progress}
          subtitleFour="In Progress"
          value5={0}
          subtitleFive="/admin/tasks"
          icon="tasks"
          color="orange"
        />

        <SingleStatCard
          title="Insights"
          value1={dashboard.totalEngagement}
          subtitle="Interactions"
          value2={dashboard.contacts}
          subtitleTwo="Contacts"
          value3={dashboard.reviews}
          subtitleThree="Reviews"
          value4={dashboard.registrations}
          subtitleFour="Registrations"
          value5={dashboard.quotes}
          subtitleFive="/admin/insights"
          icon="engagements"
          color="blue"
        />

        <RevenueCard
          totalRevenue={summary?.totalRevenue ?? 0}
          percentageChange={summary?.growthPercentage}
          currency={summary?.currency}
          manageHref="/admin/finance/revenue"
        />
      </div>

      <div className="mt-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <TaskWidget />

          <section className="grid gap-6">
            <div>
              <mark className="mb-2 text-xs p-1 rounded-r-full bg-orange-700 text-white">
                Quick Actions
              </mark>
              <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-4">
                <a
                  href="/admin/blog/new"
                  className="flex flex-col items-center rounded-r-2xl border border-orange-700 p-6 shadow-sm bg-white hover:shadow-lg transition"
                >
                  <p className="text-center text-xs">Create new article</p>

                  <CirclePlus
                    size={40}
                    className="text-orange-700 animate-[pulse_3s_ease-in-out_infinite]"
                  />
                </a>

                <a
                  href="/admin/blog/articles"
                  className="flex flex-col items-center rounded-2xl bg-blue-100 p-6 shadow-sm hover:border-blue-500 hover:shadow-lg transition"
                >
                  <p className="text-center text-xs">Manage articles</p>

                  <PencilIcon size={40} className="text-blue-700" />
                </a>

                <a
                  href="/admin/bootcamp/bootcamp"
                  className="flex flex-col items-center rounded-2xl bg-green-100 p-6 shadow-sm hover:border-blue-500 hover:shadow-lg transition"
                >
                  <p className="text-center text-xs">Manage Bootcamp</p>

                  <Users size={40} className="text-green-700" />
                </a>

                <a
                  href="/admin/profile/profile"
                  className="flex flex-col items-center rounded-2xl bg-yellow-50 p-6 shadow-sm hover:border-blue-500 hover:shadow-lg transition"
                >
                  <p className="text-xs text-center">Manage Settings</p>

                  <Cog size={40} className="text-yellow-700" />
                </a>

                <a
                  href="/admin/services"
                  className="flex flex-col items-center rounded-2xl bg-purple-50 p-6 shadow-sm hover:border-blue-500 hover:shadow-lg transition"
                >
                  <p className="text-xs text-center">Manage Services</p>

                  <Briefcase size={40} className="text-purple-700" />
                </a>

                <a
                  href="/admin/bootcamp/instructors"
                  className="flex flex-col items-center rounded-2xl bg-cyan-100 p-6 shadow-sm hover:border-blue-500 hover:shadow-lg transition"
                >
                  <p className="text-xs text-center">Manage Instructors</p>

                  <Users size={40} className="text-cyan-700" />
                </a>

                <a
                  href="/admin/careers/applications"
                  className="flex flex-col items-center rounded-2xl bg-orange-100 p-6 shadow-sm hover:border-blue-500 hover:shadow-lg transition"
                >
                  <p className="text-xs text-center">Manage Careers</p>

                  <ContactRound size={40} className="text-orange-700" />
                </a>

                <a
                  href="/admin/academy"
                  className="flex flex-col items-center rounded-2xl bg-pink-50 p-6 shadow-sm hover:border-blue-500 hover:shadow-lg transition"
                >
                  <p className="text-xs text-center">Manage Academy</p>

                  <GraduationCap size={40} className="text-pink-700" />
                </a>
              </div>
            </div>
          </section>

          {/* MOST RECENT ARTICLES */}
        </div>
        {/* Insights */}
        <section className="grid gap-5 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-row gap-2">
              <Trophy className="text-orange-500" />
              <p className="text-sm uppercase tracking-wide text-slate-400">
                Most Viewed
              </p>
            </div>

            <h3 className="mt-3 line-clamp-2 text-sm font-semibold">
              {mostViewedArticle?.title}
            </h3>

            <p className="mt-3 text-xs text-red-600">
              {mostViewedArticle?.views} views
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-row gap-2">
              <Podium className="text-green-500" />
              <p className="text-sm uppercase tracking-wide text-slate-400">
                Top Category
              </p>
            </div>

            <h3 className="mt-3 text-sm font-semibold">
              {mostViewedCategory?.category}
            </h3>

            <p className="mt-3 text-xs text-red-600">
              {mostViewedCategory?.views} views
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-row gap-2">
              <StarPlus className="text-blue-500" />
              <p className="text-sm uppercase tracking-wide text-slate-400">
                Latest Article
              </p>
            </div>

            <h3 className="mt-3 line-clamp-2 text-sm font-semibold">
              {latestArticle?.title}
            </h3>

            <p className="mt-3 text-xs text-red-600">
              {latestArticle?.views} views
            </p>
          </div>

          <div className="rounded-2xl p-5 text-black border-4 border-blue-600 shadow-lg">
            <div className="flex flex-row gap-2">
              <ScanEye className="text-blue-500" />
              <p className="text-sm opacity-80 font-bold text-blue-500">
                TOTAL VIEWS
              </p>
            </div>

            <h2 className="mt-2 text-5xl font-bold text-blue-500">
              {totalViews.toLocaleString()}
            </h2>

            <p className="mt-2 text-sm opacity-80 text-blue-500">
              Across all published articles
            </p>
          </div>
        </section>
        <div className="grid grid-cols-2 gap-4">
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
                className="items-center animate-soft-glow rounded-full bg-gradient-to-r from-red-500 via-pink-500 to-orange-400 px-2 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
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
                      <span className="text-white text-xs bg-blue-700 rounded-full p-1">
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
          {/* Category Performance */}

          <section className="rounded-2xl bg-white shadow-lg border border-slate-200">
            <div className="flex items-center justify-between space-x-4 border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-semibold">Category Performance</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Reader engagement by technology.
                </p>
              </div>

              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                {categoryViews.length} Categories
              </span>
            </div>
            <div className="p-6">
              <CategoryLeaderboard data={categoryViews} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
