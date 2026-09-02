import { useEffect, useMemo, useState } from "react";
import SocialMediaUploader from "./SocialMediaUploader";
import ConfirmModal from "../../../islands/ConfirmModal";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Save,
  Send,
} from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaThreads,
  FaXTwitter,
} from "react-icons/fa6";

import {
  getSocialPlatformConfig,
  validateSocialContent,
} from "../../../lib/social/social-platforms";

import type {
  SocialChannel,
  SocialPlatform,
  SocialPost,
} from "../../../lib/social/social-types";
import { toast } from "react-toastify";

interface ChannelsResponse {
  success: boolean;

  organization?: {
    id: string;
    name: string;
  };

  channels?: SocialChannel[];
  error?: string;
}

interface SocialValidationResponse {
  valid: boolean;
  characterCount: number;
  maxCharacters: number | null;
  remainingCharacters: number | null;
  errors: string[];
  warnings: string[];
}

interface ScheduledCampaignUpdateResponse {
  success: boolean;
  partialSuccess?: boolean;

  summary?: {
    total: number;
    succeeded: number;
    failed: number;
  };

  error?: string;
}

interface CreateResponse {
  success: boolean;
  campaignId?: string;

  posts?: Array<{
    post: SocialPost;
    validation: SocialValidationResponse;
  }>;

  error?: string;
}

interface CampaignDeliverySummary {
  total: number;
  succeeded: number;
  failed: number;
}

interface CampaignDeliveryResponse {
  success: boolean;
  partialSuccess?: boolean;
  campaignId?: string;
  mode?: "queue" | "publish";
  summary?: CampaignDeliverySummary;
  error?: string;
}
type ComposerAction = "draft" | "update" | "queue" | "publish";

interface SocialComposerProps {
  mode?: "create" | "edit";
  campaignId?: string;
}

interface CampaignResponse {
  success: boolean;
  campaignId?: string;
  posts?: SocialPost[];
  error?: string;
}

interface UpdateCampaignResponse {
  success: boolean;
  campaignId?: string;
  posts?: SocialPost[];
  error?: string;
}

/* Returns the appropriate brand icon for a social platform. */
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
        <span className="text-xs font-semibold uppercase">
          {platform.slice(0, 2)}
        </span>
      );
  }
}

/* Loads and controls the standalone multi-destination social campaign composer. */
export default function SocialComposer({
  mode = "create",
  campaignId,
}: SocialComposerProps) {
  const [channels, setChannels] = useState<SocialChannel[]>([]);

  const [loadingChannels, setLoadingChannels] = useState(true);

  const [channelError, setChannelError] = useState<string | null>(null);

  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);

  const [captions, setCaptions] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");

  const [mediaUrl, setMediaUrl] = useState("");

  const [action, setAction] = useState<ComposerAction | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const [publishConfirmationOpen, setPublishConfirmationOpen] = useState(false);

  const [loadingCampaign, setLoadingCampaign] = useState(mode === "edit");

  const [campaignStatus, setCampaignStatus] = useState<
    SocialPost["status"] | null
  >(null);

  const isEditMode = mode === "edit";

  const busy = action !== null;

  /* Resolves the currently selected channel records from their Buffer IDs. */
  const selectedChannels = useMemo(
    () =>
      selectedChannelIds
        .map((channelId) =>
          channels.find((channel) => channel.id === channelId)
        )
        .filter((channel): channel is SocialChannel => Boolean(channel)),
    [channels, selectedChannelIds]
  );

  /*
   * Determines whether every selected destination contains valid content and
   * is available for publishing.
   */
  const campaignReady = useMemo(() => {
    if (selectedChannels.length === 0) {
      return false;
    }

    return selectedChannels.every((channel) => {
      if (channel.isQueuePaused) {
        return false;
      }

      const validation = validateSocialContent(
        channel.platform,
        captions[channel.id] ?? ""
      );

      return validation.valid;
    });
  }, [selectedChannels, captions]);

  /*
   * Retrieves connected Buffer channels and, when editing, hydrates the
   * composer from the existing draft campaign.
   */
  useEffect(() => {
    async function loadComposer() {
      setLoadingChannels(true);
      setChannelError(null);

      if (isEditMode) {
        setLoadingCampaign(true);
      }

      try {
        const channelsResponse = await fetch("/api/admin/social/channels");

        const channelsData = await readJsonResponse<ChannelsResponse>(
          channelsResponse,
          "Unable to load social channels."
        );

        if (!channelsResponse.ok || !channelsData.success) {
          throw new Error(
            channelsData.error || "Unable to load social channels."
          );
        }

        const availableChannels = channelsData.channels ?? [];

        setChannels(availableChannels);

        /*
         * Edit mode loads the authoritative campaign rows and uses them to
         * populate destinations, captions, title and shared media.
         */
        if (isEditMode) {
          if (!campaignId) {
            throw new Error("A campaign ID is required for editing.");
          }

          const campaignResponse = await fetch(
            `/api/admin/social/campaign/${encodeURIComponent(campaignId)}`
          );

          const campaignData = await readJsonResponse<CampaignResponse>(
            campaignResponse,
            "Unable to load social campaign."
          );

          if (
            !campaignResponse.ok ||
            !campaignData.success ||
            !campaignData.posts?.length
          ) {
            throw new Error(
              campaignData.error || "Unable to load social campaign."
            );
          }

          const campaignPosts = campaignData.posts;

          /*
           * Campaign editing currently supports fully draft or fully scheduled
           * campaigns. Mixed lifecycle states are intentionally blocked.
           */
          const statuses = new Set(campaignPosts.map((post) => post.status));

          if (statuses.size !== 1) {
            throw new Error(
              "This campaign contains mixed publishing states and cannot currently be edited."
            );
          }

          const loadedStatus = campaignPosts[0].status;

          if (loadedStatus !== "draft" && loadedStatus !== "scheduled") {
            throw new Error(
              "Only draft or scheduled campaigns can currently be edited."
            );
          }

          setCampaignStatus(loadedStatus);

          const firstPost = campaignPosts[0];

          setTitle(firstPost.title ?? "");
          setMediaUrl(firstPost.media_url ?? "");

          setSelectedChannelIds(
            campaignPosts.map((post) => post.buffer_channel_id)
          );

          setCaptions(
            Object.fromEntries(
              campaignPosts.map((post) => [
                post.buffer_channel_id,
                post.caption,
              ])
            )
          );

          return;
        }

        /*
         * Create mode automatically selects the only available active channel.
         */
        if (
          availableChannels.length === 1 &&
          !availableChannels[0].isQueuePaused
        ) {
          const channel = availableChannels[0];

          setSelectedChannelIds([channel.id]);

          setCaptions({
            [channel.id]: "",
          });
        }
      } catch (loadError) {
        setChannelError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load social campaign."
        );
      } finally {
        setLoadingChannels(false);
        setLoadingCampaign(false);
      }
    }

    void loadComposer();
  }, [campaignId, isEditMode]);

  /* Adds or removes a connected social destination while creating a campaign. */
  function toggleChannel(channel: SocialChannel) {
    if (busy || channel.isQueuePaused || isEditMode) {
      return;
    }

    setSelectedChannelIds((current) => {
      if (current.includes(channel.id)) {
        return current.filter((channelId) => channelId !== channel.id);
      }

      return [...current, channel.id];
    });

    setCaptions((current) => ({
      ...current,
      [channel.id]: current[channel.id] ?? "",
    }));

    setError(null);
  }

  /* Updates the platform-specific caption belonging to one destination. */
  function updateCaption(channelId: string, value: string) {
    setCaptions((current) => ({
      ...current,
      [channelId]: value,
    }));
  }

  /* Builds the destination payload submitted to the campaign API. */
  function buildDestinations() {
    return selectedChannelIds.map((channelId) => ({
      channelId,
      caption: captions[channelId] ?? "",
    }));
  }

  /*
   * Creates all authoritative social_posts rows before any Buffer delivery
   * is attempted.
   */
  async function createCampaign(status: "draft" | "ready") {
    if (selectedChannelIds.length === 0) {
      throw new Error("Select at least one social destination.");
    }

    const response = await fetch("/api/admin/social/create-campaign", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        sourceType: "campaign",

        title: title.trim() || null,

        mediaUrl: mediaUrl.trim() || null,

        mediaType: mediaUrl.trim() ? "image" : null,

        status,

        destinations: buildDestinations(),
      }),
    });

    const data = (await response.json()) as CreateResponse;

    if (!response.ok || !data.success || !data.campaignId) {
      throw new Error(data.error || "Unable to create campaign.");
    }

    return data;
  }

  /* Updates the existing draft campaign while preserving its destination rows. */
  async function updateCampaign() {
    if (!campaignId) {
      throw new Error("A campaign ID is required for editing.");
    }

    if (selectedChannelIds.length === 0) {
      throw new Error("The campaign must contain at least one destination.");
    }

    const response = await fetch(
      `/api/admin/social/campaign/${encodeURIComponent(campaignId)}`,
      {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          title: title.trim() || null,

          mediaUrl: mediaUrl.trim() || null,

          mediaType: mediaUrl.trim() ? "image" : null,

          destinations: buildDestinations(),
        }),
      }
    );

    const data = (await response.json()) as UpdateCampaignResponse;

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Unable to update campaign.");
    }

    return data;
  }

  /*
   * Synchronizes edits to all existing scheduled Buffer posts belonging to the
   * campaign while preserving their IDs and current schedules.
   */
  async function updateScheduledCampaign() {
    if (!campaignId) {
      throw new Error("A campaign ID is required for editing.");
    }

    if (selectedChannelIds.length === 0) {
      throw new Error("The campaign must contain at least one destination.");
    }

    const response = await fetch(
      "/api/admin/social/update-scheduled-campaign",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId,

          title: title.trim() || null,

          mediaUrl: mediaUrl.trim() || null,

          mediaType: mediaUrl.trim() ? "image" : null,

          destinations: buildDestinations(),
        }),
      }
    );

    const data = await readJsonResponse<ScheduledCampaignUpdateResponse>(
      response,
      "Unable to update scheduled campaign."
    );

    if (!response.ok) {
      if (data.summary) {
        throw new Error(
          `Unable to synchronize scheduled campaign. ${data.summary.failed} of ${data.summary.total} destination(s) failed.`
        );
      }

      throw new Error(data.error || "Unable to update scheduled campaign.");
    }

    return data;
  }

  /* Safely reads a JSON API response and reports HTML/route failures clearly. */
  async function readJsonResponse<T>(
    response: Response,
    fallbackMessage: string
  ): Promise<T> {
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      const responseText = await response.text();

      console.error("Expected JSON API response but received:", {
        url: response.url,
        status: response.status,
        contentType,
        response: responseText.slice(0, 500),
      });

      throw new Error(
        `${fallbackMessage} The server returned ${response.status} instead of JSON.`
      );
    }

    return (await response.json()) as T;
  }
  /* Saves every selected destination as a draft without contacting Buffer for delivery. */
  /* Creates a new draft or saves changes to an existing draft campaign. */
  async function handleSaveDraft() {
    if (selectedChannelIds.length === 0) {
      toast.error("Select at least one social destination.", {
        autoClose: 2000,
      });

      return;
    }

    setAction(isEditMode ? "update" : "draft");
    let shouldRedirect = true;
    try {
      if (isEditMode) {
        if (campaignStatus === "scheduled") {
          const result = await updateScheduledCampaign();

          if (result.partialSuccess && result.summary) {
            shouldRedirect = false;
            toast.warning(
              `${result.summary.succeeded} destination(s) updated successfully. ${result.summary.failed} destination(s) could not be synchronized with Buffer.`,
              {
                autoClose: 4000,
              }
            );

            return;
          }

          if (!result.success) {
            throw new Error(
              result.error || "Unable to synchronize scheduled campaign."
            );
          }

          toast.success("Scheduled campaign updated across all destinations.", {
            autoClose: 2000,
          });
        } else {
          await updateCampaign();

          toast.success("Campaign changes saved successfully.", {
            autoClose: 2000,
          });
        }
      } else {
        await createCampaign("draft");

        toast.success("Campaign saved as a draft.", {
          autoClose: 2000,
        });
      }

      if (shouldRedirect) {
        window.setTimeout(() => {
          window.location.href = "/admin/social";
        }, 2200);
      }
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : isEditMode
            ? "Unable to update campaign."
            : "Unable to save campaign.",
        {
          autoClose: 3000,
        }
      );
    } finally {
      setAction(null);
    }
  }

  /*
   * Creates all database rows first and then queues every campaign destination
   * through the server-side campaign delivery service.
   */
  async function handleAddToQueue() {
    if (!campaignReady) {
      setError(
        "Complete valid content for every selected destination before queueing this campaign."
      );

      return;
    }

    setAction("queue");
    setError(null);
    setSuccess(null);

    try {
      const campaign = await createCampaign("ready");

      const response = await fetch("/api/admin/social/queue-campaign", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          campaignId: campaign.campaignId,
        }),
      });

      const data = (await response.json()) as CampaignDeliveryResponse;

      /*
       * A complete delivery failure can return a non-2xx response while still
       * containing a useful campaign delivery summary.
       */
      if (!response.ok) {
        if (data.summary) {
          throw new Error(
            `Unable to queue campaign. ${data.summary.failed} of ${data.summary.total} destination(s) failed.`
          );
        }

        throw new Error(data.error || "Unable to queue campaign.");
      }

      if (!data.success && !data.partialSuccess) {
        throw new Error(data.error || "Unable to queue campaign.");
      }

      if (data.partialSuccess && data.summary) {
        setSuccess(
          `${data.summary.succeeded} destination(s) queued successfully. ${data.summary.failed} destination(s) failed.`
        );
      } else {
        setSuccess("Campaign added to the publishing queue.");
      }

      window.setTimeout(() => {
        window.location.href = "/admin/social";
      }, 900);
    } catch (queueError) {
      setError(
        queueError instanceof Error
          ? queueError.message
          : "Unable to queue campaign."
      );
    } finally {
      setAction(null);
    }
  }

  /*
   * Creates every campaign destination in Supabase first and then immediately
   * publishes the complete campaign through the server-side delivery service.
   */
  async function handlePublishNow() {
    if (!campaignReady) {
      setError(
        "Complete valid content for every selected destination before publishing this campaign."
      );

      return;
    }

    setAction("publish");
    setError(null);
    setSuccess(null);

    try {
      const campaign = await createCampaign("ready");

      const response = await fetch("/api/admin/social/publish-campaign-now", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          campaignId: campaign.campaignId,
        }),
      });

      const data = (await response.json()) as CampaignDeliveryResponse;

      /*
       * Preserve useful partial-delivery information instead of reducing every
       * provider failure to a generic HTTP error.
       */
      if (!response.ok) {
        if (data.summary) {
          throw new Error(
            `Unable to publish campaign. ${data.summary.failed} of ${data.summary.total} destination(s) failed.`
          );
        }

        throw new Error(data.error || "Unable to publish campaign.");
      }

      if (!data.success && !data.partialSuccess) {
        throw new Error(data.error || "Unable to publish campaign.");
      }

      setPublishConfirmationOpen(false);

      if (data.partialSuccess && data.summary) {
        setSuccess(
          `${data.summary.succeeded} destination(s) published successfully. ${data.summary.failed} destination(s) failed.`
        );
      } else {
        setSuccess("Campaign published successfully.");
      }

      window.setTimeout(() => {
        window.location.href = "/admin/social";
      }, 900);
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Unable to publish campaign."
      );
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="mx-auto max-w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <a
            href="/admin/social"
            title="Back to Social Publishing"
            className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900"
          >
            <ArrowLeft size={17} />
          </a>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">
              {isEditMode ? "Edit Campaign" : "Create Campaign"}
            </h1>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              {isEditMode
                ? campaignStatus === "scheduled"
                  ? "Update the content and media across every scheduled destination in this campaign."
                  : "Update the content and media for this draft social campaign."
                : "Create standalone social content with platform-specific copy without publishing an article to the CloudTweak blog."}
            </p>
          </div>
        </div>
      </div>

      {isEditMode && campaignStatus === "scheduled" && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <Clock3
            size={18}
            className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
          />

          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Editing a scheduled campaign
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300/80">
              Saving changes will update every existing scheduled Buffer post in
              this campaign while preserving its current publishing schedule.
            </p>
          </div>
        </div>
      )}

      {error &&
        toast.error(error, {
          autoClose: 2000,
        })}

      {success &&
        toast.success(success, {
          autoClose: 2000,
        })}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <label
              htmlFor="campaign-title"
              className="text-sm font-medium text-gray-900 dark:text-white"
            >
              Campaign title
            </label>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Internal title used to identify all destinations belonging to this
              campaign.
            </p>

            <input
              id="campaign-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. CloudTweak AI Workshop"
              disabled={busy}
              className="mt-3 w-full rounded-xl border border-gray-200 bg-transparent px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-400 disabled:opacity-60 dark:border-gray-800 dark:text-white dark:focus:border-gray-600"
            />
          </section>

          {selectedChannels.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-950">
              <Send size={28} className="mx-auto text-gray-400" />

              <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                Select a social destination
              </p>

              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-gray-500">
                Choose one or more connected social channels to prepare
                platform-specific campaign content.
              </p>
            </section>
          ) : (
            <div className="space-y-5">
              {selectedChannels.map((channel) => {
                const caption = captions[channel.id] ?? "";

                const validation = validateSocialContent(
                  channel.platform,
                  caption
                );

                const platformConfig = getSocialPlatformConfig(
                  channel.platform
                );

                return (
                  <section
                    key={channel.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                          {channel.avatar ? (
                            <img
                              src={channel.avatar}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <PlatformIcon platform={channel.platform} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-950 dark:text-white">
                            {platformConfig.label}
                          </p>

                          <p className="truncate text-xs text-gray-500">
                            {channel.displayName || channel.name}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 text-xs font-medium ${
                          validation.valid
                            ? "text-gray-500"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {validation.characterCount}

                        {validation.maxCharacters !== null &&
                          ` / ${validation.maxCharacters}`}
                      </span>
                    </div>

                    <textarea
                      rows={9}
                      value={caption}
                      disabled={busy}
                      onChange={(event) =>
                        updateCaption(channel.id, event.target.value)
                      }
                      placeholder={`Write your ${platformConfig.label} post...`}
                      className="mt-4 w-full resize-y rounded-xl border border-gray-200 bg-transparent px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition focus:border-gray-400 disabled:opacity-60 dark:border-gray-800 dark:text-white dark:focus:border-gray-600"
                    />

                    {validation.errors.map((validationError) => (
                      <p
                        key={validationError}
                        className="mt-2 text-xs text-red-600 dark:text-red-400"
                      >
                        {validationError}
                      </p>
                    ))}

                    {validation.warnings.map((warning) => (
                      <p
                        key={warning}
                        className="mt-2 text-xs text-amber-600 dark:text-amber-400"
                      >
                        {warning}
                      </p>
                    ))}

                    {validation.valid &&
                      validation.remainingCharacters !== null && (
                        <p className="mt-2 text-xs text-gray-500">
                          {validation.remainingCharacters} characters remaining
                        </p>
                      )}
                  </section>
                );
              })}
            </div>
          )}

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-sm font-semibold text-gray-950 dark:text-white">
              Campaign Media
            </h2>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Add an image that will accompany the selected campaign
              destinations.
            </p>

            <div className="mt-4">
              <SocialMediaUploader
                value={mediaUrl}
                onChange={setMediaUrl}
                disabled={busy}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-950 dark:text-white">
                  Destinations
                </h2>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Choose one or more connected social channels.
                </p>
              </div>

              {selectedChannelIds.length > 0 && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                  {selectedChannelIds.length}
                </span>
              )}
            </div>

            {loadingChannels ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-gray-500">
                <LoaderCircle size={17} className="animate-spin" />
                Loading channels...
              </div>
            ) : channelError ? (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                {channelError}
              </p>
            ) : channels.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                No supported social channels are connected.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {channels.map((channel) => {
                  const selected = selectedChannelIds.includes(channel.id);

                  const platformConfig = getSocialPlatformConfig(
                    channel.platform
                  );

                  return (
                    <button
                      key={channel.id}
                      type="button"
                      disabled={busy || channel.isQueuePaused || isEditMode}
                      onClick={() => toggleChannel(channel)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        selected
                          ? "border-gray-950 bg-gray-50 dark:border-white dark:bg-gray-900"
                          : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                        {channel.avatar ? (
                          <img
                            src={channel.avatar}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <PlatformIcon platform={channel.platform} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {channel.displayName || channel.name}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {platformConfig.label}
                          {channel.isQueuePaused && " · Queue paused"}
                        </p>
                      </div>

                      {selected && (
                        <CheckCircle2
                          size={17}
                          className="shrink-0 text-emerald-600 dark:text-emerald-400"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {selectedChannels.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <h2 className="text-sm font-semibold text-gray-950 dark:text-white">
                Campaign Readiness
              </h2>

              <div className="mt-4 space-y-3">
                {selectedChannels.map((channel) => {
                  const validation = validateSocialContent(
                    channel.platform,
                    captions[channel.id] ?? ""
                  );

                  const platformConfig = getSocialPlatformConfig(
                    channel.platform
                  );

                  return (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <PlatformIcon platform={channel.platform} />

                        <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                          {platformConfig.label}
                        </span>
                      </div>

                      {validation.valid ? (
                        <CheckCircle2
                          size={16}
                          className="shrink-0 text-emerald-600 dark:text-emerald-400"
                        />
                      ) : (
                        <AlertCircle
                          size={16}
                          className="shrink-0 text-amber-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <button
              type="button"
              disabled={busy || selectedChannelIds.length === 0}
              onClick={() => void handleSaveDraft()}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
            >
              {action === "draft" || action === "update" ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isEditMode ? "Save Changes" : "Save Draft"}
            </button>
            {!isEditMode && (
              <>
                <button
                  type="button"
                  disabled={busy || !campaignReady}
                  onClick={() => void handleAddToQueue()}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-950 text-sm font-medium text-gray-950 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white dark:text-white dark:hover:bg-gray-900"
                >
                  {action === "queue" ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Clock3 size={16} />
                  )}
                  Add to Queue
                </button>

                <button
                  type="button"
                  disabled={busy || !campaignReady}
                  onClick={() => setPublishConfirmationOpen(true)}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gray-950 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-gray-950"
                >
                  {action === "publish" ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Publish Now
                </button>
              </>
            )}
          </section>
        </aside>
      </div>

      <ConfirmModal
        open={publishConfirmationOpen}
        title="Publish campaign now?"
        message={`This campaign will be published immediately to ${
          selectedChannels.length === 1
            ? selectedChannels[0].displayName || selectedChannels[0].name
            : `${selectedChannels.length} selected social destinations`
        }.`}
        confirmText="Publish Now"
        cancelText="Cancel"
        variant="primary"
        loading={action === "publish"}
        onCancel={() => {
          if (action !== "publish") {
            setPublishConfirmationOpen(false);
          }
        }}
        onConfirm={() => {
          void handlePublishNow();
        }}
      />
    </div>
  );
}
