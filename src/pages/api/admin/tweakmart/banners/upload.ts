import type { APIRoute } from "astro";

import { tweakMartAdminSupabase } from "../../../../../lib/tweakmart/supabase-server";

const BANNER_BUCKET = "tweakmart-banners";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

/* Converts an uploaded filename into a storage-safe filename. */
function sanitizeFilename(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() || "webp";

  const basename = filename
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${basename || "banner"}.${extension}`;
}

/* Uploads a TweakMart featured banner image to the private admin-controlled storage pipeline. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const uploadedFile = formData.get("image");

    if (!(uploadedFile instanceof File)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Please select a banner image.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!allowedMimeTypes.has(uploadedFile.type)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Banner images must be JPG, PNG or WebP.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (uploadedFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Banner images cannot exceed 8 MB.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const safeFilename = sanitizeFilename(uploadedFile.name);

    const uniqueFilename = `${crypto.randomUUID()}-${safeFilename}`;

    const storagePath = `homepage/${uniqueFilename}`;

    const arrayBuffer = await uploadedFile.arrayBuffer();

    const { error: uploadError } = await tweakMartAdminSupabase.storage
      .from(BANNER_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: uploadedFile.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to upload TweakMart banner:", uploadError);

      return new Response(
        JSON.stringify({
          success: false,
          message: "Unable to upload the banner image.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: publicUrlData } = tweakMartAdminSupabase.storage
      .from(BANNER_BUCKET)
      .getPublicUrl(storagePath);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrlData.publicUrl,
        storagePath,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unexpected TweakMart banner upload error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "An unexpected upload error occurred.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
