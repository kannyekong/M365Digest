import {
  Archive,
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  Eye,
  FilePenLine,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  Rocket,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import type { AcademyProgram } from "../../../types/academy";
import ProgramDetail from "./ProgramDetail";
import ProgramStatusBadge from "./ProgramStatusBadge";

export type ProgramAction =
  "publish" | "draft" | "archive" | "featured" | "registration" | null;

export interface ProgramActionState {
  id: string;
  action: ProgramAction;
}

interface ProgramCardProps {
  program: AcademyProgram;
  actionState: ProgramActionState;
  onPublish: (program: AcademyProgram) => Promise<void>;
  onDraft: (program: AcademyProgram) => Promise<void>;
  onArchive: (program: AcademyProgram) => Promise<void>;
  onFeaturedToggle: (program: AcademyProgram) => Promise<void>;
  onRegistrationToggle: (program: AcademyProgram) => Promise<void>;
  onDelete: (program: AcademyProgram) => void;
}

/**
 * Convert an underscore-separated database value into a readable label.
 */
function formatEnumLabel(value: string) {
  return value
    .split("_")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Format the program price using its configured currency.
 */
function formatProgramPrice(program: AcademyProgram) {
  // Hide the price when the program is configured not to display it.
  if (!program.show_price) {
    return "Price hidden";
  }

  // Use the discounted price when one has been configured.
  const amount = program.discount_price ?? program.price;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: program.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${program.currency} ${amount.toLocaleString("en-US")}`;
  }
}

/**
 * Format the duration of an Academy program.
 */
function formatProgramDuration(program: AcademyProgram) {
  // Display a fallback when duration information is incomplete.
  if (!program.duration_value || !program.duration_unit) {
    return "Duration not specified";
  }

  // Convert the duration unit to singular when the value is one.
  const durationUnit =
    program.duration_value === 1
      ? program.duration_unit.replace(/s$/, "")
      : program.duration_unit;

  return `${program.duration_value} ${durationUnit}`;
}

/**
 * Format a program date for display.
 */
function formatProgramDate(value: string | null) {
  // Display a fallback when no date has been configured.
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

/**
 * Display one Academy program and its available management actions.
 */
export default function ProgramCard({
  program,
  actionState,
  onPublish,
  onDraft,
  onArchive,
  onFeaturedToggle,
  onRegistrationToggle,
  onDelete,
}: ProgramCardProps) {
  // Check whether this program currently has an active request.
  const isProcessing = actionState.id === program.id;

  // Choose the best available image for the program card.
  const programImage =
    program.thumbnail_image_url ??
    program.hero_image_url ??
    program.banner_image_url;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-48 overflow-hidden bg-slate-100">
        {programImage ? (
          <img
            src={programImage}
            alt={program.title}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 text-slate-400">
            <GraduationCap size={48} />
          </div>
        )}

        <div className="absolute left-4 top-4">
          <ProgramStatusBadge status={program.status} />
        </div>

        <button
          type="button"
          onClick={() => {
            void onFeaturedToggle(program);
          }}
          disabled={Boolean(actionState.id)}
          aria-label={
            program.featured
              ? `Remove ${program.title} from featured programs`
              : `Feature ${program.title}`
          }
          title={
            program.featured
              ? "Remove from featured programs"
              : "Feature this program"
          }
          className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border backdrop-blur-md transition disabled:cursor-not-allowed disabled:opacity-50 ${
            program.featured
              ? "border-amber-300 bg-amber-50/95 text-amber-500"
              : "border-white/70 bg-white/85 text-slate-500 hover:text-amber-500"
          }`}
        >
          {isProcessing && actionState.action === "featured" ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <Star
              size={18}
              className={program.featured ? "fill-current" : ""}
            />
          )}
        </button>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {program.category?.name ?? "Uncategorised"}
            </p>

            <h2 className="mt-2 text-xl font-bold leading-7 text-slate-950">
              {program.title}
            </h2>

            {program.code ? (
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                {program.code}
              </p>
            ) : null}
          </div>

          {program.certificate_enabled ? (
            <div
              title="Certificate enabled"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600"
            >
              <GraduationCap size={17} />
            </div>
          ) : null}
        </div>

        <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500">
          {program.short_description ??
            "No short description has been added for this program."}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ProgramDetail
            icon={<BookOpen size={16} />}
            label={formatEnumLabel(program.delivery_mode)}
          />

          <ProgramDetail
            icon={<CalendarDays size={16} />}
            label={formatProgramDuration(program)}
          />

          <ProgramDetail
            icon={<CircleDollarSign size={16} />}
            label={formatProgramPrice(program)}
          />

          <ProgramDetail
            icon={<Users size={16} />}
            label={
              program.maximum_students
                ? `${program.maximum_students} students`
                : "Unlimited capacity"
            }
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void onRegistrationToggle(program);
            }}
            disabled={Boolean(actionState.id)}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              program.registration_open
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {isProcessing && actionState.action === "registration" ? (
              <LoaderCircle size={13} className="animate-spin" />
            ) : program.registration_open ? (
              <Users size={13} />
            ) : (
              <LockKeyhole size={13} />
            )}

            {program.registration_open
              ? "Registration open"
              : "Registration closed"}
          </button>

          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            Starts {formatProgramDate(program.start_date)}
          </span>

          {program.featured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              <Star size={12} className="fill-current" />
              Featured
            </span>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <a
            href={`/admin/academy/programs/${program.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FilePenLine size={16} />
            Edit
          </a>

          <a
            href={`/admin/academy/programs/${program.id}/curriculum`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <BookOpen size={16} />
            Curriculum
          </a>

          <a
            href={`/admin/academy/registrations?program=${program.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Users size={16} />
            Students
          </a>

          {program.status === "published" ? (
            <a
              href={`/academy/${program.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Eye size={16} />
              Preview
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                void onPublish(program);
              }}
              disabled={Boolean(actionState.id)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing && actionState.action === "publish" ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Rocket size={16} />
              )}
              Publish
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          {program.status === "published" ? (
            <button
              type="button"
              onClick={() => {
                void onDraft(program);
              }}
              disabled={Boolean(actionState.id)}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing && actionState.action === "draft" ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <FilePenLine size={15} />
              )}
              Return to draft
            </button>
          ) : null}

          {program.status !== "archived" ? (
            <button
              type="button"
              onClick={() => {
                void onArchive(program);
              }}
              disabled={Boolean(actionState.id)}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing && actionState.action === "archive" ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <Archive size={15} />
              )}
              Archive
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onDelete(program);
            }}
            disabled={Boolean(actionState.id)}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
