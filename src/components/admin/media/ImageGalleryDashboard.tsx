import {
  ArrowLeft,
  ArrowRight,
  ImageIcon,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  archiveImageAsset,
  copyImageAssetUrl,
  deleteImageAsset,
  listImageAssets,
  restoreImageAsset,
  uploadImageAsset,
} from "../../../lib/image-assets";
import type {
  ImageAssetCategory,
  ImageAssetFilters,
  ImageAssetWithUrl,
  UploadImageAssetInput,
} from "../../../types/image-asset";
import ImageCard from "./ImageCard";
import ImageUploadModal from "./ImageUploadModal";
import "../../../styles/global.css";

const IMAGE_CATEGORIES: Array<{
  value: ImageAssetCategory | "all";
  label: string;
}> = [
  {
    value: "all",
    label: "All Categories",
  },
  {
    value: "general",
    label: "General",
  },
  {
    value: "website",
    label: "Website",
  },
  {
    value: "blog",
    label: "Blog",
  },
  {
    value: "academy",
    label: "Academy",
  },
  {
    value: "projects",
    label: "Projects",
  },
  {
    value: "clients",
    label: "Clients",
  },
  {
    value: "marketing",
    label: "Marketing",
  },
];

/* Displays and manages the Admin Image Gallery. */
export default function ImageGalleryDashboard() {
  const [assets, setAssets] = useState<ImageAssetWithUrl[]>([]);

  const [filters, setFilters] = useState<ImageAssetFilters>({
    search: "",
    category: "all",
    includeArchived: false,
  });

  const [page, setPage] = useState(1);

  const [pageSize] = useState(24);

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);

  const [processingAssetId, setProcessingAssetId] = useState<string | null>(
    null
  );

  const [selectedAsset, setSelectedAsset] = useState<ImageAssetWithUrl | null>(
    null
  );

  const [errorMessage, setErrorMessage] = useState("");

  /* Loads the Image Gallery using the current filters and page. */
  const loadGallery = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await listImageAssets({
        page,
        pageSize,
        filters,
      });

      setAssets(result.assets);

      setTotal(result.total);

      setTotalPages(result.totalPages);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Images could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  /* Reloads the Gallery whenever filters or pagination values change. */
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadGallery();
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadGallery]);

  /* Updates one Gallery filter and resets pagination. */
  function updateFilter<Key extends keyof ImageAssetFilters>(
    key: Key,
    value: ImageAssetFilters[Key]
  ) {
    setPage(1);

    setFilters((currentFilters: ImageAssetFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  /* Uploads one image and refreshes the Gallery. */
  async function handleUpload(input: UploadImageAssetInput) {
    setUploading(true);

    try {
      await uploadImageAsset(input);

      toast.success("Image uploaded successfully.");

      setUploadOpen(false);

      await loadGallery();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Image could not be uploaded."
      );

      throw error;
    } finally {
      setUploading(false);
    }
  }

  /* Copies one image URL to the clipboard and confirms the action. */
  async function handleCopy(asset: ImageAssetWithUrl) {
    try {
      await copyImageAssetUrl(asset);

      toast.success("Image URL copied to clipboard.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Image URL could not be copied."
      );
    }
  }

  /* Archives one image after confirmation. */
  async function handleArchive(asset: ImageAssetWithUrl) {
    const confirmed = window.confirm(`Archive ${asset.original_file_name}?`);

    if (!confirmed) {
      return;
    }

    setProcessingAssetId(asset.id);

    try {
      await archiveImageAsset(asset.id);

      toast.success("Image archived.");

      await loadGallery();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Image could not be archived."
      );
    } finally {
      setProcessingAssetId(null);
    }
  }

  /* Restores one archived image. */
  async function handleRestore(asset: ImageAssetWithUrl) {
    setProcessingAssetId(asset.id);

    try {
      await restoreImageAsset(asset.id);

      toast.success("Image restored.");

      await loadGallery();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Image could not be restored."
      );
    } finally {
      setProcessingAssetId(null);
    }
  }

  /* Permanently deletes one image from both Storage and the database. */
  async function handleDelete(asset: ImageAssetWithUrl) {
    const confirmed = window.confirm(
      `Permanently delete ${asset.original_file_name}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setProcessingAssetId(asset.id);

    try {
      await deleteImageAsset(asset);

      toast.success("Image permanently deleted.");

      if (selectedAsset?.id === asset.id) {
        setSelectedAsset(null);
      }

      await loadGallery();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Image could not be deleted."
      );
    } finally {
      setProcessingAssetId(null);
    }
  }

  return (
    <section className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-heading">
            Image Gallery
          </h1>

          <p className="mt-2 max-w-3xl text-xs leading-6 text-text-muted">
            Manage reusable images for the website, Academy, projects,
            marketing, blogs, and other CloudTweak content.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadGallery()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-box-border bg-body px-4 py-2.5 text-sm font-semibold text-heading transition hover:text-primary disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus size={16} />
            Upload Image
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-box-border bg-box-bg/70 p-4 shadow-sm backdrop-blur-xl">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />

            <input
              type="search"
              value={filters.search ?? ""}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search images..."
              className="w-full rounded-xl border border-box-border bg-body py-2.5 pl-10 pr-4 text-sm text-heading outline-none transition focus:border-primary"
            />
          </label>

          <select
            value={filters.category ?? "all"}
            onChange={(event) =>
              updateFilter(
                "category",
                event.target.value as ImageAssetCategory | "all"
              )
            }
            className="rounded-xl border border-box-border bg-body px-3 py-2.5 text-sm text-heading outline-none transition focus:border-primary"
          >
            {IMAGE_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 rounded-xl border border-box-border bg-body px-3 py-2.5 text-sm text-heading">
            <input
              type="checkbox"
              checked={Boolean(filters.includeArchived)}
              onChange={(event) =>
                updateFilter("includeArchived", event.target.checked)
              }
            />
            Archived
          </label>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-600 dark:text-red-300">
          {errorMessage}
        </div>
      ) : loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-box-border bg-box-bg/70">
          <RefreshCw className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : assets.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-box-border bg-box-bg/40 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ImageIcon size={26} />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-heading">
            No images found
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">
            Upload your first image or adjust the selected filters.
          </p>

          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            Upload Image
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {assets.map((asset) => (
              <ImageCard
                key={asset.id}
                asset={asset}
                archivedView={Boolean(filters.includeArchived)}
                processing={processingAssetId === asset.id}
                onView={setSelectedAsset}
                onCopy={(currentAsset) => void handleCopy(currentAsset)}
                onArchive={(currentAsset) => void handleArchive(currentAsset)}
                onRestore={(currentAsset) => void handleRestore(currentAsset)}
                onDelete={(currentAsset) => void handleDelete(currentAsset)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-box-border bg-box-bg/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-muted">
              {total} image
              {total === 1 ? "" : "s"}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg border border-box-border px-2 py-2 text-xs font-semibold text-heading disabled:opacity-40"
              >
                <ArrowLeft />
              </button>

              <span className="px-2 text-xs text-text-muted">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-lg border border-box-border px-2 py-2 text-xs font-semibold text-heading disabled:opacity-40"
              >
                <ArrowRight />
              </button>
            </div>
          </div>
        </>
      )}

      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <section className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-box-border bg-box-bg p-4 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Image
                </p>

                <h2 className="mt-1 break-words text-xl font-bold text-heading">
                  {selectedAsset.title || selectedAsset.original_file_name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="rounded-xl border border-box-border px-3 py-2 text-sm font-semibold text-heading"
              >
                Close
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-box-border bg-body">
              <img
                src={selectedAsset.public_url}
                alt={
                  selectedAsset.alt_text ||
                  selectedAsset.title ||
                  selectedAsset.original_file_name
                }
                className="max-h-[65vh] w-full object-contain"
              />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  File Name
                </p>

                <p className="mt-1 break-words text-sm font-medium text-heading">
                  {selectedAsset.original_file_name}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Category
                </p>

                <p className="mt-1 text-sm font-medium text-heading">
                  {selectedAsset.category}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Public URL
                </p>

                <p className="mt-1 break-all text-sm text-heading">
                  {selectedAsset.public_url}
                </p>
              </div>

              {selectedAsset.alt_text && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Alt Text
                  </p>

                  <p className="mt-1 text-sm text-heading">
                    {selectedAsset.alt_text}
                  </p>
                </div>
              )}

              {selectedAsset.description && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Description
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-heading">
                    {selectedAsset.description}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <ImageUploadModal
        open={uploadOpen}
        uploading={uploading}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUpload}
      />
    </section>
  );
}
