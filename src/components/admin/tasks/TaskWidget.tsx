import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Eye, Plus, X } from "lucide-react";
import { listMyTasks } from "../../../lib/tasks";
import type { Task } from "../../../types/task";

export default function TaskWidget() {
  // Store the tasks loaded from Supabase.
  const [tasks, setTasks] = useState<Task[]>([]);

  // Track whether tasks are currently being loaded.
  const [loading, setLoading] = useState(true);

  // Track whether the overdue tasks modal is open.
  const [showOverdueModal, setShowOverdueModal] = useState(false);

  // Load the logged-in user's tasks from Supabase.
  async function loadTasks() {
    // Display the loading state while the request is running.
    setLoading(true);

    // Retrieve the tasks belonging to the current staff member.
    const { data, error } = await listMyTasks();

    // Log the error to the browser console if the request fails.
    if (error) {
      console.error(error);

      // Stop the loading state after the error.
      setLoading(false);

      return;
    }

    // Store the returned tasks in component state.
    setTasks(data ?? []);

    // Stop the loading state after the request completes.
    setLoading(false);
  }

  // Determine whether a task has passed its due date.
  function isTaskOverdue(task: Task) {
    // Treat completed tasks as never overdue.
    if (task.status === "completed") return false;

    // Treat tasks without a due date as never overdue.
    if (!task.due_date) return false;

    // Create today's date.
    const today = new Date();

    // Remove the current time from today's date.
    today.setHours(0, 0, 0, 0);

    // Create the task due date.
    const dueDate = new Date(task.due_date);

    // Remove the time from the task due date.
    dueDate.setHours(0, 0, 0, 0);

    // Return true only when the due date has fully passed.
    return dueDate < today;
  }

  // Format the task status for display.
  function formatStatus(status: Task["status"]) {
    // Return a readable in-progress label.
    if (status === "in_progress") return "In Progress";

    // Return a readable completed label.
    if (status === "completed") return "Completed";

    // Return the pending label.
    return "Pending";
  }

  // Format a task due date for the overdue modal.
  function formatDueDate(date: string | null) {
    // Return a fallback when no due date exists.
    if (!date) return "-";

    // Return a readable date.
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Load the user's tasks once when the component first mounts.
  useEffect(() => {
    // Call the task loading function.
    loadTasks();
  }, []);

  // Calculate all overdue tasks.
  const overdueTasks = tasks.filter(isTaskOverdue);

  // Display a loading card while the tasks are being retrieved.
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        Loading tasks...
      </div>
    );
  }

  // Render the complete task widget.
  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-slate-200 p-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-md font-semibold text-slate-900">
                Task Widget
              </h2>

              {overdueTasks.length > 0 && (
                <button
                  onClick={() => setShowOverdueModal(true)}
                  className="flex h-5 min-w-5 animate-overdue-glow items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white transition hover:bg-red-600"
                  title="View overdue tasks"
                >
                  Overdue: {overdueTasks.length}
                </button>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Track your pending and completed work.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <a
              href="/admin/tasks/add"
              className="flex items-center gap-1 rounded-lg border border-primary px-1 py-1 text-xs text-blue-500 transition hover:opacity-90"
            >
              <Plus size={12} />
              Add a task
            </a>

            <a
              href="/admin/tasks/"
              className="flex items-center gap-2 rounded-lg border border-orange-500 px-1 py-1 text-xs text-orange-500 transition hover:opacity-90"
            >
              <Eye size={12} />
              View all
            </a>
          </div>
        </div>

        <div className="border-t border-slate-200">
          {!tasks.length ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">You have no tasks yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {tasks.slice(0, 2).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-5 p-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">
                      {task.title}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span className="capitalize">Priority</span>

                      <span>•</span>

                      <span
                        className={`rounded-full px-1 pr-1 pl-1 text-white ${
                          task.priority === "high"
                            ? "bg-red-500"
                            : task.priority === "medium"
                              ? "bg-blue-500"
                              : "bg-green-500"
                        }`}
                      >
                        {task.priority}
                      </span>

                      <span>•</span>

                      <a
                        href={`/admin/tasks/${task.id}/edit`}
                        className="text-blue-500 underline"
                      >
                        View task
                      </a>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      task.status === "completed"
                        ? "bg-green-500 text-white"
                        : task.status === "in_progress"
                          ? "bg-blue-500 text-white"
                          : "bg-yellow-400 text-white"
                    }`}
                  >
                    {formatStatus(task.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showOverdueModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowOverdueModal(false)}
          />

          <div className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle size={20} className="text-red-600" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Overdue Tasks
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    These tasks have passed their due date.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowOverdueModal(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-6">
              <div className="space-y-3">
                {overdueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-red-100 bg-red-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {task.title}
                        </p>

                        <p className="mt-1 text-xs text-red-600">
                          Due date: {formatDueDate(task.due_date)}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
                          task.priority === "high"
                            ? "bg-red-500 text-white"
                            : task.priority === "medium"
                              ? "bg-blue-500 text-white"
                              : "bg-green-500 text-white"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <a
                      href={`/admin/tasks/${task.id}/edit`}
                      className="mt-3 inline-block text-xs font-medium text-blue-600 underline"
                    >
                      View task
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
