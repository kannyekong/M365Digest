import { supabase } from "./superbase";
import type {
  ImageAsset,
  ImageAssetCategory,
  ImageAssetFilters,
  ImageAssetListResult,
  ImageAssetWithUrl,
  UpdateImageAssetInput,
  UploadImageAssetInput,
} from "../types/image-asset";

const IMAGE_BUCKET = "cloudtweak-media";

interface ListImageAssetsOptions {
  page?: number;

  pageSize?: number;

  filters?: ImageAssetFilters;
}

/* Converts blank optional text into null before storing it. */
function optionalText(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

/* Returns the file extension from one uploaded filename. */
function getFileExtension(fileName: string) {
  const pieces = fileName.split(".");

  if (pieces.length < 2) {
    return "";
  }

  return pieces.pop()?.toLowerCase() ?? "";
}

/* Builds a collision-resistant storage path for one uploaded image. */
function buildStoragePath(file: File, category: ImageAssetCategory) {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const extension = getFileExtension(file.name);

  const fileId = crypto.randomUUID();

  const storedFileName = extension ? `${fileId}.${extension}` : fileId;

  return {
    storagePath: `${category}/${year}/${month}/${storedFileName}`,

    storedFileName,
  };
}

/* Returns the public Storage URL for one image path. */
export function getImageAssetPublicUrl(storagePath: string) {
  const { data } = supabase.storage
    .from(IMAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/* Adds the public Storage URL to one Image Asset record. */
function withPublicUrl(asset: ImageAsset): ImageAssetWithUrl {
  return {
    ...asset,

    public_url: getImageAssetPublicUrl(asset.storage_path),
  };
}

/* Reads the pixel dimensions of one browser image file. */
async function getImageDimensions(file: File): Promise<{
  width: number | null;
  height: number | null;
}> {
  if (!file.type.startsWith("image/")) {
    return {
      width: null,
      height: null,
    };
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);

    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth || null,

        height: image.naturalHeight || null,
      });

      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      resolve({
        width: null,
        height: null,
      });

      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
  });
}

/* Retrieves the currently authenticated user ID. */
async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("You must be signed in to manage images.");
  }

  return user.id;
}

/* Uploads one image to Storage and creates its Image Asset database record. */
export async function uploadImageAsset(
  input: UploadImageAssetInput
): Promise<ImageAssetWithUrl> {
  const file = input.file;

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }

  const maximumSize = 10 * 1024 * 1024;

  if (file.size > maximumSize) {
    throw new Error("Images must be 10 MB or smaller.");
  }

  const category = input.category ?? "general";

  const userId = await getCurrentUserId();

  const { storagePath, storedFileName } = buildStoragePath(file, category);

  const dimensions = await getImageDimensions(file);

  const { error: uploadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",

      upsert: false,

      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error: databaseError } = await supabase
    .from("image_assets")
    .insert({
      file_name: storedFileName,

      original_file_name: file.name,

      storage_bucket: IMAGE_BUCKET,

      storage_path: storagePath,

      mime_type: file.type,

      file_size: file.size,

      width: dimensions.width,

      height: dimensions.height,

      alt_text: optionalText(input.altText),

      title: optionalText(input.title),

      description: optionalText(input.description),

      category,

      uploaded_by: userId,

      metadata: {},
    })
    .select()
    .single();

  if (databaseError || !data) {
    /* Removes the Storage object if database registration fails. */
    await supabase.storage.from(IMAGE_BUCKET).remove([storagePath]);

    throw new Error(
      databaseError?.message ?? "The image record could not be created."
    );
  }

  return withPublicUrl(data as ImageAsset);
}

/* Retrieves paginated Image Assets for the Admin Gallery. */
export async function listImageAssets({
  page = 1,
  pageSize = 24,
  filters = {},
}: ListImageAssetsOptions = {}): Promise<ImageAssetListResult> {
  const safePage = Math.max(1, page);

  const safePageSize = Math.max(1, pageSize);

  const from = (safePage - 1) * safePageSize;

  const to = from + safePageSize - 1;

  let query = supabase.from("image_assets").select("*", {
    count: "exact",
  });

  const search = filters.search?.trim();

  if (search) {
    const escapedSearch = search.replace(/[%_,]/g, "");

    query = query.or(
      `original_file_name.ilike.%${escapedSearch}%,title.ilike.%${escapedSearch}%,alt_text.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`
    );
  }

  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  if (!filters.includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error, count } = await query
    .order("created_at", {
      ascending: false,
    })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;

  return {
    assets: (data ?? []).map((asset) => withPublicUrl(asset as ImageAsset)),

    total,

    page: safePage,

    pageSize: safePageSize,

    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

/* Retrieves one Image Asset using its UUID. */
export async function getImageAssetById(
  assetId: string
): Promise<ImageAssetWithUrl> {
  const { data, error } = await supabase
    .from("image_assets")
    .select("*")
    .eq("id", assetId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "The image could not be found.");
  }

  return withPublicUrl(data as ImageAsset);
}

/* Updates editable Image Asset metadata. */
export async function updateImageAsset(
  assetId: string,
  updates: UpdateImageAssetInput
): Promise<ImageAssetWithUrl> {
  const databaseUpdates: Record<string, unknown> = {};

  if (updates.category !== undefined) {
    databaseUpdates.category = updates.category;
  }

  if (updates.altText !== undefined) {
    databaseUpdates.alt_text = optionalText(updates.altText);
  }

  if (updates.title !== undefined) {
    databaseUpdates.title = optionalText(updates.title);
  }

  if (updates.description !== undefined) {
    databaseUpdates.description = optionalText(updates.description);
  }

  databaseUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("image_assets")
    .update(databaseUpdates)
    .eq("id", assetId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "The image could not be updated.");
  }

  return withPublicUrl(data as ImageAsset);
}

/* Archives one Image Asset without deleting its Storage object. */
export async function archiveImageAsset(
  assetId: string
): Promise<ImageAssetWithUrl> {
  const { data, error } = await supabase
    .from("image_assets")
    .update({
      archived_at: new Date().toISOString(),

      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId)
    .is("archived_at", null)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "The image could not be archived.");
  }

  return withPublicUrl(data as ImageAsset);
}

/* Restores one archived Image Asset. */
export async function restoreImageAsset(
  assetId: string
): Promise<ImageAssetWithUrl> {
  const { data, error } = await supabase
    .from("image_assets")
    .update({
      archived_at: null,

      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "The image could not be restored.");
  }

  return withPublicUrl(data as ImageAsset);
}

/* Permanently removes one Image Asset and its Storage object. */
export async function deleteImageAsset(asset: ImageAsset): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(asset.storage_bucket)
    .remove([asset.storage_path]);

  if (storageError) {
    throw new Error(storageError.message);
  }

  const { error: databaseError } = await supabase
    .from("image_assets")
    .delete()
    .eq("id", asset.id);

  if (databaseError) {
    throw new Error(databaseError.message);
  }
}

/* Copies one Image Asset public URL to the browser clipboard. */
export async function copyImageAssetUrl(asset: ImageAsset) {
  const publicUrl = getImageAssetPublicUrl(asset.storage_path);

  await navigator.clipboard.writeText(publicUrl);

  return publicUrl;
}
