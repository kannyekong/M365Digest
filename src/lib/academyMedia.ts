import { supabase } from "./superbase";

const CMS_MEDIA_BUCKET = "cms-media";

export type AcademyImageType = "hero" | "thumbnail" | "banner";

export interface AcademyMediaUploadResult {
  publicUrl: string;
  storagePath: string;
}

/**
 * Convert a value into a safe file-path segment.
 */
function sanitizePathSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a unique storage file name while preserving
 * the original file extension.
 */
function generateStorageFileName(file: File) {
  // Retrieve the original extension when one exists.
  const fileExtension = file.name.split(".").pop()?.toLowerCase() || "webp";

  // Generate a unique name to avoid accidental overwrites.
  const uniqueValue = crypto.randomUUID();

  return `${uniqueValue}.${fileExtension}`;
}

/**
 * Validate an Academy image before uploading it.
 */
function validateAcademyImage(file: File) {
  // Restrict uploads to supported image formats.
  const supportedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ];

  if (!supportedTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG, WebP and AVIF images are supported.");
  }

  // Restrict individual images to five megabytes.
  const maximumFileSize = 5 * 1024 * 1024;

  if (file.size > maximumFileSize) {
    throw new Error("The selected image must not exceed 5 MB.");
  }
}

/**
 * Upload an Academy program image to Supabase Storage.
 */
export async function uploadAcademyProgramImage(
  file: File,
  programSlug: string,
  imageType: AcademyImageType
): Promise<AcademyMediaUploadResult> {
  // Validate the image before beginning the upload.
  validateAcademyImage(file);

  // Use a fallback folder when the program has no slug yet.
  const safeProgramSlug = sanitizePathSegment(programSlug) || "new-program";

  // Generate a unique storage file name.
  const fileName = generateStorageFileName(file);

  // Organize program images by program and image type.
  const storagePath = [
    "academy",
    "programs",
    safeProgramSlug,
    imageType,
    fileName,
  ].join("/");

  // Upload the selected file to Supabase Storage.
  const { error: uploadError } = await supabase.storage
    .from(CMS_MEDIA_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw uploadError;
  }

  // Retrieve the public URL for the uploaded image.
  const { data } = supabase.storage
    .from(CMS_MEDIA_BUCKET)
    .getPublicUrl(storagePath);

  if (!data.publicUrl) {
    throw new Error(
      "The image uploaded successfully, but its public URL could not be generated."
    );
  }

  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
}

/**
 * Delete an Academy image from Supabase Storage.
 */
export async function deleteAcademyProgramImage(storagePath: string) {
  // Ignore empty paths.
  if (!storagePath.trim()) {
    return;
  }

  // Remove the selected object from the CMS media bucket.
  const { error } = await supabase.storage
    .from(CMS_MEDIA_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw error;
  }
}
