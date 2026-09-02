import { useEffect, useRef, useState } from "react";

import {
  ExternalLink,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";

import type { TweakMartBanner } from "../../../../lib/tweakmart/banner";

import ConfirmModal from "../../../../islands/ConfirmModal";
import BannerStatusBadge from "./BannerStatusBadge";

interface BannerTableProps {
  initialBanners: TweakMartBanner[];
}

type BannerAction = "activate" | "deactivate" | "delete" | null;

/* Formats an ISO date into a compact administrative date representation. */
function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

/* Creates a human-readable banner schedule from its optional start and end dates. */
function getScheduleLabel(banner: TweakMartBanner) {
  if (!banner.starts_at && !banner.ends_at) {
    return "Always";
  }

  if (banner.starts_at && banner.ends_at) {
    return `${formatDate(banner.starts_at)} – ${formatDate(banner.ends_at)}`;
  }

  if (banner.starts_at) {
    return `From ${formatDate(banner.starts_at)}`;
  }

  return `Until ${formatDate(banner.ends_at)}`;
}

/* Renders the administrative TweakMart featured-banner table and handles banner actions. */
export default function BannerTable({ initialBanners }: BannerTableProps) {
  const [banners, setBanners] = useState<TweakMartBanner[]>(initialBanners);

  const [busyBannerId, setBusyBannerId] = useState<string | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [selectedBanner, setSelectedBanner] = useState<TweakMartBanner | null>(
    null
  );

  const [pendingAction, setPendingAction] = useState<BannerAction>(null);

  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  /* Closes the currently open action popover when clicking outside it or pressing Escape. */
  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    /* Closes the popover when the pointer is pressed outside the active action area. */
    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (actionMenuRef.current && !actionMenuRef.current.contains(target)) {
        setOpenMenuId(null);
      }
    }

    /* Allows the administrator to dismiss the action popover with the Escape key. */
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);

      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuId]);

  /* Opens the reusable confirmation modal for a requested banner action. */
  function requestBannerAction(
    banner: TweakMartBanner,
    action: Exclude<BannerAction, null>
  ) {
    setSelectedBanner(banner);
    setPendingAction(action);
    setOpenMenuId(null);
  }

  /* Closes the reusable confirmation modal when no operation is currently running. */
  function closeConfirmationModal() {
    if (busyBannerId) {
      return;
    }

    setSelectedBanner(null);
    setPendingAction(null);
  }

  /* Activates or deactivates a featured banner and synchronizes the local table state. */
  async function updateBannerStatus(
    banner: TweakMartBanner,
    isActive: boolean
  ) {
    const response = await fetch(`/api/admin/tweakmart/banners/${banner.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        is_active: isActive,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message ?? "Unable to update banner.");
    }

    setBanners((current) =>
      current.map((item) => (item.id === banner.id ? result.banner : item))
    );
  }

  /* Permanently deletes a featured banner and removes it from the local table state. */
  async function deleteBanner(banner: TweakMartBanner) {
    const response = await fetch(`/api/admin/tweakmart/banners/${banner.id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message ?? "Unable to delete banner.");
    }

    setBanners((current) => current.filter((item) => item.id !== banner.id));
  }

  /* Executes the banner operation selected through the reusable confirmation modal. */
  async function confirmBannerAction() {
    if (!selectedBanner || !pendingAction) {
      return;
    }

    try {
      setBusyBannerId(selectedBanner.id);

      if (pendingAction === "activate") {
        await updateBannerStatus(selectedBanner, true);
      }

      if (pendingAction === "deactivate") {
        await updateBannerStatus(selectedBanner, false);
      }

      if (pendingAction === "delete") {
        await deleteBanner(selectedBanner);
      }

      setSelectedBanner(null);
      setPendingAction(null);
    } catch (error) {
      console.error("Failed to complete TweakMart banner action:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to complete banner action."
      );
    } finally {
      setBusyBannerId(null);
    }
  }

  /* Provides the appropriate confirmation modal copy and appearance for the pending action. */
  function getConfirmationConfig() {
    if (!selectedBanner) {
      return {
        title: "Confirm Action",
        message: "Are you sure you want to continue?",
        confirmText: "Confirm",
        variant: "primary" as const,
      };
    }

    if (pendingAction === "delete") {
      return {
        title: "Delete Featured Banner",
        message: `Are you sure you want to permanently delete "${selectedBanner.title}"? This action cannot be undone.`,
        confirmText: "Delete Banner",
        variant: "danger" as const,
      };
    }

    if (pendingAction === "deactivate") {
      return {
        title: "Deactivate Featured Banner",
        message: `Are you sure you want to deactivate "${selectedBanner.title}"? It will no longer be displayed on the TweakMart storefront.`,
        confirmText: "Deactivate",
        variant: "warning" as const,
      };
    }

    return {
      title: "Activate Featured Banner",
      message: `Are you sure you want to activate "${selectedBanner.title}"? It will become eligible for display on the TweakMart storefront according to its configured schedule.`,
      confirmText: "Activate",
      variant: "primary" as const,
    };
  }

  const confirmationConfig = getConfirmationConfig();

  if (banners.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-950">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <ImageIcon size={21} />
          </div>

          <h3 className="mt-4 text-sm font-bold text-slate-950 dark:text-white">
            No featured banners
          </h3>

          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
            Create your first TweakMart promotional banner to start
            merchandising the storefront.
          </p>

          <a
            href="/admin/tweakmart/banners/new"
            className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
          >
            Add Featured Banner
          </a>
        </div>

        <ConfirmModal
          open={Boolean(selectedBanner && pendingAction)}
          title={confirmationConfig.title}
          message={confirmationConfig.message}
          confirmText={confirmationConfig.confirmText}
          cancelText="Cancel"
          variant={confirmationConfig.variant}
          loading={Boolean(busyBannerId)}
          onConfirm={confirmBannerAction}
          onCancel={closeConfirmationModal}
        />
      </>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-5 py-4">Banner</th>

                <th className="px-5 py-4">Schedule</th>

                <th className="px-5 py-4 text-center">Order</th>

                <th className="px-5 py-4">Status</th>

                <th className="px-5 py-4">Destination</th>

                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {banners.map((banner) => {
                const busy = busyBannerId === banner.id;

                return (
                  <tr
                    key={banner.id}
                    className="transition hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex min-w-[300px] items-center gap-4">
                        <div className="h-16 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                          <img
                            src={banner.image_url}
                            alt={banner.alt_text ?? banner.title}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-slate-950 dark:text-white">
                            {banner.title}
                          </p>

                          <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500 dark:text-slate-400">
                            {banner.alt_text || "No alternative text"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300">
                        {getScheduleLabel(banner)}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-100 px-2 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        {banner.display_order}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <BannerStatusBadge banner={banner} />
                    </td>

                    <td className="px-5 py-4">
                      {banner.link_url ? (
                        <a
                          href={banner.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-[180px] items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          <span className="truncate">{banner.link_url}</span>

                          <ExternalLink size={12} className="shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">No link</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div
                        ref={
                          openMenuId === banner.id ? actionMenuRef : undefined
                        }
                        className="relative inline-block text-left"
                      >
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setOpenMenuId((current) =>
                              current === banner.id ? null : banner.id
                            )
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                          aria-label={`Actions for ${banner.title}`}
                          aria-expanded={openMenuId === banner.id}
                        >
                          <MoreHorizontal size={17} />
                        </button>

                        {openMenuId === banner.id ? (
                          <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            <a
                              href={`/admin/tweakmart/banners/${banner.id}`}
                              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <Pencil size={14} />
                              Edit Banner
                            </a>

                            <button
                              type="button"
                              onClick={() =>
                                requestBannerAction(
                                  banner,
                                  banner.is_active ? "deactivate" : "activate"
                                )
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              {banner.is_active ? (
                                <PowerOff size={14} />
                              ) : (
                                <Power size={14} />
                              )}

                              {banner.is_active ? "Deactivate" : "Activate"}
                            </button>

                            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                            <button
                              type="button"
                              onClick={() =>
                                requestBannerAction(banner, "delete")
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                            >
                              <Trash2 size={14} />
                              Delete Banner
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(selectedBanner && pendingAction)}
        title={confirmationConfig.title}
        message={confirmationConfig.message}
        confirmText={confirmationConfig.confirmText}
        cancelText="Cancel"
        variant={confirmationConfig.variant}
        loading={Boolean(busyBannerId)}
        onConfirm={confirmBannerAction}
        onCancel={closeConfirmationModal}
      />
    </>
  );
}
