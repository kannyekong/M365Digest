import { ArrowLeft, BookOpen, LoaderCircle, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  createAcademyLesson,
  createAcademyModule,
  deleteAcademyLesson,
  deleteAcademyModule,
  getAcademyModuleLessons,
  getAcademyProgramById,
  getAcademyProgramModules,
  updateAcademyLesson,
  updateAcademyModule,
} from "../../../../lib/academy";
import type {
  AcademyLesson,
  AcademyModule,
  AcademyProgram,
} from "../../../../types/academy";
import CurriculumModuleCard from "./CurriculumModuleCard";

type AcademyLessonType =
  "lesson" | "lab" | "project" | "assessment" | "resource";

interface AcademyCurriculumBuilderProps {
  programId: string;
}

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

interface NewModuleFormState {
  title: string;
  description: string;
  duration: string;
  is_preview: boolean;
}

const DEFAULT_MODULE_FORM: NewModuleFormState = {
  title: "",
  description: "",
  duration: "",
  is_preview: false,
};

/**
 * Display and manage the curriculum belonging to one Academy program.
 */
export default function AcademyCurriculumBuilder({
  programId,
}: AcademyCurriculumBuilderProps) {
  // Store the Academy program being managed.
  const [program, setProgram] = useState<AcademyProgram | null>(null);

  // Store all curriculum modules belonging to the program.
  const [modules, setModules] = useState<AcademyModule[]>([]);

  // Store lessons grouped by their parent module ID.
  const [lessonsByModule, setLessonsByModule] = useState<
    Record<string, AcademyLesson[]>
  >({});

  // Track whether the curriculum is loading.
  const [loading, setLoading] = useState(true);

  // Store a user-facing loading error.
  const [errorMessage, setErrorMessage] = useState("");

  // Track whether the new-module form is visible.
  const [addingModule, setAddingModule] = useState(false);

  // Store the values used to create a new module.
  const [newModuleForm, setNewModuleForm] =
    useState<NewModuleFormState>(DEFAULT_MODULE_FORM);

  // Track whether a module is currently being created.
  const [creatingModule, setCreatingModule] = useState(false);

  // Store the ID of the module currently being updated.
  const [savingModuleId, setSavingModuleId] = useState<string | null>(null);

  // Store the ID of the module currently being deleted.
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);

  // Store the ID of the module currently receiving a new lesson.
  const [creatingLessonModuleId, setCreatingLessonModuleId] = useState<
    string | null
  >(null);

  // Store the ID of the lesson currently being updated.
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null);

  // Store the ID of the lesson currently being deleted.
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);

  /**
   * Sort curriculum modules using display order and module number.
   */
  function sortModules(records: AcademyModule[]) {
    return [...records].sort((firstModule, secondModule) => {
      // Prioritize the explicitly configured display order.
      if (firstModule.display_order !== secondModule.display_order) {
        return firstModule.display_order - secondModule.display_order;
      }

      // Use the module number when display orders are equal.
      return firstModule.module_number - secondModule.module_number;
    });
  }

  /**
   * Sort lessons using display order and creation date.
   */
  function sortLessons(records: AcademyLesson[]) {
    return [...records].sort((firstLesson, secondLesson) => {
      // Prioritize the explicitly configured display order.
      if (firstLesson.display_order !== secondLesson.display_order) {
        return firstLesson.display_order - secondLesson.display_order;
      }

      // Use creation time as the secondary ordering value.
      return (
        new Date(firstLesson.created_at).getTime() -
        new Date(secondLesson.created_at).getTime()
      );
    });
  }

  /**
   * Load the program, modules, and lessons from Supabase.
   */
  const loadCurriculum = useCallback(async () => {
    // Start loading and clear the previous request error.
    setLoading(true);
    setErrorMessage("");

    try {
      // Load the selected program and its curriculum modules.
      const [programRecord, moduleRecords] = await Promise.all([
        getAcademyProgramById(programId),
        getAcademyProgramModules(programId),
      ]);

      // Sort the returned module records.
      const sortedModules = sortModules(moduleRecords);

      // Retrieve the lessons belonging to every module.
      const lessonResults = await Promise.all(
        sortedModules.map(async (module) => {
          const lessons = await getAcademyModuleLessons(module.id);

          return {
            moduleId: module.id,
            lessons: sortLessons(lessons),
          };
        })
      );

      // Convert the lesson results into a module-based lookup object.
      const groupedLessons = lessonResults.reduce<
        Record<string, AcademyLesson[]>
      >((lessonGroups, result) => {
        lessonGroups[result.moduleId] = result.lessons;

        return lessonGroups;
      }, {});

      // Store the loaded program and curriculum records.
      setProgram(programRecord);
      setModules(sortedModules);
      setLessonsByModule(groupedLessons);
    } catch (error) {
      // Log the complete loading error for debugging.
      console.error("Failed to load Academy curriculum:", error);

      // Display a safe loading error.
      setErrorMessage("The Academy curriculum could not be loaded.");
    } finally {
      // End the loading state after every request completes.
      setLoading(false);
    }
  }, [programId]);

  // Load the curriculum after the React island hydrates.
  useEffect(() => {
    void loadCurriculum();
  }, [loadCurriculum]);

  // Calculate the total number of lessons in the curriculum.
  const totalLessons = useMemo(() => {
    return Object.values(lessonsByModule).reduce(
      (total, lessons) => total + lessons.length,
      0
    );
  }, [lessonsByModule]);

  /**
   * Update one field in the new-module form.
   */
  function updateNewModuleField<Key extends keyof NewModuleFormState>(
    field: Key,
    value: NewModuleFormState[Key]
  ) {
    setNewModuleForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  /**
   * Reset and close the new-module form.
   */
  function resetNewModuleForm() {
    setNewModuleForm(DEFAULT_MODULE_FORM);
    setAddingModule(false);
  }

  /**
   * Create a new curriculum module.
   */
  async function handleCreateModule() {
    // Prevent creating a module without a title.
    if (!newModuleForm.title.trim() || creatingModule) {
      return;
    }

    // Calculate the next available module number.
    const nextModuleNumber =
      modules.length > 0
        ? Math.max(
            ...modules.map((curriculumModule) => curriculumModule.module_number)
          ) + 1
        : 1;

    // Calculate the next available display order.
    const nextDisplayOrder =
      modules.length > 0
        ? Math.max(
            ...modules.map((curriculumModule) => curriculumModule.display_order)
          ) + 1
        : 0;

    // Start the module creation state.
    setCreatingModule(true);

    try {
      // Create the curriculum module in Supabase.
      const createdModule = await createAcademyModule({
        program_id: programId,
        title: newModuleForm.title.trim(),
        description: newModuleForm.description.trim() || null,
        module_number: nextModuleNumber,
        duration: newModuleForm.duration.trim() || null,
        display_order: nextDisplayOrder,
        is_preview: newModuleForm.is_preview,
      });

      // Add the created module to local state.
      setModules((currentModules) =>
        sortModules([...currentModules, createdModule])
      );

      // Create an empty lesson collection for the new module.
      setLessonsByModule((currentLessons) => ({
        ...currentLessons,
        [createdModule.id]: [],
      }));

      // Confirm the successful creation.
      toast.success(`${createdModule.title} has been added.`);

      // Clear and close the module form.
      resetNewModuleForm();
    } catch (error) {
      // Log the complete creation error for debugging.
      console.error("Failed to create curriculum module:", error);

      // Display a safe creation error.
      toast.error("The curriculum module could not be created.");
    } finally {
      // End the module creation state.
      setCreatingModule(false);
    }
  }

  /**
   * Update an existing curriculum module.
   */
  async function handleUpdateModule(
    moduleId: string,
    updates: ModuleUpdateValues
  ) {
    // Prevent overlapping module update requests.
    if (savingModuleId) {
      return;
    }

    // Store the module currently being updated.
    setSavingModuleId(moduleId);

    try {
      // Update the selected module in Supabase.
      const updatedModule = await updateAcademyModule(moduleId, updates);

      // Replace and re-sort the updated module locally.
      setModules((currentModules) =>
        sortModules(
          currentModules.map((curriculumModule) =>
            curriculumModule.id === updatedModule.id
              ? updatedModule
              : curriculumModule
          )
        )
      );

      // Confirm the successful update.
      toast.success(`${updatedModule.title} has been updated.`);
    } catch (error) {
      // Log the complete update error for debugging.
      console.error("Failed to update curriculum module:", error);

      // Display a safe update error.
      toast.error("The curriculum module could not be updated.");
    } finally {
      // Clear the active module update state.
      setSavingModuleId(null);
    }
  }

  /**
   * Delete a curriculum module and all of its lessons.
   */
  async function handleDeleteModule(curriculumModule: AcademyModule) {
    // Prevent overlapping module deletion requests.
    if (deletingModuleId) {
      return;
    }

    // Ask the administrator to confirm the destructive action.
    const confirmed = window.confirm(
      `Delete "${curriculumModule.title}" and all of its lessons? This action cannot be undone.`
    );

    // Stop when the administrator cancels.
    if (!confirmed) {
      return;
    }

    // Store the module currently being deleted.
    setDeletingModuleId(curriculumModule.id);

    try {
      // Delete the module from Supabase.
      await deleteAcademyModule(curriculumModule.id);

      // Remove the deleted module from local state.
      setModules((currentModules) =>
        currentModules.filter(
          (currentModule) => currentModule.id !== curriculumModule.id
        )
      );

      // Remove the deleted module's lesson collection.
      setLessonsByModule((currentLessons) => {
        const updatedLessons = {
          ...currentLessons,
        };

        delete updatedLessons[curriculumModule.id];

        return updatedLessons;
      });

      // Confirm the successful deletion.
      toast.success(`${curriculumModule.title} has been deleted.`);
    } catch (error) {
      // Log the complete deletion error for debugging.
      console.error("Failed to delete curriculum module:", error);

      // Display a safe deletion error.
      toast.error("The curriculum module could not be deleted.");
    } finally {
      // Clear the active module deletion state.
      setDeletingModuleId(null);
    }
  }

  /**
   * Create a new lesson inside a curriculum module.
   */
  async function handleCreateLesson(values: LessonCreateValues) {
    // Prevent overlapping lesson creation requests.
    if (creatingLessonModuleId) {
      return;
    }

    // Store the module currently receiving a lesson.
    setCreatingLessonModuleId(values.module_id);

    try {
      // Create the new lesson in Supabase.
      const createdLesson = await createAcademyLesson(values);

      // Add and sort the created lesson locally.
      setLessonsByModule((currentLessons) => ({
        ...currentLessons,
        [values.module_id]: sortLessons([
          ...(currentLessons[values.module_id] ?? []),
          createdLesson,
        ]),
      }));

      // Confirm the successful creation.
      toast.success(`${createdLesson.title} has been added.`);
    } catch (error) {
      // Log the complete creation error for debugging.
      console.error("Failed to create curriculum lesson:", error);

      // Display a safe creation error.
      toast.error("The curriculum lesson could not be created.");
    } finally {
      // Clear the active lesson creation state.
      setCreatingLessonModuleId(null);
    }
  }

  /**
   * Update an existing curriculum lesson.
   */
  async function handleUpdateLesson(
    lessonId: string,
    updates: LessonUpdateValues
  ) {
    // Prevent overlapping lesson update requests.
    if (savingLessonId) {
      return;
    }

    // Store the lesson currently being updated.
    setSavingLessonId(lessonId);

    try {
      // Update the selected lesson in Supabase.
      const updatedLesson = await updateAcademyLesson(lessonId, updates);

      // Replace the updated lesson in its module collection.
      setLessonsByModule((currentLessons) => {
        const updatedGroups = {
          ...currentLessons,
        };

        // Find the module containing the updated lesson.
        const moduleEntry = Object.entries(updatedGroups).find(([, lessons]) =>
          lessons.some((lesson) => lesson.id === lessonId)
        );

        // Return the existing groups when no matching lesson exists.
        if (!moduleEntry) {
          return currentLessons;
        }

        const [moduleId, lessons] = moduleEntry;

        // Replace and re-sort the updated lesson.
        updatedGroups[moduleId] = sortLessons(
          lessons.map((lesson) =>
            lesson.id === updatedLesson.id ? updatedLesson : lesson
          )
        );

        return updatedGroups;
      });

      // Confirm the successful update.
      toast.success(`${updatedLesson.title} has been updated.`);
    } catch (error) {
      // Log the complete update error for debugging.
      console.error("Failed to update curriculum lesson:", error);

      // Display a safe update error.
      toast.error("The curriculum lesson could not be updated.");
    } finally {
      // Clear the active lesson update state.
      setSavingLessonId(null);
    }
  }

  /**
   * Delete an existing curriculum lesson.
   */
  async function handleDeleteLesson(lesson: AcademyLesson) {
    // Prevent overlapping lesson deletion requests.
    if (deletingLessonId) {
      return;
    }

    // Ask the administrator to confirm the destructive action.
    const confirmed = window.confirm(
      `Delete "${lesson.title}"? This action cannot be undone.`
    );

    // Stop when the administrator cancels.
    if (!confirmed) {
      return;
    }

    // Store the lesson currently being deleted.
    setDeletingLessonId(lesson.id);

    try {
      // Delete the selected lesson from Supabase.
      await deleteAcademyLesson(lesson.id);

      // Remove the deleted lesson from its module collection.
      setLessonsByModule((currentLessons) => {
        const updatedGroups: Record<string, AcademyLesson[]> = {};

        // Rebuild each module's lesson collection.
        Object.entries(currentLessons).forEach(([moduleId, lessons]) => {
          updatedGroups[moduleId] = lessons.filter(
            (currentLesson) => currentLesson.id !== lesson.id
          );
        });

        return updatedGroups;
      });

      // Confirm the successful deletion.
      toast.success(`${lesson.title} has been deleted.`);
    } catch (error) {
      // Log the complete deletion error for debugging.
      console.error("Failed to delete curriculum lesson:", error);

      // Display a safe deletion error.
      toast.error("The curriculum lesson could not be deleted.");
    } finally {
      // Clear the active lesson deletion state.
      setDeletingLessonId(null);
    }
  }

  // Display the initial loading state.
  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-primary" />

          <p className="mt-3 text-sm text-slate-500">Loading curriculum...</p>
        </div>
      </div>
    );
  }

  // Display the loading error state.
  if (errorMessage || !program) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
        <p className="font-semibold text-red-700">
          {errorMessage || "The selected Academy program could not be found."}
        </p>

        <button
          type="button"
          onClick={() => {
            void loadCurriculum();
          }}
          className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <a
            href="/admin/academy/programs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to programs
          </a>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Curriculum Builder
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            {program.title}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Organize this program into modules, lessons, laboratories, projects,
            assessments, and resources.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              {modules.length} {modules.length === 1 ? "module" : "modules"}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setAddingModule(true);
          }}
          disabled={addingModule}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add module
        </button>
      </header>

      {addingModule ? (
        <section className="mb-6 rounded-3xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                New curriculum module
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Add a week, section, or learning module to the program.
              </p>
            </div>

            <button
              type="button"
              onClick={resetNewModuleForm}
              disabled={creatingModule}
              aria-label="Close new module form"
              className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="new-module-title"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Module title
              </label>

              <input
                id="new-module-title"
                type="text"
                value={newModuleForm.title}
                onChange={(event) => {
                  updateNewModuleField("title", event.target.value);
                }}
                placeholder="Week 1 — Microsoft 365 Fundamentals"
                disabled={creatingModule}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="new-module-duration"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Duration
              </label>

              <input
                id="new-module-duration"
                type="text"
                value={newModuleForm.duration}
                onChange={(event) => {
                  updateNewModuleField("duration", event.target.value);
                }}
                placeholder="Example: 1 week"
                disabled={creatingModule}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <input
                type="checkbox"
                checked={newModuleForm.is_preview}
                onChange={(event) => {
                  updateNewModuleField("is_preview", event.target.checked);
                }}
                disabled={creatingModule}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Public preview
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Allow visitors to preview this module.
                </span>
              </span>
            </label>

            <div className="md:col-span-2">
              <label
                htmlFor="new-module-description"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Description
              </label>

              <textarea
                id="new-module-description"
                value={newModuleForm.description}
                onChange={(event) => {
                  updateNewModuleField("description", event.target.value);
                }}
                rows={4}
                disabled={creatingModule}
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={resetNewModuleForm}
              disabled={creatingModule}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {
                void handleCreateModule();
              }}
              disabled={creatingModule || !newModuleForm.title.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingModule ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}

              {creatingModule ? "Creating module..." : "Create module"}
            </button>
          </div>
        </section>
      ) : null}

      {modules.length > 0 ? (
        <div className="space-y-6">
          {modules.map((curriculumModule) => (
            <CurriculumModuleCard
              key={curriculumModule.id}
              module={curriculumModule}
              lessons={lessonsByModule[curriculumModule.id] ?? []}
              savingModule={savingModuleId === curriculumModule.id}
              deletingModule={deletingModuleId === curriculumModule.id}
              creatingLesson={creatingLessonModuleId === curriculumModule.id}
              savingLessonId={savingLessonId}
              deletingLessonId={deletingLessonId}
              onUpdateModule={handleUpdateModule}
              onDeleteModule={handleDeleteModule}
              onCreateLesson={handleCreateLesson}
              onUpdateLesson={handleUpdateLesson}
              onDeleteLesson={handleDeleteLesson}
            />
          ))}
        </div>
      ) : (
        <section className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <BookOpen className="h-7 w-7" />
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-950">
            No curriculum modules yet
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Add your first module, then organize its lessons, labs, projects,
            assessments, and resources.
          </p>

          <button
            type="button"
            onClick={() => {
              setAddingModule(true);
            }}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add first module
          </button>
        </section>
      )}
    </div>
  );
}
