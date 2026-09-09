import { useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";

import ConfirmModal from "../../../../islands/ConfirmModal";
import { supabase } from "../../../../lib/supabase/client";
import type { TweakMartAdminOrderDetails } from "../../../../lib/tweakmart/order";

interface TweakMartManualReviewPanelProps {
  order: TweakMartAdminOrderDetails;
}

type ReviewAction = "retry_fulfillment" | "refund" | null;

interface RetryFulfillmentResponse {
  success: boolean;
  message?: string;
  code?: string;
  result?: {
    success?: boolean;
    already_processed?: boolean;
    order_id?: string;
    order_number?: string;
    payment_status?: string;
    order_status?: string;
    inventory_status?: string;
    reservations_created?: number;
    inventory_groups_fulfilled?: number;
  };
}

/* Renders resolution controls for TweakMart orders requiring manual review. */
export default function TweakMartManualReviewPanel({
  order,
}: TweakMartManualReviewPanelProps) {
  const [pendingAction, setPendingAction] = useState<ReviewAction>(null);
  const [processing, setProcessing] = useState(false);

  /*
   * Prevent the resolution controls from rendering if the order no
   * longer matches the authoritative manual-review state.
   */
  if (!order.requires_manual_review) {
    return null;
  }

  /*
   * Build the shared confirmation modal configuration for the
   * administrative action currently awaiting confirmation.
   */
  const confirmationConfig =
    pendingAction === "retry_fulfillment"
      ? {
          title: "Retry Order Fulfillment?",
          message: `TweakMart will re-check current inventory for ${order.order_number}. The order will only be confirmed if all required inventory can be safely reserved and consumed.`,
          confirmText: "Retry Fulfillment",
          variant: "warning" as const,
        }
      : {
          title: "Refund Customer?",
          message: `You are about to begin the refund process for ${order.order_number}. The payment must be refunded through the original payment provider before the order is marked as refunded.`,
          confirmText: "Continue to Refund",
          variant: "danger" as const,
        };

  /* Opens the existing shared confirmation modal for an order action. */
  function requestAction(action: Exclude<ReviewAction, null>) {
    if (processing) {
      return;
    }

    setPendingAction(action);
  }

  /* Closes the confirmation modal while no request is being processed. */
  function closeConfirmation() {
    if (processing) {
      return;
    }

    setPendingAction(null);
  }

  /*
   * Retrieves the current CloudTweak access token so the server can
   * authenticate the administrator before using privileged TweakMart APIs.
   */
  async function getAccessToken() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw new Error("Unable to verify your CloudTweak session.");
    }

    if (!session?.access_token) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    return session.access_token;
  }

  /*
   * Calls the authenticated TweakMart server endpoint that performs
   * the transactional retry-fulfillment database operation.
   */
  async function retryFulfillment() {
    const accessToken = await getAccessToken();

    const response = await fetch(
      `/api/admin/tweakmart/orders/${order.id}/retry-fulfillment`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    let payload: RetryFulfillmentResponse;

    try {
      payload = (await response.json()) as RetryFulfillmentResponse;
    } catch {
      throw new Error("The fulfillment server returned an invalid response.");
    }

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "The order could not be fulfilled.");
    }

    return payload;
  }

  /*
   * Executes the action only after the administrator has confirmed it
   * through the shared CloudTweak confirmation modal.
   */
  async function confirmAction() {
    if (!pendingAction || processing) {
      return;
    }

    const action = pendingAction;

    setProcessing(true);

    try {
      if (action === "retry_fulfillment") {
        const result = await retryFulfillment();

        setPendingAction(null);

        if (result.result?.already_processed) {
          toast.info(
            result.message ||
              `${order.order_number} has already been fulfilled.`
          );
        } else {
          toast.success(
            result.message ||
              `${order.order_number} was fulfilled successfully.`
          );
        }

        /*
         * Reload the server-rendered order details so every status,
         * reservation, movement, and manual-review indicator reflects
         * the authoritative database state.
         */
        window.setTimeout(() => {
          window.location.reload();
        }, 700);

        return;
      }

      /*
       * Refund remains deliberately disabled until its Paystack
       * provider workflow has been implemented.
       */
      setPendingAction(null);

      toast.info(
        "The TweakMart Paystack refund workflow has not been enabled yet."
      );
    } catch (error) {
      console.error("TweakMart manual review action failed:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The order action could not be completed."
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm dark:border-amber-500/20 dark:bg-slate-950">
        <div className="border-b border-amber-100 bg-amber-50/70 p-5 dark:border-amber-500/10 dark:bg-amber-500/[0.06]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <ShieldCheck size={18} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Manual Review Resolution
              </h2>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                This payment has been received, but the order requires an
                administrator to resolve its inventory fulfillment state.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Payment
              </p>

              <div className="mt-2 flex items-center gap-1.5">
                <CheckCircle2
                  size={14}
                  className="text-emerald-600 dark:text-emerald-400"
                />

                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Paid
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Order
              </p>

              <div className="mt-2 flex items-center gap-1.5">
                <AlertTriangle
                  size={14}
                  className="text-amber-600 dark:text-amber-400"
                />

                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  Pending
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Inventory
              </p>

              <div className="mt-2 flex items-center gap-1.5">
                <Boxes
                  size={14}
                  className="text-orange-600 dark:text-orange-400"
                />

                <p className="text-xs font-bold text-orange-700 dark:text-orange-300">
                  Released
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Why this order needs attention
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
              The payment was verified after the original inventory reservation
              had already been released. Automatic inventory recovery could not
              be completed because sufficient sellable stock was unavailable at
              the time payment was confirmed.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => requestAction("retry_fulfillment")}
              disabled={processing}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Boxes size={15} />
              Retry Fulfillment
            </button>

            <button
              type="button"
              onClick={() => requestAction("refund")}
              disabled={processing}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/20 dark:bg-slate-950 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <RotateCcw size={15} />
              Refund Customer
            </button>
          </div>

          <p className="mt-4 text-[11px] leading-5 text-slate-400">
            Fulfillment will never be retried without checking current
            inventory. Refunds must be completed through the payment provider
            before the payment state is changed.
          </p>
        </div>
      </section>

      <ConfirmModal
        open={Boolean(pendingAction)}
        title={confirmationConfig.title}
        message={confirmationConfig.message}
        confirmText={confirmationConfig.confirmText}
        cancelText="Cancel"
        variant={confirmationConfig.variant}
        loading={processing}
        onConfirm={() => void confirmAction()}
        onCancel={closeConfirmation}
      />
    </>
  );
}
