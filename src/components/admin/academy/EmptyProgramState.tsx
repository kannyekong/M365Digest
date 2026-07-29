import { GraduationCap, Plus } from "lucide-react";

interface EmptyProgramsStateProps {
  hasPrograms: boolean;
  onClearFilters: () => void;
}

/**
 * Display an empty state when no Academy programs exist
 * or when the active search and filters return no matches.
 */
export default function EmptyProgramsState({
  hasPrograms,
  onClearFilters,
}: EmptyProgramsStateProps) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <GraduationCap size={29} />
      </div>

      <h2 className="mt-5 text-xl font-bold text-slate-950">
        {hasPrograms ? "No matching programs" : "No Academy programs yet"}
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasPrograms
          ? "Try changing your search phrase or selected status."
          : "Create your first Academy program and publish it when it is ready for students."}
      </p>

      {hasPrograms ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Clear filters
        </button>
      ) : (
        <a
          href="/admin/academy/programs/new"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Plus size={17} />
          Create first program
        </a>
      )}
    </div>
  );
}
