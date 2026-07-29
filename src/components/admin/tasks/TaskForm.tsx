import { useEffect, useState } from "react";
import { toast } from "sonner";
import { addTask, getTask, updateTask } from "../../../lib/tasks";
import { getProjectOptions } from "../../../lib/server/projects";

interface Props {
  mode?: "create" | "edit";
}

export default function TaskForm({ mode = "create" }: Props) {
  // Store all values entered into the task form.
  const [form, setForm] = useState({
    project_id: "",
    title: "",
    description: "",
    status: "pending" as "pending" | "in_progress" | "completed",
    priority: "medium" as "low" | "medium" | "high",
    due_date: "",
  });

  // Store all projects that can be assigned to a task.
  const [projects, setProjects] = useState<
    {
      id: string;
      project_code: string;
      name: string;
    }[]
  >([]);

  // Track whether the task is currently being saved.
  const [saving, setSaving] = useState(false);

  // Track whether the existing task is currently being loaded.
  const [loading, setLoading] = useState(false);

  // Extract the task ID from the /admin/tasks/[id]/edit route.
  const id =
    typeof window !== "undefined"
      ? window.location.pathname.split("/")[3]
      : null;

  // Load the existing task details when the form is in edit mode.
  async function loadTask() {
    // Stop execution when a task ID is not available.
    if (!id) return;

    // Enable the loading state while the task is being retrieved.
    setLoading(true);

    // Retrieve the selected task using the task service.
    const { data, error } = await getTask(id);

    // Disable the loading state after the request completes.
    setLoading(false);

    // Display an error when the task cannot be loaded.
    if (error) {
      toast.error(error.message);
      return;
    }

    // Populate the form with the existing task data.
    setForm({
      project_id: data.project_id ?? "",
      title: data.title ?? "",
      description: data.description ?? "",
      status: data.status ?? "pending",
      priority: data.priority ?? "medium",
      due_date: data.due_date ?? "",
    });
  }

  // Load all available projects.
  async function loadProjects() {
    const projects = await getProjectOptions();

    setProjects(projects);
  }

  // Load the existing task when the component opens in edit mode.
  useEffect(() => {
    loadProjects();

    if (mode === "edit") {
      loadTask();
    }
  }, []);

  // Update the matching form field whenever the user changes a value.
  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  // Submit the form and either create or update the task.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Prevent duplicate submissions while the request is running.
    setSaving(true);

    // Store the database error returned by the appropriate operation.
    let error;

    // Update the existing task when the form is in edit mode.
    if (mode === "edit" && id) {
      const result = await updateTask(id, {
        project_id: form.project_id,
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        completed_at:
          form.status === "completed" ? new Date().toISOString() : null,
      });

      // Store the update error for later handling.
      error = result.error;
    } else {
      // Create a new task when the form is in create mode.
      const result = await addTask({
        project_id: form.project_id,
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
      });

      // Store the creation error for later handling.
      error = result.error;
    }

    // Stop the saving state after the request completes.
    setSaving(false);

    // Display the database error when the operation fails.
    if (error) {
      toast.error(error.message);
      return;
    }

    // Display the correct success message based on the form mode.
    toast.success(
      mode === "edit"
        ? "Task updated successfully."
        : "Task added successfully."
    );

    // Return the user to the task management page.
    window.location.href = "/admin/tasks";
  }

  // Display a loading state while the existing task is being retrieved.
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        Loading task...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 p-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900">
            {mode === "edit" ? "Edit Task" : "Task Details"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {mode === "edit"
              ? "Update the task details below."
              : "Create a task to track your work."}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Task title
            </label>

            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="e.g. Review staff onboarding process"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <label
              htmlFor="project_id"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Project
            </label>

            <select
              id="project_id"
              name="project_id"
              value={form.project_id}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="">No Project</option>

              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_code} — {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Description
            </label>

            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={5}
              placeholder="Add more details about this task..."
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="pending">Pending</option>

                <option value="in_progress">In Progress</option>

                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="priority"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Priority
              </label>

              <select
                id="priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="low">Low</option>

                <option value="medium">Medium</option>

                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="due_date"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Due date
              </label>

              <input
                id="due_date"
                name="due_date"
                type="date"
                value={form.due_date}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <a
          href="/admin/tasks"
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </a>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : mode === "edit" ? "Update Task" : "Save Task"}
        </button>
      </div>
    </form>
  );
}
