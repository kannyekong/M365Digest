import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  LibraryBig,
  PlayCircle,
  TrendingUp,
} from "lucide-react";

import { getSession } from "../../lib/auth";
import { supabase } from "../../lib/superbase";

type StudentProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type EnrollmentProgram = {
  id: string;
  title: string;
  slug: string;
};

type Enrollment = {
  id: string;
  status: string;
  completed_at: string | null;
  academy_programs: EnrollmentProgram | null;
};

type LessonProgress = {
  enrollment_id: string;
  lesson_id: string;
  status: "not_started" | "in_progress" | "completed";
  progress_percent: number;
  last_accessed_at: string | null;
};

type CourseSummary = {
  enrollmentId: string;
  title: string;
  slug: string;
  status: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
};

const emptyStats = {
  totalCourses: 0,
  inProgress: 0,
  completed: 0,
  overallProgress: 0,
};

export default function StudentDashboard() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressRecords, setProgressRecords] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Loads the authenticated student's profile, enrollments, and lesson progress.
  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { session },
      } = await getSession();

      if (!session) {
        window.location.replace("/student/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("student_profiles")
        .select("id, first_name, last_name")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Failed to load student profile:", profileError);
        setErrorMessage("We could not load your student profile.");
        setLoading(false);
        return;
      }

      if (!profileData) {
        window.location.replace("/student/complete-profile");
        return;
      }

      setProfile(profileData);

      // Loads the student's enrollments and their related Academy programs.
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("student_enrollments")
        .select(
          `
            id,
            status,
            completed_at,
            academy_programs (
              id,
              title,
              slug
            )
          `
        )
        .eq("student_id", profileData.id)
        .order("created_at", { ascending: false });

      if (enrollmentError) {
        console.error("Failed to load student enrollments:", enrollmentError);
        console.error("Enrollment query details:", {
          studentId: profileData.id,
          errorCode: enrollmentError.code,
          errorMessage: enrollmentError.message,
          errorDetails: enrollmentError.details,
          errorHint: enrollmentError.hint,
        });

        setErrorMessage("We could not load your courses.");
        setLoading(false);
        return;
      }

      // Converts Supabase's nested relationship result into the single Academy
      // program object expected by the dashboard.
      const normalizedEnrollments: Enrollment[] = (enrollmentData ?? []).map(
        (enrollment) => ({
          id: enrollment.id,
          status: enrollment.status,
          completed_at: enrollment.completed_at,
          academy_programs: Array.isArray(enrollment.academy_programs)
            ? (enrollment.academy_programs[0] ?? null)
            : enrollment.academy_programs,
        })
      );

      setEnrollments(normalizedEnrollments);

      const enrollmentIds = normalizedEnrollments.map(
        (enrollment) => enrollment.id
      );

      if (enrollmentIds.length === 0) {
        setProgressRecords([]);
        setLoading(false);
        return;
      }

      const { data: progressData, error: progressError } = await supabase
        .from("student_lesson_progress")
        .select(
          `
            enrollment_id,
            lesson_id,
            status,
            progress_percent,
            last_accessed_at
          `
        )
        .in("enrollment_id", enrollmentIds);

      if (progressError) {
        console.error("Failed to load lesson progress:", progressError);
        setErrorMessage("We could not load your learning progress.");
        setLoading(false);
        return;
      }

      setProgressRecords(progressData ?? []);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  // Calculates course-level progress from the student's lesson progress records.
  const courseSummaries = useMemo<CourseSummary[]>(() => {
    return enrollments
      .filter((enrollment) => enrollment.academy_programs)
      .map((enrollment) => {
        const program = enrollment.academy_programs!;

        const courseProgress = progressRecords.filter(
          (progress) => progress.enrollment_id === enrollment.id
        );

        const totalLessons = courseProgress.length;

        const completedLessons = courseProgress.filter(
          (progress) => progress.status === "completed"
        ).length;

        const progress =
          totalLessons > 0
            ? Math.round(
                courseProgress.reduce(
                  (total, lesson) =>
                    total + Number(lesson.progress_percent || 0),
                  0
                ) / totalLessons
              )
            : 0;

        return {
          enrollmentId: enrollment.id,
          title: program.title,
          slug: program.slug,
          status: enrollment.status,
          progress,
          completedLessons,
          totalLessons,
        };
      });
  }, [enrollments, progressRecords]);

  // Calculates the summary statistics displayed at the top of the dashboard.
  const stats = useMemo(() => {
    if (courseSummaries.length === 0) {
      return emptyStats;
    }

    const inProgress = courseSummaries.filter(
      (course) =>
        course.status === "active" &&
        course.progress > 0 &&
        course.progress < 100
    ).length;

    const completed = courseSummaries.filter(
      (course) => course.status === "completed" || course.progress >= 100
    ).length;

    const overallProgress = Math.round(
      courseSummaries.reduce((total, course) => total + course.progress, 0) /
        courseSummaries.length
    );

    return {
      totalCourses: courseSummaries.length,
      inProgress,
      completed,
      overallProgress,
    };
  }, [courseSummaries]);

  // Finds the course with the most recently accessed lesson for the continue-learning card.
  const continueLearningCourse = useMemo(() => {
    const activeCourses = courseSummaries.filter(
      (course) => course.status === "active" && course.progress < 100
    );

    if (activeCourses.length === 0) {
      return null;
    }

    const lastAccessByEnrollment = new Map<string, number>();

    progressRecords.forEach((progress) => {
      if (!progress.last_accessed_at) return;

      lastAccessByEnrollment.set(
        progress.enrollment_id,
        new Date(progress.last_accessed_at).getTime()
      );
    });

    return [...activeCourses].sort((a, b) => {
      const aLastAccess = lastAccessByEnrollment.get(a.enrollmentId) ?? 0;
      const bLastAccess = lastAccessByEnrollment.get(b.enrollmentId) ?? 0;

      return bLastAccess - aLastAccess;
    })[0];
  }, [courseSummaries, progressRecords]);

  // Returns the student's preferred display name for the welcome section.
  const displayName = useMemo(() => {
    if (!profile) return "Student";

    return profile.first_name?.trim() || profile.last_name?.trim() || "Student";
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen p-5 dark:bg-slate-950 md:p-6 xl:p-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="animate-pulse space-y-6">
            <div className="h-28 rounded-2xl bg-white shadow-sm dark:bg-slate-900" />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 rounded-2xl bg-white shadow-sm dark:bg-slate-900"
                />
              ))}
            </div>

            <div className="h-64 rounded-2xl bg-white shadow-sm dark:bg-slate-900" />

            <div className="h-72 rounded-2xl bg-white shadow-sm dark:bg-slate-900" />
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen p-5 dark:bg-slate-950 md:p-6 xl:p-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/50 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/40">
              <Clock3 size={22} />
            </div>

            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Something went wrong
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 dark:bg-slate-950 md:p-6 xl:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-7">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                Welcome back, {displayName}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Continue your learning journey, track your progress, and access
                your Academy courses from one place.
              </p>
            </div>

            <a
              href="/student/courses"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Browse My Courses
              <ArrowRight size={16} />
            </a>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  My Courses
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.totalCourses}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <BookOpen size={20} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  In Progress
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.inProgress}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                <PlayCircle size={20} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Completed
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.completed}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400">
                <CheckCircle2 size={20} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Overall Progress
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.overallProgress}%
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                <TrendingUp size={20} />
              </div>
            </div>
          </div>
        </section>

        {continueLearningCourse && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-500">
                  Keep Learning
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  Continue Learning
                </h2>
              </div>

              <a
                href="/student/courses"
                className="hidden items-center gap-1 text-sm font-semibold text-slate-600 hover:text-orange-500 dark:text-slate-300 dark:hover:text-orange-400 sm:flex"
              >
                View all
                <ArrowRight size={15} />
              </a>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="grid md:grid-cols-[220px_1fr]">
                <div className="flex min-h-[180px] items-center justify-center bg-gradient-to-br from-sky-100 via-emerald-50 to-yellow-50 text-sky-600 dark:from-sky-950 dark:via-emerald-950 dark:to-yellow-950 dark:text-sky-300">
                  <GraduationCap size={52} strokeWidth={1.5} />
                </div>

                <div className="flex flex-col justify-between p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                      Continue Course
                    </p>

                    <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                      {continueLearningCourse.title}
                    </h3>

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {continueLearningCourse.completedLessons} of{" "}
                      {continueLearningCourse.totalLessons} tracked lessons
                      completed.
                    </p>
                  </div>

                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500 dark:text-slate-400">
                        Course progress
                      </span>

                      <span className="text-slate-900 dark:text-white">
                        {continueLearningCourse.progress}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-orange-500 transition-all"
                        style={{
                          width: `${continueLearningCourse.progress}%`,
                        }}
                      />
                    </div>

                    <a
                      href={`/student/courses/${continueLearningCourse.slug}`}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                    >
                      Continue Learning
                      <ArrowRight size={16} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-500">
              Shortcuts
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              Quick Actions
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <a
              href="/student/courses"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <BookOpen size={21} />
              </div>

              <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">
                My Courses
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Access your enrolled Academy programs.
              </p>

              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                Open
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
              </div>
            </a>

            <a
              href="/student/resources"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400">
                <LibraryBig size={21} />
              </div>

              <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">
                Resources
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Find learning materials and course resources.
              </p>

              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                Browse
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
              </div>
            </a>

            <a
              href="/student/progress"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                <TrendingUp size={21} />
              </div>

              <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">
                My Progress
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Track your progress across enrolled courses.
              </p>

              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                View progress
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
              </div>
            </a>

            <a
              href="/student/certificates"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400">
                <Award size={21} />
              </div>

              <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">
                Certificates
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Access certificates you've earned.
              </p>

              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                View certificates
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
              </div>
            </a>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-500">
                Academy
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                My Courses
              </h2>
            </div>

            <a
              href="/student/courses"
              className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 transition hover:text-orange-500 dark:text-slate-300 dark:hover:text-orange-400"
            >
              View all
              <ArrowRight size={15} />
            </a>
          </div>

          {courseSummaries.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <BookOpen size={24} />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                No courses yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Your enrolled Academy programs will appear here.
              </p>

              <a
                href="/student/courses"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Explore Courses
                <ArrowRight size={16} />
              </a>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {courseSummaries.map((course) => (
                <a
                  key={course.enrollmentId}
                  href={`/student/courses/${course.slug}`}
                  className="group flex flex-col gap-5 p-6 transition hover:bg-slate-50 dark:hover:bg-slate-800/40 md:flex-row md:items-center"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                    <GraduationCap size={25} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="truncate font-semibold text-slate-900 dark:text-white">
                        {course.title}
                      </h3>

                      <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {course.status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-orange-500 transition-all"
                          style={{
                            width: `${course.progress}%`,
                          }}
                        />
                      </div>

                      <span className="w-10 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {course.progress}%
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      {course.completedLessons} of {course.totalLessons} tracked
                      lessons completed
                    </p>
                  </div>

                  <ArrowRight
                    size={18}
                    className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-orange-500 dark:text-slate-600"
                  />
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
