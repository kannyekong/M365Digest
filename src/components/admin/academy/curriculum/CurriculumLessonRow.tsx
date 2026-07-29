import {
  Check,
  FileText,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  LoaderCircle,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AcademyLesson } from "../../../../types/academy";

type AcademyLessonType =
  "lesson" | "lab" | "project" | "assessment" | "resource";

interface CurriculumLessonRowProps {
  lesson: AcademyLesson;
  deleting: boolean;
  saving: boolean;
  onUpdate: (
    lessonId: string,
    updates: {
      title: string;
      description: string | null;
      lesson_type: AcademyLessonType;
      duration: string | null;
    }
  ) => Promise<void>;
  onDelete: (lesson: AcademyLesson) => Promise<void>;
}

/**
 * Return the icon associated with a curriculum lesson type.
 */
function getLessonTypeIcon(lessonType: AcademyLessonType) {
  const iconClassName = "h-4 w-4";

  switch (lessonType) {
    case "lab":
      return <FlaskConical className={iconClassName} />;

    case "project":
      return <FolderOpen className={iconClassName} />;

    case "assessment":
      return <GraduationCap className={iconClassName} />;

    case "resource":
      return <FileText className={iconClassName} />;

    default:
      return <FileText className={iconClassName} />;
  }
}

/**
 * Convert a lesson type into a readable label.
 */
function formatLessonType(lessonType: AcademyLessonType) {
  return lessonType
    .split("_")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Display one curriculum lesson with inline editing controls.
 */
export default function CurriculumLessonRow({
  lesson,
  deleting,
  saving,
  onUpdate,
  onDelete,
}: CurriculumLessonRowProps) {
  // Track whether the lesson is currently being edited.
  const [editing, setEditing] = useState(false);

  // Store the editable lesson title.
  const [title, setTitle] = useState(lesson.title);

  // Store the editable lesson description.
  const [description, setDescription] = useState(lesson.description ?? "");

  // Store the editable lesson type.
  const [lessonType, setLessonType] = useState<AcademyLessonType>(
    lesson.lesson_type
  );

  // Store the editable lesson duration.
  const [duration, setDuration] = useState(lesson.duration ?? "");

  // Keep local values synchronized after a parent update.
  useEffect(() => {
    setTitle(lesson.title);
    setDescription(lesson.description ?? "");
    setLessonType(lesson.lesson_type);
    setDuration(lesson.duration ?? "");
  }, [lesson]);

  /**
   * Reset the editor and leave edit mode.
   */
  function handleCancel() {
    setTitle(lesson.title);
    setDescription(lesson.description ?? "");
    setLessonType(lesson.lesson_type);
    setDuration(lesson.duration ?? "");
    setEditing(false);
  }

  /**
   * Validate and save the edited lesson.
   */
  async function handleSave() {
    // Prevent saving when the title is empty or a request is active.
    if (!title.trim() || saving) {
      return;
    }

    // Send the normalized lesson values to the parent component.
    await onUpdate(lesson.id, {
      title: title.trim(),
      description: description.trim() || null,
      lesson_type: lessonType,
      duration: duration.trim() || null,
    });

    // Exit edit mode after the update completes.
    setEditing(false);
  }

  // Display the inline lesson editor.
  if (editing) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor={`lesson-title-${lesson.id}`}
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Lesson title
            </label>

            <input
              id={`lesson-title-${lesson.id}`}
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              disabled={saving}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor={`lesson-type-${lesson.id}`}
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Lesson type
            </label>

            <select
              id={`lesson-type-${lesson.id}`}
              value={lessonType}
              onChange={(event) => {
                setLessonType(event.target.value as AcademyLessonType);
              }}
              disabled={saving}
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
              htmlFor={`lesson-duration-${lesson.id}`}
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Duration
            </label>

            <input
              id={`lesson-duration-${lesson.id}`}
              type="text"
              value={duration}
              onChange={(event) => {
                setDuration(event.target.value);
              }}
              placeholder="Example: 45 minutes"
              disabled={saving}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor={`lesson-description-${lesson.id}`}
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Description
            </label>

            <textarea
              id={`lesson-description-${lesson.id}`}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              rows={3}
              disabled={saving}
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={saving || !title.trim()}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}

            {saving ? "Saving..." : "Save lesson"}
          </button>
        </div>
      </div>
    );
  }

  // Display the saved lesson row.
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {getLessonTypeIcon(lesson.lesson_type)}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-slate-950">{lesson.title}</h4>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {formatLessonType(lesson.lesson_type)}
            </span>

            {lesson.duration ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {lesson.duration}
              </span>
            ) : null}
          </div>

          {lesson.description ? (
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {lesson.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setEditing(true);
          }}
          disabled={deleting || saving}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>

        <button
          type="button"
          onClick={() => {
            void onDelete(lesson);
          }}
          disabled={deleting || saving}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete
        </button>
      </div>
    </article>
  );
}
