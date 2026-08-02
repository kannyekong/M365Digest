import { Download, LoaderCircle } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import { toast } from "react-toastify";
import type { Invoice } from "../../../../types/invoice";
import InvoicePdfDocument from "./InvoicePdfDocument";

interface InvoicePdfDownloadButtonProps {
  invoice: Invoice;

  company?: {
    name?: string;

    address?: string;

    email?: string;

    phone?: string;

    website?: string;

    registrationNumber?: string;

    taxNumber?: string;
  };

  className?: string;
}

/**
 * Trigger a safe browser download for one generated PDF Blob.
 */
function downloadPdfBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(objectUrl);
}

/**
 * Generate and download the selected Invoice as a branded PDF.
 */
export default function InvoicePdfDownloadButton({
  invoice,
  company,
  className = "",
}: InvoicePdfDownloadButtonProps) {
  const [generating, setGenerating] = useState(false);

  /**
   * Render the Invoice PDF and start the browser download.
   */
  async function handleDownload() {
    setGenerating(true);

    try {
      const document = (
        <InvoicePdfDocument invoice={invoice} company={company} />
      );

      const blob = await pdf(document).toBlob();

      downloadPdfBlob(blob, `${invoice.invoice_number.toLowerCase()}.pdf`);

      toast.success(`${invoice.invoice_number} PDF downloaded successfully.`);
    } catch (error) {
      console.error("Failed to generate Invoice PDF:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Invoice PDF could not be generated."
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      disabled={generating}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900 ${className}`}
    >
      {generating ? (
        <LoaderCircle size={16} className="animate-spin" />
      ) : (
        <Download size={16} />
      )}

      {generating ? "Generating PDF..." : "Download PDF"}
    </button>
  );
}
