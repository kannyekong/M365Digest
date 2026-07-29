import { useEffect, useState } from "react";
import { supabase } from "../lib/superbase";
import { listMyTasks } from "../lib/tasks";

interface DashboardStatusPanelProps {
  monthlyRevenue?: number;
}

interface DashboardStatus {
  tasksDueToday: number;
  newEnquiries: number;
}

/* Formats a monetary amount in Nigerian naira. */
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

/* Returns today's date using the YYYY-MM-DD format stored by task due dates. */
function getTodayDate() {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60_000;

  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

/* Displays a compact live operational summary beneath the dashboard greeting. */
export default function DashboardStatusPanel({
  monthlyRevenue,
}: DashboardStatusPanelProps) {
  const [status, setStatus] = useState<DashboardStatus>({
    tasksDueToday: 0,
    newEnquiries: 0,
  });

  const [loading, setLoading] = useState(true);

  /* Loads task and contact statistics when the dashboard header mounts. */
  useEffect(() => {
    async function loadDashboardStatus() {
      const today = getTodayDate();

      const [tasksResponse, contactsResponse] = await Promise.all([
        listMyTasks(),

        supabase
          .from("contact_submissions")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("is_read", false),
      ]);

      if (tasksResponse.error) {
        console.error(tasksResponse.error);
      }

      if (contactsResponse.error) {
        console.error(contactsResponse.error);
      }

      const tasksDueToday = (tasksResponse.data ?? []).filter(
        (task) => task.due_date === today && task.status !== "completed"
      ).length;

      setStatus({
        tasksDueToday,
        newEnquiries: contactsResponse.count ?? 0,
      });

      setLoading(false);
    }

    void loadDashboardStatus();
  }, []);

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

      {typeof monthlyRevenue === "number" && (
        <>
          <span className="text-slate-300 dark:text-slate-600">•</span>

          <span>
            <strong className="font-semibold text-emerald-600">
              {formatCurrency(monthlyRevenue)}
            </strong>{" "}
            revenue this month
          </span>
        </>
      )}
    </div>
  );
}
