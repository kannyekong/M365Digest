import { LoaderCircle, Plus, X } from "lucide-react";
import type { MouseEvent } from "react";
import type { RevenueCategory } from "../../../../types/revenue";
import RevenueForm from "./RevenueForm";
import type { RevenueFormState } from "../../../../types/revenuetable";

interface RevenueCreateModalProps {
  open: boolean;
  form: RevenueFormState;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onCategoryChange: (category: RevenueCategory) => void;
  onChange: <Key extends keyof RevenueFormState>(
    field: Key,
    value: RevenueFormState[Key]
  ) => void;
}

/**
 * Display the modal used to create a manual Revenue transaction.
 */
export default function RevenueCreateModal({
  open,
  form,
  submitting,
  onClose,
  onSubmit,
  onCategoryChange,
  onChange,
}: RevenueCreateModalProps) {
  if (!open) {
    return null;
  }

  /**
   * Close the modal only when the backdrop itself is selected.
   */
  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Add Revenue transaction
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Create a manual or imported Revenue record.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close create Revenue modal"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <RevenueForm
            form={form}
            creating
            onCategoryChange={onCategoryChange}
            onChange={onChange}
          />
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Create transaction
          </button>
        </div>
      </div>
    </div>
  );
}
