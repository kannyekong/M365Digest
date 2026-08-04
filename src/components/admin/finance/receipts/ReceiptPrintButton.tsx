import {
  LoaderCircle,
  Printer,
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import { toast } from "react-toastify";
import type { Receipt } from "../../../types/receipt";
import ReceiptPdfDocument from "./ReceiptPdfDocument";

interface ReceiptPrintButtonProps {
  receipt: Receipt;

  company: {
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
}

/**
 * Generate and open one Receipt PDF in the browser print dialog.
 */
export default function ReceiptPrintButton({
  receipt,
  company,
}: ReceiptPrintButtonProps) {
  const [printing, setPrinting] =
    useState(false);

  /**
   * Generate the PDF blob and open it in a printable browser tab.
   */
  async function handlePrint() {
    setPrinting(true);

    try {
      const receiptBlob = await pdf(
        <ReceiptPdfDocument
          receipt={receipt}
          company={company}
        />
      ).toBlob();

      const receiptUrl =
        URL.createObjectURL(
          receiptBlob
        );

      const printWindow =
        window.open(
          receiptUrl,
          "_blank",
          "noopener,noreferrer"
        );

      if (!printWindow) {
        throw new Error(
          "The browser blocked the Receipt print window."
        );
      }

      printWindow.addEventListener(
        "load",
        () => {
          printWindow.focus();
          printWindow.print();
        },
        {
          once: true,
        }
      );

      window.setTimeout(() => {
        URL.revokeObjectURL(
          receiptUrl
        );
      }, 60_000);
    } catch (error) {
      console.error(
        "Failed to print Receipt:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "The Receipt could not be printed."
      );
    } finally {
      setPrinting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() =>
        void handlePrint()
      }
      disabled={printing}
      title="Print Receipt"
      aria-label="Print Receipt"
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
    >
      {printing ? (
        <LoaderCircle
          size={16}
          className="animate-spin"
        />
      ) : (
        <Printer size={16} />
      )}

      {printing
        ? "Preparing print..."
        : "Print Receipt"}
    </button>
  );
}
