import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Landmark,
  RefreshCw,
  Search,
} from "lucide-react";

import type {
  ProvidusTransaction,
  ProvidusTransactionSummary,
} from "../../../types/providus";

import ProvidusReconciliationModal from "./ProvidusReconciliationModal";

type StatusFilter = "all" | "unreconciled" | "manual_review" | "reconciled";

interface ProvidusApiResponse {
  success: boolean;
  transactions?: ProvidusTransaction[];
  message?: string;
}

/* Formats Providus amounts as Nigerian naira. */
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(value);
}

/* Formats the server receipt timestamp for the admin UI. */
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/* Converts reconciliation states into readable labels. */
function getStatusLabel(status: ProvidusTransaction["reconciliation_status"]) {
  switch (status) {
    case "manual_review":
      return "Manual review";

    case "reconciled":
      return "Reconciled";

    case "matched":
      return "Matched";

    default:
      return "Unreconciled";
  }
}

/* Returns theme-aware classes for each reconciliation status. */
function getStatusClasses(
  status: ProvidusTransaction["reconciliation_status"]
) {
  switch (status) {
    case "reconciled":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";

    case "matched":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300";

    case "manual_review":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/* Provides the Finance workspace for reviewing and reconciling Providus transactions. */
export default function ProvidusReconciliationManager() {
  const [transactions, setTransactions] = useState<ProvidusTransaction[]>([]);

  const [selectedTransaction, setSelectedTransaction] =
    useState<ProvidusTransaction | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Loads the latest Providus transactions from the Finance API. */
  async function loadTransactions(showRefreshState = false) {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const response = await fetch("/api/admin/finance/providus", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const result = (await response.json()) as ProvidusApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load Providus transactions."
        );
      }

      setTransactions(result.transactions ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load Providus transactions."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /* Loads reconciliation data when the component mounts. */
  useEffect(() => {
    void loadTransactions();
  }, []);

  /* Calculates the dashboard counts from the loaded transactions. */
  const summary = useMemo<ProvidusTransactionSummary>(() => {
    return {
      total: transactions.length,

      unreconciled: transactions.filter(
        (transaction) => transaction.reconciliation_status === "unreconciled"
      ).length,

      manualReview: transactions.filter(
        (transaction) => transaction.reconciliation_status === "manual_review"
      ).length,

      reconciled: transactions.filter(
        (transaction) => transaction.reconciliation_status === "reconciled"
      ).length,

      credits: transactions.filter(
        (transaction) => transaction.transaction_type === "cr"
      ).length,

      debits: transactions.filter(
        (transaction) => transaction.transaction_type === "dr"
      ).length,
    };
  }, [transactions]);

  /* Applies the status and text filters to the transaction list. */
  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesStatus =
        statusFilter === "all" ||
        transaction.reconciliation_status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        transaction.reference.toLowerCase().includes(normalizedSearch) ||
        transaction.account_number.toLowerCase().includes(normalizedSearch) ||
        transaction.narration?.toLowerCase().includes(normalizedSearch);

      return matchesStatus && Boolean(matchesSearch);
    });
  }, [transactions, statusFilter, search]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Providus payment reconciliation
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Review incoming Providus bank transactions and reconcile client
              payments against projects, contracts and invoices.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadTransactions(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total transactions"
            value={summary.total}
            icon={<Landmark className="h-5 w-5" />}
            color="text-blue-600"
            bgcolor="bg-blue-50"
          />

          <SummaryCard
            label="Unreconciled"
            value={summary.unreconciled}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="text-yellow-600"
            bgcolor="bg-yellow-50"
          />

          <SummaryCard
            label="Manual review"
            value={summary.manualReview}
            icon={<Search className="h-5 w-5" />}
            color="text-orange-600"
            bgcolor="bg-orange-50"
          />

          <SummaryCard
            label="Reconciled"
            value={summary.reconciled}
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="text-green-600"
            bgcolor="bg-green-50"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reference, account or narration..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-600"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All statuses</option>
              <option value="unreconciled">Unreconciled</option>
              <option value="manual_review">Manual review</option>
              <option value="reconciled">Reconciled</option>
            </select>
          </div>

          {error && (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
              <Landmark className="h-8 w-8 text-slate-300 dark:text-slate-700" />

              <p className="mt-3 font-semibold text-slate-950 dark:text-white">
                No Providus transactions found
              </p>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Try changing your search or reconciliation filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900">
                      {transaction.transaction_type === "cr" ? (
                        <ArrowDownLeft className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950 dark:text-white">
                          {formatCurrency(Number(transaction.amount))}
                        </p>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            transaction.reconciliation_status
                          )}`}
                        >
                          {getStatusLabel(transaction.reconciliation_status)}
                        </span>
                      </div>

                      <p className="mt-1 max-w-2xl truncate text-sm text-slate-600 dark:text-slate-300">
                        {transaction.narration || "No narration supplied"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>{transaction.reference}</span>
                        <span>{formatDate(transaction.received_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {transaction.transaction_type === "cr" &&
                      transaction.reconciliation_status !== "reconciled" && (
                        <button
                          type="button"
                          onClick={() => setSelectedTransaction(transaction)}
                          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                        >
                          Reconcile
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProvidusReconciliationModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onReconciled={() => {
          void loadTransactions();
        }}
      />
    </>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  bgcolor: string;
  color: string;
}

/* Displays one reconciliation summary metric. */
function SummaryCard({ label, value, icon, bgcolor, color }: SummaryCardProps) {
  return (
    <div className={`rounded-2xl ${bgcolor} p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>

        <div className={`${color}`}>{icon}</div>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
        {value.toLocaleString("en-NG")}
      </p>
    </div>
  );
}
