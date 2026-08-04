import {
  CheckCircle2,
  LoaderCircle,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import type {
  Receipt,
  ReceiptStatus,
} from "../../../../types/receipt";
import { supabase } from "../../../../lib/superbase";

interface ReceiptStatusActionsProps {
  receipt: Receipt;

  onUpdated: (receipt: Receipt) => void;
}

/**
 * Update one Receipt status through the protected server endpoint.
 */
export default function ReceiptStatusActions({
  receipt,
  onUpdated,
}: ReceiptStatusActionsProps) {
  const [updatingStatus, setUpdatingStatus] =
    useState<ReceiptStatus | null>(null);

  /**
   * Submit one status change after user confirmation.
   */
  async function updateStatus(
    status: ReceiptStatus
  ) {
    const confirmationMessage =
      status === "voided"
        ? "Void this Receipt? This should only be used when the Receipt was issued incorrectly."
        : status === "refunded"
          ? "Mark this Receipt as refunded? This indicates the related payment has been refunded."
          : "Restore this Receipt to issued status?";

    if (
      !window.confirm(
        confirmationMessage
      )
    ) {
      return;
    }

    setUpdatingStatus(status);

    try {
      const {
        data: sessionResult,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken =
        sessionResult.session?.access_token;

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response = await fetch(
        "/api/receipts/status",
        {
          method: "PATCH",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            receiptId: receipt.id,
            status,
          }),
        }
      );

      const result =
        (await response.json()) as {
          success: boolean;
          message?: string;
          receipt?: Receipt;
        };

      if (
        !response.ok ||
        !result.success ||
        !result.receipt
      ) {
        throw new Error(
          result.message ??
            "The Receipt status could not be updated."
        );
      }

      onUpdated(result.receipt);

      toast.success(
        result.message ??
          "Receipt status updated."
      );
    } catch (error) {
      console.error(
        "Failed to update Receipt status:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "The Receipt status could not be updated."
      );
    } finally {
      setUpdatingStatus(null);
    }
  }

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {receipt.status !== "issued" && (
        <button
          type="button"
          onClick={() =>
            void updateStatus("issued")
          }
          disabled={Boolean(updatingStatus)}
          title="Restore Receipt"
          aria-label="Restore Receipt"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
        >
          {updatingStatus === "issued" ? (
            <LoaderCircle
              size={16}
              className="animate-spin"
            />
          ) : (
            <CheckCircle2 size={16} />
          )}

          Restore Issued
        </button>
      )}

      {receipt.status !== "refunded" && (
        <button
          type="button"
          onClick={() =>
            void updateStatus("refunded")
          }
          disabled={Boolean(updatingStatus)}
          title="Mark Receipt Refunded"
          aria-label="Mark Receipt Refunded"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/30"
        >
          {updatingStatus === "refunded" ? (
            <LoaderCircle
              size={16}
              className="animate-spin"
            />
          ) : (
            <RotateCcw size={16} />
          )}

          Mark Refunded
        </button>
      )}

      {receipt.status !== "voided" && (
        <button
          type="button"
          onClick={() =>
            void updateStatus("voided")
          }
          disabled={Boolean(updatingStatus)}
          title="Void Receipt"
          aria-label="Void Receipt"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          {updatingStatus === "voided" ? (
            <LoaderCircle
              size={16}
              className="animate-spin"
            />
          ) : (
            <XCircle size={16} />
          )}

          Void Receipt
        </button>
      )}
    </div>
  );
}
