import { useRef, useState } from "react";
import MediaPicker from "../../media/MediaPicker";
import {
  ImagePlus,
  Images,
  LoaderCircle,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import type { ImageAssetWithUrl } from "../../../../types/image-asset";

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

interface ProductImageMutationResponse {
  success: boolean;
  message?: string;
  image?: ProductImage;
}

/* Reads an API response safely and prevents HTML error pages from causing JSON parsing errors. */
async function readApiResponse<T>(response: Response): Promise<T> {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText) as T;
  } catch {
    console.error("Invalid product image API response:", responseText);

    throw new Error("The product image server returned an invalid response.");
  }
}

/* Sorts product images by their configured storefront display order. */
function sortProductImages(images: ProductImage[]) {
  return [...images].sort(
    (firstImage, secondImage) =>
      firstImage.display_order - secondImage.display_order
  );
}

/* Manages product image uploads, Media Library selection, primary-image selection, and removal. */
export default function ProductImageManager({
  productId,
  initialImages = [],
}: ProductImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ProductImage[]>(
    sortProductImages(initialImages)
  );

  const [uploading, setUploading] = useState(false);
  const [attachingMedia, setAttachingMedia] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [updatingPrimaryId, setUpdatingPrimaryId] = useState<string | null>(
    null
  );
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [error, setError] = useState("");

  /* Opens the hidden product image file selector. */
  function handleChooseImage() {
    if (uploading || attachingMedia) {
      return;
    }

    fileInputRef.current?.click();
  }

  /* Opens the shared CloudTweak Media Library picker. */
  function handleOpenMediaLibrary() {
    if (uploading || attachingMedia) {
      return;
    }

    setError("");
    setMediaPickerOpen(true);
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

      const result =
        await readApiResponse<ProductImageMutationResponse>(response);

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Unable to upload product image.");
      }

      const uploadedImage = result.image;

      if (!uploadedImage) {
        throw new Error("The uploaded image was not returned by the server.");
      }

      setImages((current) => sortProductImages([...current, uploadedImage]));

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

  /* Attaches an existing Media Library asset to the product without uploading a duplicate file. */
  async function handleMediaSelect(asset: ImageAssetWithUrl) {
    try {
      setAttachingMedia(true);
      setError("");

      const response = await fetch(
        `/api/admin/tweakmart/products/${productId}/images`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: asset.public_url,
            storagePath: asset.storage_path ?? null,
            altText: asset.alt_text ?? null,
            mediaAssetId: asset.id,
          }),
        }
      );

      const result =
        await readApiResponse<ProductImageMutationResponse>(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ??
            "Unable to add the Media Library image to this product."
        );
      }

      if (!result.image) {
        throw new Error(
          "The selected product image was not returned by the server."
        );
      }

      setImages((current) =>
        sortProductImages([...current, result.image as ProductImage])
      );

      setMediaPickerOpen(false);
    } catch (mediaError) {
      console.error("Failed to attach Media Library image:", mediaError);

      setError(
        mediaError instanceof Error
          ? mediaError.message
          : "Unable to add the Media Library image."
      );
    } finally {
      setAttachingMedia(false);
    }
  }

  /* Marks a product image as the primary storefront image. */
  async function handleMakePrimary(imageId: string) {
    if (updatingPrimaryId) {
      return;
    }

    try {
      setUpdatingPrimaryId(imageId);
      setError("");

      const response = await fetch(
        `/api/admin/tweakmart/products/${productId}/images/${imageId}/primary`,
        {
          method: "PATCH",
        }
      );

      const result =
        await readApiResponse<ProductImageMutationResponse>(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ?? "Unable to update the primary image."
        );
      }

      setImages((current) =>
        current.map((image) => ({
          ...image,
          is_primary: image.id === imageId,
        }))
      );
    } catch (primaryError) {
      console.error("Failed to update product primary image:", primaryError);

      setError(
        primaryError instanceof Error
          ? primaryError.message
          : "Unable to update the primary image."
      );
    } finally {
      setUpdatingPrimaryId(null);
    }
  }

  /* Deletes a product image association through the protected CloudTweak API. */
  async function handleDeleteImage(imageId: string) {
    if (deletingImageId) {
      return;
    }

    try {
      setDeletingImageId(imageId);
      setError("");

      const response = await fetch(
        `/api/admin/tweakmart/products/${productId}/images/${imageId}`,
        {
          method: "DELETE",
        }
      );

      const result =
        await readApiResponse<ProductImageMutationResponse>(response);

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Unable to delete product image.");
      }

      setImages((current) => current.filter((image) => image.id !== imageId));
    } catch (deleteError) {
      console.error("Failed to delete product image:", deleteError);

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete product image."
      );
    } finally {
      setDeletingImageId(null);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
              Product Images
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Upload product photos or choose existing images from the Media
              Library.
            </p>
          </div>

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
            {images.map((image) => {
              const isUpdatingPrimary = updatingPrimaryId === image.id;

              const isDeleting = deletingImageId === image.id;

              return (
                <div
                  key={image.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={image.image_url}
                      alt={image.alt_text ?? "TweakMart product"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />

                    {image.is_primary ? (
                      <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-primary shadow-sm backdrop-blur dark:bg-slate-950/90">
                        <Star size={11} fill="currentColor" />
                        Primary
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-2 p-3">
                    {image.is_primary ? (
                      <span className="text-[11px] font-medium text-slate-400">
                        Storefront image
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleMakePrimary(image.id)}
                        disabled={
                          Boolean(updatingPrimaryId) || Boolean(deletingImageId)
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400"
                      >
                        {isUpdatingPrimary ? (
                          <LoaderCircle size={12} className="animate-spin" />
                        ) : (
                          <Star size={12} />
                        )}

                        {isUpdatingPrimary ? "Updating..." : "Make Primary"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleDeleteImage(image.id)}
                      disabled={
                        Boolean(deletingImageId) || Boolean(updatingPrimaryId)
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-500/10"
                      aria-label="Delete image"
                      title="Delete image"
                    >
                      {isDeleting ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
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
              Upload a new image or choose one from the Media Library. The first
              product image will become the primary storefront image.
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={handleOpenMediaLibrary}
                disabled={uploading || attachingMedia}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <Images size={14} />
                Media Library
              </button>

              <button
                type="button"
                onClick={handleChooseImage}
                disabled={uploading || attachingMedia}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <LoaderCircle size={14} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Upload Image
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => {
          if (!attachingMedia) {
            setMediaPickerOpen(false);
          }
        }}
        onSelect={handleMediaSelect}
      />
    </>
  );
}
