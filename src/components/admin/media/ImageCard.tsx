import {
  Archive,
  Copy,
  Eye,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { ImageAssetWithUrl } from "../../../types/image-asset";

interface ImageCardProps {
  asset: ImageAssetWithUrl;

  archivedView: boolean;

  processing: boolean;

  onView: (asset: ImageAssetWithUrl) => void;

  onCopy: (asset: ImageAssetWithUrl) => void;

  onArchive: (asset: ImageAssetWithUrl) => void;

  onRestore: (asset: ImageAssetWithUrl) => void;

  onDelete: (asset: ImageAssetWithUrl) => void;
}

/* Formats one byte count into a readable file size. */
function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  const megabytes = kilobytes / 1024;

  return `${megabytes.toFixed(1)} MB`;
}

/* Converts one internal category value into a readable label. */
function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/* Displays one image in the Admin Media Library. */
export default function ImageCard({
  asset,
  archivedView,
  processing,
  onView,
  onCopy,
  onArchive,
  onRestore,
  onDelete,
}: ImageCardProps) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-box-border bg-box-bg/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={() => onView(asset)}
        className="block aspect-[4/3] w-full overflow-hidden bg-body"
      >
        <img
          src={asset.public_url}
          alt={asset.alt_text || asset.title || asset.original_file_name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
      </button>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-heading">
              {asset.title || asset.original_file_name}
            </p>

            <p className="mt-1 truncate text-xs text-text-muted">
              {asset.original_file_name}
            </p>
          </div>

          <MoreHorizontal size={17} className="shrink-0 text-text-muted" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {formatLabel(asset.category)}
          </span>

          <span className="text-xs text-text-muted">
            {formatFileSize(Number(asset.file_size))}
          </span>

          {asset.width && asset.height && (
            <span className="text-xs text-text-muted">
              {asset.width} × {asset.height}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            title="View image"
            onClick={() => onView(asset)}
            className="rounded-lg border border-box-border p-2 text-text-muted transition hover:text-primary"
          >
            <Eye size={15} />
          </button>

          <button
            type="button"
            title="Copy image URL"
            onClick={() => onCopy(asset)}
            className="rounded-lg border border-box-border p-2 text-text-muted transition hover:text-primary"
          >
            <Copy size={15} />
          </button>

          {archivedView ? (
            <button
              type="button"
              title="Restore image"
              disabled={processing}
              onClick={() => onRestore(asset)}
              className="rounded-lg border border-box-border p-2 text-text-muted transition hover:text-emerald-600 disabled:opacity-50"
            >
              <RotateCcw size={15} />
            </button>
          ) : (
            <button
              type="button"
              title="Archive image"
              disabled={processing}
              onClick={() => onArchive(asset)}
              className="rounded-lg border border-box-border p-2 text-text-muted transition hover:text-amber-600 disabled:opacity-50"
            >
              <Archive size={15} />
            </button>
          )}

          <button
            type="button"
            title="Permanently delete image"
            disabled={processing}
            onClick={() => onDelete(asset)}
            className="rounded-lg border border-box-border p-2 text-text-muted transition hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
