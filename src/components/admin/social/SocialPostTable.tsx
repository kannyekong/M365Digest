import { useState } from "react";

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Eye,
  LoaderCircle,
  Pencil,
  Search,
  Send,
  Trash2,
} from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaThreads,
  FaXTwitter,
} from "react-icons/fa6";

import { toast } from "react-toastify";

import ConfirmModal from "../../../islands/ConfirmModal";

import type {
  SocialCampaignListItem,
  SocialCampaignStatus,
  SocialPlatform,
  SocialPostSource,
  SocialPostStatus,
} from "../../../lib/social/social-types";

interface SocialPostsTableProps {
  campaigns: SocialCampaignListItem[];
  loading: boolean;
  onRefresh: () => void | Promise<void>;
  page: number;
  totalPages: number;
  total: number;

  search: string;
  status: string;
  platform: string;
  sourceType: string;

  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPlatformChange: (value: string) => void;
  onSourceTypeChange: (value: string) => void;
  onPageChange: (page: number) => void;
}

type CampaignAction = "queue" | "publish";

const statusLabels: Record<SocialCampaignStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  queueing: "Queueing",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  cancelled: "Cancelled",
  partial_failure: "Partial Failure",
  in_progress: "In Progress",
};

const sourceLabels: Record<SocialPostSource, string> = {
  blog: "Blog",
  campaign: "Campaign",
};

/* Returns the appropriate social-network icon for a platform. */
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
        <span className="text-[10px] font-semibold uppercase">
          {platform.slice(0, 2)}
        </span>
      );
  }
}

/* Returns brand-aware icon styling for each supported social platform. */
function getPlatformIconClass(platform: SocialPlatform) {
  const platformClasses: Record<SocialPlatform, string> = {
    linkedin: "bg-blue-50 text-blue-500",
    twitter: "bg-black/5 text-black dark:bg-white/10 dark:text-white",
    facebook: "bg-[#1877F2]/10 text-[#1877F2]",
    instagram: "bg-[#E4405F]/10 text-[#E4405F]",
    threads: "bg-black/5 text-black dark:bg-white/10 dark:text-white",
    tiktok: "bg-black/5 text-black dark:bg-white/10 dark:text-white",
    youtube: "bg-[#FF0000]/10 text-[#FF0000]",
    pinterest: "bg-[#E60023]/10 text-[#E60023]",
    bluesky: "bg-[#1185FE]/10 text-[#1185FE]",
    mastodon: "bg-[#6364FF]/10 text-[#6364FF]",
    googlebusiness: "bg-[#4285F4]/10 text-[#4285F4]",
  };

  return platformClasses[platform];
}

/* Converts a social platform identifier into a readable label. */
function getPlatformLabel(platform: SocialPlatform) {
  const labels: Record<SocialPlatform, string> = {
    linkedin: "LinkedIn",
    twitter: "X",
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

/* Returns lifecycle styling for a grouped campaign. */
function getStatusClass(status: SocialCampaignStatus) {
  switch (status) {
    case "published":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";

    case "scheduled":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300";

    case "failed":
    case "partial_failure":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300";

    case "ready":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300";

    case "queueing":
    case "publishing":
    case "in_progress":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";

    default:
      return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300";
  }
}

/* Formats social publishing dates for the admin dashboard. */
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

/* Returns the most relevant lifecycle date for a grouped campaign. */
function getCampaignDate(campaign: SocialCampaignListItem) {
  if (campaign.status === "published" && campaign.publishedAt) {
    return campaign.publishedAt;
  }

  if (campaign.status === "scheduled" && campaign.scheduledFor) {
    return campaign.scheduledFor;
  }

  return campaign.createdAt;
}

/* Returns the lifecycle state that can safely drive campaign actions. */
function getActionableStatus(
  campaign: SocialCampaignListItem
): SocialPostStatus | null {
  const statuses = new Set(
    campaign.destinations.map((destination) => destination.status)
  );

  if (statuses.size !== 1) {
    return null;
  }

  return campaign.destinations[0]?.status ?? null;
}

/* Reads JSON API responses without exposing cryptic HTML parsing errors. */
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

/* Renders the campaign-grouped CloudTweak social publishing table. */
export default function SocialPostsTable({
  campaigns,
  loading,
  page,
  totalPages,
  total,
  search,
  status,
  platform,
  sourceType,
  onSearchChange,
  onStatusChange,
  onPlatformChange,
  onSourceTypeChange,
  onPageChange,
  onRefresh,
}: SocialPostsTableProps) {
  const [campaignToDelete, setCampaignToDelete] =
    useState<SocialCampaignListItem | null>(null);

  const [deleting, setDeleting] = useState(false);

  const [campaignAction, setCampaignAction] = useState<CampaignAction | null>(
    null
  );

  const [actionCampaignId, setActionCampaignId] = useState<string | null>(null);

  const [actionPostStatus, setActionPostStatus] =
    useState<SocialPostStatus | null>(null);

  const [processingCampaign, setProcessingCampaign] = useState(false);

  /* Stores the requested campaign delivery action before confirmation. */
  function requestCampaignAction(
    campaignId: string,
    action: CampaignAction,
    campaignStatus: SocialPostStatus
  ) {
    setActionCampaignId(campaignId);
    setCampaignAction(action);
    setActionPostStatus(campaignStatus);
  }

  /* Clears the pending campaign delivery action. */
  function clearCampaignAction() {
    if (processingCampaign) {
      return;
    }

    setActionCampaignId(null);
    setCampaignAction(null);
    setActionPostStatus(null);
  }

  /*
   * Delivers an existing campaign while preserving the destination records
   * already stored in Supabase.
   */
  async function handleCampaignAction() {
    if (!actionCampaignId || !campaignAction || !actionPostStatus) {
      return;
    }

    setProcessingCampaign(true);

    try {
      /*
       * Draft campaigns must first move through content validation before
       * they can be handed to the delivery layer.
       */
      if (actionPostStatus === "draft") {
        const prepareResponse = await fetch(
          "/api/admin/social/prepare-draft-campaign",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              campaignId: actionCampaignId,
            }),
          }
        );

        const prepareData = await readJsonResponse<{
          success: boolean;
          error?: string;
        }>(prepareResponse, "Unable to prepare campaign.");

        if (!prepareResponse.ok || !prepareData.success) {
          throw new Error(prepareData.error || "Unable to prepare campaign.");
        }
      }

      /*
       * Scheduled campaigns use their existing Buffer posts when published
       * immediately, while ready campaigns can be queued or published.
       */
      const endpoint =
        campaignAction === "queue"
          ? "/api/admin/social/queue-campaign"
          : "/api/admin/social/publish-campaign-now";

      const deliveryResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: actionCampaignId,
        }),
      });

      const deliveryData = await readJsonResponse<{
        success: boolean;
        partialSuccess?: boolean;
        summary?: {
          total: number;
          succeeded: number;
          failed: number;
        };
        error?: string;
      }>(
        deliveryResponse,
        campaignAction === "queue"
          ? "Unable to queue campaign."
          : "Unable to publish campaign."
      );

      if (!deliveryResponse.ok) {
        if (deliveryData.summary) {
          throw new Error(
            `${deliveryData.summary.failed} of ${deliveryData.summary.total} destination(s) failed.`
          );
        }

        throw new Error(
          deliveryData.error ||
            (campaignAction === "queue"
              ? "Unable to queue campaign."
              : "Unable to publish campaign.")
        );
      }

      if (!deliveryData.success && !deliveryData.partialSuccess) {
        throw new Error(
          deliveryData.error || "Unable to complete campaign delivery."
        );
      }

      if (deliveryData.partialSuccess && deliveryData.summary) {
        toast.warning(
          `${deliveryData.summary.succeeded} destination(s) succeeded and ${deliveryData.summary.failed} failed.`,
          {
            autoClose: 3500,
          }
        );
      } else {
        toast.success(
          campaignAction === "queue"
            ? "Campaign added to the publishing queue."
            : actionPostStatus === "scheduled"
              ? "Scheduled campaign published successfully."
              : "Campaign published successfully.",
          {
            autoClose: 2000,
          }
        );
      }

      setActionCampaignId(null);
      setCampaignAction(null);
      setActionPostStatus(null);

      await onRefresh();
    } catch (actionError) {
      toast.error(
        actionError instanceof Error
          ? actionError.message
          : "Unable to complete campaign action.",
        {
          autoClose: 3500,
        }
      );
    } finally {
      setProcessingCampaign(false);
    }
  }

  /* Deletes a complete campaign or one legacy destination record. */
  async function handleDeleteCampaign() {
    if (!campaignToDelete) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch("/api/admin/social/delete-campaign", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: campaignToDelete.campaignId,
          socialPostId:
            campaignToDelete.legacyPostId ??
            campaignToDelete.destinations[0]?.socialPostId,
        }),
      });

      const data = await readJsonResponse<{
        success: boolean;
        deletedCount?: number;
        error?: string;
      }>(response, "Unable to delete social campaign.");

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to delete social campaign.");
      }

      toast.success(
        campaignToDelete.campaignId
          ? "Social campaign removed from CloudTweak."
          : "Social post removed from CloudTweak.",
        {
          autoClose: 2000,
        }
      );

      setCampaignToDelete(null);

      await onRefresh();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete social campaign.",
        {
          autoClose: 3000,
        }
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-sm">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search campaigns..."
              className="w-full rounded-xl border border-gray-200 bg-transparent py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-gray-400 dark:border-gray-800 dark:text-white dark:focus:border-gray-600"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <select
              value={platform}
              onChange={(event) => onPlatformChange(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
            >
              <option value="">All platforms</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">X</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="threads">Threads</option>
            </select>

            <select
              value={sourceType}
              onChange={(event) => onSourceTypeChange(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
            >
              <option value="">All sources</option>
              <option value="blog">Blog</option>
              <option value="campaign">Campaign</option>
            </select>

            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/60">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Campaign
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Destinations
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Source
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Date
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-14">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <LoaderCircle size={18} className="animate-spin" />
                    Loading campaigns...
                  </div>
                </td>
              </tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center">
                  <p className="font-medium text-gray-900 dark:text-white">
                    No campaigns found
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Try changing your search or filters.
                  </p>
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => {
                const actionableStatus = getActionableStatus(campaign);

                const canEdit =
                  Boolean(campaign.campaignId) &&
                  (actionableStatus === "draft" ||
                    actionableStatus === "scheduled");

                const canQueue =
                  Boolean(campaign.campaignId) &&
                  (actionableStatus === "draft" ||
                    actionableStatus === "ready");

                const canPublish =
                  Boolean(campaign.campaignId) &&
                  (actionableStatus === "draft" ||
                    actionableStatus === "ready" ||
                    actionableStatus === "scheduled");

                return (
                  <tr
                    key={campaign.key}
                    className="transition hover:bg-gray-50/80 dark:hover:bg-gray-900/40"
                  >
                    <td className="max-w-md px-5 py-4">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {campaign.title || "Untitled social campaign"}
                      </p>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                        {campaign.caption}
                      </p>

                      {campaign.campaignId && (
                        <p className="mt-1.5 font-mono text-[10px] text-gray-400">
                          {campaign.campaignId.slice(0, 8)}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center">
                        {campaign.destinations
                          .slice(0, 5)
                          .map((destination, index) => (
                            <div
                              key={destination.socialPostId}
                              title={`${getPlatformLabel(
                                destination.platform
                              )} · ${
                                destination.channelName || "Connected channel"
                              } · ${statusLabels[destination.status]}`}
                              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-white text-sm shadow-sm dark:border-gray-950 ${getPlatformIconClass(
                                destination.platform
                              )} ${index > 0 ? "-ml-2" : ""}`}
                            >
                              <PlatformIcon platform={destination.platform} />
                            </div>
                          ))}

                        {campaign.destinationCount > 5 && (
                          <div className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-white bg-gray-100 text-[11px] font-semibold text-gray-600 shadow-sm dark:border-gray-950 dark:bg-gray-900 dark:text-gray-300">
                            +{campaign.destinationCount - 5}
                          </div>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        {campaign.destinationCount === 1
                          ? "1 destination"
                          : `${campaign.destinationCount} destinations`}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                        {sourceLabels[campaign.sourceType]}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(
                          campaign.status
                        )}`}
                      >
                        {statusLabels[campaign.status]}
                      </span>

                      {(campaign.status === "partial_failure" ||
                        campaign.status === "in_progress") && (
                        <p className="mt-2 text-[11px] text-gray-500">
                          {
                            campaign.destinations.filter(
                              (destination) =>
                                destination.status === "published"
                            ).length
                          }{" "}
                          of {campaign.destinationCount} published
                        </p>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                      {formatDate(getCampaignDate(campaign))}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {campaign.campaignId && (
                          <a
                            href={`/admin/social/campaign/${campaign.campaignId}`}
                            title="View campaign"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                          >
                            <Eye size={15} />
                          </a>
                        )}

                        {canEdit && campaign.campaignId && (
                          <a
                            href={`/admin/social/edit/${campaign.campaignId}`}
                            title={
                              actionableStatus === "scheduled"
                                ? "Edit scheduled campaign"
                                : "Edit campaign"
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                          >
                            <Pencil size={15} />
                          </a>
                        )}

                        {canQueue &&
                          campaign.campaignId &&
                          actionableStatus && (
                            <button
                              type="button"
                              title="Add campaign to queue"
                              disabled={processingCampaign}
                              onClick={() =>
                                requestCampaignAction(
                                  campaign.campaignId!,
                                  "queue",
                                  actionableStatus
                                )
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                            >
                              <Clock3 size={15} />
                            </button>
                          )}

                        {canPublish &&
                          campaign.campaignId &&
                          actionableStatus && (
                            <button
                              type="button"
                              title={
                                actionableStatus === "scheduled"
                                  ? "Publish scheduled campaign now"
                                  : "Publish campaign now"
                              }
                              disabled={processingCampaign}
                              onClick={() =>
                                requestCampaignAction(
                                  campaign.campaignId!,
                                  "publish",
                                  actionableStatus
                                )
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                            >
                              <Send size={15} />
                            </button>
                          )}

                        {campaign.campaignId && (
                          <a
                            href={`/admin/social/campaign/${campaign.campaignId}#analytics`}
                            title="Campaign analytics"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                          >
                            <BarChart3 size={15} />
                          </a>
                        )}

                        {campaign.destinationCount === 1 &&
                          campaign.destinations[0]?.externalUrl && (
                            <a
                              href={campaign.destinations[0].externalUrl!}
                              target="_blank"
                              rel="noreferrer"
                              title="View published post"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                            >
                              <ExternalLink size={15} />
                            </a>
                          )}

                        <button
                          type="button"
                          title={
                            campaign.campaignId
                              ? "Delete campaign"
                              : "Delete social post"
                          }
                          disabled={deleting || processingCampaign}
                          onClick={() => setCampaignToDelete(campaign)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <p className="text-sm text-gray-500">
          {total === 1 ? "1 campaign" : `${total} campaigns`}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            <ChevronLeft size={15} />
            Previous
          </button>

          <span className="px-2 text-sm text-gray-500">
            {page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={loading || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            Next
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(campaignToDelete)}
        title={
          campaignToDelete?.campaignId
            ? "Delete social campaign?"
            : "Delete social post?"
        }
        message={
          campaignToDelete?.campaignId
            ? `This will permanently remove this campaign and all ${campaignToDelete.destinationCount} destination record${
                campaignToDelete.destinationCount === 1 ? "" : "s"
              } from CloudTweak. This action cannot be undone.`
            : "This will permanently remove this social post from CloudTweak. This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setCampaignToDelete(null);
          }
        }}
        onConfirm={() => {
          void handleDeleteCampaign();
        }}
      />

      <ConfirmModal
        open={Boolean(actionCampaignId && campaignAction)}
        title={
          campaignAction === "queue"
            ? "Add campaign to queue?"
            : actionPostStatus === "scheduled"
              ? "Publish scheduled campaign now?"
              : "Publish campaign now?"
        }
        message={
          campaignAction === "queue"
            ? "Every valid destination in this campaign will be added to its Buffer publishing queue."
            : actionPostStatus === "scheduled"
              ? "This campaign is already scheduled in Buffer. Every scheduled destination will be published immediately using its existing Buffer post."
              : "Every valid destination in this campaign will be published immediately."
        }
        confirmText={
          campaignAction === "queue" ? "Add to Queue" : "Publish Now"
        }
        cancelText="Cancel"
        variant="primary"
        loading={processingCampaign}
        onCancel={clearCampaignAction}
        onConfirm={() => {
          void handleCampaignAction();
        }}
      />
    </div>
  );
}
