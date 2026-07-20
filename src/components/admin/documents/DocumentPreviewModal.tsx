import { Download, ExternalLink, X } from "lucide-react";
import { useEffect } from "react";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  title: string;
  fileUrl: string;
  fileType: string;
  onClose: () => void;
}

// This component displays a preview modal for supported document types.
export default function DocumentPreviewModal({
  isOpen,
  title,
  fileUrl,
  fileType,
  onClose,
}: DocumentPreviewModalProps) {
  // Close the preview when the Escape key is pressed.
  useEffect(() => {
    // Stop listening for keyboard events when the modal is closed.
    if (!isOpen) return;

    // Handle keyboard events inside the document.
    function handleKeyDown(event: KeyboardEvent) {
      // Close the modal when the Escape key is pressed.
      if (event.key === "Escape") {
        onClose();
      }
    }

    // Listen for keyboard events.
    document.addEventListener("keydown", handleKeyDown);

    // Remove the keyboard listener when the modal closes or unmounts.
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Stop rendering the modal when it is closed.
  if (!isOpen) return null;

  // Determine whether the file is a PDF document.
  const isPdf = fileType.includes("pdf");

  // Determine whether the file is an image.
  const isImage = fileType.startsWith("image/");

  // Determine whether the file can be opened externally.
  const isOfficeDocument =
    fileType.includes("word") ||
    fileType.includes("document") ||
    fileType.includes("excel") ||
    fileType.includes("spreadsheet") ||
    fileType.includes("presentation");

  // Close the modal when the user clicks the overlay.
  function handleOverlayClick(event: React.MouseEvent<HTMLDivElement>) {
    // Close only when the overlay itself was clicked.
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6"
    >
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2
              className="truncate text-lg font-semibold text-slate-900"
              title={title}
            >
              {title}
            </h2>

            <p className="mt-1 text-xs text-slate-500">Document Preview</p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary"
              title="Open document"
            >
              <ExternalLink size={18} />
            </a>

            <a
              href={fileUrl}
              download
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary"
              title="Download document"
            >
              <Download size={18} />
            </a>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              title="Close preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-6">
          {isPdf && (
            <iframe
              src={fileUrl}
              title={title}
              className="h-full w-full rounded-xl border border-slate-200 bg-white"
            />
          )}

          {isImage && (
            <img
              src={fileUrl}
              alt={title}
              className="max-h-full max-w-full rounded-xl object-contain shadow-sm"
            />
          )}

          {isOfficeDocument && (
            <div className="max-w-md text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ExternalLink size={36} />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                Preview unavailable
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This document type cannot be previewed directly in the browser.
              </p>

              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Open Document
                <ExternalLink size={16} />
              </a>
            </div>
          )}

          {!isPdf && !isImage && !isOfficeDocument && (
            <div className="max-w-md text-center">
              <h3 className="text-lg font-semibold text-slate-900">
                Preview unavailable
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                This file type cannot be previewed in the browser.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
