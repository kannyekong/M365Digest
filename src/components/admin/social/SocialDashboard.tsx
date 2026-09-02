import { useCallback, useEffect, useState } from "react";

import { Plus, RefreshCw } from "lucide-react";

import type { SocialCampaignListItem } from "../../../lib/social/social-types";

import SocialOverview from "./SocialOverview";

import SocialPostsTable from "./SocialPostTable";

interface SocialSummary {
  total: number;
  draft: number;
  ready: number;
  scheduled: number;
  published: number;
  failed: number;
}

interface CampaignsResponse {
  success: boolean;
  campaigns?: SocialCampaignListItem[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
}

interface SummaryResponse {
  success: boolean;
  summary?: SocialSummary;
  error?: string;
}

const emptySummary: SocialSummary = {
  total: 0,
  draft: 0,
  ready: 0,
  scheduled: 0,
  published: 0,
  failed: 0,
};

/* Controls the CloudTweak Social Publishing dashboard. */
export default function SocialDashboard() {
  const [campaigns, setCampaigns] = useState<SocialCampaignListItem[]>([]);

  const [summary, setSummary] = useState<SocialSummary>(emptySummary);

  const [loading, setLoading] = useState(true);

  const [summaryLoading, setSummaryLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [status, setStatus] = useState("");

  const [platform, setPlatform] = useState("");

  const [sourceType, setSourceType] = useState("");

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  const pageSize = 10;

  /* Loads the aggregate social publishing statistics. */
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);

    try {
      const response = await fetch("/api/admin/social/summary");

      const data = (await response.json()) as SummaryResponse;

      if (!response.ok || !data.success || !data.summary) {
        throw new Error(
          data.error || "Unable to load social publishing summary."
        );
      }

      setSummary(data.summary);
    } catch (loadError) {
      console.error("Unable to load social publishing summary:", loadError);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  /* Loads one server-generated page of grouped social campaigns. */
  const loadCampaigns = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      if (status) {
        params.set("status", status);
      }

      if (platform) {
        params.set("platform", platform);
      }

      if (sourceType) {
        params.set("sourceType", sourceType);
      }

      const response = await fetch(
        `/api/admin/social/posts?${params.toString()}`
      );

      const data = (await response.json()) as CampaignsResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load social campaigns.");
      }

      setCampaigns(data.campaigns ?? []);

      setTotal(data.total ?? 0);

      setTotalPages(data.totalPages ?? 1);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load social campaigns.";

      setError(message);

      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, platform, sourceType]);

  /* Debounces campaign search before requesting another database page. */
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);

      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  /* Resets pagination whenever a campaign filter changes. */
  useEffect(() => {
    setPage(1);
  }, [status, platform, sourceType]);

  /* Loads campaigns whenever pagination, search, or filters change. */
  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  /* Loads database-wide dashboard statistics when the dashboard mounts. */
  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  /* Refreshes both campaign data and dashboard statistics. */
  async function handleRefresh() {
    await Promise.all([loadCampaigns(), loadSummary()]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">
            Social Publishing
          </h1>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            Manage blog distribution and standalone social campaigns from one
            place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={loading || summaryLoading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            <RefreshCw
              size={16}
              className={loading || summaryLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <a
            href="/admin/social/create"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-gray-950"
          >
            <Plus size={17} />
            Create Campaign
          </a>
        </div>
      </div>

      <SocialOverview summary={summary} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <SocialPostsTable
        campaigns={campaigns}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        search={search}
        status={status}
        platform={platform}
        sourceType={sourceType}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onPlatformChange={setPlatform}
        onSourceTypeChange={setSourceType}
        onPageChange={setPage}
        onRefresh={async () => {
          await Promise.all([loadCampaigns(), loadSummary()]);
        }}
      />
    </div>
  );
}
