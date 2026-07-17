import { useEffect, useState } from "react";
import { listMyTasks } from "../../../lib/tasks";
import TaskTable from "./TaskTable";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  due_date: string | null;
}

export default function TaskPage() {
  // Store the tasks belonging to the logged-in staff member.
  const [tasks, setTasks] = useState<Task[]>([]);

  // Track whether the task list is currently loading.
  const [loading, setLoading] = useState(true);

  // Load the current user's tasks from Supabase.
  async function loadTasks() {
    // Enable the loading state before fetching tasks.
    setLoading(true);

    // Retrieve tasks belonging to the logged-in staff member.
    const { data, error } = await listMyTasks();

    // Log the database error when task loading fails.
    if (error) {
      console.error(error);
    }

    // Store the returned tasks in component state.
    setTasks(data ?? []);

    // Disable the loading state after the request completes.
    setLoading(false);
  }

  // Load tasks when the component first mounts.
  useEffect(() => {
    loadTasks();
  }, []);

  // Display a loading state while tasks are being retrieved.
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        Loading tasks...
      </div>
    );
  }

  // Render the task table after loading is complete.
  return <TaskTable tasks={tasks} reload={loadTasks} />;
}
