// Import the configured Supabase client used to communicate with the database.
import { supabase } from "./superbase";

// Retrieve the staff record belonging to the currently authenticated user.
export async function getMyStaffId() {
  // Get the currently logged-in Supabase Auth user.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Stop execution if the user is not authenticated or Supabase returns an error.
  if (userError || !user) {
    // Return a consistent error response to the calling function.
    return {
      data: null,
      error: userError ?? new Error("User is not authenticated."),
    };
  }

  // Find the staff record linked to the authenticated user's Auth ID.
  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  // Return the staff record ID and any Supabase error.
  return {
    data,
    error,
  };
}

// Retrieve all tasks belonging to the currently logged-in staff member.
export async function listMyTasks() {
  // Query the tasks table and return the newest tasks first.
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
  *,
  project:projects (
  id,
  project_code,
  name,
  project_type
)
`
    )
    .order("created_at", { ascending: false });

  // Return the tasks or an empty array when no tasks are found.
  return {
    data: data ?? [],
    error,
  };
}

// Create a new task for the currently logged-in staff member.
export async function addTask(payload: {
  // Define the task title.
  title: string;

  project_id?: string;

  // Define the optional task description.
  description?: string;

  // Define the allowed task statuses.
  status?: "pending" | "in_progress" | "completed";

  // Define the allowed task priorities.
  priority?: "low" | "medium" | "high";

  // Define the optional task due date.
  due_date?: string | null;
}) {
  // Retrieve the current user's linked staff record.
  const { data: staff, error: staffError } = await getMyStaffId();

  // Stop execution if the staff record cannot be found.
  if (staffError || !staff) {
    // Return a meaningful error to the calling component.
    return {
      data: null,
      error: staffError ?? new Error("Staff profile not found."),
    };
  }

  // Insert the new task into the database.
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      // Automatically assign the task to the logged-in staff member.
      staff_id: staff.id,

      // Connect the task to the selected project or leave it unassigned.
      project_id: payload.project_id || null,

      // Save the task title.
      title: payload.title,

      // Save the task description or null when not provided.
      description: payload.description ?? null,

      // Use the supplied status or default to pending.
      status: payload.status ?? "pending",

      // Use the supplied priority or default to medium.
      priority: payload.priority ?? "medium",

      // Save the due date or null when not provided.
      due_date: payload.due_date ?? null,

      // Record the completion time only when the task is created as completed.
      completed_at:
        payload.status === "completed" ? new Date().toISOString() : null,
    })

    // Return the newly created task together with its project details.
    .select(
      `
    *,
    project:projects (
      id,
      project_code,
      name
    )
  `
    )

    // Ensure exactly one task is returned.
    .single();

  // Return the newly created task and any database error.
  return {
    data,
    error,
  };
} ////////////////////////////////////////////////////////////////////////////////////////////////////////

// Update an existing task belonging to the logged-in staff member.
export async function updateTask(
  // Receive the ID of the task to update.
  id: string,

  // Define the fields that can be updated.
  payload: {
    project_id?: string | null;
    // Allow the task title to be updated.
    title?: string;

    // Allow the task description to be updated.
    description?: string;

    // Allow the task status to be updated.
    status?: "pending" | "in_progress" | "completed";

    // Allow the task priority to be updated.
    priority?: "low" | "medium" | "high";

    // Allow the task due date to be updated.
    due_date?: string | null;

    // Allow the completion date to be updated.
    completed_at?: string | null;
  }
) {
  // Update the selected task using its ID.
  const { data, error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("id", id)

    // Return the updated task from Supabase.
    .select()

    // Ensure exactly one task is returned.
    .single();

  // Return the updated task and any database error.
  return {
    data,
    error,
  };
}

// Delete a task using its unique task ID.
export async function deleteTask(id: string) {
  // Delete the selected task from the tasks table.
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  // Return any error generated during deletion.
  return {
    error,
  };
}

// Mark a task as completed and record the completion timestamp.
export async function markTaskCompleted(id: string) {
  // Update the task status and completion timestamp.
  const { data, error } = await supabase
    .from("tasks")
    .update({
      // Change the task status to completed.
      status: "completed",

      // Store the exact time the task was completed.
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)

    // Return the updated task.
    .select()

    // Ensure exactly one task is returned.
    .single();

  // Return the updated task and any error.
  return {
    data,
    error,
  };
}

// Retrieve a single task using its unique task ID.
export async function getTask(id: string) {
  // Query Supabase for the selected task.
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  // Return the task and any database error.
  return {
    data,
    error,
  };
}

// Retrieve the total number of tasks grouped by their current status.
export async function getTaskCounts() {
  // Retrieve all task statuses from the tasks table.
  const { data, error } = await supabase.from("tasks").select("status");

  // Return the database error when the query fails.
  if (error) {
    return {
      data: null,
      error,
    };
  }

  // Count all pending tasks.
  const pending = data.filter((task) => task.status === "pending").length;

  // Count all in-progress tasks.
  const in_progress = data.filter(
    (task) => task.status === "in_progress"
  ).length;

  // Count all completed tasks.
  const completed = data.filter((task) => task.status === "completed").length;

  // Return the task counts grouped by status.
  return {
    data: {
      pending,
      in_progress,
      completed,
    },
    error: null,
  };
}
