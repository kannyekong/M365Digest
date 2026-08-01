import { Filter, Search, X } from "lucide-react";
import type {
  RevenueCategory,
  RevenueProvider,
  RevenueReconciliationStatus,
  RevenueStatus,
} from "../../../../types/revenue";
import {
  RECONCILIATION_STATUSES,
  REVENUE_CATEGORIES,
  REVENUE_PROVIDERS,
  REVENUE_STATUSES,
} from "../../../../config/revenueTable";
import type { RevenueFilterState } from "../../../../types/revenuetable";

interface RevenueFilterPanelProps {
  filters: RevenueFilterState;
  visible: boolean;
  activeFilterCount: number;
  onToggleVisibility: () => void;
  onClear: () => void;
  onChange: <Key extends keyof RevenueFilterState>(
    field: Key,
    value: RevenueFilterState[Key]
  ) => void;
}

const inputClasses =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

/**
 * Display the Revenue search field and advanced filters.
 */
export default function RevenueFilterPanel({
  filters,
  visible,
  activeFilterCount,
  onToggleVisibility,
  onClear,
  onChange,
}: RevenueFilterPanelProps) {
  return (
    <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-md">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className={`${inputClasses} mt-0 pl-10`}
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Search reference, customer, description..."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleVisibility}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>
      </div>

      {visible && (
        <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Category
            <select
              className={inputClasses}
              value={filters.category}
              onChange={(event) =>
                onChange(
                  "category",
                  event.target.value as RevenueCategory | "all"
                )
              }
            >
              <option value="all">All categories</option>
              {REVENUE_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Provider
            <select
              className={inputClasses}
              value={filters.provider}
              onChange={(event) =>
                onChange(
                  "provider",
                  event.target.value as RevenueProvider | "all"
                )
              }
            >
              <option value="all">All providers</option>
              {REVENUE_PROVIDERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Status
            <select
              className={inputClasses}
              value={filters.status}
              onChange={(event) =>
                onChange("status", event.target.value as RevenueStatus | "all")
              }
            >
              <option value="all">All statuses</option>
              {REVENUE_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Reconciliation
            <select
              className={inputClasses}
              value={filters.reconciliationStatus}
              onChange={(event) =>
                onChange(
                  "reconciliationStatus",
                  event.target.value as RevenueReconciliationStatus | "all"
                )
              }
            >
              <option value="all">All reconciliation states</option>
              {RECONCILIATION_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Currency
            <input
              className={inputClasses}
              maxLength={3}
              value={filters.currency}
              onChange={(event) =>
                onChange("currency", event.target.value.toUpperCase())
              }
              placeholder="NGN"
            />
          </label>

          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            From
            <input
              className={inputClasses}
              type="date"
              value={filters.dateFrom}
              onChange={(event) => onChange("dateFrom", event.target.value)}
            />
          </label>

          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            To
            <input
              className={inputClasses}
              type="date"
              value={filters.dateTo}
              onChange={(event) => onChange("dateTo", event.target.value)}
            />
          </label>

          <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={filters.includeArchived}
              onChange={(event) =>
                onChange("includeArchived", event.target.checked)
              }
            />
            Include archived
          </label>
        </div>
      )}
    </div>
  );
}
