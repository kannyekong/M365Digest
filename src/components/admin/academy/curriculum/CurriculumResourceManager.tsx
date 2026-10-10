import {
  Check,
  ClipboardCheck,
  FileText,
  FlaskConical,
  Link2,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import {
  createAcademyResource,
  deleteAcademyResource,
  getAcademyLessonResources,
  getAcademyLessonQuizzes,
  getAcademyModuleQuizzes,
  updateAcademyQuiz,
  updateAcademyResource,
} from "../../../../lib/academy";

import QuizBuilder from "../../../../islands/QuizBuilder";

import type {
  AcademyResource,
  AcademyResourceInput,
  AcademyResourceProvider,
  AcademyResourceType,
  AcademyQuiz,
} from "../../../../types/academy";

interface CurriculumResourceManagerProps {
  programId: string;
  moduleId: string;
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
}

interface ResourceFormState {
  title: string;
  description: string;
  resource_type: AcademyResourceType;
  provider: AcademyResourceProvider;
  external_url: string;
  storage_path: string;
  thumbnail_url: string;
  file_name: string;
  mime_type: string;
  file_size: string;
  duration_seconds: string;
  is_required: boolean;
  is_published: boolean;
  available_from: string;
  available_until: string;
  display_order: string;
}

const DEFAULT_FORM: ResourceFormState = {
  title: "",
  description: "",
  resource_type: "video",
  provider: "youtube",
  external_url: "",
  storage_path: "",
  thumbnail_url: "",
  file_name: "",
  mime_type: "",
  file_size: "",
  duration_seconds: "",
  is_required: false,
  is_published: true,
  available_from: "",
  available_until: "",
  display_order: "0",
};

/**
 * Returns the icon associated with a resource type.
 */
function getResourceIcon(resourceType: AcademyResourceType) {
  switch (resourceType) {
    case "video":
      return <Video className="h-4 w-4" />;

    case "pdf":
      return <FileText className="h-4 w-4" />;

    case "document":
      return <FileText className="h-4 w-4" />;

    case "spreadsheet":
      return <FileText className="h-4 w-4" />;

    case "zip":
      return <FlaskConical className="h-4 w-4" />;

    case "link":
      return <Link2 className="h-4 w-4" />;

    default:
      return <FileText className="h-4 w-4" />;
  }
}

/**
 * Converts a resource type into a readable label.
 */
function formatResourceType(resourceType: AcademyResourceType) {
  return resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
}

/**
 * Converts a provider value into a readable label.
 */
function formatProvider(provider: AcademyResourceProvider | null) {
  if (!provider) {
    return "External";
  }

  switch (provider) {
    case "sharepoint":
      return "SharePoint";

    case "onedrive":
      return "OneDrive";

    case "youtube":
      return "YouTube";

    case "vimeo":
      return "Vimeo";

    case "supabase_storage":
      return "Supabase Storage";

    case "external":
      return "External";

    default:
      return provider;
  }
}

/**
 * Converts an ISO timestamp into a datetime-local input value.
 */
function formatDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

/**
 * Converts a datetime-local value into an ISO timestamp.
 */
function toIsoDateTime(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

/**
 * Displays and manages resources attached to one curriculum lesson.
 */
export default function CurriculumResourceManager({
  programId,
  moduleId,
  lessonId,
  lessonTitle,
  onClose,
}: CurriculumResourceManagerProps) {
  const [resources, setResources] = useState<AcademyResource[]>([]);
  const [quizzes, setQuizzes] = useState<AcademyQuiz[]>([]);
  const [moduleQuizzes, setModuleQuizzes] = useState<AcademyQuiz[]>([]);
  const [movingQuizId, setMovingQuizId] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<AcademyQuiz | null>(null);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editingResource, setEditingResource] =
    useState<AcademyResource | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ResourceFormState>(DEFAULT_FORM);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Load all resources attached to the current lesson.
   */
  async function loadResources() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [records, quizRecords, moduleQuizRecords] = await Promise.all([
        getAcademyLessonResources(lessonId),
        getAcademyLessonQuizzes(lessonId),
        getAcademyModuleQuizzes(moduleId),
      ]);
      setResources(records);
      setQuizzes(quizRecords);
      setModuleQuizzes(moduleQuizRecords.filter((quiz) => !quiz.lesson_id));
    } catch (error) {
      console.error("Failed to load lesson resources:", error);
      setErrorMessage("The lesson resources could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadResources();
  }, [lessonId]);

  /** Open the quiz builder to create a quiz for this lesson. */
  function handleAddQuiz() { setEditingQuiz(null); setShowQuizBuilder(true); }

  /** Keep the lesson quiz list synchronized after saving a quiz. */
  function handleQuizSaved(quiz: AcademyQuiz) {
    setQuizzes((current) => current.some((item) => item.id === quiz.id) ? current.map((item) => item.id === quiz.id ? quiz : item) : [...current, quiz].sort((a, b) => a.display_order - b.display_order));
    setEditingQuiz(quiz);
    toast.success("Lesson quiz saved.");
  }

  /** Reattach an existing module quiz to this lesson without recreating its record or attempts. */
  async function handleMoveModuleQuiz(quiz: AcademyQuiz) {
    if (movingQuizId) return;
    setMovingQuizId(quiz.id);
    try {
      const updated = await updateAcademyQuiz(quiz.id, { module_id: null, lesson_id: lessonId });
      setModuleQuizzes((current) => current.filter((item) => item.id !== quiz.id));
      setQuizzes((current) => [...current, updated].sort((a, b) => a.display_order - b.display_order));
      toast.success("Quiz moved to this lesson. Existing attempts were preserved.");
    } catch (error) {
      console.error("Failed to move module quiz to lesson:", error);
      toast.error(error instanceof Error ? error.message : "Unable to move this quiz to the lesson.");
    } finally {
      setMovingQuizId(null);
    }
  }

  /** Remove a quiz from the local list after confirmed deletion. */
  function handleQuizDeleted() {
    if (editingQuiz) setQuizzes((current) => current.filter((quiz) => quiz.id !== editingQuiz.id));
    setEditingQuiz(null);
    setShowQuizBuilder(false);
  }

  /**
   * Update one field in the resource form.
   */
  function updateForm<Key extends keyof ResourceFormState>(
    field: Key,
    value: ResourceFormState[Key]
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  /**
   * Reset the resource form and close the editor.
   */
  function resetForm() {
    setForm(DEFAULT_FORM);
    setEditingResource(null);
    setShowForm(false);
    setErrorMessage("");
  }

  /**
   * Open the resource form for a new resource.
   */
  function handleAddResource() {
    setEditingResource(null);
    setForm({
      ...DEFAULT_FORM,
      display_order: String(resources.length),
    });
    setErrorMessage("");
    setShowForm(true);
  }

  /**
   * Open the resource form for an existing resource.
   */
  function handleEditResource(resource: AcademyResource) {
    setEditingResource(resource);

    setForm({
      title: resource.title,
      description: resource.description ?? "",
      resource_type: resource.resource_type,
      provider: resource.provider ?? "external",
      external_url: resource.external_url ?? "",
      storage_path: resource.storage_path ?? "",
      thumbnail_url: resource.thumbnail_url ?? "",
      file_name: resource.file_name ?? "",
      mime_type: resource.mime_type ?? "",
      file_size: resource.file_size === null ? "" : String(resource.file_size),
      duration_seconds:
        resource.duration_seconds === null
          ? ""
          : String(resource.duration_seconds),
      is_required: resource.is_required,
      is_published: resource.is_published,
      available_from: formatDateTimeLocal(resource.available_from),
      available_until: formatDateTimeLocal(resource.available_until),
      display_order: String(resource.display_order),
    });

    setErrorMessage("");
    setShowForm(true);
  }

  /**
   * Validate and save a resource.
   */
  async function handleSaveResource() {
    if (!form.title.trim() || saving) {
      return;
    }

    const hasExternalUrl = Boolean(form.external_url.trim());
    const hasStoragePath = Boolean(form.storage_path.trim());

    if (!hasExternalUrl && !hasStoragePath) {
      setErrorMessage("Add a resource URL or storage path before saving.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const payload: AcademyResourceInput = {
      lesson_id: lessonId,

      title: form.title.trim(),
      description: form.description.trim() || null,

      resource_type: form.resource_type,
      provider: form.provider,

      external_url: form.external_url.trim() || null,
      storage_path: form.storage_path.trim() || null,

      thumbnail_url: form.thumbnail_url.trim() || null,

      mime_type: form.mime_type.trim() || null,
      file_name: form.file_name.trim() || null,

      file_size: form.file_size ? Number(form.file_size) : null,

      duration_seconds: form.duration_seconds
        ? Number(form.duration_seconds)
        : null,

      is_required: form.is_required,
      is_published: form.is_published,

      available_from: toIsoDateTime(form.available_from),
      available_until: toIsoDateTime(form.available_until),

      display_order: Number(form.display_order) || 0,
    };

    try {
      if (editingResource) {
        const updated = await updateAcademyResource(
          editingResource.id,
          payload
        );

        setResources((currentResources) =>
          currentResources
            .map((resource) =>
              resource.id === updated.id ? updated : resource
            )
            .sort((first, second) => first.display_order - second.display_order)
        );
      } else {
        const created = await createAcademyResource(payload);

        setResources((currentResources) =>
          [...currentResources, created].sort(
            (first, second) => first.display_order - second.display_order
          )
        );
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save Academy resource:", error);
      setErrorMessage("The resource could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  /**
   * Delete an existing resource.
   */
  async function handleDeleteResource(resource: AcademyResource) {
    if (deletingId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${resource.title}"? This resource will be removed from the lesson.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(resource.id);
    setErrorMessage("");

    try {
      await deleteAcademyResource(resource.id);

      setResources((currentResources) =>
        currentResources.filter(
          (currentResource) => currentResource.id !== resource.id
        )
      );

      if (editingResource?.id === resource.id) {
        resetForm();
      }
    } catch (error) {
      console.error("Failed to delete Academy resource:", error);
      setErrorMessage("The resource could not be deleted.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-start justify-between gap-5 border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Lesson Resources
            </p>

            <h2 className="mt-2 truncate text-xl font-bold text-slate-950 dark:text-white">
              {lessonTitle}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage videos, PDFs, documents, links, and supporting materials.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close resource manager"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {errorMessage ? (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {errorMessage}
            </div>
          ) : null}

          {!showForm ? (
            <div className="mb-5 flex justify-end">
              <button
                type="button"
                onClick={handleAddResource}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Add Resource
              </button>
            </div>
          ) : null}

          {showForm ? (
            <section className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 dark:border-primary/30 dark:bg-primary/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                    {editingResource ? "Edit resource" : "New resource"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Add the material students will use for this lesson.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-white dark:hover:bg-slate-800"
                  aria-label="Close resource form"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label
                    htmlFor="academy-resource-title"
                    className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Resource title
                  </label>

                  <input
                    id="academy-resource-title"
                    type="text"
                    value={form.title}
                    onChange={(event) => {
                      updateForm("title", event.target.value);
                    }}
                    disabled={saving}
                    placeholder="Example: Microsoft 365 Admin Center Walkthrough"
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="academy-resource-type"
                    className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Resource type
                  </label>

                  <select
                    id="academy-resource-type"
                    value={form.resource_type}
                    onChange={(event) => {
                      updateForm(
                        "resource_type",
                        event.target.value as AcademyResourceType
                      );
                    }}
                    disabled={saving}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="video">Video</option>
                    <option value="pdf">PDF</option>
                    <option value="document">Document</option>
                    <option value="spreadsheet">Spreadsheet</option>
                    <option value="zip">ZIP</option>
                    <option value="link">Link</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="academy-resource-provider"
                    className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Provider
                  </label>

                  <select
                    id="academy-resource-provider"
                    value={form.provider}
                    onChange={(event) => {
                      updateForm(
                        "provider",
                        event.target.value as AcademyResourceProvider
                      );
                    }}
                    disabled={saving}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="sharepoint">SharePoint</option>
                    <option value="onedrive">OneDrive</option>
                    <option value="supabase_storage">Supabase Storage</option>
                    <option value="external">External</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="academy-resource-url"
                    className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Resource URL
                  </label>

                  <input
                    id="academy-resource-url"
                    type="url"
                    value={form.external_url}
                    onChange={(event) => {
                      updateForm("external_url", event.target.value);
                    }}
                    disabled={saving}
                    placeholder="https://..."
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />

                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Use the share, embed, or public resource URL supported by
                    the selected provider.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="academy-resource-description"
                    className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Description
                  </label>

                  <textarea
                    id="academy-resource-description"
                    value={form.description}
                    onChange={(event) => {
                      updateForm("description", event.target.value);
                    }}
                    rows={3}
                    disabled={saving}
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="academy-resource-duration"
                    className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Duration (seconds)
                  </label>

                  <input
                    id="academy-resource-duration"
                    type="number"
                    min="0"
                    value={form.duration_seconds}
                    onChange={(event) => {
                      updateForm("duration_seconds", event.target.value);
                    }}
                    disabled={saving}
                    placeholder="Example: 900"
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="academy-resource-order"
                    className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Display order
                  </label>

                  <input
                    id="academy-resource-order"
                    type="number"
                    min="0"
                    value={form.display_order}
                    onChange={(event) => {
                      updateForm("display_order", event.target.value);
                    }}
                    disabled={saving}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="academy-resource-required"
                    type="checkbox"
                    checked={form.is_required}
                    onChange={(event) => {
                      updateForm("is_required", event.target.checked);
                    }}
                    disabled={saving}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />

                  <label
                    htmlFor="academy-resource-required"
                    className="text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Required for course completion
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="academy-resource-published"
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(event) => {
                      updateForm("is_published", event.target.checked);
                    }}
                    disabled={saving}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />

                  <label
                    htmlFor="academy-resource-published"
                    className="text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Published to students
                  </label>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleSaveResource();
                  }}
                  disabled={
                    saving ||
                    !form.title.trim() ||
                    (!form.external_url.trim() && !form.storage_path.trim())
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}

                  {saving ? "Saving..." : "Save Resource"}
                </button>
              </div>
            </section>
          ) : null}

          <section className="mb-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500"><ClipboardCheck className="h-5 w-5" /></div><div><h3 className="font-semibold text-slate-900 dark:text-white">Lesson quizzes</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage assessments independently from lesson resources.</p></div></div><button type="button" onClick={handleAddQuiz} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"><Plus className="h-4 w-4" /> Add quiz</button></div>
            {moduleQuizzes.length > 0 ? <div className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50/60 p-3 dark:border-amber-900/60 dark:bg-amber-950/20"><p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Existing module quizzes</p><p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-400">Move a quiz here to associate it with this lesson. Its existing quiz ID, questions, and attempt history are retained.</p><div className="mt-3 space-y-2">{moduleQuizzes.map((quiz) => <article key={quiz.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-900/50 dark:bg-slate-950"><div><p className="text-sm font-semibold text-slate-900 dark:text-white">{quiz.title}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{quiz.is_published ? "Published" : "Draft"} · {quiz.is_required ? "Required" : "Optional"}</p></div><button type="button" disabled={Boolean(movingQuizId)} onClick={() => { void handleMoveModuleQuiz(quiz); }} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-300 px-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/50">{movingQuizId === quiz.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}{movingQuizId === quiz.id ? "Moving..." : "Move to lesson"}</button></article>)}</div></div> : null}
            {quizzes.length > 0 ? <div className="mt-4 space-y-2">{quizzes.map((quiz) => <article key={quiz.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"><div className="min-w-0"><p className="font-semibold text-slate-900 dark:text-white">{quiz.title}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><span>{quiz.is_published ? "Published" : "Draft"}</span><span>•</span><span>{quiz.is_required ? "Required" : "Optional"}</span><span>•</span><span>Pass mark: {quiz.passing_score}%</span></div></div><button type="button" onClick={() => { setEditingQuiz(quiz); setShowQuizBuilder(true); }} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" /> Manage quiz</button></article>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">No quizzes attached to this lesson yet.</p>}
          </section>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : resources.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 text-center dark:border-slate-700">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>

              <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
                No resources yet
              </h3>

              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                Add a video, PDF, document, link, or other supporting material
                for this lesson.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((resource) => (
                <article
                  key={resource.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {getResourceIcon(resource.resource_type)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-slate-950 dark:text-white">
                          {resource.title}
                        </h4>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {formatResourceType(resource.resource_type)}
                        </span>

                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          {formatProvider(resource.provider)}
                        </span>

                        {resource.is_required ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                            Required
                          </span>
                        ) : null}
                      </div>

                      {resource.description ? (
                        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {resource.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleEditResource(resource);
                      }}
                      disabled={deletingId === resource.id}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void handleDeleteResource(resource);
                      }}
                      disabled={deletingId === resource.id}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      {deletingId === resource.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="flex justify-end border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </footer>
      </div>
      {showQuizBuilder ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm"><div className="max-h-[96vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"><QuizBuilder key={editingQuiz?.id ?? "new-lesson-quiz"} programId={programId} moduleId={moduleId} lessonId={lessonId} quiz={editingQuiz} onSaved={handleQuizSaved} onDeleted={handleQuizDeleted} onCancel={() => { setShowQuizBuilder(false); setEditingQuiz(null); }} /></div></div> : null}
    </div>
  );
}
