import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  GraduationCap,
  LockKeyhole,
  PlayCircle,
  ShoppingCart,
  Sparkles,
} from "lucide-react";

import { getSession } from "../../lib/auth";
import { supabase } from "../../lib/superbase";
import StudentHeader from "../../components/admin/UI/StudentHeader.astro";

type Program = {
  id: string;
  title: string;
  slug: string;
  code: string | null;
  short_description: string | null;
  description: string | null;
  hero_image_url: string | null;
  thumbnail_image_url: string | null;
  banner_image_url: string | null;
  duration_value: number | null;
  duration_unit: string | null;
  delivery_mode: string | null;
  certificate_enabled: boolean;
  status: string;
  registration_open: boolean;
  price: number | null;
  discount_price: number | null;
  currency: string | null;
  show_price: boolean;
};

type Enrollment = {
  id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
  duration: number | null;
  module_number: number | null;
  is_preview: boolean;
};

type Lesson = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  display_order: number;
  duration: number | null;
  lesson_type: string | null;
};

type LessonProgress = {
  lesson_id: string;
  status: "not_started" | "in_progress" | "completed";
  progress_percent: number;
  last_accessed_at: string | null;
};

type Props = {
  programSlug: string;
};

export default function StudentProgramOverview({ programSlug }: Props) {
  const [program, setProgram] = useState<Program | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progressRecords, setProgressRecords] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    // Loads the authenticated student's program, enrollment, curriculum, and progress.
    async function loadProgram() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { session },
      } = await getSession();

      if (!session) {
        window.location.replace("/student/login");
        return;
      }

      // Loads the student's Academy profile so enrollment can be resolved safely.
      const { data: profileData, error: profileError } = await supabase
        .from("student_profiles")
        .select("id")
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

      // Loads the published Academy program identified by the route slug.
      const { data: programData, error: programError } = await supabase
        .from("academy_programs")
        .select(
          `
            id,
            title,
            slug,
            code,
            short_description,
            description,
            hero_image_url,
            thumbnail_image_url,
            banner_image_url,
            duration_value,
            duration_unit,
            delivery_mode,
            certificate_enabled,
            status,
            registration_open,
            price,
            discount_price,
            currency,
            show_price
          `
        )
        .eq("slug", programSlug)
        .eq("status", "published")
        .maybeSingle();

      if (programError) {
        console.error("Failed to load Academy program:", programError);
        setErrorMessage("We could not load this course.");
        setLoading(false);
        return;
      }

      if (!programData) {
        setErrorMessage("This course could not be found.");
        setLoading(false);
        return;
      }

      setProgram(programData);
      // Checks whether the authenticated student already has an enrollment for this program.
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("student_enrollments")
        .select("id, status, start_date, end_date")
        .eq("student_id", profileData.id)
        .eq("program_id", programData.id)
        .in("status", ["pending", "active", "paused", "completed"])
        .maybeSingle();

      if (enrollmentError) {
        console.error("Failed to load enrollment:", enrollmentError);
        setErrorMessage("We could not determine your course enrollment.");
        setLoading(false);
        return;
      }

      // Keep the enrollment mutable because a paid registration may need
      // to be synchronized into student_enrollments before continuing.
      let resolvedEnrollment = enrollmentData;

      // Recover a paid Academy registration when the enrollment record is missing.
      if (!resolvedEnrollment) {
        const accessToken = session.access_token;

        if (accessToken) {
          try {
            // Ask the secure server endpoint to reconcile the student's paid
            // Academy registration into an active student enrollment.
            const syncResponse = await fetch("/api/student/enrollments/sync", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                programId: programData.id,
              }),
            });

            const syncResult = await syncResponse.json();

            if (
              syncResponse.ok &&
              syncResult.enrolled &&
              syncResult.enrollmentId
            ) {
              // Reload the enrollment created or recovered by the server.
              const { data: syncedEnrollment, error: syncedEnrollmentError } =
                await supabase
                  .from("student_enrollments")
                  .select("id, status, start_date, end_date")
                  .eq("id", syncResult.enrollmentId)
                  .single();

              if (syncedEnrollmentError) {
                console.error(
                  "Failed to reload synchronized enrollment:",
                  syncedEnrollmentError
                );
              } else {
                resolvedEnrollment = syncedEnrollment;
              }
            } else if (!syncResponse.ok && syncResult.message) {
              console.warn(
                "Student enrollment synchronization did not complete:",
                syncResult.message
              );
            }
          } catch (syncError) {
            console.error(
              "Student enrollment synchronization request failed:",
              syncError
            );
          }
        }
      }

      setEnrollment(resolvedEnrollment);

      // Loads the course modules independently so non-enrolled students can preview the curriculum.
      const { data: moduleData, error: moduleError } = await supabase
        .from("academy_program_modules")
        .select(
          `
            id,
            title,
            description,
            display_order,
            duration,
            module_number,
            is_preview
          `
        )
        .eq("program_id", programData.id)
        .order("display_order", { ascending: true });

      if (moduleError) {
        console.error("Failed to load course modules:", moduleError);
        setErrorMessage("We could not load the course curriculum.");
        setLoading(false);
        return;
      }

      const loadedModules = (moduleData ?? []) as Module[];

      setModules(loadedModules);

      const moduleIds = loadedModules.map((module) => module.id);

      if (moduleIds.length === 0) {
        setLessons([]);
        setProgressRecords([]);
        setLoading(false);
        return;
      }

      // Loads the lessons belonging to the course modules.
      const { data: lessonData, error: lessonError } = await supabase
        .from("academy_program_lessons")
        .select(
          `
            id,
            module_id,
            title,
            description,
            display_order,
            duration,
            lesson_type
          `
        )
        .in("module_id", moduleIds)
        .order("display_order", { ascending: true });

      if (lessonError) {
        console.error("Failed to load course lessons:", lessonError);
        setErrorMessage("We could not load the course lessons.");
        setLoading(false);
        return;
      }

      setLessons((lessonData ?? []) as Lesson[]);

      // Clear previous progress before loading the current program's enrollment progress.
      setProgressRecords([]);

      // Loads lesson progress only when the student has an enrollment.
      if (resolvedEnrollment) {
        const { data: progressData, error: progressError } = await supabase
          .from("student_lesson_progress")
          .select(
            `
        lesson_id,
        status,
        progress_percent,
        last_accessed_at
      `
          )
          .eq("enrollment_id", resolvedEnrollment.id);

        if (progressError) {
          console.error("Failed to load lesson progress:", progressError);
          setErrorMessage("We could not load your learning progress.");
          setLoading(false);
          return;
        }

        setProgressRecords((progressData ?? []) as LessonProgress[]);
      }

      // Opens the first module when the curriculum is initially displayed.
      if (loadedModules.length > 0) {
        setExpandedModules(new Set([loadedModules[0].id]));
      }

      setLoading(false);
    }

    loadProgram();
  }, [programSlug]);

  const totalLessons = lessons.length;

  const completedLessons = progressRecords.filter(
    (progress) => progress.status === "completed"
  ).length;

  const courseProgress =
    totalLessons > 0
      ? Math.round(
          lessons.reduce((total, lesson) => {
            const progress = progressRecords.find(
              (record) => record.lesson_id === lesson.id
            );

            return total + Number(progress?.progress_percent ?? 0);
          }, 0) / totalLessons
        )
      : 0;

  const nextLesson = useMemo(() => {
    return lessons.find((lesson) => {
      const progress = progressRecords.find(
        (record) => record.lesson_id === lesson.id
      );

      return progress?.status !== "completed";
    });
  }, [lessons, progressRecords]);

  const priceLabel = useMemo(() => {
    if (!program?.show_price || program.price === null) {
      return null;
    }

    const currency = program.currency || "NGN";

    const formatter = new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });

    return formatter.format(program.discount_price ?? program.price);
  }, [program]);

  const hasDiscount =
    program?.show_price &&
    program.price !== null &&
    program.discount_price !== null &&
    program.discount_price < program.price;

  const originalPriceLabel = useMemo(() => {
    if (!program?.show_price || program.price === null || !hasDiscount) {
      return null;
    }

    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: program.currency || "NGN",
      maximumFractionDigits: 0,
    }).format(program.price);
  }, [program, hasDiscount]);

  // Toggles one curriculum module while preserving the state of the other modules.
  function toggleModule(moduleId: string) {
    setExpandedModules((current) => {
      const next = new Set(current);

      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }

      return next;
    });
  }

  // Returns the number of lessons belonging to one curriculum module.
  function getModuleLessonCount(moduleId: string) {
    return lessons.filter((lesson) => lesson.module_id === moduleId).length;
  }

  // Returns the completed lesson count for one curriculum module.
  function getModuleCompletedCount(moduleId: string) {
    const moduleLessonIds = lessons
      .filter((lesson) => lesson.module_id === moduleId)
      .map((lesson) => lesson.id);

    return progressRecords.filter(
      (progress) =>
        moduleLessonIds.includes(progress.lesson_id) &&
        progress.status === "completed"
    ).length;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid min-h-[430px] lg:grid-cols-[1.05fr_0.95fr]">
            <div className="animate-pulse p-8 md:p-10">
              <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-6 h-12 max-w-xl rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-4 h-12 max-w-lg rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-8 h-5 max-w-2xl rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-3 h-5 max-w-xl rounded bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="min-h-[280px] animate-pulse bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      </div>
    );
  }

  if (errorMessage || !program) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-10 text-center shadow-sm dark:border-red-900/60 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950/40">
          <BookOpen size={24} />
        </div>

        <h2 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">
          Course unavailable
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          {errorMessage || "This course could not be found."}
        </p>

        <a
          href="/student/courses"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Back to My Courses
          <ArrowRight size={16} />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center p-7 md:p-10 lg:p-12">
            <div className="flex flex-wrap items-center gap-2">
              {program.code && (
                <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                  {program.code}
                </span>
              )}

              {enrollment && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <CheckCircle2 size={13} />
                  Enrolled
                </span>
              )}
            </div>

            <h1 className="mt-6 max-w-2xl text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
              {program.title}
            </h1>

            <div className="mt-8 flex flex-wrap gap-3">
              {enrollment && nextLesson ? (
                <a
                  href={`/student/courses/${program.slug}/lessons/${nextLesson.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
                >
                  <PlayCircle size={17} />
                  Continue Learning
                  <ArrowRight size={16} />
                </a>
              ) : !enrollment && program.registration_open ? (
                <a
                  href={`/student/courses/${program.slug}/checkout`}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
                >
                  <ShoppingCart size={17} />
                  Enroll Now
                  <ArrowRight size={16} />
                </a>
              ) : null}

              <a
                href="#curriculum"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <BookOpen size={17} />
                View Curriculum
              </a>
            </div>
          </div>

          <div className="relative min-h-[320px] overflow-hidden bg-slate-100 dark:bg-slate-800 lg:min-h-full">
            <img
              src={
                program.hero_image_url ||
                program.banner_image_url ||
                program.thumbnail_image_url ||
                "/images/academy-placeholder.jpg"
              }
              alt={program.title}
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />

            {program.certificate_enabled && (
              <div className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/90 px-4 py-3 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur dark:bg-slate-900/90 dark:text-white">
                <Award size={17} className="text-orange-500" />
                Certificate included
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-950/40">
            <Clock3 size={19} />
          </div>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
            Duration
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            {program.duration_value
              ? `${program.duration_value} ${program.duration_unit ?? ""}`
              : "Flexible"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-950/40">
            <GraduationCap size={19} />
          </div>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
            Delivery
          </p>

          <p className="mt-1 text-sm font-semibold capitalize text-slate-900 dark:text-white">
            {program.delivery_mode || "Academy"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40">
            <BookOpen size={19} />
          </div>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
            Curriculum
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            {modules.length} modules · {totalLessons} lessons
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500 dark:bg-violet-950/40">
            <Award size={19} />
          </div>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
            Certification
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            {program.certificate_enabled
              ? "Certificate included"
              : "No certificate"}
          </p>
        </div>
      </section>

      {enrollment && (
        <section className="overflow-hidden rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-white shadow-sm dark:border-orange-900/50 dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-900">
          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <Sparkles size={17} />
                  <span className="text-xs font-bold uppercase tracking-[0.16em]">
                    Your Learning Progress
                  </span>
                </div>

                <h2 className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                  {courseProgress}% complete
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {completedLessons} of {totalLessons} lessons completed
                </p>
              </div>

              {nextLesson && (
                <a
                  href={`/student/courses/${program.slug}/lessons/${nextLesson.id}`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Continue Learning
                  <ArrowRight size={16} />
                </a>
              )}
            </div>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-orange-100 dark:bg-orange-950/50">
              <div
                className="h-full rounded-full bg-orange-500 transition-all duration-500"
                style={{ width: `${courseProgress}%` }}
              />
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {program.description && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <BookOpen size={19} />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-500">
                    About the course
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                    What you will learn
                  </h2>
                </div>
              </div>

              <div className="mt-6 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300">
                {program.description}
              </div>
            </section>
          )}

          <section
            id="curriculum"
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="border-b border-slate-200 p-6 dark:border-slate-800 md:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-500">
                    Curriculum
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                    Course content
                  </h2>

                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {modules.length} modules · {totalLessons} lessons
                  </p>
                </div>

                {!enrollment && (
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-400">
                    <LockKeyhole size={14} />
                    Enroll to access lessons
                  </span>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {modules.length === 0 ? (
                <div className="p-8 text-center">
                  <BookOpen
                    size={28}
                    className="mx-auto text-slate-300 dark:text-slate-600"
                  />

                  <p className="mt-3 text-sm text-slate-500">
                    Curriculum content will be available soon.
                  </p>
                </div>
              ) : (
                modules.map((module) => {
                  const moduleLessons = lessons
                    .filter((lesson) => lesson.module_id === module.id)
                    .sort((a, b) => a.display_order - b.display_order);

                  const isOpen = expandedModules.has(module.id);
                  const moduleCompleted = getModuleCompletedCount(module.id);
                  const moduleLessonCount = getModuleLessonCount(module.id);

                  return (
                    <div key={module.id}>
                      <button
                        type="button"
                        onClick={() => toggleModule(module.id)}
                        className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50 md:p-6"
                        aria-expanded={isOpen}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {module.module_number ?? module.display_order}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {module.title}
                            </h3>

                            {module.is_preview && !enrollment && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                Preview
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span>
                              {moduleLessonCount}{" "}
                              {moduleLessonCount === 1 ? "lesson" : "lessons"}
                            </span>

                            {enrollment && (
                              <span>
                                {moduleCompleted}/{moduleLessonCount} completed
                              </span>
                            )}

                            {module.duration && (
                              <span>{module.duration} min</span>
                            )}
                          </div>
                        </div>

                        <ChevronDown
                          size={19}
                          className={[
                            "shrink-0 text-slate-400 transition-transform duration-200",
                            isOpen ? "rotate-180" : "",
                          ].join(" ")}
                        />
                      </button>

                      {isOpen && (
                        <div className="border-t border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/30">
                          {module.description && (
                            <div className="border-b border-slate-200 px-5 py-4 text-sm leading-6 text-slate-500 dark:border-slate-800 dark:text-slate-400 md:px-6">
                              {module.description}
                            </div>
                          )}

                          {moduleLessons.map((lesson) => {
                            const progress = progressRecords.find(
                              (record) => record.lesson_id === lesson.id
                            );

                            const isCompleted =
                              progress?.status === "completed";

                            const canOpen =
                              Boolean(enrollment) &&
                              enrollment?.status !== "cancelled" &&
                              enrollment?.status !== "expired";

                            return canOpen ? (
                              <a
                                key={lesson.id}
                                href={`/student/courses/${program.slug}/lessons/${lesson.id}`}
                                className="group flex items-center gap-4 border-b border-slate-200 px-5 py-4 transition last:border-0 hover:bg-white dark:border-slate-800 dark:hover:bg-slate-900 md:px-6"
                              >
                                <div
                                  className={[
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                                    isCompleted
                                      ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40"
                                      : "bg-white text-slate-400 dark:bg-slate-900",
                                  ].join(" ")}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 size={17} />
                                  ) : (
                                    <PlayCircle size={17} />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-slate-700 group-hover:text-orange-500 dark:text-slate-200">
                                    {lesson.title}
                                  </p>

                                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                                    {lesson.lesson_type && (
                                      <span className="capitalize">
                                        {lesson.lesson_type}
                                      </span>
                                    )}

                                    {lesson.duration && (
                                      <span>{lesson.duration} min</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                  {progress &&
                                    progress.progress_percent > 0 &&
                                    !isCompleted && (
                                      <span className="text-xs font-medium text-orange-500">
                                        {Math.round(progress.progress_percent)}%
                                      </span>
                                    )}

                                  <ArrowRight
                                    size={16}
                                    className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500"
                                  />
                                </div>
                              </a>
                            ) : (
                              <div
                                key={lesson.id}
                                className="flex items-center gap-4 border-b border-slate-200 px-5 py-4 last:border-0 dark:border-slate-800 md:px-6"
                              >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 dark:bg-slate-900">
                                  {module.is_preview ? (
                                    <PlayCircle size={17} />
                                  ) : (
                                    <LockKeyhole size={16} />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                                    {lesson.title}
                                  </p>

                                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                                    {lesson.lesson_type && (
                                      <span className="capitalize">
                                        {lesson.lesson_type}
                                      </span>
                                    )}

                                    {lesson.duration && (
                                      <span>{lesson.duration} min</span>
                                    )}
                                  </div>
                                </div>

                                {!module.is_preview && (
                                  <LockKeyhole
                                    size={15}
                                    className="shrink-0 text-slate-300 dark:text-slate-600"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-6 xl:sticky xl:top-24">
          {!enrollment ? (
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 p-6 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-500">
                  Start learning
                </p>

                <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                  Join this course
                </h2>
              </div>

              <div className="p-6">
                {priceLabel ? (
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-slate-950 dark:text-white">
                      {priceLabel}
                    </span>

                    {originalPriceLabel && (
                      <span className="mb-1 text-sm text-slate-400 line-through">
                        {originalPriceLabel}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-slate-950 dark:text-white">
                    Enroll to get started
                  </p>
                )}

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <Check size={16} className="text-emerald-500" />
                    Full curriculum access
                  </div>

                  <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <Check size={16} className="text-emerald-500" />
                    Progress tracking
                  </div>

                  {program.certificate_enabled && (
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <Check size={16} className="text-emerald-500" />
                      Course certificate
                    </div>
                  )}
                </div>

                {program.registration_open ? (
                  <a
                    href={`/student/courses/${program.slug}/checkout`}
                    className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    <ShoppingCart size={17} />
                    Enroll Now
                    <ArrowRight size={16} />
                  </a>
                ) : (
                  <div className="mt-7 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Registration is currently closed
                  </div>
                )}

                <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                  You will remain inside the Student Portal throughout the
                  enrollment process.
                </p>
              </div>
            </section>
          ) : (
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 size={21} />
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
                You are enrolled
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Continue working through your curriculum and complete each
                lesson at your own pace.
              </p>

              {nextLesson && (
                <a
                  href={`/student/courses/${program.slug}/lessons/${nextLesson.id}`}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Continue Learning
                  <ArrowRight size={16} />
                </a>
              )}
            </section>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Course at a glance
            </h3>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Modules</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {modules.length}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Lessons</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {totalLessons}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Delivery</span>
                <span className="text-sm font-semibold capitalize text-slate-900 dark:text-white">
                  {program.delivery_mode || "Online"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Certificate</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {program.certificate_enabled ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
