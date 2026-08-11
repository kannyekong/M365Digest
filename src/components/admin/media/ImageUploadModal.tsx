import { ImagePlus, Loader2, Upload, X } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import type {
  ImageAssetCategory,
  UploadImageAssetInput,
} from "../../../types/image-asset";

interface ImageUploadModalProps {
  open: boolean;
  uploading: boolean;
  onClose: () => void;
  onUpload: (input: UploadImageAssetInput) => Promise<void> | void;
}

const IMAGE_CATEGORIES: Array<{
  value: ImageAssetCategory;
  label: string;
}> = [
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

/* Displays the modal used to upload one image into the Media Library. */
export default function ImageUploadModal({
  open,
  uploading,
  onClose,
  onUpload,
}: ImageUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);

  const [previewUrl, setPreviewUrl] = useState("");

  const [category, setCategory] = useState<ImageAssetCategory>("general");

  const [title, setTitle] = useState("");

  const [altText, setAltText] = useState("");

  const [description, setDescription] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  /* Resets all local upload state. */
  function resetForm() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(null);
    setPreviewUrl("");
    setCategory("general");
    setTitle("");
    setAltText("");
    setDescription("");
    setErrorMessage("");
  }

  /* Handles one browser image selection and generates a local preview. */
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setErrorMessage("Please select an image file.");

      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage("Images must be 10 MB or smaller.");

      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(selectedFile);

    setPreviewUrl(URL.createObjectURL(selectedFile));

    setErrorMessage("");
  }

  /* Closes the modal unless an upload is currently running. */
  function handleClose() {
    if (uploading) {
      return;
    }

    resetForm();
    onClose();
  }

  /* Validates and submits the selected image. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setErrorMessage("Select an image to upload.");

      return;
    }

    setErrorMessage("");

    try {
      await onUpload({
        file,
        category,
        title: title.trim() || null,
        altText: altText.trim() || null,
        description: description.trim() || null,
      });

      resetForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The image could not be uploaded."
      );
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/65 px-3 py-6 backdrop-blur-sm sm:px-4 sm:py-8">
      <section className="w-full max-w-2xl overflow-hidden rounded-2xl border border-box-border bg-box-bg shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-box-border px-4 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ImagePlus size={22} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-heading">Upload Image</h2>

              <p className="mt-1 text-sm leading-6 text-text-muted">
                Add a new image to the CloudTweak Media Library.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            aria-label="Close upload modal"
            className="rounded-xl border border-box-border p-2 text-text-muted transition hover:text-heading disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6">
          {errorMessage && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          <label className="block">
            <span className="text-sm font-semibold text-heading">Image</span>

            <div className="mt-2 overflow-hidden rounded-2xl border border-dashed border-box-border bg-body/50">
              {previewUrl ? (
                <div className="relative aspect-video">
                  <img
                    src={previewUrl}
                    alt="Selected upload preview"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
                  <ImagePlus className="h-9 w-9 text-text-muted" />

                  <p className="mt-3 text-sm font-semibold text-heading">
                    Select an image
                  </p>

                  <p className="mt-1 text-xs text-text-muted">
                    JPG, PNG, WEBP, GIF or SVG. Maximum 10 MB.
                  </p>
                </div>
              )}
            </div>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              onChange={handleFileChange}
              disabled={uploading}
              className="mt-3 block w-full text-sm text-text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-heading">
              Category
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as ImageAssetCategory)
                }
                className="mt-2 w-full rounded-xl border border-box-border bg-body px-3 py-2.5 text-sm text-heading outline-none transition focus:border-primary"
              >
                {IMAGE_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-heading">
              Title
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Optional title"
                className="mt-2 w-full rounded-xl border border-box-border bg-body px-3 py-2.5 text-sm text-heading outline-none transition focus:border-primary"
              />
            </label>

            <label className="text-sm font-semibold text-heading sm:col-span-2">
              Alt text
              <input
                type="text"
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
                placeholder="Describe the image for accessibility"
                className="mt-2 w-full rounded-xl border border-box-border bg-body px-3 py-2.5 text-sm text-heading outline-none transition focus:border-primary"
              />
            </label>

            <label className="text-sm font-semibold text-heading sm:col-span-2">
              Description
              <textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional internal description"
                className="mt-2 w-full resize-y rounded-xl border border-box-border bg-body px-3 py-2.5 text-sm text-heading outline-none transition focus:border-primary"
              />
            </label>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-box-border pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="rounded-xl border border-box-border px-4 py-2.5 text-sm font-semibold text-heading transition hover:text-primary disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={uploading || !file}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}

              {uploading ? "Uploading..." : "Upload Image"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
