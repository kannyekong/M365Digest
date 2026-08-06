import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

interface RevenuePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  firstVisibleRecord: number;
  lastVisibleRecord: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

/**
 * Display Revenue pagination controls and the visible record range.
 */
export default function RevenuePagination({
  page,
  totalPages,
  total,
  firstVisibleRecord,
  lastVisibleRecord,
  loading,
  onPageChange,
}: RevenuePaginationProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Showing {firstVisibleRecord}–{lastVisibleRecord} of{" "}
        {total.toLocaleString("en-NG")}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
