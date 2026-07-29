/* Represents the statuses currently used by the Tasks module. */
export type TaskStatus = "pending" | "in_progress" | "completed";

/* Represents the available task priority levels. */
export type TaskPriority = "low" | "medium" | "high" | "critical";

/* Represents the project information returned with a task. */
export interface TaskProject {
  id: string;
  project_code: string;
  name: string;
}

/* Represents the fields used when calculating project progress. */
export interface TaskSummary {
  id: string;
  status: TaskStatus;
}

/* Represents a complete task from the tasks table. */
export interface Task {
  id: string;
  staff_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  project?: TaskProject | null;
}

/* Represents values submitted by the create and edit task forms. */
export interface TaskInput {
  project_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
}
