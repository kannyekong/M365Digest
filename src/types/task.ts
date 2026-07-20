// This interface describes the complete task structure used across the dashboard.
export interface Task {
  // Unique task identifier.
  id: string;

  // Task title displayed to the user.
  title: string;

  // Optional task description.
  description: string | null;

  // Current task status.
  status: "pending" | "in_progress" | "completed";

  // Current task priority.
  priority: "low" | "medium" | "high";

  // Optional task due date.
  due_date: string | null;

  // Date and time the task was created.
  created_at: string;

  // Optional completion date.
  completed_at?: string | null;
}
