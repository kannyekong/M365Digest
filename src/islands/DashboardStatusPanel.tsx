import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/superbase";
import { listMyTasks } from "../lib/tasks";

interface DashboardStatus {
  tasksDueToday: number;
  newEnquiries: number;
  monthlyRevenue: number;
  growthPercentage: number;
  currency: string;
}

interface FinancialSummaryResponse {
  success: boolean;
  message?: string;
  summary?: {
    currentMonthRevenue: number;
    growthPercentage: number;
    currency: string;
  };
}

/* Formats a monetary amount using the supplied currency. */
function formatCurrency(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/* Formats a percentage with a plus sign for positive growth. */
function formatGrowthPercentage(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;

  const sign = safeValue > 0 ? "+" : "";

  return `${sign}${safeValue.toLocaleString("en-NG", {
    maximumFractionDigits: 1,
  })}%`;
}

/* Returns today's date using the YYYY-MM-DD format stored by task due dates. */
function getTodayDate() {
  const today = new Date();

  const timezoneOffset = today.getTimezoneOffset() * 60_000;

  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

/* Displays a compact live operational summary beneath the dashboard greeting. */
export default function DashboardStatusPanel() {
  const [status, setStatus] = useState<DashboardStatus>({
    tasksDueToday: 0,
    newEnquiries: 0,
    monthlyRevenue: 0,
    growthPercentage: 0,
    currency: "NGN",
  });

  const [loading, setLoading] = useState(true);

  /* Loads tasks, enquiries, and company financial statistics when the header mounts. */
  useEffect(() => {
    async function loadDashboardStatus() {
      const today = getTodayDate();

      try {
        const [tasksResponse, contactsResponse, financialResponse] =
          await Promise.all([
            listMyTasks(),

            supabase
              .from("contact_submissions")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq("is_read", false),

            fetch("/api/admin/finance/summary", {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
              cache: "no-store",
            }),
          ]);

        if (tasksResponse.error) {
          console.error("Failed to load dashboard tasks:", tasksResponse.error);
        }

        if (contactsResponse.error) {
          console.error(
            "Failed to load dashboard enquiries:",
            contactsResponse.error
          );
        }

        let monthlyRevenue = 0;
        let growthPercentage = 0;
        let currency = "NGN";

        if (financialResponse.ok) {
          const financialResult =
            (await financialResponse.json()) as FinancialSummaryResponse;

          if (financialResult.success && financialResult.summary) {
            monthlyRevenue = financialResult.summary.currentMonthRevenue;

            growthPercentage = financialResult.summary.growthPercentage;

            currency = financialResult.summary.currency || "NGN";
          } else {
            console.error(
              "Failed to load financial summary:",
              financialResult.message
            );
          }
        } else {
          console.error(
            "Financial summary request failed:",
            financialResponse.status
          );
        }

        const tasksDueToday = (tasksResponse.data ?? []).filter(
          (task) => task.due_date === today && task.status !== "completed"
        ).length;

        setStatus({
          tasksDueToday,
          newEnquiries: contactsResponse.count ?? 0,
          monthlyRevenue,
          growthPercentage,
          currency,
        });
      } catch (error) {
        console.error("Failed to load dashboard status:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboardStatus();
  }, []);

  const GrowthIcon =
    status.growthPercentage > 0
      ? ArrowUpRight
      : status.growthPercentage < 0
        ? ArrowDownRight
        : Minus;

  const growthClasses =
    status.growthPercentage > 0
      ? "text-emerald-600"
      : status.growthPercentage < 0
        ? "text-red-600"
        : "text-slate-500 dark:text-slate-300";

  if (loading) {
    return (
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-300">
        Loading dashboard summary...
      </p>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-300">
      <span>
        <strong className="font-semibold text-slate-700 dark:text-white">
          {status.tasksDueToday}
        </strong>{" "}
        {status.tasksDueToday === 1 ? "task due today" : "tasks due today"}
      </span>

      <span className="text-slate-300 dark:text-slate-600">•</span>

      <span>
        <strong className="font-semibold text-blue-600">
          {status.newEnquiries}
        </strong>{" "}
        {status.newEnquiries === 1 ? "new enquiry" : "new enquiries"}
      </span>

      <span className="text-slate-300 dark:text-slate-600">•</span>

      <span className="inline-flex flex-wrap items-center gap-1">
        <strong className="font-semibold text-emerald-600">
          {formatCurrency(status.monthlyRevenue, status.currency)}
        </strong>

        <span>revenue this month</span>

        <span
          className={`inline-flex items-center gap-0.5 font-semibold ${growthClasses}`}
          title="Change compared with the previous month"
        >
          <GrowthIcon className="h-3.5 w-3.5" />

          {formatGrowthPercentage(status.growthPercentage)}
        </span>
      </span>
    </div>
  );
}
