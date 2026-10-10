import { ArrowRight, BookOpen, CheckCircle2, Clock3 } from "lucide-react";

import { useEffect, useState } from "react";

import {
  getStudentCourseProgress,
  type StudentCourseProgressSummary,
} from "../../lib/academy";

/**
 * Displays the authenticated student's course-level learning progress.
 */
export default function StudentProgress() {
  // Store the authoritative course progress returned by the Academy service.
  const [courses, setCourses] = useState<StudentCourseProgressSummary[]>([]);

  // Track the initial course-progress loading state.
  const [loading, setLoading] = useState(true);

  // Store a readable error when course progress cannot be loaded.
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Loads the authenticated student's course progress.
   */
  useEffect(() => {
    async function loadProgress() {
      // Enable the loading state before requesting course progress.
      setLoading(true);

      // Clear any previous error before starting a new request.
      setErrorMessage("");

      try {
        // Load progress through the centralized Academy progress service.
        const result = await getStudentCourseProgress();

        // Store the authoritative course summaries.
        setCourses(result);
      } catch (error) {
        // Log the technical error for development diagnostics.
        console.error("Failed to load student course progress:", error);

        // Display a readable message to the student.
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "We could not load your course progress."
        );
      } finally {
        // End the loading state regardless of the request result.
        setLoading(false);
      }
    }

    void loadProgress();
  }, []);

  // Display responsive loading placeholders while course progress loads.
  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
      </div>
    );
  }

  // Display a readable error when course progress could not be loaded.
  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
        {errorMessage}
      </div>
    );
  }

  // Display an empty state when the student has no enrolled courses.
  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <BookOpen className="mx-auto h-10 w-10 text-slate-400" />

        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
          No courses yet
        </h2>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Your enrolled courses and learning progress will appear here.
        </p>

        <a
          href="/academy"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Explore Academy
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {courses.map((course) => {
        // Determine whether this course has reached full completion.
        const isCompleted =
          course.status === "completed" || course.progressPercent >= 100;

        return (
          <article
            key={course.enrollmentId}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex-1 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>

                {isCompleted ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                    <Clock3 className="h-3.5 w-3.5" />
                    In Progress
                  </span>
                )}
              </div>

              <h2 className="mt-5 line-clamp-2 text-lg font-bold leading-6 text-slate-900 dark:text-white">
                {course.title}
              </h2>

              <div className="mt-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    Course Progress
                  </span>

                  <span className="font-bold text-slate-900 dark:text-white">
                    {course.progressPercent}%
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{
                      width: `${course.progressPercent}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {course.completedLessons} of {course.totalLessons} lessons
                  completed
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 p-4 dark:border-slate-800">
              <a
                href={`/student/courses/${course.slug}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Go to Course
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
