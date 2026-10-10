import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  completeStudentLesson,
  getStudentLessonProgress,
} from "../../lib/academy";

interface StudentLessonControlsProps {
  enrollmentId: string;
  lessonId: string;
  previousLessonUrl: string | null;
  nextLessonUrl: string | null;
}

/**
 * Provide interactive lesson completion and navigation controls.
 */
export default function StudentLessonControls({
  enrollmentId,
  lessonId,
  previousLessonUrl,
  nextLessonUrl,
}: StudentLessonControlsProps) {
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /**
   * Load the student's existing lesson progress.
   */
  useEffect(() => {
    async function loadProgress() {
      try {
        const progress = await getStudentLessonProgress(enrollmentId, lessonId);

        setCompleted(progress?.status === "completed");
      } catch (error) {
        console.error("Failed to load lesson progress:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadProgress();
  }, [enrollmentId, lessonId]);

  /**
   * Mark the current lesson as completed.
   */
  /**
   * Mark the current lesson as completed and show the result through Toastify.
   */
  async function handleComplete() {
    if (saving || completed) {
      return;
    }

    setSaving(true);

    try {
      await completeStudentLesson(enrollmentId, lessonId);

      setCompleted(true);

      toast.success("Lesson completed successfully.", {
        autoClose: 2500,
      });
    } catch (error) {
      // Log the complete error for development diagnostics.
      console.error("Failed to complete lesson:", error);

      // Display the actual user-safe error through Toastify.
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to complete this lesson.",
        {
          autoClose: 5000,
        }
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * Navigate to the previous lesson when one exists.
   */
  function handlePrevious() {
    if (previousLessonUrl) {
      window.location.href = previousLessonUrl;
    }
  }

  /**
   * Navigate to the next lesson when one exists.
   */
  function handleNext() {
    if (nextLessonUrl) {
      window.location.href = nextLessonUrl;
    }
  }

  return (
    <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={!previousLessonUrl}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous Lesson
        </button>

        <button
          type="button"
          onClick={() => {
            void handleComplete();
          }}
          disabled={loading || saving || completed}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : completed ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Lesson Completed
            </>
          ) : (
            <>
              Mark Complete
              <CheckCircle2 className="h-4 w-4" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!nextLessonUrl}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Next Lesson
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
