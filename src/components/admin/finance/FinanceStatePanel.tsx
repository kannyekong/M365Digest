import {
  AlertCircle,
  Inbox,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

interface FinanceStatePanelProps {
  type: "loading" | "empty" | "error";
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/**
 * Render one shared loading, empty, or error state.
 */
export default function FinanceStatePanel({
  type,
  title,
  message,
  onRetry,
}: FinanceStatePanelProps) {
  const config = {
    loading: {
      icon: LoaderCircle,
      defaultTitle: "Loading Finance data",
      defaultMessage:
        "Please wait while the latest records are retrieved.",
      iconClass:
        "animate-spin text-blue-600 dark:text-blue-400",
    },

    empty: {
      icon: Inbox,
      defaultTitle: "No records found",
      defaultMessage:
        "There are no Finance records matching the current filters.",
      iconClass:
        "text-slate-400",
    },

    error: {
      icon: AlertCircle,
      defaultTitle:
        "Finance data could not be loaded",
      defaultMessage:
        "Something went wrong while retrieving this information.",
      iconClass:
        "text-red-600 dark:text-red-400",
    },
  }[type];

  const Icon = config.icon;

  return (
    <section className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Icon
        size={34}
        className={config.iconClass}
      />

      <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
        {title ?? config.defaultTitle}
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
        {message ?? config.defaultMessage}
      </p>

      {type === "error" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      )}
    </section>
  );
}
