import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import type { AcademyProgram } from "../../../types/academy";

interface DeleteProgramDialogProps {
  program: AcademyProgram | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Display a confirmation dialog before permanently deleting an Academy program.
 */
export default function DeleteProgramDialog({
  program,
  deleting,
  onCancel,
  onConfirm,
}: DeleteProgramDialogProps) {
  // Do not render the dialog when no program has been selected.
  if (!program) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-program-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            aria-label="Close delete confirmation"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5">
          <h2
            id="delete-program-title"
            className="text-xl font-semibold text-slate-950 dark:text-white"
          >
            Delete Academy program?
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            You are about to permanently delete{" "}
            <span className="font-semibold text-slate-950 dark:text-white">
              {program.title}
            </span>
            . This action cannot be undone.
          </p>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            Supabase will block deletion if this program already has related
            registrations or certificates.
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}

            {deleting ? "Deleting..." : "Delete program"}
          </button>
        </div>
      </div>
    </div>
  );
}
