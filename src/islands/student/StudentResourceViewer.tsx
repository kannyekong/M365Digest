import {
  CheckCircle2,
  ClipboardCheck,
  BookOpen,
  ChevronDown,
  Clock3,
  Maximize2,
  Minimize2,
  X,
  ExternalLink,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Link2,
  LoaderCircle,
  PlayCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  getStudentLessonResources,
  getStudentLessonQuizzes,
  getStudentResourceProgress,
  upsertStudentResourceProgress,
} from "../../lib/academy";
import { studentSupabase } from "../../lib/superbase";
import StudentQuizPlayer from "./StudentQuizPlayer";
import type {
  AcademyResource,
  StudentResourceProgress,
  StudentResourceProgressStatus,
  AcademyQuiz,
  StudentQuizResult,
} from "../../types/academy";

interface CurriculumLesson {
  id: string;
  title: string;
  lesson_type: string | null;
  duration: number | null;
  material_count: number;
  total_duration_seconds: number;
  materials: Array<{ id: string; title: string; resource_type: string; duration_seconds: number | null; kind: "resource" | "quiz" }>;
}

interface CurriculumModule {
  id: string;
  title: string;
  module_number: number | null;
  lessons: CurriculumLesson[];
}

interface StudentResourceViewerProps {
  programId: string;
  moduleId: string;
  lessonId: string;
  enrollmentId: string;
  programSlug: string;
  curriculum: CurriculumModule[];
}

/**
 * Convert a resource type into a readable label.
 */
function formatResourceType(resourceType: AcademyResource["resource_type"]) {
  return resourceType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return the appropriate icon for a resource type.
 */
function getResourceIcon(resourceType: AcademyResource["resource_type"]) {
  switch (resourceType) {
    case "video":
      return PlayCircle;

    case "pdf":
    case "document":
      return FileText;

    case "spreadsheet":
      return FileSpreadsheet;

    case "zip":
      return FileArchive;

    case "link":
    default:
      return Link2;
  }
}

/**
 * Extract a YouTube video ID from common YouTube URL formats.
 */
function getYouTubeVideoId(url: string) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.replace("/", "").trim() || null;
    }

    if (parsedUrl.hostname.includes("youtube.com")) {
      return parsedUrl.searchParams.get("v");
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract a Vimeo video ID from common Vimeo URL formats.
 */
function getVimeoVideoId(url: string) {
  const match = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);

  return match?.[1] ?? null;
}

/**
 * Build an embeddable URL for supported video providers.
 */
function getVideoEmbedUrl(resource: AcademyResource) {
  if (!resource.external_url) {
    return null;
  }

  if (resource.provider === "youtube") {
    const videoId = getYouTubeVideoId(resource.external_url);

    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0` : null;
  }

  if (resource.provider === "vimeo") {
    const videoId = getVimeoVideoId(resource.external_url);

    return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
  }

  return null;
}

/**
 * Return the resource URL used by the student-facing viewer.
 */
function getResourceUrl(resource: AcademyResource) {
  return resource.external_url || resource.storage_path || null;
}

/**
 * Determine whether a resource is currently available.
 */
function isResourceAvailable(resource: AcademyResource) {
  const now = Date.now();

  if (resource.available_from) {
    const availableFrom = new Date(resource.available_from).getTime();

    if (now < availableFrom) {
      return false;
    }
  }

  if (resource.available_until) {
    const availableUntil = new Date(resource.available_until).getTime();

    if (now > availableUntil) {
      return false;
    }
  }

  return true;
}

/**
 * Display and track Academy resources belonging to one lesson.
 */
export default function StudentResourceViewer({
  programId,
  moduleId,
  lessonId,
  enrollmentId,
  programSlug,
  curriculum,
}: StudentResourceViewerProps) {
  const [resources, setResources] = useState<AcademyResource[]>([]);
  const [quizzes, setQuizzes] = useState<AcademyQuiz[]>([]);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [passedQuizIds, setPassedQuizIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<
    Record<string, StudentResourceProgress>
  >({});
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingResourceId, setSavingResourceId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(new Set([moduleId]));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [curriculumData, setCurriculumData] = useState(curriculum);

  /**
   * Load curriculum materials with the authenticated student client so the
   * dropdown reflects the same row-level security access as the lesson viewer.
   */
  useEffect(() => {
    async function loadCurriculumMaterials() {
      const lessonIds = curriculum.flatMap((academyModule) => academyModule.lessons.map((lesson) => lesson.id));
      if (lessonIds.length === 0) return;

      const [
        { data: resourceData, error: resourceError },
        { data: quizData, error: quizError },
      ] = await Promise.all([
        studentSupabase
          .from("academy_program_resources")
          .select("id, lesson_id, title, resource_type, duration_seconds, display_order, is_published, available_from, available_until")
          .in("lesson_id", lessonIds)
          .order("display_order", { ascending: true }),
        studentSupabase
          .from("academy_quizzes")
          .select("id, lesson_id, title, display_order, is_published")
          .in("lesson_id", lessonIds)
          .order("display_order", { ascending: true }),
      ]);

      if (resourceError || quizError) {
        console.error("Failed to load curriculum lesson materials:", resourceError ?? quizError);
        return;
      }

      const now = Date.now();
      const publishedResources = (resourceData ?? []).filter((resource) =>
        resource.is_published &&
        (!resource.available_from || new Date(resource.available_from).getTime() <= now) &&
        (!resource.available_until || new Date(resource.available_until).getTime() >= now)
      );
      const publishedQuizzes = (quizData ?? []).filter((quiz) => quiz.is_published);

      setCurriculumData((current) => current.map((academyModule) => ({
        ...academyModule,
        lessons: academyModule.lessons.map((lesson) => {
          const lessonResources = publishedResources
            .filter((resource) => resource.lesson_id === lesson.id)
            .map((resource) => ({
              id: resource.id,
              title: resource.title,
              resource_type: resource.resource_type,
              duration_seconds: resource.duration_seconds,
              kind: "resource" as const,
            }));
          const lessonQuizzes = publishedQuizzes
            .filter((quiz) => quiz.lesson_id === lesson.id)
            .map((quiz) => ({
              id: quiz.id,
              title: quiz.title,
              resource_type: "quiz",
              duration_seconds: null,
              kind: "quiz" as const,
            }));
          const materials = [...lessonResources, ...lessonQuizzes].sort((a, b) => a.title.localeCompare(b.title));

          return {
            ...lesson,
            materials,
            material_count: materials.length,
            total_duration_seconds: lessonResources.reduce((total, resource) => total + (resource.duration_seconds ?? 0), 0),
          };
        }),
      })));
    }

    void loadCurriculumMaterials();
  }, [curriculum]);

  /**
   * Load the lesson resources and the student's existing resource progress.
   */
  useEffect(() => {
    async function loadResources() {
      setLoading(true);
      setErrorMessage("");

      try {
        const [resourceData, progressData, quizData] = await Promise.all([getStudentLessonResources(lessonId), getStudentResourceProgress(enrollmentId), getStudentLessonQuizzes(lessonId)]);

        // Load passing attempts for this enrollment without mixing quiz status into resource progress.
        const publishedQuizIds = quizData
          .filter((quiz) => quiz.is_published)
          .map((quiz) => quiz.id);
        const { data: passedAttempts, error: passedAttemptsError } =
          publishedQuizIds.length > 0
            ? await studentSupabase
                .from("student_quiz_attempts")
                .select("quiz_id")
                .eq("enrollment_id", enrollmentId)
                .eq("passed", true)
                .not("completed_at", "is", null)
                .in("quiz_id", publishedQuizIds)
            : { data: [], error: null };

        if (passedAttemptsError) {
          throw passedAttemptsError;
        }

        setPassedQuizIds(
          new Set((passedAttempts ?? []).map((attempt) => attempt.quiz_id))
        );

        const publishedResources = resourceData.filter(
          (resource) => resource.is_published && isResourceAvailable(resource)
        );

        setResources(publishedResources);
        const publishedQuizzes = quizData.filter((quiz) => quiz.is_published);
        setQuizzes(publishedQuizzes);
        const requestedResourceId = new URLSearchParams(window.location.search).get("resourceId");
        const requestedQuizId = new URLSearchParams(window.location.search).get("quizId");
        const requestedResource = publishedResources.find((resource) => resource.id === requestedResourceId);
        const requestedQuiz = publishedQuizzes.find((quiz) => quiz.id === requestedQuizId);
        setActiveResourceId(requestedResource?.id ?? (requestedQuiz ? null : publishedResources[0]?.id ?? null));
        setActiveQuizId(requestedQuiz?.id ?? (publishedResources.length === 0 ? publishedQuizzes[0]?.id ?? null : null));

        const progressMap: Record<string, StudentResourceProgress> = {};

        progressData.forEach((record) => {
          progressMap[record.resource_id] = record;
        });

        setProgress(progressMap);

      } catch (error) {
        console.error("Failed to load student resources:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load lesson resources."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadResources();

    // Load lesson completion separately from resource and quiz completion.
    async function loadLessonProgress() {
      const { data, error } = await studentSupabase
        .from("student_lesson_progress")
        .select("lesson_id, status")
        .eq("enrollment_id", enrollmentId);

      if (error) {
        console.error("Failed to load curriculum lesson progress:", error);
        return;
      }

      setCompletedLessonIds(
        new Set((data ?? []).filter((item) => item.status === "completed").map((item) => item.lesson_id))
      );
    }

    void loadLessonProgress();
  }, [lessonId, enrollmentId]);

  /**
   * Return the currently selected resource.
   */
  const activeResource = useMemo(() => {
    return (
      resources.find((resource) => resource.id === activeResourceId) ?? null
    );
  }, [resources, activeResourceId]);

  /** Return the currently selected lesson quiz, if one is selected. */
  const activeQuiz = useMemo(() => quizzes.find((quiz) => quiz.id === activeQuizId) ?? null, [quizzes, activeQuizId]);



  /** Notify lesson progression controls when a student passes a quiz. */
  function handleQuizProceed(result: StudentQuizResult) {
    if (!result.passed) return;

    // Reflect the newly passed quiz immediately in the lesson sidebar.
    if (activeQuizId) {
      setPassedQuizIds((current) => new Set(current).add(activeQuizId));
    }

    window.dispatchEvent(
      new CustomEvent("academy:quiz-passed", {
        detail: { programId, moduleId, lessonId, enrollmentId, result },
      })
    );
  }

  /**
   * Mark a resource as started without changing a completed resource back
   * to an incomplete state.
   */
  async function handleResourceOpened(resource: AcademyResource) {
    const existingProgress = progress[resource.id];

    if (existingProgress?.status === "completed") {
      return;
    }

    try {
      const updatedProgress = await upsertStudentResourceProgress({
        enrollment_id: enrollmentId,
        resource_id: resource.id,
        status: "in_progress",
      });

      setProgress((current) => ({
        ...current,
        [resource.id]: updatedProgress,
      }));
    } catch (error) {
      console.error("Failed to update resource progress:", error);
    }
  }

  /**
   * Mark a resource as completed by the student.
   */
  async function handleMarkComplete(resource: AcademyResource) {
    if (savingResourceId) {
      return;
    }

    const existingProgress = progress[resource.id];

    if (existingProgress?.status === "completed") {
      return;
    }

    setSavingResourceId(resource.id);

    try {
      const updatedProgress = await upsertStudentResourceProgress({
        enrollment_id: enrollmentId,
        resource_id: resource.id,
        status: "completed",
      });

      setProgress((current) => ({
        ...current,
        [resource.id]: updatedProgress,
      }));
    } catch (error) {
      console.error("Failed to complete resource:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update resource completion."
      );
    } finally {
      setSavingResourceId(null);
    }
  }

  /**
   * Render the selected resource according to its provider and type.
   */
  function renderResourceContent(resource: AcademyResource) {
    const resourceUrl = getResourceUrl(resource);

    if (!resourceUrl) {
      return (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900">
          <div>
            <FileText className="mx-auto h-10 w-10 text-slate-400" />

            <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
              This resource does not have an accessible file or URL yet.
            </p>
          </div>
        </div>
      );
    }

    if (resource.resource_type === "video") {
      const embedUrl = getVideoEmbedUrl(resource);

      if (embedUrl) {
        return (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm dark:border-slate-800">
            <div className={isFullscreen ? "aspect-video max-h-[78vh]" : "aspect-video"}>
              <iframe
                src={embedUrl}
                title={resource.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        );
      }

      return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
          <PlayCircle className="h-10 w-10 text-primary" />

          <h4 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
            Video resource
          </h4>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            This video is hosted externally and cannot be embedded directly
            here.
          </p>

          <a
            href={resourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              void handleResourceOpened(resource);
            }}
            className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Open Video
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      );
    }

    if (resource.resource_type === "pdf") {
      return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <iframe
            src={resourceUrl}
            title={resource.title}
            className="h-[70vh] min-h-[500px] w-full"
            onLoad={() => {
              void handleResourceOpened(resource);
            }}
          />
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {(() => {
            const Icon = getResourceIcon(resource.resource_type);
            return <Icon className="h-6 w-6" />;
          })()}
        </div>

        <h4 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
          {formatResourceType(resource.resource_type)}
        </h4>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Open this resource in a new browser tab.
        </p>

        <a
          href={resourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            void handleResourceOpened(resource);
          }}
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Open Resource
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading resources...
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
        {errorMessage}
      </div>
    );
  }

  return (
    <section className={isFullscreen ? "fixed inset-0 z-[100] overflow-y-auto bg-white p-4 dark:bg-slate-950 sm:p-6" : "space-y-5"}>
      <div className={isFullscreen ? "mx-auto grid min-h-full max-w-[1800px] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]" : "grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"}>
        <div className={isFullscreen ? "col-span-full flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800" : "hidden"}><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Distraction-free learning</p><p className="text-sm text-slate-600 dark:text-slate-300">{activeResource?.title ?? activeQuiz?.title ?? "Course lesson"}</p></div><button type="button" onClick={() => setIsFullscreen(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">Close <X className="inline h-4 w-4" /></button></div>
        <aside className={(isFullscreen ? "hidden " : "") + "order-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-5 lg:order-2"}>
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Course Curriculum</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {curriculumData.reduce((total, item) => total + item.lessons.length, 0)} lessons across {curriculumData.length} modules
            </p>
          </div>
          <div className="mt-2 max-h-[72vh] space-y-2 overflow-y-auto">
            {curriculumData.map((academyModule, index) => {
              const expanded = expandedModuleIds.has(academyModule.id);
              const moduleCompleted = academyModule.lessons.length > 0 && academyModule.lessons.every((lesson) => completedLessonIds.has(lesson.id));
              const completedCount = academyModule.lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;

              return (
                <section key={academyModule.id} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setExpandedModuleIds((current) => {
                      const next = new Set(current);
                      if (next.has(academyModule.id)) next.delete(academyModule.id);
                      else next.add(academyModule.id);
                      return next;
                    })}
                    aria-expanded={expanded}
                    className="flex w-full items-center gap-2 bg-slate-50 px-3 py-3 text-left dark:bg-slate-800/70"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {academyModule.module_number ?? index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{academyModule.title}</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{completedCount} of {academyModule.lessons.length} completed</span>
                    </span>
                    {moduleCompleted ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : null}
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>
                  {expanded ? (
                    <div className="space-y-1 p-2">
                      {academyModule.lessons.map((lesson) => {
                        const active = lesson.id === lessonId;
                        const completed = completedLessonIds.has(lesson.id);
                        const lessonType = (lesson.lesson_type ?? "lesson").replace(/_/g, " ");
                        const hours = Math.floor(lesson.total_duration_seconds / 3600);
                        const minutes = Math.round((lesson.total_duration_seconds % 3600) / 60);
                        const timeLabel = hours > 0 ? (minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`) : (minutes > 0 ? `${minutes} min` : "Time varies");

                        return (
                          <details key={lesson.id} open={active} className="rounded-lg">
                            <summary className={`flex cursor-pointer list-none items-start gap-2 rounded-lg px-3 py-2.5 transition ${active ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                              {completed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />}
                              <span className="min-w-0 flex-1">
                                <a href={`/student/courses/${programSlug}/lessons/${lesson.id}`} className="block text-sm font-medium leading-5 hover:underline">{lesson.title}</a>
                                <span className="mt-1 block text-xs capitalize opacity-70">{lessonType} · {lesson.resource_count} resources · {timeLabel}</span>
                              </span>
                              <ChevronDown className="mt-1 h-4 w-4 shrink-0" />
                            </summary>
                            <div className="ml-5 space-y-1 border-l border-slate-200 py-2 pl-3 dark:border-slate-700">
                              {lesson.materials.length > 0 ? lesson.materials.map((material) => (
                                <a key={material.id} href={material.kind === "quiz" ? `/student/courses/${programSlug}/lessons/${lesson.id}?quizId=${material.id}` : `/student/courses/${programSlug}/lessons/${lesson.id}?resourceId=${material.id}`} className="flex items-start gap-2 rounded-md px-2 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                                  {material.kind === "quiz" ? <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <PlayCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                                  <span className="min-w-0 flex-1">{material.title}</span>
                                  {material.duration_seconds ? <span className="shrink-0 opacity-70">{Math.max(1, Math.round(material.duration_seconds / 60))} min</span> : null}
                                </a>
                              )) : <p className="px-2 py-2 text-xs text-slate-500">No published lesson materials</p>}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </aside>

        <div className={"order-1 min-w-0 lg:order-1 " + (isFullscreen ? "lg:col-span-2" : "")}>

          {activeQuiz ? (
            <div className="space-y-5"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">Lesson quiz</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${activeQuiz.is_required ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>{activeQuiz.is_required ? "Required" : "Optional"}</span></div><h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">{activeQuiz.title}</h2>{activeQuiz.description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">{activeQuiz.description}</p> : null}</div><StudentQuizPlayer key={activeQuiz.id} quizId={activeQuiz.id} enrollmentId={enrollmentId} onProceed={handleQuizProceed} /></div>
          ) : activeResource ? (
            <div className="space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {formatResourceType(activeResource.resource_type)}
                  </span>

                  {activeResource.is_required ? (
                    <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Required
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Optional
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="mt-3 min-w-0 flex-1 text-xl font-bold text-slate-900 dark:text-white">{activeResource.title}</h2>
                  <button type="button" onClick={() => setIsFullscreen(!isFullscreen)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">{isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}{isFullscreen ? "Exit full screen" : "Full screen"}</button>
                </div>

                {activeResource.description ? (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {activeResource.description}
                  </p>
                ) : null}
              </div>

              {renderResourceContent(activeResource)}

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  {progress[activeResource.id]?.status === "completed" ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Completed
                    </>
                  ) : (
                    <>
                      <Clock3 className="h-5 w-5" />
                      Not completed
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void handleMarkComplete(activeResource);
                  }}
                  disabled={
                    savingResourceId === activeResource.id ||
                    progress[activeResource.id]?.status === "completed"
                  }
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingResourceId === activeResource.id ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : progress[activeResource.id]?.status === "completed" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Completed
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Complete
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <FileText className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">No lesson materials yet</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                You can continue exploring the course curriculum. Materials will appear here when published.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
