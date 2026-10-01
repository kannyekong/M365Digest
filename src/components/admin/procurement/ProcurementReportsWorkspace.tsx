import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileText,
  Handshake,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import type {
  ProcurementReport,
  ProcurementReportSummary,
} from "../../../types/procurement";
import { SummaryCard } from "../../../islands/AdminSummaryCard";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ReportCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

/**
 * Formats a numeric amount as Nigerian Naira.
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a report stage or status into a readable label.
 */
function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Calculates the percentage represented by a value within a total.
 */
function calculatePercentage(value: number, total: number): number {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

/**
 * Renders a reusable procurement report KPI card.
 */
function ReportCard({
  label,
  value,
  icon: Icon,
  description,
}: ReportCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the procurement reporting dashboard.
 */
export default function ProcurementReportsWorkspace() {
  const [report, setReport] = useState<ProcurementReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads the latest procurement reporting data.
   */
  async function loadReport(showRefreshState = false): Promise<void> {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const response = await fetch("/api/admin/procurement/reports");

      const result: ApiResponse<ProcurementReport> = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error ?? "Unable to load procurement reports.");
      }

      setReport(result.data);
    } catch (err) {
      console.error("Failed to load procurement report:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load procurement reports."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  const summary: ProcurementReportSummary | null = report?.summary ?? null;

  const maximumPipelineValue = useMemo(() => {
    if (!report?.pipeline.length) {
      return 0;
    }

    return Math.max(...report.pipeline.map((item) => item.value), 1);
  }, [report]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading procurement reports...
        </div>
      </div>
    );
  }

  if (error || !report || !summary) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

          <div className="flex-1">
            <h2 className="font-semibold text-red-800 dark:text-red-300">
              Unable to load procurement reports
            </h2>

            <p className="mt-1 text-sm text-red-700 dark:text-red-400">
              {error ?? "No report data was returned."}
            </p>

            <button
              type="button"
              onClick={() => void loadReport(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Procurement Reports
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor procurement pipeline, business development activity,
            proposals, negotiations and contracts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadReport(true)}
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Leads"
          value={summary.total_leads}
          icon={Users}
          iconBackgroundColor="bg-green-50"
          iconColor="text-green-500"
          description={`${summary.qualified_leads} qualified`}
        />

        <SummaryCard
          label="Open Opportunities"
          value={summary.open_opportunities}
          icon={Target}
          description={`${summary.total_opportunities} total opportunities`}
          iconBackgroundColor="bg-blue-50"
          iconColor="text-blue-500"
        />

        <SummaryCard
          label="Pipeline Value"
          value={formatCurrency(summary.pipeline_value)}
          icon={TrendingUp}
          description={`Weighted: ${formatCurrency(
            summary.weighted_pipeline_value
          )}`}
          iconBackgroundColor="bg-green-50"
          iconColor="text-green-500"
        />

        <SummaryCard
          label="Won Value"
          value={formatCurrency(summary.won_value)}
          icon={CheckCircle2}
          description={`${summary.won_opportunities} won opportunities`}
          iconBackgroundColor="bg-blue-50"
          iconColor="text-blue-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Vendor Registrations"
          value={summary.active_vendor_registrations}
          icon={ClipboardList}
          description={`${summary.approved_vendor_registrations} approved`}
          iconBackgroundColor="bg-pink-50"
          iconColor="text-pink-500"
        />

        <SummaryCard
          label="Active Proposals"
          value={summary.active_proposals}
          icon={FileText}
          description={`${summary.accepted_proposals} accepted`}
          iconBackgroundColor="bg-green-50"
          iconColor="text-green-500"
        />

        <SummaryCard
          label="Active Negotiations"
          value={summary.active_negotiations}
          icon={Handshake}
          description={`${summary.agreed_negotiations} agreed`}
          iconBackgroundColor="bg-yellow-50"
          iconColor="text-yellow-500"
        />

        <SummaryCard
          label="Active Contracts"
          value={summary.active_contracts}
          icon={FileCheck2}
          description={`${summary.expiring_contracts} expiring within 60 days`}
          iconBackgroundColor="bg-purple-50"
          iconColor="text-purple-500"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Opportunity Pipeline
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Opportunity count and estimated value by pipeline stage.
            </p>
          </div>

          <BarChart3 className="h-5 w-5 text-slate-400" />
        </div>

        <div className="mt-6 space-y-4">
          {report.pipeline.map((item) => {
            const percentage = calculatePercentage(
              item.value,
              maximumPipelineValue
            );

            return (
              <div key={item.stage}>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatLabel(item.stage)}
                    </span>

                    <span className="text-xs text-slate-400">
                      {item.count}{" "}
                      {item.count === 1 ? "opportunity" : "opportunities"}
                    </span>
                  </div>

                  <span className="shrink-0 font-medium text-slate-900 dark:text-white">
                    {formatCurrency(item.value)}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-slate-700 transition-all dark:bg-slate-300"
                    style={{
                      width: `${Math.max(percentage, item.value ? 2 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Lead Sources
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Lead generation and conversion by source.
            </p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">
                    Source
                  </th>
                  <th className="pb-3 text-right font-medium text-slate-500 dark:text-slate-400">
                    Leads
                  </th>
                  <th className="pb-3 text-right font-medium text-slate-500 dark:text-slate-400">
                    Qualified
                  </th>
                  <th className="pb-3 text-right font-medium text-slate-500 dark:text-slate-400">
                    Converted
                  </th>
                </tr>
              </thead>

              <tbody>
                {report.lead_sources.map((item) => (
                  <tr
                    key={item.source}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/70"
                  >
                    <td className="py-3 font-medium text-slate-700 dark:text-slate-300">
                      {formatLabel(item.source)}
                    </td>

                    <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                      {item.count}
                    </td>

                    <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                      {item.qualified}
                    </td>

                    <td className="py-3 text-right font-medium text-slate-900 dark:text-white">
                      {item.converted}
                    </td>
                  </tr>
                ))}

                {!report.lead_sources.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-sm text-slate-500"
                    >
                      No lead source data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              RFQ / RFP Performance
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Procurement requests by lifecycle status.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {report.rfqs.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800"
              >
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {formatLabel(item.status)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.count} request
                    {item.count === 1 ? "" : "s"}
                  </p>
                </div>

                <p className="font-medium text-slate-900 dark:text-white">
                  {formatCurrency(item.estimated_value)}
                </p>
              </div>
            ))}

            {!report.rfqs.length && (
              <p className="py-8 text-center text-sm text-slate-500">
                No RFQ/RFP data available.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Proposal Performance
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Proposal volume and quoted value by status.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {report.proposals.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800"
              >
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {formatLabel(item.status)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.count} proposal
                    {item.count === 1 ? "" : "s"}
                  </p>
                </div>

                <p className="font-medium text-slate-900 dark:text-white">
                  {formatCurrency(item.quoted_value)}
                </p>
              </div>
            ))}

            {!report.proposals.length && (
              <p className="py-8 text-center text-sm text-slate-500">
                No proposal data available.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Contract Performance
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Contract volume and value by lifecycle status.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {report.contracts.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800"
              >
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {formatLabel(item.status)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.count} contract
                    {item.count === 1 ? "" : "s"}
                  </p>
                </div>

                <p className="font-medium text-slate-900 dark:text-white">
                  {formatCurrency(item.contract_value)}
                </p>
              </div>
            ))}

            {!report.contracts.length && (
              <p className="py-8 text-center text-sm text-slate-500">
                No contract data available.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Procurement Activity
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Current workload and follow-up status.
            </p>
          </div>

          <ClipboardList className="h-5 w-5 text-slate-400" />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Pending RFQs
            </p>

            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
              {summary.pending_rfqs}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Submitted RFQs
            </p>

            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
              {summary.submitted_rfqs}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Pending Follow-ups
            </p>

            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
              {summary.pending_follow_ups}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Overdue Follow-ups
            </p>

            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
              {summary.overdue_follow_ups}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Staff Performance
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Procurement workload assigned across the team.
          </p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[650px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">
                  Staff
                </th>
                <th className="pb-3 text-right font-medium text-slate-500 dark:text-slate-400">
                  Leads
                </th>
                <th className="pb-3 text-right font-medium text-slate-500 dark:text-slate-400">
                  Opportunities
                </th>
                <th className="pb-3 text-right font-medium text-slate-500 dark:text-slate-400">
                  Follow-ups
                </th>
                <th className="pb-3 text-right font-medium text-slate-500 dark:text-slate-400">
                  Contracts
                </th>
              </tr>
            </thead>

            <tbody>
              {report.staff_performance.map((item) => (
                <tr
                  key={item.staff_id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800/70"
                >
                  <td className="py-3 font-medium text-slate-700 dark:text-slate-300">
                    {item.staff_name}
                  </td>

                  <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                    {item.leads}
                  </td>

                  <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                    {item.opportunities}
                  </td>

                  <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                    {item.follow_ups}
                  </td>

                  <td className="py-3 text-right font-medium text-slate-900 dark:text-white">
                    {item.contracts}
                  </td>
                </tr>
              ))}

              {!report.staff_performance.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-sm text-slate-500"
                  >
                    No staff performance data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
