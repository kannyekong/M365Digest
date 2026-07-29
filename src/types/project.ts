export type ProjectStatus =
  "planning" | "active" | "on_hold" | "completed" | "archived";

export type ProjectType = "internal" | "client";

/* Represents one project stored in the projects table. */
export interface Project {
  id: string;
  project_code: string;
  name: string;
  description: string | null;
  project_type: ProjectType;
  client_name: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  created_by_staff_id: string;
  created_at: string;
  updated_at: string;
}

/* Represents the task statistics displayed on each project card. */
export interface ProjectTaskStats {
  total_tasks: number;
  completed_tasks: number;
  progress: number;
}

/* Combines the project record with its calculated task statistics. */
export interface ProjectWithTaskStats extends Project, ProjectTaskStats {}

/* Represents the values submitted by the create and edit project forms. */
export interface ProjectInput {
  name: string;
  description: string;
  project_type: ProjectType;
  client_name: string;
  status: ProjectStatus;
  start_date: string;
  due_date: string;
}

/* Represents the project fields required by dropdown selectors. */
export interface ProjectOption {
  id: string;
  project_code: string;
  name: string;
  status: ProjectStatus;
  project_type: ProjectType;
}
