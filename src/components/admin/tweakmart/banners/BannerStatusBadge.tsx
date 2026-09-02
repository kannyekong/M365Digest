import { CalendarClock, CheckCircle2, CircleOff, Clock3 } from "lucide-react";

import type { TweakMartBanner } from "../../../../lib/tweakmart/banner";

export type BannerStatus = "live" | "scheduled" | "expired" | "inactive";

/* Determines the effective storefront status of a banner from its activation and scheduling configuration. */
export function getBannerStatus(banner: TweakMartBanner): BannerStatus {
  if (!banner.is_active) {
    return "inactive";
  }

  const now = Date.now();

  if (banner.starts_at && new Date(banner.starts_at).getTime() > now) {
    return "scheduled";
  }

  if (banner.ends_at && new Date(banner.ends_at).getTime() < now) {
    return "expired";
  }

  return "live";
}

interface BannerStatusBadgeProps {
  banner: TweakMartBanner;
}

/* Displays the effective storefront status of a featured banner. */
export default function BannerStatusBadge({ banner }: BannerStatusBadgeProps) {
  const status = getBannerStatus(banner);

  const config = {
    live: {
      label: "Live",
      icon: CheckCircle2,
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
    },

    scheduled: {
      label: "Scheduled",
      icon: CalendarClock,
      className:
        "bg-blue-50 text-blue-700 ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20",
    },

    expired: {
      label: "Expired",
      icon: Clock3,
      className:
        "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
    },

    inactive: {
      label: "Inactive",
      icon: CircleOff,
      className:
        "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${config.className}`}
    >
      <Icon size={12} />

      {config.label}
    </span>
  );
}
