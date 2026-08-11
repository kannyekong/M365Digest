import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CalendarDays, Loader2, Save } from "lucide-react";
import { createProject } from "../../../lib/server/projects";
import { listClientOptions } from "../../../lib/client";
import type { ClientOption } from "../../../types/client";

import type {
  ProjectInput,
  ProjectStatus,
  ProjectType,
} from "../../../types/project";

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
 * Validates the project form before it is submitted.
 */
const validateProject = (values: ProjectInput): string | null => {
  if (!values.name.trim()) {
    return "Enter a project name.";
  }

  if (values.project_type === "client" && !values.client_id) {
    return "Select a client for this project.";
  }

  if (
    values.start_date &&
    values.due_date &&
    values.due_date < values.start_date
  ) {
    return "The due date cannot be earlier than the start date.";
  }

  return null;
};

/**
 * Displays the form used to create a new CloudTweak project.
 */
export default function ProjectForm() {
  const [formValues, setFormValues] = useState<ProjectInput>(initialFormValues);

  const [clients, setClients] = useState<ClientOption[]>([]);

  const [loadingClients, setLoadingClients] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Loads active Clients for the Client project select field.
   */
  useEffect(() => {
    async function loadClients() {
      setLoadingClients(true);

      try {
        const clientOptions = await listClientOptions();

        setClients(clientOptions);
      } catch (error) {
        console.error("Failed to load Client options:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Clients could not be loaded."
        );

        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    }

    void loadClients();
  }, []);

  /**
   * Updates a single project form field without replacing other values.
   */
  const updateField = <Key extends keyof ProjectInput>(
    field: Key,
    value: ProjectInput[Key]
  ) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  /**
   * Changes the project type and clears Client data for internal projects.
   */
  const handleProjectTypeChange = (projectType: ProjectType) => {
    setFormValues((currentValues) => ({
      ...currentValues,

      project_type: projectType,

      client_id: projectType === "internal" ? "" : currentValues.client_id,

      client_name: projectType === "internal" ? "" : currentValues.client_name,
    }));

    setErrorMessage("");
  };

  /**
   * Updates both the Client UUID and readable Client name.
   */
  const handleClientChange = (clientId: string) => {
    const selectedClient = clients.find((client) => client.id === clientId);

    setFormValues((currentValues) => ({
      ...currentValues,

      client_id: clientId,

      client_name: selectedClient?.display_name ?? "",
    }));

    setErrorMessage("");
  };

  /**
   * Validates and creates the project before returning to the Projects page.
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateProject(formValues);

    if (validationError) {
      setErrorMessage(validationError);

      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const projectInput: ProjectInput = {
        ...formValues,

        name: formValues.name.trim(),

        description: formValues.description.trim(),

        client_id:
          formValues.project_type === "client" ? formValues.client_id : "",

        client_name:
          formValues.project_type === "client"
            ? formValues.client_name.trim()
            : "",
      };

      await createProject(projectInput);

      window.location.href = "/admin/projects/";
    } catch (error) {
      console.error("Failed to create project:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not create the project."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-full p-4 sm:p-6 lg:p-10">
      <div className="mb-8">
        <a
          href="/admin/projects"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </a>

        <div className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight text-heading">
            Create Project
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-text-muted">
            Add an internal initiative or client engagement and begin organizing
            its tasks, deadlines, and progress.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-3xl border border-box-border bg-box-bg/70 shadow-sm backdrop-blur-xl"
      >
        <div className="border-b border-box-border p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl font-semibold text-heading">
            Project information
          </h2>

          <p className="mt-2 text-sm text-text-muted">
            Enter the basic details used to identify and organize this project.
          </p>
        </div>

        <div className="space-y-8 p-4 sm:p-6 lg:p-8">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
            >
              {errorMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="project-name"
              className="text-sm font-semibold text-heading"
            >
              Project name
              <span className="ml-1 text-red-500">*</span>
            </label>

            <input
              id="project-name"
              type="text"
              value={formValues.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Microsoft 365 migration"
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-heading">
              Project type
              <span className="ml-1 text-red-500">*</span>
            </legend>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-2xl border p-4 transition sm:p-5 ${
                  formValues.project_type === "internal"
                    ? "border-primary bg-primary/10"
                    : "border-box-border bg-body hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="project_type"
                  value="internal"
                  checked={formValues.project_type === "internal"}
                  onChange={() => handleProjectTypeChange("internal")}
                  className="sr-only"
                />

                <span className="block font-semibold text-heading">
                  Internal project
                </span>

                <span className="mt-2 block text-sm leading-6 text-text-muted">
                  CloudTweak operations, product development, training,
                  marketing, or administration.
                </span>
              </label>

              <label
                className={`cursor-pointer rounded-2xl border p-4 transition sm:p-5 ${
                  formValues.project_type === "client"
                    ? "border-primary bg-primary/10"
                    : "border-box-border bg-body hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="project_type"
                  value="client"
                  checked={formValues.project_type === "client"}
                  onChange={() => handleProjectTypeChange("client")}
                  className="sr-only"
                />

                <span className="block font-semibold text-heading">
                  Client project
                </span>

                <span className="mt-2 block text-sm leading-6 text-text-muted">
                  A contract or engagement being delivered for an external
                  organization.
                </span>
              </label>
            </div>
          </fieldset>

          {formValues.project_type === "client" && (
            <div>
              <label
                htmlFor="client-id"
                className="text-sm font-semibold text-heading"
              >
                Client
                <span className="ml-1 text-red-500">*</span>
              </label>

              <select
                id="client-id"
                value={formValues.client_id}
                onChange={(event) => handleClientChange(event.target.value)}
                disabled={loadingClients}
                className="mt-2 w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {loadingClients
                    ? "Loading Clients..."
                    : clients.length === 0
                      ? "No active Clients available"
                      : "Select a Client"}
                </option>

                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.client_code} — {client.display_name}
                  </option>
                ))}
              </select>

              {!loadingClients && clients.length === 0 && (
                <p className="mt-2 text-xs leading-5 text-text-muted">
                  Create or activate a Client before assigning this project.
                </p>
              )}

              {formValues.client_id && formValues.client_name && (
                <p className="mt-2 text-xs text-text-muted">
                  Selected Client:{" "}
                  <span className="font-semibold text-heading">
                    {formValues.client_name}
                  </span>
                </p>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="project-description"
              className="text-sm font-semibold text-heading"
            >
              Description
            </label>

            <textarea
              id="project-description"
              value={formValues.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Describe the project objectives, deliverables, and expected outcome..."
              rows={5}
              className="mt-2 w-full resize-y rounded-xl border border-box-border bg-body px-4 py-3 text-sm leading-7 text-heading outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label
                htmlFor="project-status"
                className="text-sm font-semibold text-heading"
              >
                Status
              </label>

              <select
                id="project-status"
                value={formValues.status}
                onChange={(event) =>
                  updateField("status", event.target.value as ProjectStatus)
                }
                className="mt-2 w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="planning">Planning</option>

                <option value="active">Active</option>

                <option value="on_hold">On hold</option>

                <option value="completed">Completed</option>

                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="project-start-date"
                className="text-sm font-semibold text-heading"
              >
                Start date
              </label>

              <div className="relative mt-2">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />

                <input
                  id="project-start-date"
                  type="date"
                  value={formValues.start_date}
                  onChange={(event) =>
                    updateField("start_date", event.target.value)
                  }
                  className="w-full rounded-xl border border-box-border bg-body py-3 pl-11 pr-4 text-sm text-heading outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="project-due-date"
                className="text-sm font-semibold text-heading"
              >
                Target completion date
              </label>

              <div className="relative mt-2">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />

                <input
                  id="project-due-date"
                  type="date"
                  min={formValues.start_date || undefined}
                  value={formValues.due_date}
                  onChange={(event) =>
                    updateField("due_date", event.target.value)
                  }
                  className="w-full rounded-xl border border-box-border bg-body py-3 pl-11 pr-4 text-sm text-heading outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-box-border bg-body/40 p-4 sm:flex-row sm:items-center sm:justify-end sm:p-6 lg:p-8">
          <a
            href="/admin/projects"
            className="inline-flex items-center justify-center rounded-xl border border-box-border bg-body px-5 py-3 text-sm font-semibold text-heading transition hover:border-primary/40 hover:text-primary"
          >
            Cancel
          </a>

          <button
            type="submit"
            disabled={isSubmitting || loadingClients}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating project...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Project
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
