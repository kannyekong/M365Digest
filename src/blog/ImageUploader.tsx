import { ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { uploadCoverImage } from "../lib/storage";

interface ImageUploaderProps {
  label?: string;
  description?: string;
  value?: string | null;
  bucket: string;
  previewClassName?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
}

/**
 * Upload an image to Supabase Storage and return its public URL.
 */
export default function ImageUploader({
  label = "Upload image",
  description,
  value,
  bucket,
  previewClassName = "h-52",
  onChange,
  onRemove,
}: ImageUploaderProps) {
  // Store a reference to the hidden file input.
  const inputRef = useRef<HTMLInputElement>(null);

  // Track whether an image upload is running.
  const [uploading, setUploading] = useState(false);

  /**
   * Open the hidden file selector.
   */
  function handleSelectImage() {
    // Prevent another selection while an upload is running.
    if (uploading) {
      return;
    }

    inputRef.current?.click();
  }

  /**
   * Upload the selected image to Supabase Storage.
   */
  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    // Retrieve the first selected file.
    const file = event.target.files?.[0];

    // Stop when the user closes the file picker without choosing a file.
    if (!file) {
      return;
    }

    // Start the upload state.
    setUploading(true);

    try {
      // Upload the selected image using the shared storage helper.
      const { data, error } = await uploadCoverImage(file, bucket);

      // Display the storage error when the upload fails.
      if (error) {
        toast.error(error.message);
        return;
      }

      // Stop when the helper does not return a public URL.
      if (!data) {
        toast.error("The image uploaded, but its URL could not be retrieved.");
        return;
      }

      // Send the uploaded image URL to the parent form.
      onChange(data);

      // Confirm the successful upload.
      toast.success(`${label} uploaded successfully.`);
    } catch (error) {
      // Log unexpected upload errors for debugging.
      console.error("Unexpected image upload error:", error);

      // Display a safe fallback error.
      toast.error("The image could not be uploaded.");
    } finally {
      // End the upload state.
      setUploading(false);

      // Reset the input so the same file can be selected again.
      event.target.value = "";
    }
  }

  /**
   * Remove the selected image from the form.
   */
  function handleRemoveImage() {
    // Stop when the parent component does not support image removal.
    if (!onRemove) {
      return;
    }

    // Clear the selected image in the parent form.
    onRemove();

    // Reset the file input.
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-slate-800">
          {label}
        </label>

        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        ) : null}
      </div>

      <div
        className={`relative overflow-hidden rounded-4xl border border-slate-200 bg-slate-50 ${previewClassName}`}
      >
        {value ? (
          <img
            src={value}
            alt={`${label} preview`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full min-h-20 flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 text-center text-slate-400">
            <ImagePlus size={30} />

            <div>
              <p className="text-sm font-medium text-slate-600">
                No image selected
              </p>

              <p className="mt-1 text-xs text-slate-400">
                JPG, PNG, WebP or AVIF
              </p>
            </div>
          </div>
        )}

        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
            <div className="text-center text-white">
              <LoaderCircle size={28} className="mx-auto animate-spin" />

              <p className="mt-3 text-sm font-medium">Uploading image...</p>
            </div>
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        hidden
        onChange={handleUpload}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSelectImage}
          disabled={uploading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <Upload size={17} />
          )}

          {uploading
            ? "Uploading..."
            : value
              ? "Replace image"
              : "Upload image"}
        </button>

        {value && onRemove ? (
          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={uploading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 size={16} />
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
