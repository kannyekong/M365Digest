import { Check, ImageIcon, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { listImageAssets } from "../../../lib/image-assets";

import type {
  ImageAssetCategory,
  ImageAssetFilters,
  ImageAssetWithUrl,
} from "../../../types/image-asset";

interface MediaPickerProps {
  open: boolean;
  value?: string | null;
  onClose: () => void;
  onSelect: (asset: ImageAssetWithUrl) => void;
}

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

/* Displays reusable Media Library images and returns the selected asset to the parent component. */
export default function MediaPicker({
  open,
  value,
  onClose,
  onSelect,
}: MediaPickerProps) {
  const [assets, setAssets] = useState<ImageAssetWithUrl[]>([]);

  const [selectedAsset, setSelectedAsset] = useState<ImageAssetWithUrl | null>(
    null
  );

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ImageAssetCategory | "all">("all");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /* Loads reusable, non-archived images from the existing Media Library. */
  const loadAssets = useCallback(async () => {
    if (!open) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const filters: ImageAssetFilters = {
        search,
        category,
        includeArchived: false,
      };

      const result = await listImageAssets({
        page: 1,
        pageSize: 48,
        filters,
      });

      setAssets(result.assets);

      /* Restores the currently assigned image as the selected asset when it exists in the loaded page. */
      if (value) {
        const currentAsset =
          result.assets.find((asset) => asset.public_url === value) ?? null;

        setSelectedAsset(currentAsset);
      } else {
        setSelectedAsset(null);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Images could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [category, open, search, value]);

  /* Loads the Media Library when the picker opens or its filters change. */
  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadAssets();
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadAssets, open]);

  /* Clears transient picker state after the modal closes. */
  function handleClose() {
    setSearch("");
    setCategory("all");
    setSelectedAsset(null);
    setErrorMessage("");

    onClose();
  }

  /* Returns the chosen Media Library asset to the parent form. */
  function handleUseImage() {
    if (!selectedAsset) {
      return;
    }

    onSelect(selectedAsset);

    handleClose();
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/65 px-3 py-6 backdrop-blur-sm sm:px-4 sm:py-8">
      <section className="w-full max-w-5xl overflow-hidden rounded-2xl border border-box-border bg-box-bg shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-box-border px-4 py-5 sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-heading">
              Choose from Media Library
            </h2>

            <p className="mt-1 text-sm leading-6 text-text-muted">
              Select an existing image without uploading another copy.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close Media Library"
            className="rounded-xl border border-box-border p-2 text-text-muted transition hover:text-heading"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-box-border p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search images..."
                className="w-full rounded-xl border border-box-border bg-body py-2.5 pl-10 pr-4 text-sm text-heading outline-none transition focus:border-primary"
              />
            </label>

            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as ImageAssetCategory | "all")
              }
              className="rounded-xl border border-box-border bg-body px-3 py-2.5 text-sm text-heading outline-none transition focus:border-primary"
            >
              {IMAGE_CATEGORIES.map((currentCategory) => (
                <option
                  key={currentCategory.value}
                  value={currentCategory.value}
                >
                  {currentCategory.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6">
          {errorMessage ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          ) : loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : assets.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <ImageIcon size={32} className="text-text-muted" />

              <p className="mt-3 text-sm font-semibold text-heading">
                No images found
              </p>

              <p className="mt-1 text-xs text-text-muted">
                Try another search or image category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {assets.map((asset) => {
                const selected = selectedAsset?.id === asset.id;

                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAsset(asset)}
                    className={`group relative overflow-hidden rounded-2xl border text-left transition ${
                      selected
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-box-border hover:border-primary/40"
                    }`}
                  >
                    <div className="relative aspect-square bg-body">
                      <img
                        src={asset.public_url}
                        alt={
                          asset.alt_text ||
                          asset.title ||
                          asset.original_file_name
                        }
                        className="h-full w-full object-contain p-2"
                      />

                      {selected ? (
                        <div className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                          <Check size={15} />
                        </div>
                      ) : null}
                    </div>

                    <div className="border-t border-box-border p-3">
                      <p className="truncate text-xs font-bold text-heading">
                        {asset.title || asset.original_file_name}
                      </p>

                      <p className="mt-1 truncate text-[11px] capitalize text-text-muted">
                        {asset.category}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-box-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            {selectedAsset ? (
              <p className="truncate text-xs text-text-muted">
                Selected:{" "}
                <span className="font-semibold text-heading">
                  {selectedAsset.title || selectedAsset.original_file_name}
                </span>
              </p>
            ) : (
              <p className="text-xs text-text-muted">
                Select an image to continue.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-box-border px-4 py-2.5 text-sm font-semibold text-heading transition hover:text-primary"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleUseImage}
              disabled={!selectedAsset}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={16} />
              Use image
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
