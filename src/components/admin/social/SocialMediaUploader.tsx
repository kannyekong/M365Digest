import { ImagePlus, LoaderCircle, Trash2, UploadCloud } from "lucide-react";

import { useRef, useState } from "react";

import { supabase } from "../../../lib/superbase";

interface SocialMediaUploaderProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

const BUCKET_NAME = "social-media";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/* Generates a storage-safe filename for uploaded social campaign media. */
function createFileName(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";

  const randomId = crypto.randomUUID();

  return `campaigns/${Date.now()}-${randomId}.${extension}`;
}

/* Uploads and previews social campaign images stored in Supabase Storage. */
export default function SocialMediaUploader({
  value,
  onChange,
  disabled = false,
}: SocialMediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /* Opens the hidden native image picker. */
  function handleSelectFile() {
    if (disabled || uploading) {
      return;
    }

    inputRef.current?.click();
  }

  /* Validates and uploads the selected image to Supabase Storage. */
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Use a JPG, PNG, or WebP image.");

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("The image must be 8 MB or smaller.");

      return;
    }

    setUploading(true);

    try {
      const filePath = createFileName(file);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!data.publicUrl) {
        throw new Error("Unable to generate the image URL.");
      }

      onChange(data.publicUrl);
    } catch (uploadError) {
      console.error("Unable to upload social media image:", uploadError);

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload image."
      );
    } finally {
      setUploading(false);
    }
  }

  /* Removes the selected image from the campaign composer. */
  function handleRemove() {
    if (disabled || uploading) {
      return;
    }

    setError(null);
    onChange("");
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || uploading}
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="relative">
            <img
              src={value}
              alt="Social campaign"
              className="aspect-[16/9] w-full object-cover"
            />

            <button
              type="button"
              title="Remove image"
              disabled={disabled || uploading}
              onClick={handleRemove}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-red-600 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-50 dark:bg-gray-950/90 dark:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
            <div className="flex min-w-0 items-center gap-2">
              <ImagePlus size={15} className="shrink-0 text-gray-400" />

              <p className="truncate text-xs text-gray-500">Campaign image</p>
            </div>

            <button
              type="button"
              disabled={disabled || uploading}
              onClick={handleSelectFile}
              className="shrink-0 text-xs font-medium text-gray-700 hover:text-gray-950 disabled:opacity-50 dark:text-gray-300 dark:hover:text-white"
            >
              Replace
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={handleSelectFile}
          className="flex min-h-44 w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 px-6 py-8 text-center transition hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-900/50"
        >
          {uploading ? (
            <LoaderCircle size={28} className="animate-spin text-gray-400" />
          ) : (
            <UploadCloud size={28} className="text-gray-400" />
          )}

          <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
            {uploading ? "Uploading image..." : "Upload campaign image"}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            JPG, PNG or WebP · Max 8 MB
          </p>
        </button>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
