import { useState } from "react";
import {
  ShieldUser,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Globe,
} from "lucide-react";

export interface CourseInstructor {
  id: string;
  full_name: string;
  job_title?: string | null;
  photo_url?: string | null;
  email: string;
  phone: string;
  website: string;
}

interface CourseInstructorCarouselProps {
  instructors: CourseInstructor[];
}

export default function CourseInstructorCarousel({
  instructors,
}: CourseInstructorCarouselProps) {
  // Tracks which assigned instructor is currently displayed.
  const [activeIndex, setActiveIndex] = useState(0);

  // Moves to the previous or next instructor and wraps at either end.
  const moveSlide = (direction: -1 | 1) => {
    setActiveIndex(
      (current) =>
        (current + direction + instructors.length) % instructors.length
    );
  };

  if (!instructors.length) return null;

  const instructor = instructors[activeIndex];

  return (
    <section className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-1 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="relative z-10 mt-4" aria-live="polite" aria-atomic="true">
        <div className="flex items-center gap-4">
          {instructor.photo_url ? (
            <img
              src={instructor.photo_url}
              alt={instructor.full_name}
              className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-violet-100 dark:ring-violet-900"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-500 dark:bg-violet-950/40">
              <ShieldUser size={27} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {instructor.full_name}
            </p>

            {instructor.job_title && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {instructor.job_title}
              </p>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <a
                href={`mailto:${instructor.email}`}
                aria-label={`Email ${instructor.full_name}`}
                title={instructor.email}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50"
              >
                <Mail size={16} />
              </a>

              <a
                href={`https://wa.me/${instructor.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Contact ${instructor.full_name} on WhatsApp`}
                title={instructor.phone}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50 text-green-600 transition hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50"
              >
                <Phone size={16} />
              </a>
              <a
                href={`${instructor.website}`}
                target="_blank"
                rel="noreferrer"
                title={instructor.website}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:bg-green-950/30 dark:hover:bg-green-950/50"
              >
                <Globe size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-2 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <span className="text-xs text-slate-400">
          Instructor {activeIndex + 1} of {instructors.length}
        </span>

        {instructors.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => moveSlide(-1)}
              aria-label="Previous instructor"
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() => moveSlide(1)}
              aria-label="Next instructor"
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
