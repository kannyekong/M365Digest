import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AcademyLesson, AcademyModule } from "../../../../types/academy";
import CurriculumLessonRow from "./CurriculumLessonRow";

type AcademyLessonType =
  "lesson" | "lab" | "project" | "assessment" | "resource";

interface ModuleUpdateValues {
  title: string;
  description: string | null;
  module_number: number;
  duration: string | null;
  display_order: number;
  is_preview: boolean;
}

interface LessonCreateValues {
  module_id: string;
  title: string;
  description: string | null;
  lesson_type: AcademyLessonType;
  duration: string | null;
  display_order: number;
}

interface LessonUpdateValues {
  title: string;
  description: string | null;
  lesson_type: AcademyLessonType;
  duration: string | null;
}

interface CurriculumModuleCardProps {
  module: AcademyModule;
  lessons: AcademyLesson[];
  savingModule: boolean;
  deletingModule: boolean;
  creatingLesson: boolean;
  savingLessonId: string | null;
  deletingLessonId: string | null;
  onUpdateModule: (
    moduleId: string,
    updates: ModuleUpdateValues
  ) => Promise<void>;
  onDeleteModule: (module: AcademyModule) => Promise<void>;
  onCreateLesson: (values: LessonCreateValues) => Promise<void>;
  onUpdateLesson: (
    lessonId: string,
    updates: LessonUpdateValues
  ) => Promise<void>;
  onDeleteLesson: (lesson: AcademyLesson) => Promise<void>;
}

/**
 * Display one curriculum module, its lessons, and its editing controls.
 */
export default function CurriculumModuleCard({
  module,
  lessons,
  savingModule,
  deletingModule,
  creatingLesson,
  savingLessonId,
  deletingLessonId,
  onUpdateModule,
  onDeleteModule,
  onCreateLesson,
  onUpdateLesson,
  onDeleteLesson,
}: CurriculumModuleCardProps) {
  // Track whether the module details are being edited.
  const [editingModule, setEditingModule] = useState(false);

  // Track whether the module lesson list is expanded.
  const [expanded, setExpanded] = useState(true);

  // Track whether the new-lesson form is visible.
  const [addingLesson, setAddingLesson] = useState(false);

  // Store editable module values.
  const [moduleTitle, setModuleTitle] = useState(module.title);
  const [moduleDescription, setModuleDescription] = useState(
    module.description ?? ""
  );
  const [moduleNumber, setModuleNumber] = useState(module.module_number);
  const [moduleDuration, setModuleDuration] = useState(module.duration ?? "");
  const [moduleDisplayOrder, setModuleDisplayOrder] = useState(
    module.display_order
  );
  const [moduleIsPreview, setModuleIsPreview] = useState(module.is_preview);

  // Store values used to create a new lesson.
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonType, setLessonType] = useState<AcademyLessonType>("lesson");
  const [lessonDuration, setLessonDuration] = useState("");

  // Keep local module values synchronized after a parent update.
  useEffect(() => {
    setModuleTitle(module.title);
    setModuleDescription(module.description ?? "");
    setModuleNumber(module.module_number);
    setModuleDuration(module.duration ?? "");
    setModuleDisplayOrder(module.display_order);
    setModuleIsPreview(module.is_preview);
  }, [module]);

  /**
   * Reset the module editor to the latest saved values.
   */
  function handleCancelModuleEdit() {
    setModuleTitle(module.title);
    setModuleDescription(module.description ?? "");
    setModuleNumber(module.module_number);
    setModuleDuration(module.duration ?? "");
    setModuleDisplayOrder(module.display_order);
    setModuleIsPreview(module.is_preview);
    setEditingModule(false);
  }

  /**
   * Validate and save the edited module.
   */
  async function handleSaveModule() {
    // Prevent saving a module without a title.
    if (!moduleTitle.trim() || savingModule) {
      return;
    }

    // Send the normalized module values to the parent builder.
    await onUpdateModule(module.id, {
      title: moduleTitle.trim(),
      description: moduleDescription.trim() || null,
      module_number: Math.max(1, moduleNumber),
      duration: moduleDuration.trim() || null,
      display_order: Math.max(0, moduleDisplayOrder),
      is_preview: moduleIsPreview,
    });

    // Exit edit mode after the parent request completes.
    setEditingModule(false);
  }

  /**
   * Reset the new-lesson form.
   */
  function resetLessonForm() {
    setLessonTitle("");
    setLessonDescription("");
    setLessonType("lesson");
    setLessonDuration("");
    setAddingLesson(false);
  }

  /**
   * Validate and create a new lesson in this module.
   */
  async function handleCreateLesson() {
    // Prevent creating a lesson without a title.
    if (!lessonTitle.trim() || creatingLesson) {
      return;
    }

    // Determine the new lesson's order from the existing lesson count.
    const nextDisplayOrder =
      lessons.length > 0
        ? Math.max(...lessons.map((lesson) => lesson.display_order)) + 1
        : 0;

    // Send the normalized lesson values to the parent builder.
    await onCreateLesson({
      module_id: module.id,
      title: lessonTitle.trim(),
      description: lessonDescription.trim() || null,
      lesson_type: lessonType,
      duration: lessonDuration.trim() || null,
      display_order: nextDisplayOrder,
    });

    // Clear and close the form after the request completes.
    resetLessonForm();

    // Keep the lesson list visible after creating a lesson.
    setExpanded(true);
  }

  // Display the module editor.
  if (editingModule) {
    return (
      <article className="rounded-3xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor={`module-title-${module.id}`}
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Module title
            </label>

            <input
              id={`module-title-${module.id}`}
              type="text"
              value={moduleTitle}
              onChange={(event) => {
                setModuleTitle(event.target.value);
              }}
              disabled={savingModule}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor={`module-number-${module.id}`}
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Module number
            </label>

            <input
              id={`module-number-${module.id}`}
              type="number"
              min="1"
              value={moduleNumber}
              onChange={(event) => {
                setModuleNumber(Number(event.target.value) || 1);
              }}
              disabled={savingModule}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor={`module-order-${module.id}`}
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Display order
            </label>

            <input
              id={`module-order-${module.id}`}
              type="number"
              min="0"
              value={moduleDisplayOrder}
              onChange={(event) => {
                setModuleDisplayOrder(Number(event.target.value) || 0);
              }}
              disabled={savingModule}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor={`module-duration-${module.id}`}
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Duration
            </label>

            <input
              id={`module-duration-${module.id}`}
              type="text"
              value={moduleDuration}
              onChange={(event) => {
                setModuleDuration(event.target.value);
              }}
              placeholder="Example: 1 week"
              disabled={savingModule}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor={`module-description-${module.id}`}
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Description
            </label>

            <textarea
              id={`module-description-${module.id}`}
              value={moduleDescription}
              onChange={(event) => {
                setModuleDescription(event.target.value);
              }}
              rows={4}
              disabled={savingModule}
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2">
            <input
              type="checkbox"
              checked={moduleIsPreview}
              onChange={(event) => {
                setModuleIsPreview(event.target.checked);
              }}
              disabled={savingModule}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />

            <span>
              <span className="block text-sm font-semibold text-slate-800">
                Public preview
              </span>

              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Allow visitors to preview this module before registering.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={handleCancelModuleEdit}
            disabled={savingModule}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              void handleSaveModule();
            }}
            disabled={savingModule || !moduleTitle.trim()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingModule ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}

            {savingModule ? "Saving..." : "Save module"}
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Module {module.module_number}
              </p>

              {module.is_preview ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  <Eye className="h-3 w-3" />
                  Preview
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  <EyeOff className="h-3 w-3" />
                  Private
                </span>
              )}

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
              </span>
            </div>

            <h2 className="mt-2 text-xl font-bold text-slate-950">
              {module.title}
            </h2>

            {module.description ? (
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {module.description}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
              {module.duration ? (
                <span>Duration: {module.duration}</span>
              ) : null}

              <span>Order: {module.display_order}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingModule(true);
            }}
            disabled={deletingModule || savingModule}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>

          <button
            type="button"
            onClick={() => {
              void onDeleteModule(module);
            }}
            disabled={deletingModule || savingModule}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deletingModule ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </button>

          <button
            type="button"
            onClick={() => {
              setExpanded((currentValue) => !currentValue);
            }}
            aria-label={
              expanded ? `Collapse ${module.title}` : `Expand ${module.title}`
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-50"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      {expanded ? (
        <div className="p-5">
          <div className="space-y-3">
            {lessons.length > 0 ? (
              lessons.map((lesson) => (
                <CurriculumLessonRow
                  key={lesson.id}
                  lesson={lesson}
                  saving={savingLessonId === lesson.id}
                  deleting={deletingLessonId === lesson.id}
                  onUpdate={onUpdateLesson}
                  onDelete={onDeleteLesson}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <BookOpen className="mx-auto h-7 w-7 text-slate-400" />

                <h3 className="mt-3 font-semibold text-slate-800">
                  No lessons yet
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Add the first lesson, lab, project, assessment, or resource to
                  this module.
                </p>
              </div>
            )}
          </div>

          {addingLesson ? (
            <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label
                    htmlFor={`new-lesson-title-${module.id}`}
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Lesson title
                  </label>

                  <input
                    id={`new-lesson-title-${module.id}`}
                    type="text"
                    value={lessonTitle}
                    onChange={(event) => {
                      setLessonTitle(event.target.value);
                    }}
                    placeholder="Introduction to Microsoft 365"
                    disabled={creatingLesson}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`new-lesson-type-${module.id}`}
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Lesson type
                  </label>

                  <select
                    id={`new-lesson-type-${module.id}`}
                    value={lessonType}
                    onChange={(event) => {
                      setLessonType(event.target.value as AcademyLessonType);
                    }}
                    disabled={creatingLesson}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="lesson">Lesson</option>
                    <option value="lab">Lab</option>
                    <option value="project">Project</option>
                    <option value="assessment">Assessment</option>
                    <option value="resource">Resource</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`new-lesson-duration-${module.id}`}
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Duration
                  </label>

                  <input
                    id={`new-lesson-duration-${module.id}`}
                    type="text"
                    value={lessonDuration}
                    onChange={(event) => {
                      setLessonDuration(event.target.value);
                    }}
                    placeholder="Example: 45 minutes"
                    disabled={creatingLesson}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor={`new-lesson-description-${module.id}`}
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Description
                  </label>

                  <textarea
                    id={`new-lesson-description-${module.id}`}
                    value={lessonDescription}
                    onChange={(event) => {
                      setLessonDescription(event.target.value);
                    }}
                    rows={3}
                    disabled={creatingLesson}
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={resetLessonForm}
                  disabled={creatingLesson}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleCreateLesson();
                  }}
                  disabled={creatingLesson || !lessonTitle.trim()}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingLesson ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}

                  {creatingLesson ? "Adding lesson..." : "Add lesson"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAddingLesson(true);
              }}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 px-4 text-sm font-semibold text-primary transition hover:bg-primary/5"
            >
              <Plus className="h-4 w-4" />
              Add lesson
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}
