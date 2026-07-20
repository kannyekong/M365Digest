import { Eye, FileText, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { deleteDocument } from "../../../lib/documents";
import DocumentPreviewModal from "./DocumentPreviewModal";

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

type SortOption = "newest" | "oldest" | "az" | "za";

export default function DocumentTable({ documents, reload }: Props) {
  // Store the current document search query.
  const [searchQuery, setSearchQuery] = useState("");

  // Store the selected document category.
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Store the selected document sorting option.
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  // Store the current pagination page.
  const [currentPage, setCurrentPage] = useState(1);

  // Store the currently selected document for preview.
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(
    null
  );

  // Define the maximum number of documents displayed per page.
  const documentsPerPage = 8;

  // Convert the document file size from bytes into a readable format.
  function formatFileSize(bytes: number) {
    // Return zero bytes when the document has no file size.
    if (bytes === 0) return "0 Bytes";

    // Define the file size units used during formatting.
    const units = ["Bytes", "KB", "MB", "GB"];

    // Calculate the correct unit for the document size.
    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    // Convert the file size into the selected unit.
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

    // Close the preview modal if the deleted document was open.
    setSelectedDocument(null);

    // Reload the document list.
    reload();
  }

  // Build the available document categories.
  const categories = useMemo(() => {
    // Extract all document categories.
    const documentCategories = documents.map((document) => document.category);

    // Remove duplicate categories and sort them alphabetically.
    return ["All", ...Array.from(new Set(documentCategories)).sort()];
  }, [documents]);

  // Filter and sort the document collection.
  const filteredDocuments = useMemo(() => {
    // Normalize the search query.
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    // Filter documents using the search query and category.
    const filtered = documents.filter((document) => {
      // Combine searchable document fields.
      const searchableText = [
        document.title,
        document.file_name,
        document.description ?? "",
      ]
        .join(" ")
        .toLowerCase();

      // Check whether the document matches the search query.
      const matchesSearch =
        !normalizedSearchQuery ||
        searchableText.includes(normalizedSearchQuery);

      // Check whether the document matches the selected category.
      const matchesCategory =
        selectedCategory === "All" || document.category === selectedCategory;

      // Keep documents that match both conditions.
      return matchesSearch && matchesCategory;
    });

    // Sort the filtered documents.
    return [...filtered].sort((firstDocument, secondDocument) => {
      // Sort from newest to oldest.
      if (sortOption === "newest") {
        return (
          new Date(secondDocument.created_at).getTime() -
          new Date(firstDocument.created_at).getTime()
        );
      }

      // Sort from oldest to newest.
      if (sortOption === "oldest") {
        return (
          new Date(firstDocument.created_at).getTime() -
          new Date(secondDocument.created_at).getTime()
        );
      }

      // Sort alphabetically from A to Z.
      if (sortOption === "az") {
        return firstDocument.title.localeCompare(secondDocument.title);
      }

      // Sort alphabetically from Z to A.
      return secondDocument.title.localeCompare(firstDocument.title);
    });
  }, [documents, searchQuery, selectedCategory, sortOption]);

  // Calculate the total number of pagination pages.
  const totalPages = Math.ceil(filteredDocuments.length / documentsPerPage);

  // Calculate the starting document index for the current page.
  const startIndex = (currentPage - 1) * documentsPerPage;

  // Calculate the ending document index for the current page.
  const endIndex = startIndex + documentsPerPage;

  // Extract only the documents for the current page.
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  // Display the empty state when there are no documents.
  if (!documents.length) {
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
          className="rounded-xl bg-primary px-3 py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          Upload Document
        </a>
      </div>

      <div className="mt-8 flex flex-col gap-4 bg-white lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search documents..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-slate-400" />

          <select
            value={selectedCategory}
            onChange={(event) => {
              setSelectedCategory(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-primary"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <select
          value={sortOption}
          onChange={(event) => {
            setSortOption(event.target.value as SortOption);
            setCurrentPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-primary"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="az">A–Z</option>
          <option value="za">Z–A</option>
        </select>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-900">
            {filteredDocuments.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-900">
            {documents.length}
          </span>{" "}
          documents
        </p>

        {searchQuery || selectedCategory !== "All" ? (
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
              setCurrentPage(1);
            }}
            className="text-sm font-medium text-primary transition hover:opacity-80"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {filteredDocuments.length ? (
        <>
          <div className="mt-6 grid grid-cols-4 gap-5">
            {paginatedDocuments.map((document) => (
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
                      <button
                        onClick={() => setSelectedDocument(document)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary"
                        title="Preview document"
                      >
                        <Eye size={16} />
                      </button>

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

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => {
                // Calculate the page number represented by the button.
                const pageNumber = index + 1;

                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`h-9 w-9 rounded-lg text-sm font-medium transition ${
                      currentPage === pageNumber
                        ? "bg-primary text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                onClick={() =>
                  setCurrentPage((page) => Math.min(page + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Search size={42} className="mx-auto text-slate-300" />

          <h3 className="mt-4 text-lg font-semibold text-slate-800">
            No matching documents
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Try adjusting your search or category filter.
          </p>
        </div>
      )}

      <DocumentPreviewModal
        isOpen={Boolean(selectedDocument)}
        title={selectedDocument?.title ?? ""}
        fileUrl={selectedDocument?.file_url ?? ""}
        fileType={selectedDocument?.file_type ?? ""}
        onClose={() => setSelectedDocument(null)}
      />
    </div>
  );
}
