import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  PackageOpen,
  RotateCcw,
  XCircle,
} from "lucide-react";

import type {
  TweakMartInventoryStatus,
  TweakMartOrderPaymentStatus,
  TweakMartOrderStatus,
} from "../../../../lib/tweakmart/order";

interface PaymentStatusBadgeProps {
  status: TweakMartOrderPaymentStatus;
}

interface OrderStatusBadgeProps {
  status: TweakMartOrderStatus;
}

interface InventoryStatusBadgeProps {
  status: TweakMartInventoryStatus;
}

interface ManualReviewBadgeProps {
  requiresManualReview: boolean;
}

/* Converts underscore-separated database values into readable labels. */
function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/* Displays the current payment state of a TweakMart order. */
export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const styles = {
    paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    pending:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    unpaid: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    failed: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    refunded:
      "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
    partially_refunded:
      "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
  } satisfies Record<TweakMartOrderPaymentStatus, string>;

  const Icon =
    status === "paid"
      ? CheckCircle2
      : status === "failed"
        ? XCircle
        : status === "refunded" || status === "partially_refunded"
          ? RotateCcw
          : status === "pending"
            ? Clock3
            : CircleDollarSign;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}
    >
      <Icon size={12} />
      {formatStatus(status)}
    </span>
  );
}

/* Displays the current fulfillment/lifecycle state of a TweakMart order. */
export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const styles = {
    pending:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    confirmed:
      "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    processing:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
    ready_for_delivery:
      "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300",
    out_for_delivery:
      "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    delivered:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    cancelled: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  } satisfies Record<TweakMartOrderStatus, string>;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}

/* Displays the inventory lifecycle state associated with an order. */
export function InventoryStatusBadge({ status }: InventoryStatusBadgeProps) {
  const styles = {
    not_reserved:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    reserved: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    released:
      "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
    consumed:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  } satisfies Record<TweakMartInventoryStatus, string>;

  const Icon =
    status === "consumed"
      ? PackageCheck
      : status === "released"
        ? PackageOpen
        : status === "reserved"
          ? Clock3
          : PackageOpen;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}
    >
      <Icon size={12} />
      {formatStatus(status)}
    </span>
  );
}

/* Highlights payment and fulfillment exceptions requiring administrator review. */
export function ManualReviewBadge({
  requiresManualReview,
}: ManualReviewBadgeProps) {
  if (!requiresManualReview) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
      <AlertTriangle size={12} />
      Manual review
    </span>
  );
}
