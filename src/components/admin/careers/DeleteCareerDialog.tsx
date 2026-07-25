import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import type { CareerOpening } from "../../../types/careers";

interface DeleteCareerDialogProps {
  careerOpening: CareerOpening | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// Render a confirmation dialog before permanently deleting a job opening.
export default function DeleteCareerDialog({
  careerOpening,
  deleting,
  onCancel,
  onConfirm,
}: DeleteCareerDialogProps) {
  // Do not render the dialog when no job has been selected.
  if (!careerOpening) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-career-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-box-border bg-white p-6 shadow-2xl dark:bg-box-bg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            aria-label="Close delete confirmation"
            className="rounded-xl p-2 text-heading-3 transition hover:bg-gray-100 hover:text-heading-1 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5">
          <h2
            id="delete-career-title"
            className="text-xl font-semibold text-heading-1"
          >
            Delete job opening?
          </h2>

          <p className="mt-2 text-sm leading-6 text-heading-3">
            You are about to permanently delete{" "}
            <span className="font-medium text-heading-1">
              {careerOpening.title}
            </span>
            . This action cannot be undone.
          </p>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-box-border px-4 py-2.5 text-sm font-medium text-heading-1 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
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

            {deleting ? "Deleting..." : "Delete opening"}
          </button>
        </div>
      </div>
    </div>
  );
}
