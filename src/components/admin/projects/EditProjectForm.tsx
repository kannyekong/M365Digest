import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { getProjectById, updateProject } from "../../../lib/server/projects";
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
  client_name: "",
  status: "planning",
  start_date: "",
  due_date: "",
};

/* Displays and updates the details of one existing project. */
export default function EditProjectForm({ projectId }: EditProjectFormProps) {
  // Store the editable project values.
  const [form, setForm] = useState<ProjectInput>(initialFormValues);

  // Track whether the existing project is being loaded.
  const [loading, setLoading] = useState(true);

  // Track whether the updated project is being saved.
  const [saving, setSaving] = useState(false);

  // Store any project loading error.
  const [loadError, setLoadError] = useState("");

  /* Loads the existing project and populates the form. */
  useEffect(() => {
    async function loadProject() {
      // Enable the project loading state.
      setLoading(true);

      try {
        // Retrieve the project using the existing service.
        const project = await getProjectById(projectId);

        // Populate the form with the existing database values.
        setForm({
          name: project.name ?? "",
          description: project.description ?? "",
          project_type: project.project_type,
          client_name: project.client_name ?? "",
          status: project.status,
          start_date: project.start_date ?? "",
          due_date: project.due_date ?? "",
        });
      } catch (error) {
        // Store a readable error when the project cannot be loaded.
        setLoadError(
          error instanceof Error
            ? error.message
            : "The project could not be loaded."
        );
      } finally {
        // Disable the project loading state.
        setLoading(false);
      }
    }

    void loadProject();
  }, [projectId]);

  /* Updates one project field while preserving all other values. */
  const updateField = <Key extends keyof ProjectInput>(
    field: Key,
    value: ProjectInput[Key]
  ) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  /* Changes the project type and clears an irrelevant client name. */
  const handleProjectTypeChange = (projectType: ProjectType) => {
    setForm((currentForm) => ({
      ...currentForm,
      project_type: projectType,
      client_name: projectType === "internal" ? "" : currentForm.client_name,
    }));
  };

  /* Validates and saves the updated project. */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // Prevent the browser from submitting the form normally.
    event.preventDefault();

    // Reject an empty project name.
    if (!form.name.trim()) {
      toast.error("Enter a project name.");
      return;
    }

    // Require a client name for external client projects.
    if (form.project_type === "client" && !form.client_name.trim()) {
      toast.error("Enter the client name.");
      return;
    }

    // Reject a due date that occurs before the start date.
    if (form.start_date && form.due_date && form.due_date < form.start_date) {
      toast.error("The due date cannot be earlier than the start date.");
      return;
    }

    // Enable the saving state while the update runs.
    setSaving(true);

    try {
      // Update the project using the existing project service.
      await updateProject(projectId, form);

      // Inform the administrator that the update succeeded.
      toast.success("Project updated successfully.");

      // Return the administrator to the Projects page.
      window.location.href = "/admin/projects";
    } catch (error) {
      // Display the database error when the update fails.
      toast.error(
        error instanceof Error
          ? error.message
          : "The project could not be updated."
      );
    } finally {
      // Restore the save button after the request finishes.
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
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-600">
        {loadError}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-full p-5">
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
        <div className="border-b border-box-border p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-heading">Edit Project</h1>

          <p className="mt-2 text-sm text-text-muted">
            Update the project details, dates, type, or current status.
          </p>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
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
              onChange={(event) => updateField("name", event.target.value)}
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
                className={`cursor-pointer rounded-2xl border p-5 transition ${
                  form.project_type === "internal"
                    ? "border-primary bg-primary/10"
                    : "border-box-border bg-body hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="project_type"
                  checked={form.project_type === "internal"}
                  onChange={() => handleProjectTypeChange("internal")}
                  className="sr-only"
                />

                <span className="font-semibold text-heading">
                  Internal project
                </span>

                <span className="mt-2 block text-sm text-text-muted">
                  Work created for CloudTweak operations or growth.
                </span>
              </label>

              <label
                className={`cursor-pointer rounded-2xl border p-5 transition ${
                  form.project_type === "client"
                    ? "border-primary bg-primary/10"
                    : "border-box-border bg-body hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="project_type"
                  checked={form.project_type === "client"}
                  onChange={() => handleProjectTypeChange("client")}
                  className="sr-only"
                />

                <span className="font-semibold text-heading">
                  Client project
                </span>

                <span className="mt-2 block text-sm text-text-muted">
                  An external contract or customer engagement.
                </span>
              </label>
            </div>
          </fieldset>

          {form.project_type === "client" && (
            <div>
              <label
                htmlFor="client-name"
                className="mb-2 block text-sm font-semibold text-heading"
              >
                Client name
              </label>

              <input
                id="client-name"
                type="text"
                value={form.client_name}
                onChange={(event) =>
                  updateField("client_name", event.target.value)
                }
                required
                className="w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
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
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
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
                  updateField("status", event.target.value as ProjectStatus)
                }
                className="w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading outline-none transition focus:border-primary"
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
                className="mb-2 block text-sm font-semibold text-heading"
              >
                Start date
              </label>

              <input
                id="project-start-date"
                type="date"
                value={form.start_date}
                onChange={(event) =>
                  updateField("start_date", event.target.value)
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
                min={form.start_date || undefined}
                value={form.due_date}
                onChange={(event) =>
                  updateField("due_date", event.target.value)
                }
                className="w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading outline-none transition focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-box-border bg-body/40 p-6 sm:flex-row sm:justify-end sm:p-8">
          <a
            href="/admin/projects"
            className="inline-flex items-center justify-center rounded-xl border border-box-border px-5 py-3 text-sm font-semibold text-heading transition hover:border-primary/40 hover:text-primary"
          >
            Cancel
          </a>

          <button
            type="submit"
            disabled={saving}
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
