import { ArrowRight, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";

import { useEffect, useState } from "react";

import {
  getAvailableAcademyPrograms,
  type AcademyProgramCarouselItem,
} from "../../lib/academy";

interface ProgramCarouselProps {
  title?: string;
  eyebrow?: string;
  description?: string;
  autoplay?: boolean;
  autoplayInterval?: number;
  showControls?: boolean;
  showExploreAll?: boolean;
  exploreAllHref?: string;
  exploreAllLabel?: string;
}

/**
 * Displays a reusable carousel of available Academy programs.
 */
export default function ProgramCarousel({
  title = "Explore Programs",
  eyebrow = "Available Programs",
  description,
  autoplay = true,
  autoplayInterval = 5000,
  showControls = true,
  showExploreAll = true,
  exploreAllHref = "/student/courses/allcourses",
  exploreAllLabel = "Explore All Courses",
}: ProgramCarouselProps) {
  const [programs, setPrograms] = useState<AcademyProgramCarouselItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Loads published Academy programs available to students.
   */
  useEffect(() => {
    async function loadPrograms() {
      setLoading(true);
      setErrorMessage("");

      try {
        const result = await getAvailableAcademyPrograms();

        setPrograms(result);
      } catch (error) {
        console.error("Failed to load Academy programs:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "We could not load available programs."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadPrograms();
  }, []);

  /**
   * Moves the carousel to the next available program.
   */
  function nextSlide() {
    setActiveIndex((current) => {
      if (programs.length <= 1) {
        return 0;
      }

      return current >= programs.length - 1 ? 0 : current + 1;
    });
  }

  /**
   * Moves the carousel to the previous available program.
   */
  function previousSlide() {
    setActiveIndex((current) => {
      if (programs.length <= 1) {
        return 0;
      }

      return current <= 0 ? programs.length - 1 : current - 1;
    });
  }

  /**
   * Automatically advances the carousel when autoplay is enabled.
   */
  useEffect(() => {
    if (!autoplay || programs.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) =>
        current >= programs.length - 1 ? 0 : current + 1
      );
    }, autoplayInterval);

    return () => {
      window.clearInterval(interval);
    };
  }, [autoplay, autoplayInterval, programs.length]);

  /**
   * Keeps the active slide within range when the available program list changes.
   */
  useEffect(() => {
    if (activeIndex >= programs.length && programs.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, programs.length]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[330px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary dark:border-slate-700 dark:border-t-primary" />

          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Loading programs...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex h-full min-h-[330px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Unable to load programs
          </p>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {errorMessage}
          </p>

          <a
            href={exploreAllHref}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Explore All Courses
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="flex h-full min-h-[330px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            No programs available
          </p>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Check back later for new learning programs.
          </p>
        </div>
      </div>
    );
  }

  const program = programs[activeIndex];

  const imageUrl = program.thumbnailImageUrl ?? program.heroImageUrl ?? null;

  const displayPrice = program.discountPrice ?? program.price ?? null;

  return (
    <div className="relative flex h-full min-h-[330px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {eyebrow}
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h2>

          {description ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}
        </div>

        {showControls && programs.length > 1 ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={previousSlide}
              aria-label="Previous program"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next program"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {imageUrl ? (
          <div className="absolute inset-0">
            <img
              src={imageUrl}
              alt={program.title}
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/5" />
        )}

        <div className="relative z-10 flex w-full flex-col justify-end p-6 pb-10">
          <div
            className={
              imageUrl ? "text-white" : "text-slate-900 dark:text-white"
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              {program.durationValue ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium opacity-90">
                  <Clock3 className="h-3.5 w-3.5" />
                  {program.durationValue} {program.durationUnit ?? "weeks"}
                </span>
              ) : null}

              {displayPrice !== null ? (
                <span className="text-xs font-semibold">
                  {program.currency ?? "NGN"} {displayPrice.toLocaleString()}
                </span>
              ) : null}
            </div>

            <h3 className="mt-3 line-clamp-2 text-xl font-bold leading-7">
              {program.title}
            </h3>

            {program.shortDescription || program.description ? (
              <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-6 opacity-90">
                {program.shortDescription ?? program.description}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href={`/student/courses/${program.slug}`}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  imageUrl
                    ? "bg-white text-slate-900 hover:bg-slate-100"
                    : "bg-primary text-white hover:opacity-90"
                }`}
              >
                Go to Course
                <ArrowRight className="h-4 w-4" />
              </a>

              {showExploreAll ? (
                <a
                  href={exploreAllHref}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    imageUrl
                      ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
                      : "border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {exploreAllLabel}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {programs.length > 1 ? (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
          {programs.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveIndex(index);
              }}
              aria-label={`Go to ${item.title}`}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
