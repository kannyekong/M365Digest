import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Save,
} from "lucide-react";
import {
  getProjectById,
  updateProject,
} from "../../../lib/server/projects";
import { listClientOptions } from "../../../lib/client";
import type { ClientOption } from "../../../types/client";
import type {
  ProjectInput,
  ProjectStatus,
  ProjectType,
} from "../../../types/project";

interface EditProjectFormProps {
  projectId: string;
}

const initialFormValues: ProjectInput = {
  name: "",
  description: "",
  project_type: "internal",
  client_id: "",
  client_name: "",
  status: "planning",
  start_date: "",
  due_date: "",
};

/**
 * Displays and updates the details of one existing project.
 */
export default function EditProjectForm({
  projectId,
}: EditProjectFormProps) {
  const [form, setForm] =
    useState<ProjectInput>(
      initialFormValues
    );

  const [clients, setClients] =
    useState<ClientOption[]>([]);

  const [
    loadingClients,
    setLoadingClients,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  /**
   * Loads the existing project and populates the form.
   */
  useEffect(() => {
    async function loadProject() {
      setLoading(true);

      try {
        const project =
          await getProjectById(
            projectId
          );

        setForm({
          name:
            project.name ?? "",

          client_id:
            project.client_id ?? "",

          description:
            project.description ?? "",

          project_type:
            project.project_type,

          client_name:
            project.client_name ?? "",

          status:
            project.status,

          start_date:
            project.start_date ?? "",

          due_date:
            project.due_date ?? "",
        });
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "The project could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadProject();
  }, [projectId]);

  /**
   * Loads active Clients for the Client project select field.
   */
  useEffect(() => {
    async function loadClients() {
      setLoadingClients(true);

      try {
        const clientOptions =
          await listClientOptions();

        setClients(clientOptions);
      } catch (error) {
        console.error(
          "Failed to load Client options:",
          error
        );

        toast.error(
          "Clients could not be loaded."
        );

        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    }

    void loadClients();
  }, []);

  /**
   * Updates one project field while preserving all other values.
   */
  const updateField = <
    Key extends keyof ProjectInput,
  >(
    field: Key,
    value: ProjectInput[Key]
  ) => {
    setForm(
      (currentForm) => ({
        ...currentForm,
        [field]: value,
      })
    );
  };

  /**
   * Changes the project type and clears Client values for internal projects.
   */
  const handleProjectTypeChange = (
    projectType: ProjectType
  ) => {
    setForm(
      (currentForm) => ({
        ...currentForm,

        project_type:
          projectType,

        client_id:
          projectType === "internal"
            ? ""
            : currentForm.client_id,

        client_name:
          projectType === "internal"
            ? ""
            : currentForm.client_name,
      })
    );
  };

  /**
   * Updates both the Client UUID and readable Client name.
   */
  const handleClientChange = (
    clientId: string
  ) => {
    const selectedClient =
      clients.find(
        (client) =>
          client.id === clientId
      );

    setForm(
      (currentForm) => ({
        ...currentForm,

        client_id:
          clientId,

        client_name:
          selectedClient?.display_name ??
          "",
      })
    );
  };

  /**
   * Validates and saves the updated project.
   */
  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error(
        "Enter a project name."
      );

      return;
    }

    if (
      form.project_type ===
        "client" &&
      !form.client_id
    ) {
      toast.error(
        "Select a Client."
      );

      return;
    }

    if (
      form.start_date &&
      form.due_date &&
      form.due_date <
        form.start_date
    ) {
      toast.error(
        "The due date cannot be earlier than the start date."
      );

      return;
    }

    setSaving(true);

    try {
      const projectInput: ProjectInput =
        {
          ...form,

          name:
            form.name.trim(),

          description:
            form.description.trim(),

          client_id:
            form.project_type ===
            "client"
              ? form.client_id
              : "",

          client_name:
            form.project_type ===
            "client"
              ? form.client_name.trim()
              : "",
        };

      await updateProject(
        projectId,
        projectInput
      );

      toast.success(
        "Project updated successfully."
      );

      window.location.href =
        "/admin/projects";
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The project could not be updated."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
        {loadError}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-full p-4 sm:p-5 lg:p-6">
      <a
        href="/admin/projects"
        className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </a>

      <form
        onSubmit={handleSubmit}
        className="mt-6 overflow-hidden rounded-3xl border border-box-border bg-box-bg/70 shadow-sm backdrop-blur-xl"
      >
        <div className="border-b border-box-border p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl font-bold text-heading">
            Edit Project
          </h1>

          <p className="mt-2 text-sm text-text-muted">
            Update the project details,
            dates, type, Client, or
            current status.
          </p>
        </div>

        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <div>
            <label
              htmlFor="project-name"
              className="mb-2 block text-sm font-semibold text-heading"
            >
              Project name
            </label>

            <input
              id="project-name"
              type="text"
              value={form.name}
              onChange={(event) =>
                updateField(
                  "name",
                  event.target.value
                )
              }
              required
              className="w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-heading">
              Project type
            </legend>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-2xl border p-4 transition sm:p-5 ${
                  form.project_type ===
                  "internal"
                    ? "border-primary bg-primary/10"
                    : "border-box-border bg-body hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="project_type"
                  checked={
                    form.project_type ===
                    "internal"
                  }
                  onChange={() =>
                    handleProjectTypeChange(
                      "internal"
                    )
                  }
                  className="sr-only"
                />

                <span className="font-semibold text-heading">
                  Internal project
                </span>

                <span className="mt-2 block text-sm text-text-muted">
                  Work created for
                  CloudTweak operations or
                  growth.
                </span>
              </label>

              <label
                className={`cursor-pointer rounded-2xl border p-4 transition sm:p-5 ${
                  form.project_type ===
                  "client"
                    ? "border-primary bg-primary/10"
                    : "border-box-border bg-body hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="project_type"
                  checked={
                    form.project_type ===
                    "client"
                  }
                  onChange={() =>
                    handleProjectTypeChange(
                      "client"
                    )
                  }
                  className="sr-only"
                />

                <span className="font-semibold text-heading">
                  Client project
                </span>

                <span className="mt-2 block text-sm text-text-muted">
                  An external contract or
                  customer engagement.
                </span>
              </label>
            </div>
          </fieldset>

          {form.project_type ===
            "client" && (
            <div>
              <label
                htmlFor="client-id"
                className="mb-2 block text-sm font-semibold text-heading"
              >
                Client
              </label>

              <select
                id="client-id"
                value={form.client_id}
                onChange={(event) =>
                  handleClientChange(
                    event.target.value
                  )
                }
                disabled={
                  loadingClients
                }
                required
                className="w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {loadingClients
                    ? "Loading Clients..."
                    : clients.length === 0
                      ? "No active Clients available"
                      : "Select a Client"}
                </option>

                {clients.map(
                  (client) => (
                    <option
                      key={client.id}
                      value={client.id}
                    >
                      {
                        client.client_code
                      }{" "}
                      —{" "}
                      {
                        client.display_name
                      }
                    </option>
                  )
                )}
              </select>

              {form.client_id &&
                form.client_name && (
                  <p className="mt-2 text-xs text-text-muted">
                    Current Client:{" "}
                    <span className="font-semibold text-heading">
                      {form.client_name}
                    </span>
                  </p>
                )}
            </div>
          )}

          <div>
            <label
              htmlFor="project-description"
              className="mb-2 block text-sm font-semibold text-heading"
            >
              Description
            </label>

            <textarea
              id="project-description"
              value={
                form.description
              }
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value
                )
              }
              rows={5}
              className="w-full resize-y rounded-xl border border-box-border bg-body px-4 py-3 text-sm leading-7 text-heading outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label
                htmlFor="project-status"
                className="mb-2 block text-sm font-semibold text-heading"
              >
                Status
              </label>

              <select
                id="project-status"
                value={form.status}
                onChange={(event) =>
                  updateField(
                    "status",
                    event.target
                      .value as ProjectStatus
                  )
                }
                className="w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading outline-none transition focus:border-primary"
              >
                <option value="planning">
                  Planning
                </option>

                <option value="active">
                  Active
                </option>

                <option value="on_hold">
                  On hold
                </option>

                <option value="completed">
                  Completed
                </option>

                <option value="archived">
                  Archived
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="project-start-date"
                className="mb-2 block text-sm font-semibold text-heading"
              >
                Start date
              </label>

              <input
                id="project-start-date"
                type="date"
                value={
                  form.start_date
                }
                onChange={(event) =>
                  updateField(
                    "start_date",
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading outline-none transition focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="project-due-date"
                className="mb-2 block text-sm font-semibold text-heading"
              >
                Due date
              </label>

              <input
                id="project-due-date"
                type="date"
                min={
                  form.start_date ||
                  undefined
                }
                value={
                  form.due_date
                }
                onChange={(event) =>
                  updateField(
                    "due_date",
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading outline-none transition focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-box-border bg-body/40 p-4 sm:flex-row sm:justify-end sm:p-6 lg:p-8">
          <a
            href="/admin/projects"
            className="inline-flex items-center justify-center rounded-xl border border-box-border px-5 py-3 text-sm font-semibold text-heading transition hover:border-primary/40 hover:text-primary"
          >
            Cancel
          </a>

          <button
            type="submit"
            disabled={
              saving ||
              loadingClients
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}