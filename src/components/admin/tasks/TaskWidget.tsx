import { useEffect, useState } from "react";
import { Plus, CheckCircle2, Clock3, Eye } from "lucide-react";
import { listMyTasks } from "../../../lib/tasks";

interface Task {
  // Unique task identifier.
  id: string;
  // Task title displayed to the user.
  title: string;
  // Current task status.
  status: "pending" | "in_progress" | "completed";
  // Current task priority.
  priority: "low" | "medium" | "high";
  // Optional task due date.
  due_date: string | null;
}

export default function TaskWidget() {
  // Store the tasks loaded from Supabase.
  const [tasks, setTasks] = useState<Task[]>([]);
  // Track whether tasks are currently being loaded.
  const [loading, setLoading] = useState(true);
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

  // Load the user's tasks once when the component first mounts.
  useEffect(() => {
    // Call the task loading function.
    loadTasks();
  }, []);

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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-slate-200 p-6">
        <div>
          <h2 className="text-md font-semibold text-slate-900">Task Widget</h2>

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
            {/* Render each of the first five tasks. */}
            {tasks.slice(0, 2).map((task) => (
              <div
                // Use the task ID as the React list key.
                key={task.id}

                className="flex items-center justify-between gap-5 p-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold  text-slate-900">
                    {task.title}
                  </p>

                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span className="capitalize">Priority</span>

                    <span>•</span>

                    <span
                      className={`capitalize text-white rounded-full pr-1 pl-1 ${
                        task.priority === "high"
                          ? "bg-red-500 "
                          : task.priority === "medium"
                            ? "bg-blue-500"
                            : "bg-green-500"
                      }`}
                    >
                      {task.priority}
                    </span>

                    <span>•</span>

                    <a href="/" className="underline text-blue-500">
                      View task
                    </a>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs capitalize ${
                    task.status === "completed"
                      ? "bg-green-500 text-white"
                      : task.status === "in_progress"
                        ? "bg-blue-500 text-white"
                        : "bg-orange-200 text-white"
                  }`}
                >
                  {task.status.replace("_", "")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
