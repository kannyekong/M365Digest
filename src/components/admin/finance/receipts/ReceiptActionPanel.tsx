import {
  Mail,
} from "lucide-react";
import { toast } from "react-toastify";
import type { Receipt } from "../../../types/receipt";
import ReceiptPdfDownloadButton from "./ReceiptPdfDownloadButton";
import ReceiptPrintButton from "./ReceiptPrintButton";

interface ReceiptActionPanelProps {
  receipt: Receipt;
}

/**
 * Render downloadable, printable, and email-ready Receipt actions.
 */
export default function ReceiptActionPanel({
  receipt,
}: ReceiptActionPanelProps) {
  const company = {
    name: "CloudTweak Technologies Limited",
    email: "support@cloudtweak.net",
    website: "cloudtweak.net",
  };

  /**
   * Explain that real email delivery is not yet connected.
   */
  function handleEmailReceipt() {
    toast.info(
      "Receipt email delivery is not connected yet. The Receipt can currently be downloaded or printed."
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <ReceiptPdfDownloadButton
        receipt={receipt}
        company={company}
      />

      <ReceiptPrintButton
        receipt={receipt}
        company={company}
      />

      <button
        type="button"
        onClick={
          handleEmailReceipt
        }
        title="Send Receipt by Email"
        aria-label="Send Receipt by Email"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
      >
        <Mail size={16} />
        Email Receipt
      </button>
    </div>
  );
}
