import {
  CheckCircle2,
  Clock3,
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
  getAcademyLessonResources,
  getStudentResourceProgress,
  upsertStudentResourceProgress,
} from "../../lib/academy";
import { supabase } from "../../lib/superbase";
import type {
  AcademyResource,
  StudentResourceProgress,
  StudentResourceProgressStatus,
} from "../../types/academy";

interface StudentResourceViewerProps {
  lessonId: string;
  enrollmentId: string;
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
  lessonId,
  enrollmentId,
}: StudentResourceViewerProps) {
  const [resources, setResources] = useState<AcademyResource[]>([]);
  const [progress, setProgress] = useState<
    Record<string, StudentResourceProgress>
  >({});
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingResourceId, setSavingResourceId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Load the lesson resources and the student's existing resource progress.
   */
  useEffect(() => {
    async function loadResources() {
      setLoading(true);
      setErrorMessage("");

      try {
        const [resourceData, progressData] = await Promise.all([
          getAcademyLessonResources(lessonId),
          getStudentResourceProgress(enrollmentId),
        ]);

        const publishedResources = resourceData.filter(
          (resource) => resource.is_published && isResourceAvailable(resource)
        );

        setResources(publishedResources);

        const progressMap: Record<string, StudentResourceProgress> = {};

        progressData.forEach((record) => {
          progressMap[record.resource_id] = record;
        });

        setProgress(progressMap);

        if (publishedResources.length > 0) {
          setActiveResourceId(publishedResources[0].id);
        }
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
  }, [lessonId, enrollmentId]);

  /**
   * Return the currently selected resource.
   */
  const activeResource = useMemo(() => {
    return (
      resources.find((resource) => resource.id === activeResourceId) ?? null
    );
  }, [resources, activeResourceId]);

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
            <div className="aspect-video">
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

  if (resources.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <FileText className="mx-auto h-10 w-10 text-slate-400" />

        <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
          No resources available
        </h3>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Resources for this lesson will appear here when they are published.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="px-3 py-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Lesson Resources
            </h3>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {resources.length}{" "}
              {resources.length === 1 ? "resource" : "resources"}
            </p>
          </div>

          <div className="mt-2 space-y-1">
            {resources.map((resource) => {
              const Icon = getResourceIcon(resource.resource_type);
              const resourceProgress = progress[resource.id];
              const completed = resourceProgress?.status === "completed";
              const active = resource.id === activeResourceId;

              return (
                <button
                  key={resource.id}
                  type="button"
                  onClick={() => {
                    setActiveResourceId(resource.id);
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {resource.title}
                    </span>

                    <span className="mt-1 flex items-center gap-2 text-xs opacity-70">
                      {formatResourceType(resource.resource_type)}

                      {resource.is_required ? (
                        <>
                          <span>•</span>
                          Required
                        </>
                      ) : null}
                    </span>
                  </span>

                  {completed ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0">
          {activeResource ? (
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

                <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
                  {activeResource.title}
                </h2>

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
          ) : null}
        </div>
      </div>
    </section>
  );
}
