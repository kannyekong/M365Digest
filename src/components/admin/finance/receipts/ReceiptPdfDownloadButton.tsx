import {
  Download,
  LoaderCircle,
} from "lucide-react";
import {
  PDFDownloadLink,
} from "@react-pdf/renderer";
import type { Receipt } from "../../../types/receipt";
import ReceiptPdfDocument from "./ReceiptPdfDocument";

interface ReceiptPdfDownloadButtonProps {
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
 * Provide a downloadable PDF for one Receipt.
 */
export default function ReceiptPdfDownloadButton({
  receipt,
  company,
}: ReceiptPdfDownloadButtonProps) {
  const filename =
    `${receipt.receipt_number}.pdf`;

  return (
    <PDFDownloadLink
      document={
        <ReceiptPdfDocument
          receipt={receipt}
          company={company}
        />
      }
      fileName={filename}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
    >
      {({ loading }) =>
        loading ? (
          <>
            <LoaderCircle
              size={16}
              className="animate-spin"
            />
            Preparing PDF...
          </>
        ) : (
          <>
            <Download size={16} />
            Download Receipt
          </>
        )
      }
    </PDFDownloadLink>
  );
}
