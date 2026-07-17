import { Download, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteDocument } from "../../../lib/documents";

interface DocumentItem {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: string;
  file_size: number;
  category: string;
  created_at: string;
}

interface Props {
  documents: DocumentItem[];
  reload: () => void;
}

export default function DocumentTable({ documents, reload }: Props) {
  // Convert the document file size from bytes into a readable format.
  function formatFileSize(bytes: number) {
    // Return zero bytes when the document has no file size.
    if (bytes === 0) return "0 Bytes";

    // Define the file size units used during formatting.
    const units = ["Bytes", "KB", "MB", "GB"];

    // Calculate the correct unit for the document size.
    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    // Convert the document size into the selected unit.
    const size = bytes / Math.pow(1024, index);

    // Return the formatted document size.
    return `${size.toFixed(1)} ${units[index]}`;
  }

  // Convert the MIME type into a simple readable file type.
  function getFileType(fileType: string) {
    // Return PDF for PDF documents.
    if (fileType.includes("pdf")) return "PDF";

    // Return Word for Microsoft Word documents.
    if (fileType.includes("word") || fileType.includes("document")) {
      return "Word";
    }

    // Return Excel for Microsoft Excel documents.
    if (fileType.includes("excel") || fileType.includes("spreadsheet")) {
      return "Excel";
    }

    // Return PowerPoint for Microsoft PowerPoint documents.
    if (fileType.includes("presentation")) {
      return "PowerPoint";
    }

    // Return the generic document type for unknown files.
    return "Document";
  }

  // Delete a document from Storage and the database.
  async function handleDelete(document: DocumentItem) {
    // Ask the user to confirm the document deletion.
    const confirmed = window.confirm(
      `Are you sure you want to delete "${document.title}"?`
    );

    // Stop execution when the user cancels the deletion.
    if (!confirmed) return;

    // Delete the document from Supabase.
    const { error } = await deleteDocument(document.id, document.file_path);

    // Display the deletion error when deletion fails.
    if (error) {
      toast.error(error.message);
      return;
    }

    // Display a success notification after deletion.
    toast.success("Document deleted successfully.");

    // Reload the document list.
    reload();
  }

  // Display the empty state when there are no documents.
  if (!documents.length) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Document Library
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Store and manage your company documents.
            </p>
          </div>

          <a
            href="/admin/documents/add"
            className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            Upload Document
          </a>
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileText size={42} className="mx-auto text-slate-300" />

          <h3 className="mt-4 text-lg font-semibold text-slate-800">
            No documents yet
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Upload your first company document to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Document Library
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Store and manage your company documents.
          </p>
        </div>

        <a
          href="/admin/documents/add"
          className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          Upload Document
        </a>
      </div>

      <div className="mt-10 grid grid-cols-4 gap-5">
        {documents.map((document) => (
          <div
            key={document.id}
            className="group relative flex min-h-[280px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText size={28} />
              </div>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                {getFileType(document.file_type)}
              </span>
            </div>

            <div className="mt-5 flex-1">
              <h3
                className="line-clamp-2 font-semibold text-slate-900"
                title={document.title}
              >
                {document.title}
              </h3>

              <p
                className="mt-2 line-clamp-2 text-xs text-slate-500"
                title={document.file_name}
              >
                {document.file_name}
              </p>

              {document.description && (
                <p className="mt-3 line-clamp-3 text-sm leading-5 text-slate-500">
                  {document.description}
                </p>
              )}
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{document.category}</span>

                <span>{formatFileSize(document.file_size)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-400">
                  {new Date(document.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-1">
                  <a
                    href={document.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary"
                    title="Download document"
                  >
                    <Download size={16} />
                  </a>

                  <button
                    onClick={() => handleDelete(document)}
                    className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                    title="Delete document"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
