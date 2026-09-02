import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmModal from "../../../islands/ConfirmModal";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleCheck,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  ImageIcon,
  LoaderCircle,
  MessageSquare,
  MousePointer2,
  Pencil,
  RefreshCw,
  Repeat2,
  RotateCcw,
  Share2,
  Tag,
  ThumbsUp,
  TriangleAlert,
  Users,
} from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaThreads,
  FaXTwitter,
} from "react-icons/fa6";

import { toast } from "react-toastify";

import type {
  SocialPlatform,
  SocialPost,
  SocialPostStatus,
} from "../../../lib/social/social-types";

interface SocialCampaignDetailsProps {
  campaignId: string;
}

interface CampaignResponse {
  success: boolean;
  campaignId?: string;
  posts?: SocialPost[];
  error?: string;
}

interface RetryCampaignResponse {
  success: boolean;
  partialSuccess?: boolean;
  error?: string;
  summary?: {
    total: number;
    failed: number;
    attempted: number;
    recovered: number;
    stillFailed: number;
    skipped: number;
  };
}

interface NormalizedMetrics {
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  reposts: number | null;
  reach: number | null;
  impressions: number | null;
  views: number | null;
  clicks: number | null;
  engagementRate: number | null;
}

interface CampaignAnalyticsDestination {
  socialPostId: string;
  bufferPostId: string | null;
  platform: SocialPlatform;
  channelName: string | null;
  status: SocialPostStatus;
  externalUrl: string | null;
  metrics: NormalizedMetrics;
  metricsUpdatedAt: string | null;
  providerUpdatedAt: string | null;
  syncedAt: string | null;
}

interface CampaignAnalytics {
  totals: NormalizedMetrics;
  destinationCount: number;
  publishedCount: number;
  destinations: CampaignAnalyticsDestination[];
  lastUpdatedAt: string | null;
}

interface AnalyticsResponse {
  success: boolean;
  campaignId?: string;
  analytics?: CampaignAnalytics;
  error?: string;
}

interface RefreshAnalyticsResponse {
  success: boolean;
  partialSuccess?: boolean;
  summary?: {
    total: number;
    refreshed: number;
    skipped: number;
    failed: number;
  };
  error?: string;
}

const statusLabels: Record<SocialPostStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  queueing: "Queueing",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  cancelled: "Cancelled",
};

const emptyMetrics: NormalizedMetrics = {
  reactions: null,
  comments: null,
  shares: null,
  reposts: null,
  reach: null,
  impressions: null,
  views: null,
  clicks: null,
  engagementRate: null,
};

/* Returns the appropriate social-network icon for a destination. */
function PlatformIcon({ platform }: { platform: SocialPlatform }) {
  switch (platform) {
    case "linkedin":
      return <FaLinkedinIn />;

    case "twitter":
      return <FaXTwitter />;

    case "facebook":
      return <FaFacebookF />;

    case "instagram":
      return <FaInstagram />;

    case "threads":
      return <FaThreads />;

    default:
      return (
        <span className="text-[10px] font-bold uppercase">
          {platform.slice(0, 2)}
        </span>
      );
  }
}

/* Returns the readable name for each supported social platform. */
function getPlatformLabel(platform: SocialPlatform) {
  const labels: Record<SocialPlatform, string> = {
    linkedin: "LinkedIn",
    twitter: "X (Twitter)",
    facebook: "Facebook",
    instagram: "Instagram",
    threads: "Threads",
    tiktok: "TikTok",
    youtube: "YouTube",
    pinterest: "Pinterest",
    bluesky: "Bluesky",
    mastodon: "Mastodon",
    googlebusiness: "Google Business",
  };

  return labels[platform];
}

/* Returns platform-brand styling used by destination icons. */
function getPlatformIconClass(platform: SocialPlatform) {
  const classes: Record<SocialPlatform, string> = {
    linkedin: "bg-[#0A66C2] text-white",
    twitter: "bg-black text-white dark:bg-white dark:text-black",
    facebook: "bg-[#1877F2] text-white",
    instagram:
      "bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#FCAF45] text-white",
    threads: "bg-black text-white dark:bg-white dark:text-black",
    tiktok: "bg-black text-white dark:bg-white dark:text-black",
    youtube: "bg-[#FF0000] text-white",
    pinterest: "bg-[#E60023] text-white",
    bluesky: "bg-[#1185FE] text-white",
    mastodon: "bg-[#6364FF] text-white",
    googlebusiness: "bg-[#4285F4] text-white",
  };

  return classes[platform];
}

/* Returns visual styling for destination lifecycle statuses. */
function getStatusClass(status: SocialPostStatus) {
  switch (status) {
    case "published":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

    case "scheduled":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

    case "failed":
      return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";

    case "ready":
      return "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300";

    case "queueing":
    case "publishing":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300";
  }
}

/* Formats stored dates consistently across the campaign page. */
function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/* Formats numeric analytics values while preserving unavailable metrics. */
function formatMetric(value: number | null) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(value);
}

/* Formats percentage metrics for the campaign analytics UI. */
function formatPercentage(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

/* Safely reads JSON API responses and rejects unexpected HTML responses. */
async function readJsonResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      `${fallbackMessage} The server returned ${response.status} instead of JSON.`
    );
  }

  return (await response.json()) as T;
}

/* Displays one compact performance metric beneath a social destination. */
function DestinationMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 border-r border-gray-100 px-3 last:border-r-0 dark:border-gray-800">
      <span className="shrink-0 text-gray-400">{icon}</span>

      <span className="hidden text-[11px] text-gray-500 2xl:inline">
        {label}
      </span>

      <span className="ml-auto text-xs font-semibold text-gray-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

/* Displays a campaign-wide analytics metric card. */
function AnalyticsMetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border-r border-gray-100 px-4 last:border-r-0 dark:border-gray-800">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-500">{label}</p>

          <p className="mt-1 text-xl font-semibold tracking-tight text-gray-950 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/* Renders the full CloudTweak campaign details and analytics workspace. */
export default function SocialCampaignDetails({
  campaignId,
}: SocialCampaignDetailsProps) {
  const [posts, setPosts] = useState<SocialPost[]>([]);

  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);

  const [retryingFailed, setRetryingFailed] = useState(false);
  const [retryConfirmOpen, setRetryConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const [refreshingAnalytics, setRefreshingAnalytics] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /* Retries only failed destinations without touching successful deliveries. */
  async function handleRetryFailed() {
    if (lifecycleSummary.failed === 0) {
      toast.info("This campaign has no failed destinations.", {
        autoClose: 2200,
      });

      return;
    }

    setRetryingFailed(true);

    try {
      const response = await fetch("/api/admin/social/retry-campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId,
        }),
      });

      const data = await readJsonResponse<RetryCampaignResponse>(
        response,
        "Unable to retry failed campaign destinations."
      );

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to retry failed campaign destinations."
        );
      }

      if (!data.summary) {
        throw new Error("The retry response did not include a summary.");
      }

      if (data.summary.stillFailed > 0 && data.summary.recovered > 0) {
        toast.warning(
          `${data.summary.recovered} destination(s) recovered. ${data.summary.stillFailed} still failed.`,
          {
            autoClose: 4000,
          }
        );
      } else if (data.summary.stillFailed > 0) {
        toast.error(
          `${data.summary.stillFailed} destination(s) could not be recovered.`,
          {
            autoClose: 4000,
          }
        );
      } else {
        toast.success(
          `${data.summary.recovered} failed destination(s) recovered successfully.`,
          {
            autoClose: 2500,
          }
        );
      }
      setRetryConfirmOpen(false);
      /*
       * Reload campaign lifecycle data first. Analytics is also reloaded so
       * previously stored metrics remain synchronized with the current UI.
       */
      await Promise.all([loadCampaign(), loadAnalytics()]);
    } catch (retryError) {
      toast.error(
        retryError instanceof Error
          ? retryError.message
          : "Unable to retry failed campaign destinations.",
        {
          autoClose: 4000,
        }
      );
    } finally {
      setRetryingFailed(false);
    }
  }

  /* Loads all CloudTweak destination records for the current campaign. */
  const loadCampaign = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const response = await fetch(
        `/api/admin/social/campaign/${encodeURIComponent(campaignId)}`
      );

      const data = await readJsonResponse<CampaignResponse>(
        response,
        "Unable to load social campaign."
      );

      if (!response.ok || !data.success || !data.posts) {
        throw new Error(data.error || "Unable to load social campaign.");
      }

      setPosts(data.posts);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load social campaign.";

      setError(message);

      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  /* Loads campaign analytics from Supabase without contacting Buffer. */
  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);

    try {
      const response = await fetch(
        `/api/admin/social/campaign/${encodeURIComponent(campaignId)}/analytics`
      );

      const data = await readJsonResponse<AnalyticsResponse>(
        response,
        "Unable to load campaign analytics."
      );

      if (!response.ok || !data.success || !data.analytics) {
        throw new Error(data.error || "Unable to load campaign analytics.");
      }

      setAnalytics(data.analytics);
    } catch (analyticsError) {
      console.error(
        "Unable to load social campaign analytics:",
        analyticsError
      );

      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [campaignId]);

  /* Refreshes metrics from Buffer before reloading stored analytics. */
  async function handleRefreshAnalytics() {
    setRefreshingAnalytics(true);

    try {
      const response = await fetch(
        `/api/admin/social/campaign/${encodeURIComponent(
          campaignId
        )}/refresh-analytics`,
        {
          method: "POST",
        }
      );

      const data = await readJsonResponse<RefreshAnalyticsResponse>(
        response,
        "Unable to refresh campaign analytics."
      );

      if (!response.ok && !data.partialSuccess) {
        throw new Error(data.error || "Unable to refresh campaign analytics.");
      }

      if (data.partialSuccess && data.summary) {
        toast.warning(
          `${data.summary.refreshed} destination(s) refreshed and ${data.summary.failed} failed.`,
          {
            autoClose: 3500,
          }
        );
      } else if (data.summary) {
        toast.success(
          `${data.summary.refreshed} destination(s) refreshed successfully.`,
          {
            autoClose: 2200,
          }
        );
      }

      await Promise.all([loadAnalytics(), loadCampaign()]);
    } catch (refreshError) {
      toast.error(
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to refresh campaign analytics.",
        {
          autoClose: 3500,
        }
      );
    } finally {
      setRefreshingAnalytics(false);
    }
  }

  /* Loads both campaign records and stored metrics when the page mounts. */
  useEffect(() => {
    void Promise.all([loadCampaign(), loadAnalytics()]);
  }, [loadCampaign, loadAnalytics]);

  /* Calculates destination lifecycle totals displayed in the overview cards. */
  const lifecycleSummary = useMemo(() => {
    return posts.reduce(
      (summary, post) => {
        summary.total += 1;

        if (post.status === "published") {
          summary.published += 1;
        }

        if (post.status === "scheduled") {
          summary.scheduled += 1;
        }

        if (post.status === "failed") {
          summary.failed += 1;
        }

        return summary;
      },
      {
        total: 0,
        published: 0,
        scheduled: 0,
        failed: 0,
      }
    );
  }, [posts]);

  /* Returns the synchronized analytics record for a destination. */
  function getDestinationAnalytics(postId: string) {
    return analytics?.destinations.find(
      (destination) => destination.socialPostId === postId
    );
  }

  const firstPost = posts[0] ?? null;

  const totals = analytics?.totals ?? emptyMetrics;

  const canEdit =
    posts.length > 0 &&
    posts.every(
      (post) => post.status === "draft" || post.status === "scheduled"
    ) &&
    new Set(posts.map((post) => post.status)).size === 1;

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <LoaderCircle size={18} className="animate-spin" />
          Loading campaign...
        </div>
      </div>
    );
  }

  if (error || !firstPost) {
    return (
      <div className="space-y-6">
        <a
          href="/admin/social"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Social Publishing
        </a>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-950 dark:bg-red-950/30">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-500" />

            <div>
              <p className="font-semibold text-red-900 dark:text-red-200">
                Unable to load campaign
              </p>

              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                {error || "This campaign could not be found."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-4">
          <a
            href="/admin/social"
            title="Back to Social Publishing"
            className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            <ArrowLeft size={18} />
          </a>

          <div>
            <a
              href="/admin/social"
              className="text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:hover:text-white"
            >
              Back to Social Publishing
            </a>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">
                {firstPost.title || "Untitled social campaign"}
              </h1>

              <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-medium capitalize text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                {firstPost.source_type}
              </span>
            </div>

            <p className="mt-2 text-xs font-semibold bg-blue-100 text-blue-500 p-2 rounded-lg">
              Campaign ID{" "}
              <span className="ml-1 rounded-md bg-gray-100 px-2 py-1 font-mono font-light text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                {campaignId}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void Promise.all([loadCampaign(), loadAnalytics()])}
            disabled={loading || analyticsLoading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            <RefreshCw
              size={16}
              className={loading || analyticsLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          {canEdit && (
            <a
              href={`/admin/social/edit/${campaignId}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              <Pencil size={16} />
              Edit Campaign
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Destinations
            </p>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
              <Share2 size={19} />
            </div>
          </div>

          <p className="mt-1 text-3xl font-semibold text-gray-950 dark:text-white">
            {lifecycleSummary.total}
          </p>

          <p className="mt-4 text-sm text-gray-500">
            Social channels in this campaign
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Published
            </p>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CircleCheck size={19} />
            </div>
          </div>

          <p className="mt-1 text-3xl font-semibold text-gray-950 dark:text-white">
            {lifecycleSummary.published}
          </p>

          <p className="mt-4 text-sm text-gray-500">
            Successfully distributed posts
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Scheduled
            </p>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Clock3 size={19} />
            </div>
          </div>

          <p className="mt-1 text-3xl font-semibold text-gray-950 dark:text-white">
            {lifecycleSummary.scheduled}
          </p>

          <p className="mt-4 text-sm text-gray-500">
            Waiting in the publishing queue
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Failed
            </p>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400">
              <TriangleAlert size={19} />
            </div>
          </div>

          <p className="mt-1 text-3xl font-semibold text-gray-950 dark:text-white">
            {lifecycleSummary.failed}
          </p>

          <p className="mt-4 text-sm text-gray-500">
            Destinations requiring attention
          </p>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h2 className="font-semibold text-gray-950 dark:text-white">
              Destinations
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Delivery status and performance for every destination in this
              campaign.
            </p>
          </div>

          <div className="space-y-3 p-4">
            {posts.map((post) => {
              const destinationAnalytics = getDestinationAnalytics(post.id);

              const metrics = destinationAnalytics?.metrics ?? emptyMetrics;

              return (
                <article
                  key={post.id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                >
                  <div className="grid gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)_auto] lg:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${getPlatformIconClass(
                          post.platform
                        )}`}
                      >
                        <PlatformIcon platform={post.platform} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-950 dark:text-white">
                            {getPlatformLabel(post.platform)}
                          </p>

                          <span
                            className={`rounded-md px-2 py-1 text-[10px] font-medium ${getStatusClass(
                              post.status
                            )}`}
                          >
                            {statusLabels[post.status]}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs text-gray-500">
                          {post.channel_name || "Connected channel"}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm leading-5 text-gray-700 dark:text-gray-300">
                        {post.caption}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={12} />

                          {post.status === "scheduled"
                            ? formatDate(post.scheduled_for)
                            : formatDate(post.published_at)}
                        </span>

                        <span>•</span>

                        <span>
                          {post.status === "published"
                            ? `Published ${formatDate(post.published_at)}`
                            : statusLabels[post.status]}
                        </span>
                      </div>
                    </div>

                    <div>
                      {post.external_url ? (
                        <a
                          href={post.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
                        >
                          View Post
                          <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span className="inline-flex h-9 items-center rounded-lg bg-gray-100 px-3 text-xs font-medium text-gray-500 dark:bg-gray-900">
                          {statusLabels[post.status]}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-t border-gray-100 py-3 sm:grid-cols-4 xl:grid-cols-7 dark:border-gray-800">
                    <DestinationMetric
                      icon={<Eye size={14} />}
                      label="Impressions"
                      value={formatMetric(metrics.impressions)}
                    />

                    <DestinationMetric
                      icon={<Users size={14} />}
                      label="Reach"
                      value={formatMetric(metrics.reach)}
                    />

                    <DestinationMetric
                      icon={<ThumbsUp size={14} />}
                      label="Reactions"
                      value={formatMetric(metrics.reactions)}
                    />

                    <DestinationMetric
                      icon={<MessageSquare size={14} />}
                      label="Comments"
                      value={formatMetric(metrics.comments)}
                    />

                    <DestinationMetric
                      icon={<Repeat2 size={14} />}
                      label="Shares"
                      value={formatMetric(metrics.shares ?? metrics.reposts)}
                    />

                    <DestinationMetric
                      icon={<MousePointer2 size={14} />}
                      label="Clicks"
                      value={formatMetric(metrics.clicks)}
                    />

                    <DestinationMetric
                      icon={<BarChart3 size={14} />}
                      label="Eng. Rate"
                      value={formatPercentage(metrics.engagementRate)}
                    />
                  </div>

                  {post.error_message && (
                    <div className="border-t border-red-100 bg-red-50 px-4 py-3 dark:border-red-950 dark:bg-red-950/20">
                      <div className="flex items-start gap-2">
                        <AlertCircle
                          size={14}
                          className="mt-0.5 shrink-0 text-red-500"
                        />

                        <p className="text-xs leading-5 text-red-700 dark:text-red-300">
                          {post.error_message}
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <h2 className="font-semibold text-gray-950 dark:text-white">
              Campaign Information
            </h2>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-[22px_78px_minmax(0,1fr)] items-start gap-2">
                <CalendarDays size={15} className="mt-0.5 text-gray-400" />

                <span className="text-xs text-gray-500">Created</span>

                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {formatDate(firstPost.created_at)}
                </span>
              </div>

              <div className="grid grid-cols-[22px_78px_minmax(0,1fr)] items-start gap-2">
                <Tag size={15} className="mt-0.5 text-gray-400" />

                <span className="text-xs text-gray-500">Source</span>

                <span className="text-xs font-medium capitalize text-gray-700 dark:text-gray-300">
                  {firstPost.source_type}
                </span>
              </div>

              <div className="grid grid-cols-[22px_78px_minmax(0,1fr)] items-start gap-2">
                <ImageIcon size={15} className="mt-0.5 text-gray-400" />

                <span className="text-xs text-gray-500">Media</span>

                <span className="text-xs font-medium capitalize text-gray-700 dark:text-gray-300">
                  {firstPost.media_type || "None"}
                </span>
              </div>

              <div className="grid grid-cols-[22px_78px_minmax(0,1fr)] items-start gap-2">
                <Copy size={15} className="mt-0.5 text-gray-400" />

                <span className="text-xs text-gray-500">Campaign ID</span>

                <span className="break-all font-mono text-[10px] text-gray-600 dark:text-gray-400">
                  {campaignId}
                </span>
              </div>
            </div>
          </section>

          {firstPost.media_url && (
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                <h2 className="font-semibold text-gray-950 dark:text-white">
                  Campaign Media
                </h2>
              </div>

              <div className="p-4">
                <img
                  src={firstPost.media_url}
                  alt={firstPost.title || "Campaign media"}
                  className="aspect-[16/8] w-full rounded-xl object-cover"
                />
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  lifecycleSummary.failed > 0
                    ? "bg-red-50 text-red-500 dark:bg-red-950/40"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
                }`}
              >
                {lifecycleSummary.failed > 0 ? (
                  <TriangleAlert size={19} />
                ) : (
                  <CheckCircle2 size={19} />
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-950 dark:text-white">
                  Delivery Summary
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {lifecycleSummary.published} published ·{" "}
                  {lifecycleSummary.scheduled} scheduled ·{" "}
                  {lifecycleSummary.failed} failed
                </p>

                <p className="mt-2 text-[11px] text-gray-400">
                  Last updated: {formatDate(analytics?.lastUpdatedAt ?? null)}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {lifecycleSummary.failed > 0 && (
                <button
                  type="button"
                  onClick={() => setRetryConfirmOpen(true)}
                  disabled={retryingFailed}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-3 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw
                    size={14}
                    className={retryingFailed ? "animate-spin" : ""}
                  />

                  {retryingFailed ? "Retrying..." : "Retry Failed"}
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleRefreshAnalytics()}
                disabled={refreshingAnalytics}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 px-3 text-xs font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950/30"
              >
                <RefreshCw
                  size={14}
                  className={refreshingAnalytics ? "animate-spin" : ""}
                />
                Refresh Analytics
              </button>
            </div>
          </section>
        </aside>
      </div>

      <section
        id="analytics"
        className="scroll-mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
      >
        <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
              <BarChart3 size={18} />
            </div>

            <div>
              <h2 className="font-semibold text-gray-950 dark:text-white">
                Campaign Analytics
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Aggregated performance across all published destinations.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-gray-500">
              Last updated: {formatDate(analytics?.lastUpdatedAt ?? null)}
            </p>

            <button
              type="button"
              onClick={() => void handleRefreshAnalytics()}
              disabled={refreshingAnalytics}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 px-3 text-xs font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950/30"
            >
              <RefreshCw
                size={14}
                className={refreshingAnalytics ? "animate-spin" : ""}
              />
              Refresh Analytics
            </button>
          </div>
        </div>

        {analyticsLoading ? (
          <div className="flex h-32 items-center justify-center gap-2 text-sm text-gray-500">
            <LoaderCircle size={17} className="animate-spin" />
            Loading analytics...
          </div>
        ) : (
          <div className="overflow-x-auto p-4">
            <div className="grid min-w-[1050px] grid-cols-7 rounded-xl border border-gray-200 py-4 dark:border-gray-800">
              <AnalyticsMetricCard
                icon={<Eye size={17} />}
                label="Impressions"
                value={formatMetric(totals.impressions)}
              />

              <AnalyticsMetricCard
                icon={<Users size={17} />}
                label="Reach"
                value={formatMetric(totals.reach)}
              />

              <AnalyticsMetricCard
                icon={<ThumbsUp size={17} />}
                label="Reactions"
                value={formatMetric(totals.reactions)}
              />

              <AnalyticsMetricCard
                icon={<MessageSquare size={17} />}
                label="Comments"
                value={formatMetric(totals.comments)}
              />

              <AnalyticsMetricCard
                icon={<Share2 size={17} />}
                label="Shares"
                value={formatMetric(totals.shares ?? totals.reposts)}
              />

              <AnalyticsMetricCard
                icon={<MousePointer2 size={17} />}
                label="Clicks"
                value={formatMetric(totals.clicks)}
              />

              <AnalyticsMetricCard
                icon={<BarChart3 size={17} />}
                label="Engagement Rate"
                value={formatPercentage(totals.engagementRate)}
              />
            </div>
          </div>
        )}
      </section>
      <ConfirmModal
        open={retryConfirmOpen}
        title="Retry Failed Destinations"
        message={`This will retry ${lifecycleSummary.failed} failed ${
          lifecycleSummary.failed === 1 ? "destination" : "destinations"
        }. Published and scheduled destinations will not be affected.`}
        confirmText="Retry Failed"
        cancelText="Cancel"
        variant="warning"
        loading={retryingFailed}
        onConfirm={() => void handleRetryFailed()}
        onCancel={() => {
          if (!retryingFailed) {
            setRetryConfirmOpen(false);
          }
        }}
      />
    </div>
  );
}
