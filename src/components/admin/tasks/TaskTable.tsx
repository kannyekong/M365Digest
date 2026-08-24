import {
  ArrowDown,
  ArrowUp,
  Badge,
  CheckCircle2,
  Clock3,
  Download,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { deleteTask, updateTask } from "../../../lib/tasks";
import { exportToCSV, paginateData, sortData } from "../../../lib/table";
import ViewSubmissionModal from "../../../islands/ViewSubmissionModal";
import type { Task } from "../../../types/task";
import { getProjectOptions } from "../../../lib/server/projects";
import type { ProjectOption } from "../../../types/project";

interface Props {
  tasks: Task[];
  reload: () => void;
}

type SortDirection = "asc" | "desc";

export default function TaskTable({ tasks, reload }: Props) {
  // Store the ID of the task currently being deleted.
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Store the current search value.
  const [search, setSearch] = useState("");

  // Store the selected task status filter.
  const [statusFilter, setStatusFilter] = useState("All");

  // Store the selected task priority filter.
  const [priorityFilter, setPriorityFilter] = useState("All");

  // Store the selected project filter.
  const [projectFilter, setProjectFilter] = useState("All");

  // Store all available projects.
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  // Store the currently selected sorting column.
  const [sortColumn, setSortColumn] = useState("created_at");

  // Store the current sorting direction.
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Store the current pagination page.
  const [currentPage, setCurrentPage] = useState(1);

  // Store the number of rows displayed per page.
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Load all available projects for the filter dropdown.
  useEffect(() => {
    async function loadProjects() {
      const data = await getProjectOptions();

      setProjects(data);
    }

    loadProjects();
  }, []);

  // Delete a task after confirming the user's action.
  async function handleDelete(task: Task) {
    // Ask the user to confirm the task deletion.
    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.title}"?`
    );

    // Stop the function when the user cancels the deletion.
    if (!confirmed) return;

    // Store the ID of the task currently being deleted.
    setDeletingId(task.id);

    // Delete the selected task from Supabase.
    const { error } = await deleteTask(task.id);

    // Clear the deleting state after the request completes.
    setDeletingId(null);

    // Display the error returned by Supabase.
    if (error) {
      toast.error(error.message);
      return;
    }

    // Inform the user that the task was deleted successfully.
    toast.success("Task deleted successfully.");

    // Reload the task list with the latest data.
    reload();
  }

  // Update the status of a selected task.
  async function handleStatusChange(
    task: Task,
    status: "pending" | "in_progress" | "completed"
  ) {
    // Update the task status in Supabase.
    const { error } = await updateTask(task.id, {
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    });

    // Display the update error when the request fails.
    if (error) {
      toast.error(error.message);
      return;
    }

    // Inform the user that the task status was updated.
    toast.success("Task status updated.");

    // Reload the task list with the updated task.
    reload();
  }

  // Sort the task table by a selected column.
  function handleSort(column: string) {
    // Reverse the sort direction when the same column is selected.
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));

      return;
    }

    // Set the new sorting column.
    setSortColumn(column);

    // Start new sorting columns in ascending order.
    setSortDirection("asc");

    // Return to the first page after changing the sort column.
    setCurrentPage(1);
  }

  // Return the correct sorting icon for a table column.
  function getSortIcon(column: string) {
    // Return nothing when the column is not currently sorted.
    if (sortColumn !== column) return null;

    // Display the ascending arrow.
    if (sortDirection === "asc") {
      return <ArrowUp size={14} />;
    }

    // Display the descending arrow.
    return <ArrowDown size={14} />;
  }

  // Handle changes to the task search field.
  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    // Update the search value.
    setSearch(event.target.value);

    // Return to the first page after searching.
    setCurrentPage(1);
  }

  // Handle changes to the rows-per-page selector.
  function handleRowsPerPageChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    // Update the number of rows displayed per page.
    setRowsPerPage(Number(event.target.value));

    // Return to the first page after changing the page size.
    setCurrentPage(1);
  }

  // Export all tasks as a CSV file.
  function handleExportCSV() {
    // Convert tasks into CSV-friendly objects.
    const exportData = tasks.map((task) => ({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      created_at: new Date(task.created_at).toLocaleDateString(),
    }));

    // Export the task data as a CSV file.
    exportToCSV(exportData, "tasks.csv");
  }

  // Filter and sort the task data.
  const processedTasks = useMemo(() => {
    // Normalize the search value for case-insensitive searching.
    const searchValue = search.toLowerCase().trim();

    // Create today's date.
    const today = new Date();

    // Remove the current time from today's date.
    today.setHours(0, 0, 0, 0);

    // Filter tasks based on search and selected filters.
    const filtered = tasks.filter((task) => {
      // Build a searchable string from the task properties.
      const searchableText = [
        task.title,
        task.description,
        task.status,
        task.priority,
      ]
        .join(" ")
        .toLowerCase();

      // Check whether the task matches the search value.
      const matchesSearch =
        !searchValue || searchableText.includes(searchValue);

      // Create the task due date when one exists.
      const dueDate = task.due_date ? new Date(task.due_date) : null;

      // Remove the time from the task due date.
      dueDate?.setHours(0, 0, 0, 0);

      // Determine whether the task is overdue.
      const isOverdue =
        task.status !== "completed" && dueDate !== null && dueDate < today;

      // Handle the derived overdue status.
      const matchesStatus =
        statusFilter === "All"
          ? true
          : statusFilter === "overdue"
            ? isOverdue
            : task.status === statusFilter;

      // Check whether the task matches the priority filter.
      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;

      // Check whether the task matches the selected project.
      const matchesProject =
        projectFilter === "All"
          ? true
          : projectFilter === "none"
            ? !task.project_id
            : task.project_id === projectFilter;

      // Return tasks matching all active filters.
      return (
        matchesSearch && matchesStatus && matchesPriority && matchesProject
      );
    });

    // Sort the filtered tasks.
    // Sort project names separately because project is a nested task property.
    if (sortColumn === "project") {
      return [...filtered].sort((firstTask, secondTask) => {
        // Use an empty string when a task is not assigned to a project.
        const firstProjectName = firstTask.project?.name ?? "";
        const secondProjectName = secondTask.project?.name ?? "";

        // Compare the project names without case sensitivity.
        const comparison = firstProjectName.localeCompare(
          secondProjectName,
          undefined,
          {
            sensitivity: "base",
          }
        );

        // Apply the selected sorting direction.
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    // Sort normal top-level task properties using the existing table helper.
    return sortData(filtered, sortColumn as keyof Task, sortDirection);
  }, [
    tasks,
    search,
    statusFilter,
    priorityFilter,
    sortColumn,
    sortDirection,
    projectFilter,
  ]);

  // Calculate the total number of pending tasks.
  const pendingTasks = tasks.filter((task) => task.status === "pending");

  // Calculate the total number of in-progress tasks.
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");

  // Calculate the total number of completed tasks.
  const completedTasks = tasks.filter((task) => task.status === "completed");

  // Calculate the total number of pagination pages.
  const totalPages = Math.ceil(processedTasks.length / rowsPerPage);

  // Calculate the first visible task index.
  const startIndex = (currentPage - 1) * rowsPerPage;

  // Calculate the last visible task index.
  const endIndex = startIndex + rowsPerPage;

  // Retrieve the tasks for the current page.
  const paginatedTasks = paginateData(processedTasks, currentPage, rowsPerPage);

  // Calculate the total number of overdue tasks.
  const overdueTasks = tasks.filter((task) => {
    // Completed tasks should never be considered overdue.
    if (task.status === "completed") return false;

    // Tasks without a due date cannot be overdue.
    if (!task.due_date) return false;

    // Create today's date.
    const today = new Date();

    // Remove the current time from today's date.
    today.setHours(0, 0, 0, 0);

    // Create the task due date.
    const dueDate = new Date(task.due_date);

    // Remove the time from the task due date.
    dueDate.setHours(0, 0, 0, 0);

    // Return true when the task due date has passed.
    return dueDate < today;
  });

  const totalTasks =
    pendingTasks.length + completedTasks.length + inProgressTasks.length;

  // Display an empty state when there are no tasks.
  if (!tasks.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h3 className="text-lg font-semibold text-slate-800">No tasks yet</h3>

        <p className="mt-2 text-sm text-slate-500">
          Create your first task to start monitoring your work.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="grid gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-pink-500 p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 text-white">
            <Clock3 size={18} />

            <span className="text-sm font-medium text-white">Total Tasks</span>
          </div>

          <p className="mt-3 text-3xl font-bold text-white">{totalTasks}</p>
        </div>

        <div className="rounded-xl border border-orange-500 p-4">
          <div className="flex items-center gap-2 text-orange-500">
            <Clock3 size={18} />

            <span className="text-sm font-medium">Pending</span>
          </div>

          <p className="mt-3 text-3xl font-bold text-orange-500">
            {pendingTasks.length}
          </p>
        </div>

        <div className="rounded-xl border border-blue-400 p-4">
          <div className="flex items-center gap-2 text-blue-500">
            <Clock3 size={18} />

            <span className="text-sm font-medium">In Progress</span>
          </div>

          <p className="mt-3 text-3xl font-bold text-blue-600">
            {inProgressTasks.length}
          </p>
        </div>

        <div className="rounded-xl border border-green-500 p-4">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 size={18} />

            <span className="text-sm font-medium">Completed</span>
          </div>

          <p className="mt-3 text-3xl font-bold text-green-500">
            {completedTasks.length}
          </p>
        </div>

        <div className="rounded-xl border border-red-400 p-4">
          <div className="flex items-center gap-2 text-red-500">
            <Clock3 size={18} />

            <span className="text-sm font-medium">Overdue</span>
          </div>

          <p className="mt-3 text-3xl font-bold text-red-500">
            {overdueTasks.length}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search tasks..."
            className="w-64 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary"
          >
            <option value="All">All Status</option>

            <option value="pending">Pending</option>

            <option value="in_progress">In Progress</option>

            <option value="completed">Completed</option>

            <option value="overdue">Overdue</option>
          </select>

          <select
            value={projectFilter}
            onChange={(event) => {
              setProjectFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary"
          >
            <option value="All">All Projects</option>

            <option value="none">No Project</option>

            <optgroup label="Internal Projects">
              {projects
                .filter((project) => project.project_type === "internal")
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_code} — {project.name}
                  </option>
                ))}
            </optgroup>

            <optgroup label="Client Projects">
              {projects
                .filter((project) => project.project_type === "client")
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_code} — {project.name}
                  </option>
                ))}
            </optgroup>
          </select>

          <select
            value={priorityFilter}
            onChange={(event) => {
              setPriorityFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary"
          >
            <option value="All">All Priority</option>

            <option value="low">Low</option>

            <option value="medium">Medium</option>

            <option value="high">High</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>

        <a
          href="/admin/tasks/add"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-2 py-3 text-sm font-medium text-white transition hover:bg-blue-800"
        >
          <Plus size={17} />
          Add new task
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="border-b border-b-slate-200 bg-slate-50">
            <tr className="text-left text-sm font-semibold text-slate-700">
              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("title")}
              >
                <div className="flex items-center gap-1">
                  Tasks
                  {getSortIcon("title")}
                </div>
              </th>

              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  Status
                  {getSortIcon("status")}
                </div>
              </th>
              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("project")}
              >
                Project type
              </th>
              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("priority")}
              >
                <div className="flex items-center gap-1">
                  Priority
                  {getSortIcon("priority")}
                </div>
              </th>

              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("created_at")}
              >
                <div className="flex items-center gap-1">
                  Date Added
                  {getSortIcon("created_at")}
                </div>
              </th>

              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-xs">
            {paginatedTasks.map((task) => (
              <tr key={task.id} className="transition hover:bg-slate-50">
                <td className="max-w-sm px-6 py-4">
                  <p className="truncate font-bold text-slate-900">
                    {task.title}
                  </p>

                  {task.description && (
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {task.description}
                    </p>
                  )}
                </td>

                <td className="px-6 py-4 text-xs">
                  <select
                    value={task.status}
                    onChange={(event) =>
                      handleStatusChange(
                        task,
                        event.target.value as
                          "pending" | "in_progress" | "completed"
                      )
                    }
                    className={`rounded-full border-0 px-3 py-1.5 text-xs font-medium outline-none ${
                      task.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : task.status === "in_progress"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    <option value="pending">Pending</option>

                    <option value="in_progress">In Progress</option>

                    <option value="completed">Completed</option>
                  </select>
                </td>

                <td className="max-w-sm px-6 py-4">
                  {task.project &&
                    (() => {
                      const projectType = (
                        task.project as unknown as {
                          project_type: "internal" | "client";
                        }
                      ).project_type;

                      return (
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            projectType === "internal"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {projectType === "internal" ? "Internal" : "Client"}
                        </span>
                      );
                    })()}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                      task.priority === "high"
                        ? "bg-red-100 text-red-700"
                        : task.priority === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {task.priority}
                  </span>
                </td>

                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(task.created_at).toLocaleDateString()}
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <ViewSubmissionModal
                      title="Task Details"
                      data={{
                        ...task,
                        project_id: task.project?.id ?? null,
                        project_name: task.project?.name ?? "No Project",
                        project_code:
                          task.project?.project_code ?? "Not available",
                        project_type:
                          (
                            task.project as unknown as {
                              project_type?: "internal" | "client";
                            }
                          )?.project_type ?? "Not available",
                      }}
                      preferredOrder={[
                        "title",
                        "description",
                        "project_name",
                        "project_code",
                        "project_type",
                        "status",
                        "priority",
                        "due_date",
                        "created_at",
                      ]}
                      hiddenFields={[
                        "id",
                        "staff_id",
                        "project",
                        "project_id",
                        "completed_at",
                        "updated_at",
                      ]}
                      showDeveloperTools={true}
                    />

                    <a
                      href={`/admin/tasks/${task.id}/edit`}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      title="Edit task"
                    >
                      <Pencil size={17} />
                    </a>

                    <button
                      onClick={() => handleDelete(task)}
                      disabled={deletingId === task.id}
                      className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                      title="Delete task"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!paginatedTasks.length && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No tasks match your search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-3">
          <span>
            Showing {processedTasks.length ? startIndex + 1 : 0} to{" "}
            {Math.min(endIndex, processedTasks.length)} of{" "}
            {processedTasks.length}
          </span>

          <select
            value={rowsPerPage}
            onChange={handleRowsPerPageChange}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          >
            <option value={10}>10</option>

            <option value={25}>25</option>

            <option value={50}>50</option>

            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            className="rounded-lg border border-slate-300 px-4 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <span className="px-3">
            Page {currentPage} of {Math.max(totalPages, 1)}
          </span>

          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            className="rounded-lg border border-slate-300 px-4 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
