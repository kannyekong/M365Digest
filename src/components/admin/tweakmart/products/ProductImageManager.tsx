import { useRef, useState } from "react";

import { ImagePlus, LoaderCircle, Star, Trash2, Upload } from "lucide-react";

export interface ProductImage {
  id: string;
  image_url: string;
  storage_path?: string | null;
  alt_text: string | null;
  is_primary: boolean;
  display_order: number;
}

interface ProductImageManagerProps {
  productId: string;
  initialImages?: ProductImage[];
}

interface ProductImageUploadResponse {
  success: boolean;
  message?: string;
  image?: ProductImage;
}

/* Manages product image uploads, primary-image selection, and removal. */
export default function ProductImageManager({
  productId,
  initialImages = [],
}: ProductImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ProductImage[]>(initialImages);

  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");

  /* Opens the hidden product image file selector. */
  function handleChooseImage() {
    if (uploading) {
      return;
    }

    fileInputRef.current?.click();
  }

  /* Resets the file input so the same image can be selected again if necessary. */
  function resetFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  /* Uploads a selected product image through the protected CloudTweak API. */
  async function handleImageSelected(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploading(true);
      setError("");

      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        `/api/admin/tweakmart/products/${productId}/images`,
        {
          method: "POST",
          body: formData,
        }
      );

      const responseText = await response.text();

      let result: ProductImageUploadResponse;

      try {
        result = JSON.parse(responseText) as ProductImageUploadResponse;
      } catch {
        console.error("Invalid product image API response:", responseText);

        throw new Error(
          "The product image server returned an invalid response."
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Unable to upload product image.");
      }

      const uploadedImage = result.image;

      if (!uploadedImage) {
        throw new Error("The uploaded image was not returned by the server.");
      }

      setImages((current) => [...current, uploadedImage]);

      resetFileInput();
    } catch (uploadError) {
      console.error("Failed to upload product image:", uploadError);

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload product image."
      );

      resetFileInput();
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Product Images
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Upload product photos and choose which image should appear as the
            primary storefront image.
          </p>
        </div>

        <button
          type="button"
          onClick={handleChooseImage}
          disabled={uploading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <>
              <LoaderCircle size={15} className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={15} />
              Upload Image
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageSelected}
          className="hidden"
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {images.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={image.image_url}
                  alt={image.alt_text ?? "TweakMart product"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="flex items-center justify-between gap-2 p-3">
                {image.is_primary ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                    <Star size={11} fill="currentColor" />
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 transition hover:text-primary dark:text-slate-400"
                  >
                    <Star size={12} />
                    Make Primary
                  </button>
                )}

                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  aria-label="Delete image"
                  title="Delete image"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-5 text-center dark:border-slate-700">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-900">
            <ImagePlus size={20} />
          </div>

          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
            No product images yet
          </p>

          <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
            Upload the first image for this product. The first uploaded image
            will become the primary storefront image.
          </p>

          <button
            type="button"
            onClick={handleChooseImage}
            disabled={uploading}
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            {uploading ? (
              <>
                <LoaderCircle size={14} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImagePlus size={14} />
                Choose Image
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
