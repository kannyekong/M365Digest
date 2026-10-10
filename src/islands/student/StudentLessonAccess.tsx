import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { getStudentEnrollmentForProgram } from "../../lib/academy";
import StudentLessonControls from "./StudentLessonControls";
import StudentResourceViewer from "./StudentResourceViewer";

interface StudentLessonAccessProps {
  programId: string;
  lessonId: string;
  programSlug: string;
  previousLessonUrl: string | null;
  nextLessonUrl: string | null;
}

/**
 * Resolves the authenticated student's enrollment and renders the
 * interactive lesson experience once access has been established.
 */
export default function StudentLessonAccess({
  programId,
  lessonId,
  programSlug,
  previousLessonUrl,
  nextLessonUrl,
}: StudentLessonAccessProps) {
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Resolve the student's enrollment for the current Academy program.
   */
  useEffect(() => {
    let redirectTimer: number | undefined;

    async function loadEnrollment() {
      try {
        // Resolve the authenticated student's enrollment.
        const enrollment = await getStudentEnrollmentForProgram(programId);

        // Handle an authenticated student who does not have access to the course.
        if (!enrollment) {
          toast.error("You are not enrolled in this course.");

          redirectTimer = window.setTimeout(() => {
            window.location.href = `/student/courses/${programSlug}`;
          }, 1800);

          return;
        }

        // Store the authorized enrollment ID for the child islands.
        setEnrollmentId(enrollment.id);
      } catch (error) {
        // Log the technical error for development diagnostics.
        console.error("Failed to resolve student course access:", error);

        // Convert the authentication/access error into a student-friendly toast.
        const message =
          error instanceof Error
            ? error.message
            : "We could not verify your course access.";

        toast.error(message);

        // Redirect unauthenticated students to the student login page.
        if (
          message.toLowerCase().includes("signed in") ||
          message.toLowerCase().includes("authenticated")
        ) {
          redirectTimer = window.setTimeout(() => {
            window.location.href = `/student/login?redirect=${encodeURIComponent(
              `/student/courses/${programSlug}/lessons/${lessonId}`
            )}`;
          }, 1800);
        }
      } finally {
        setLoading(false);
      }
    }

    void loadEnrollment();

    return () => {
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [programId, lessonId, programSlug]);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={4500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />

      {loading ? (
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Verifying course access...
          </div>
        </div>
      ) : null}

      {enrollmentId ? (
        <div className="space-y-6">
          <StudentLessonControls
            enrollmentId={enrollmentId}
            lessonId={lessonId}
            previousLessonUrl={previousLessonUrl}
            nextLessonUrl={nextLessonUrl}
          />

          <StudentResourceViewer
            lessonId={lessonId}
            enrollmentId={enrollmentId}
          />
        </div>
      ) : null}
    </>
  );
}
