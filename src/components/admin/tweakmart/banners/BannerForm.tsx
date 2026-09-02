import { useMemo, useRef, useState } from "react";

import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";

import type { TweakMartBanner } from "../../../../lib/tweakmart/banner";

import ConfirmModal from "../../../../islands/ConfirmModal";

interface BannerFormProps {
  banner?: TweakMartBanner | null;
}

interface UploadResponse {
  success: boolean;
  imageUrl?: string;
  storagePath?: string;
  message?: string;
}

interface BannerSaveResponse {
  success: boolean;
  message?: string;
  banner?: TweakMartBanner;
}

/* Converts a stored ISO date into the value expected by a datetime-local field. */
function toDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

/* Renders the create and edit form used by TweakMart featured-banner management. */
export default function BannerForm({ banner }: BannerFormProps) {
  const editing = Boolean(banner);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(banner?.title ?? "");

  const [altText, setAltText] = useState(banner?.alt_text ?? "");

  const [linkUrl, setLinkUrl] = useState(banner?.link_url ?? "");

  const [displayOrder, setDisplayOrder] = useState(banner?.display_order ?? 1);

  const [active, setActive] = useState(banner?.is_active ?? true);

  const [startsAt, setStartsAt] = useState(toDateTimeLocal(banner?.starts_at));

  const [endsAt, setEndsAt] = useState(toDateTimeLocal(banner?.ends_at));

  const [imageUrl, setImageUrl] = useState(banner?.image_url ?? "");

  const [storagePath, setStoragePath] = useState(banner?.storage_path ?? "");

  const [localPreview, setLocalPreview] = useState("");

  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [updateConfirmationOpen, setUpdateConfirmationOpen] = useState(false);

  const previewImage = localPreview || imageUrl;

  const submitLabel = useMemo(() => {
    if (saving) {
      return editing ? "Saving changes..." : "Creating banner...";
    }

    return editing ? "Save Changes" : "Create Banner";
  }, [editing, saving]);

  /* Handles banner-image selection, creates a temporary preview and uploads the image through the CloudTweak server. */
  async function handleImageSelection(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

    /* Releases the previous temporary preview before creating another one. */
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
    }

    const temporaryPreview = URL.createObjectURL(file);

    setLocalPreview(temporaryPreview);

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append("image", file);

      const response = await fetch("/api/admin/tweakmart/banners/upload", {
        method: "POST",
        body: formData,
      });

      /* Reads the response safely so an unexpected HTML response does not cause a JSON parsing crash. */
      const responseText = await response.text();

      let result: UploadResponse;

      try {
        result = JSON.parse(responseText) as UploadResponse;
      } catch {
        console.error("Unexpected banner upload response:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          contentType: response.headers.get("content-type"),
          body: responseText.slice(0, 500),
        });

        throw new Error(
          `Banner upload endpoint returned an unexpected response (${response.status}).`
        );
      }

      if (
        !response.ok ||
        !result.success ||
        !result.imageUrl ||
        !result.storagePath
      ) {
        throw new Error(result.message ?? "Unable to upload banner image.");
      }

      setImageUrl(result.imageUrl);
      setStoragePath(result.storagePath);

      setSuccess("Banner image uploaded successfully.");
    } catch (uploadError) {
      console.error("Banner image upload failed:", uploadError);

      /* Restores the original banner image when a replacement upload fails. */
      setImageUrl(banner?.image_url ?? "");

      setStoragePath(banner?.storage_path ?? "");

      setLocalPreview("");

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload banner image."
      );
    } finally {
      setUploading(false);
    }
  }

  /* Clears the currently selected banner image from the form. */
  function clearImage() {
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
    }

    setLocalPreview("");
    setImageUrl("");
    setStoragePath("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  /* Validates the banner fields before a create or update operation can continue. */
  function validateBannerForm() {
    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError("Banner title is required.");
      return false;
    }

    if (!imageUrl) {
      setError("Please upload a banner image.");

      return false;
    }

    if (!Number.isInteger(displayOrder) || displayOrder < 1) {
      setError("Display order must be at least 1.");

      return false;
    }

    if (
      startsAt &&
      endsAt &&
      new Date(endsAt).getTime() <= new Date(startsAt).getTime()
    ) {
      setError("End date must be later than the start date.");

      return false;
    }

    return true;
  }

  /* Handles form submission and requires confirmation before updating an existing banner. */
  async function submitBanner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateBannerForm()) {
      return;
    }

    /* Existing banner updates must pass through the reusable confirmation modal. */
    if (editing) {
      setUpdateConfirmationOpen(true);
      return;
    }

    await saveBanner();
  }

  /* Creates or updates the featured banner after validation and any required confirmation. */
  async function saveBanner() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const endpoint = editing
        ? `/api/admin/tweakmart/banners/${banner?.id}`
        : "/api/admin/tweakmart/banners";

      const response = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          title: title.trim(),

          image_url: imageUrl,

          storage_path: storagePath || null,

          alt_text: altText.trim() || null,

          link_url: linkUrl.trim() || null,

          display_order: displayOrder,

          is_active: active,

          starts_at: startsAt ? new Date(startsAt).toISOString() : null,

          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        }),
      });

      /* Reads the response as text first so malformed or HTML responses can be handled safely. */
      const responseText = await response.text();

      let result: BannerSaveResponse;

      try {
        result = JSON.parse(responseText) as BannerSaveResponse;
      } catch {
        console.error("Unexpected banner save response:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          contentType: response.headers.get("content-type"),
          body: responseText.slice(0, 500),
        });

        throw new Error(
          `Banner endpoint returned an unexpected response (${response.status}).`
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Unable to save featured banner.");
      }

      setUpdateConfirmationOpen(false);

      window.location.href = "/admin/tweakmart/banners";
    } catch (submitError) {
      console.error("Failed to save TweakMart banner:", submitError);

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save featured banner."
      );

      setUpdateConfirmationOpen(false);
    } finally {
      setSaving(false);
    }
  }

  /* Closes the update confirmation modal while no save operation is in progress. */
  function closeUpdateConfirmation() {
    if (saving) {
      return;
    }

    setUpdateConfirmationOpen(false);
  }

  return (
    <>
      <form onSubmit={submitBanner} className="mt-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Banner Information
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Configure the content and destination associated with this
                  storefront banner.
                </p>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="banner-title"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Banner Title
                  </label>

                  <input
                    id="banner-title"
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Dell Business Technology"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="banner-alt"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Alternative Text
                  </label>

                  <input
                    id="banner-alt"
                    type="text"
                    value={altText}
                    onChange={(event) => setAltText(event.target.value)}
                    placeholder="Dell business laptops available on TweakMart"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="banner-link"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Destination URL
                  </label>

                  <input
                    id="banner-link"
                    type="text"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="/collections/computers-laptops"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />

                  <p className="mt-2 text-[11px] leading-5 text-slate-400">
                    Optional. This is where shoppers should go when they
                    interact with the banner.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Display & Scheduling
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Control banner priority and when it becomes available on
                TweakMart.
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="display-order"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Display Order
                  </label>

                  <input
                    id="display-order"
                    type="number"
                    min={1}
                    value={displayOrder}
                    onChange={(event) =>
                      setDisplayOrder(Number(event.target.value))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Active Banner
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        Eligible for storefront display.
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(event) => setActive(event.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                  </label>
                </div>

                <div>
                  <label
                    htmlFor="starts-at"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Starts At
                  </label>

                  <input
                    id="starts-at"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ends-at"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Ends At
                  </label>

                  <input
                    id="ends-at"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(event) => setEndsAt(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div>
                <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                  Banner Image
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Upload the promotional image shown in the TweakMart hero.
                </p>
              </div>

              {previewImage ? (
                <div className="relative mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                  <img
                    src={previewImage}
                    alt={altText || title || "Banner preview"}
                    className="aspect-[4/3] w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={clearImage}
                    disabled={uploading || saving}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Remove selected image"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploading || saving}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-5 flex aspect-[4/3] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-primary/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                    {uploading ? (
                      <LoaderCircle size={21} className="animate-spin" />
                    ) : (
                      <ImagePlus size={21} />
                    )}
                  </div>

                  <p className="mt-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                    {uploading ? "Uploading image..." : "Select banner image"}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-400">
                    JPG, PNG or WebP • Maximum 8 MB
                  </p>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelection}
                className="hidden"
              />

              {previewImage ? (
                <button
                  type="button"
                  disabled={uploading || saving}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  {uploading ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <UploadCloud size={15} />
                  )}

                  {uploading
                    ? "Uploading..."
                    : editing
                      ? "Replace Image"
                      : "Change Image"}
                </button>
              ) : null}
            </section>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium leading-5 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium leading-5 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />

                {success}
              </div>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : null}

                {submitLabel}
              </button>

              <a
                href="/admin/tweakmart/banners"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <ArrowLeft size={14} />
                Back to Banners
              </a>
            </section>
          </aside>
        </div>
      </form>

      <ConfirmModal
        open={editing && updateConfirmationOpen}
        title="Update Featured Banner"
        message={`Are you sure you want to save the changes made to "${
          title || banner?.title || "this banner"
        }"? The updated configuration will be reflected on the TweakMart storefront according to its activation and scheduling settings.`}
        confirmText="Update Banner"
        cancelText="Cancel"
        variant="primary"
        loading={saving}
        onConfirm={saveBanner}
        onCancel={closeUpdateConfirmation}
      />
    </>
  );
}
