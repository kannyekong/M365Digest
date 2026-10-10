import { ClipboardCheck, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  getStudentEnrollmentForProgram,
  getStudentLessonQuiz,
} from "../../lib/academy";
import type { AcademyQuiz, StudentQuizResult } from "../../types/academy";
import StudentQuizPlayer from "./StudentQuizPlayer";

interface StudentLessonAssessmentProps {
  programId: string;
  moduleId: string;
  lessonId: string;
}

/**
 * Loads and displays the quiz attached to the current lesson.
 */
export default function StudentLessonAssessment({
  programId,
  moduleId,
  lessonId,
}: StudentLessonAssessmentProps) {
  const [quiz, setQuiz] = useState<AcademyQuiz | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads the authenticated student's enrollment and the published
   * quiz attached to the current lesson.
   */
  async function loadAssessment() {
    setLoading(true);
    setError(null);

    try {
      const enrollment = await getStudentEnrollmentForProgram(programId);

      if (!enrollment) {
        setQuiz(null);
        setEnrollmentId(null);
        setError("You are not enrolled in this course.");
        return;
      }

      const lessonQuiz = await getStudentLessonQuiz(programId, lessonId);

      setEnrollmentId(enrollment.id);
      setQuiz(lessonQuiz);
    } catch (loadError) {
      console.error("Failed to load lesson assessment:", loadError);

      setQuiz(null);
      setEnrollmentId(null);
      setError("We could not load the assessment for this lesson.");

      toast.error("Unable to load the lesson assessment.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Loads the lesson assessment whenever the current lesson or
   * Academy program changes.
   */
  useEffect(() => {
    void loadAssessment();
  }, [programId, lessonId]);

  /**
   * Handles successful quiz completion.
   */
  function handleQuizComplete(result: StudentQuizResult) {
    if (result.passed) {
      toast.success("Assessment passed.");
    }
  }

  /**
   * Handles the student's request to proceed after passing the assessment.
   */
  function handleProceed(result: StudentQuizResult) {
    if (!result.passed || !enrollmentId) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("academy:quiz-passed", {
        detail: {
          programId,
          moduleId,
          lessonId,
          enrollmentId,
          result,
        },
      })
    );
  }

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Loading assessment...
          </p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {error}
        </p>
      </section>
    );
  }

  if (!quiz || !enrollmentId) {
    return null;
  }

  return (
    <section className="mt-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
          <ClipboardCheck className="h-5 w-5" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-500">
            Knowledge Check
          </p>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Lesson Assessment
          </h2>
        </div>
      </div>

      <StudentQuizPlayer
        quizId={quiz.id}
        enrollmentId={enrollmentId}
        onComplete={handleQuizComplete}
        onProceed={handleProceed}
      />
    </section>
  );
}