import { supabase } from "../superbase";
import type { TaskSummary } from "../../types/task";
import type {
  Project,
  ProjectInput,
  ProjectOption,
  ProjectWithTaskStats,
  ProjectWorkspace,
  ProjectWorkspaceInvoice,
  ProjectWorkspaceTask,
} from "../../types/project";

interface ResolvedProjectClient {
  clientId: string | null;
  clientName: string | null;
}

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

/* Retrieves non-archived projects linked to one Client. */
export const getProjectsForClient = async (
  clientId: string
): Promise<ProjectOption[]> => {
  if (!clientId) {
    return [];
  }

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
    .eq("client_id", clientId)
    .neq("status", "archived")
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProjectOption[];
};

/* Retrieves one Project workspace with its tasks, invoices and summary values. */
export const getProjectWorkspace = async (
  projectId: string
): Promise<ProjectWorkspace> => {
  const [projectResult, tasksResult, invoicesResult] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),

    supabase
      .from("tasks")
      .select(
        `
        id,
        title,
        status,
        priority,
        due_date
      `
      )
      .eq("project_id", projectId)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        status,
        total_amount,
        amount_paid,
        amount_due,
        currency,
        issue_date,
        due_date
      `
      )
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (projectResult.error) {
    throw new Error(projectResult.error.message);
  }

  if (!projectResult.data) {
    throw new Error("The Project could not be found.");
  }

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  if (invoicesResult.error) {
    throw new Error(invoicesResult.error.message);
  }

  const project = projectResult.data as Project;

  const tasks = (tasksResult.data ?? []) as ProjectWorkspaceTask[];

  const invoices = (invoicesResult.data ?? []) as ProjectWorkspaceInvoice[];

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  ).length;

  const taskProgress =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const totalInvoiced = invoices.reduce(
    (total, invoice) => total + Number(invoice.total_amount ?? 0),
    0
  );

  const totalPaid = invoices.reduce(
    (total, invoice) => total + Number(invoice.amount_paid ?? 0),
    0
  );

  const totalOutstanding = invoices.reduce(
    (total, invoice) => total + Number(invoice.amount_due ?? 0),
    0
  );

  const currency =
    invoices.find((invoice) => invoice.currency)?.currency ?? "NGN";

  return {
    project,

    tasks,

    invoices,

    total_tasks: totalTasks,

    completed_tasks: completedTasks,

    task_progress: taskProgress,

    total_invoiced: totalInvoiced,

    total_paid: totalPaid,

    total_outstanding: totalOutstanding,

    currency,
  };
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

/* Resolves and validates the Client selected for a Project. */
const resolveProjectClient = async (
  values: ProjectInput
): Promise<ResolvedProjectClient> => {
  if (values.project_type !== "client") {
    return {
      clientId: null,
      clientName: null,
    };
  }

  const clientId = values.client_id?.trim();

  if (!clientId) {
    throw new Error("Select a Client for this project.");
  }

  const { data: client, error } = await supabase
    .from("clients")
    .select(
      `
      id,
      display_name,
      archived_at
    `
    )
    .eq("id", clientId)
    .is("archived_at", null)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!client) {
    throw new Error("The selected Client could not be found.");
  }

  return {
    clientId: client.id,
    clientName: client.display_name,
  };
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

      client_id: project.client_id,
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

  const resolvedClient = await resolveProjectClient(values);

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: values.name.trim(),

      description: values.description.trim() || null,

      project_type: values.project_type,

      client_id: resolvedClient.clientId,

      client_name: resolvedClient.clientName,

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
  const resolvedClient = await resolveProjectClient(values);

  const { data, error } = await supabase
    .from("projects")
    .update({
      name: values.name.trim(),

      description: values.description.trim() || null,

      project_type: values.project_type,

      client_id: resolvedClient.clientId,

      client_name: resolvedClient.clientName,

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
