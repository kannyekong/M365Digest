import { useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  Clock3,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getCommunicationsInsights } from "../../../lib/insights";
import type {
  CommunicationsInsights,
  InsightsDateRange,
  InsightsGrouping,
} from "../../../types/insights";
import DashboardCountCard from "../../shared/DashboardCountCard";

type Timeframe =
  "today" | "last_7_days" | "last_30_days" | "this_month" | "this_year";

const pieColors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"];

const paymentColors = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#64748b"];

/* Converts a date into the YYYY-MM-DD format required by the analytics service. */
function formatInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/* Returns the correct date range and chart grouping for a selected timeframe. */
function getDateRange(timeframe: Timeframe): InsightsDateRange {
  const today = new Date();
  const startDate = new Date(today);
  let grouping: InsightsGrouping = "day";

  if (timeframe === "today") {
    return {
      startDate: formatInputDate(today),
      endDate: formatInputDate(today),
      grouping: "day",
    };
  }

  if (timeframe === "last_7_days") {
    startDate.setDate(today.getDate() - 6);
  }

  if (timeframe === "last_30_days") {
    startDate.setDate(today.getDate() - 29);
  }

  if (timeframe === "this_month") {
    startDate.setDate(1);
  }

  if (timeframe === "this_year") {
    startDate.setMonth(0, 1);
    grouping = "month";
  }

  return {
    startDate: formatInputDate(startDate),
    endDate: formatInputDate(today),
    grouping,
  };
}

/* Formats analytics dates for the recent-activity feed. */
function formatActivityDate(dateValue: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

/* Displays communication analytics across the four public forms. */
export default function InsightsDashboard() {
  // Store the timeframe applied to every dashboard metric.
  const [timeframe, setTimeframe] = useState<Timeframe>("last_30_days");

  // Store the complete analytics response.
  const [insights, setInsights] = useState<CommunicationsInsights | null>(null);

  // Track whether analytics are currently being loaded.
  const [loading, setLoading] = useState(true);

  // Store an error returned while loading analytics.
  const [errorMessage, setErrorMessage] = useState("");

  // Reload the full dashboard whenever the timeframe changes.
  useEffect(() => {
    async function loadInsights() {
      setLoading(true);
      setErrorMessage("");

      try {
        const analytics = await getCommunicationsInsights(
          getDateRange(timeframe)
        );

        setInsights(analytics);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The analytics dashboard could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadInsights();
  }, [timeframe]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (errorMessage || !insights) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {errorMessage || "Analytics data is unavailable."}
      </div>
    );
  }

  return (
    <div className="space-y-8 p-5">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Analytics overview
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-heading">
            Insights
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-text-muted">
            Monitor contacts, registrations, reviews, and quote requests from
            one central dashboard.
          </p>
        </div>

        <div>
          <label
            htmlFor="insights-timeframe"
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-muted"
          >
            Timeframe
          </label>

          <select
            id="insights-timeframe"
            value={timeframe}
            onChange={(event) => setTimeframe(event.target.value as Timeframe)}
            className="rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading outline-none transition focus:border-primary"
          >
            <option value="today">Today</option>
            <option value="last_7_days">Last 7 days</option>
            <option value="last_30_days">Last 30 days</option>
            <option value="this_month">This month</option>
            <option value="this_year">This year</option>
          </select>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCountCard
          title="Contacts"
          count={insights.counts.contacts}
          type="contacts"
          href="/admin/forms/contact"
          description="Contact enquiries received"
        />

        <DashboardCountCard
          title="Registrations"
          count={insights.counts.registrations}
          type="registrations"
          href="/admin/academy/registrations"
          description="Bootcamp registrations"
        />

        <DashboardCountCard
          title="Reviews"
          count={insights.counts.reviews}
          type="reviews"
          href="/admin/forms/review"
          description="Customer reviews submitted"
        />

        <DashboardCountCard
          title="Quotes"
          count={insights.counts.quotes}
          type="quotes"
          href="/admin/forms/quotes"
          description="Quote requests received"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <article className="rounded-3xl border border-box-border bg-box-bg/70 p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-heading">
              Submission trend
            </h2>

            <p className="mt-1 text-sm text-text-muted">
              Submission activity across all four forms.
            </p>
          </div>

          <div className="mt-6 h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={insights.trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12 }}
                  minTickGap={24}
                />

                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="contacts"
                  name="Contacts"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="registrations"
                  name="Registrations"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="reviews"
                  name="Reviews"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="quotes"
                  name="Quotes"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-3xl border border-box-border bg-box-bg/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-heading">
            Submission distribution
          </h2>

          <p className="mt-1 text-sm text-text-muted">
            Share of engagement by form type.
          </p>

          <div className="mt-6 h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={insights.distribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={68}
                  outerRadius={105}
                  paddingAngle={3}
                >
                  {insights.distribution.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={pieColors[index % pieColors.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ActivitySummaryCard
          icon={TrendingUp}
          label="Total submissions"
          value={insights.counts.total.toLocaleString()}
        />

        <ActivitySummaryCard
          icon={CalendarDays}
          label="Busiest day"
          value={insights.activity.busiestDay}
        />

        <ActivitySummaryCard
          icon={Clock3}
          label="Peak hour"
          value={insights.activity.peakHour}
        />

        <ActivitySummaryCard
          icon={Activity}
          label="Average daily"
          value={insights.activity.averageDaily.toString()}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-box-border bg-box-bg/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-heading">
            Review satisfaction
          </h2>

          <p className="mt-1 text-sm text-text-muted">
            Rating distribution for each review category.
          </p>

          <div className="mt-6 h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={insights.reviewRatings}
                layout="vertical"
                margin={{
                  left: 40,
                  right: 10,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

                <XAxis type="number" allowDecimals={false} />

                <YAxis
                  type="category"
                  dataKey="question"
                  width={150}
                  tick={{ fontSize: 11 }}
                />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="great"
                  name="Great"
                  stackId="ratings"
                  fill="#10b981"
                />

                <Bar
                  dataKey="average"
                  name="Average"
                  stackId="ratings"
                  fill="#f59e0b"
                />

                <Bar
                  dataKey="bad"
                  name="Bad"
                  stackId="ratings"
                  fill="#ef4444"
                />

                <Bar
                  dataKey="other"
                  name="Other"
                  stackId="ratings"
                  fill="#64748b"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-3xl border border-box-border bg-box-bg/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-heading">
            Registration payments
          </h2>

          <p className="mt-1 text-sm text-text-muted">
            Payment-status breakdown for bootcamp registrations.
          </p>

          <div className="mt-6 h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={insights.registrationPayments}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                >
                  {insights.registrationPayments.map((item, index) => (
                    <Cell
                      key={item.status}
                      fill={paymentColors[index % paymentColors.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-box-border bg-box-bg/70 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-heading">
              Recent activity
            </h2>

            <p className="mt-1 text-sm text-text-muted">
              Latest submissions across all communication channels.
            </p>
          </div>
        </div>

        <div className="mt-6 divide-y divide-box-border">
          {insights.recentActivity.length ? (
            insights.recentActivity.map((activity) => (
              <a
                key={`${activity.type}-${activity.id}`}
                className="flex items-center justify-between gap-5 py-4 transition first:pt-0 last:pb-0 hover:text-primary"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-heading">
                    {activity.title}
                  </p>

                  <p className="mt-1 truncate text-xs text-text-muted">
                    {activity.subtitle}
                  </p>
                </div>

                <span className="shrink-0 text-xs text-text-muted">
                  {formatActivityDate(activity.created_at)}
                </span>
              </a>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-text-muted">
              No submissions were received during this timeframe.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

interface ActivitySummaryCardProps {
  icon: typeof Activity;
  label: string;
  value: string;
}

/* Displays one small operational insight. */
function ActivitySummaryCard({
  icon: Icon,
  label,
  value,
}: ActivitySummaryCardProps) {
  return (
    <article className="rounded-2xl border border-box-border bg-box-bg/70 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            {label}
          </p>

          <p className="mt-3 text-xl font-bold text-heading">{value}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </article>
  );
}
