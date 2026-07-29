import { supabase } from "../superbase";
import type { TaskSummary } from "../../types/task";
import type {
  Project,
  ProjectInput,
  ProjectOption,
  ProjectWithTaskStats,
} from "../../types/project";

/* Retrieves non-archived projects for task form dropdowns and filters. */
export const getProjectOptions = async (): Promise<ProjectOption[]> => {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      id,
      project_code,
      name,
      status,
      project_type
    `
    )
    .neq("status", "archived")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProjectOption[];
};

/* Retrieves the staff member linked to the currently authenticated account. */
export const getCurrentStaff = async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    throw new Error("You must be signed in to perform this action.");
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("id, first_name, last_name, auth_user_id")
    .eq("auth_user_id", user.id)
    .single();

  if (staffError) {
    throw new Error(staffError.message);
  }

  return staff;
};

/* Retrieves all projects together with their related task statuses. */
export const getProjects = async (): Promise<ProjectWithTaskStats[]> => {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      tasks (
        id,
        status
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  /* Converts the related task records into project progress statistics. */
  return (data ?? []).map((project) => {
    const tasks: TaskSummary[] = Array.isArray(project.tasks)
      ? project.tasks
      : [];
    const totalTasks = tasks.length;

    const completedTasks = tasks.filter(
      (task) => task.status === "completed"
    ).length;

    const progress =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return {
      id: project.id,
      project_code: project.project_code,
      name: project.name,
      description: project.description,
      project_type: project.project_type,
      client_name: project.client_name,
      status: project.status,
      start_date: project.start_date,
      due_date: project.due_date,
      created_by_staff_id: project.created_by_staff_id,
      created_at: project.created_at,
      updated_at: project.updated_at,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      progress,
    };
  });
};

/* Retrieves one project using its UUID. */
export const getProjectById = async (projectId: string): Promise<Project> => {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Project;
};

/* Creates a new project under the authenticated staff member. */
export const createProject = async (values: ProjectInput): Promise<Project> => {
  const staff = await getCurrentStaff();

  /* Removes the client name when the project is internal. */
  const clientName =
    values.project_type === "client" ? values.client_name.trim() || null : null;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: values.name.trim(),
      description: values.description.trim() || null,
      project_type: values.project_type,
      client_name: clientName,
      status: values.status,
      start_date: values.start_date || null,
      due_date: values.due_date || null,
      created_by_staff_id: staff.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Project;
};

/* Updates an existing project with submitted form values. */
export const updateProject = async (
  projectId: string,
  values: ProjectInput
): Promise<Project> => {
  /* Removes the client name when the project is changed to internal. */
  const clientName =
    values.project_type === "client" ? values.client_name.trim() || null : null;

  const { data, error } = await supabase
    .from("projects")
    .update({
      name: values.name.trim(),
      description: values.description.trim() || null,
      project_type: values.project_type,
      client_name: clientName,
      status: values.status,
      start_date: values.start_date || null,
      due_date: values.due_date || null,
    })
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Project;
};

/* Permanently deletes a project when it does not contain protected records. */
export const deleteProject = async (projectId: string): Promise<void> => {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    throw new Error(error.message);
  }
};
