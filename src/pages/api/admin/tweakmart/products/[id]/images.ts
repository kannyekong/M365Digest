import type { APIRoute } from "astro";

import { tweakMartAdminSupabase } from "../../../../../../lib/tweakmart/supabase-server";

const PRODUCT_BUCKET = "tweakmart-products";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/* Returns a safe extension for an uploaded product image. */
function getFileExtension(file: File) {
  switch (file.type) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return null;
  }
}

/* Uploads a product image to TweakMart Storage and creates its product_images database record. */
export const POST: APIRoute = async ({ params, request }) => {
  let uploadedStoragePath: string | null = null;

  try {
    const productId = params.id;

    if (!productId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Product ID is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const formData = await request.formData();

    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Please select a product image.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(uploadedFile.type)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Only JPG, PNG, and WebP images are supported.",
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
          message: "Product images cannot exceed 8 MB.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const extension = getFileExtension(uploadedFile);

    if (!extension) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unsupported image format.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: product, error: productError } = await tweakMartAdminSupabase
      .from("products")
      .select("id, name")
      .eq("id", productId)
      .maybeSingle();

    if (productError) {
      throw productError;
    }

    if (!product) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Product not found.",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: existingImages, error: imagesError } =
      await tweakMartAdminSupabase
        .from("product_images")
        .select("id, display_order, is_primary")
        .eq("product_id", productId)
        .order("display_order", {
          ascending: true,
        });

    if (imagesError) {
      throw imagesError;
    }

    const isFirstImage = !existingImages || existingImages.length === 0;

    const highestDisplayOrder = (existingImages ?? []).reduce(
      (highest, image) => Math.max(highest, Number(image.display_order ?? 0)),
      0
    );

    const displayOrder = highestDisplayOrder + 1;

    const fileName = `${crypto.randomUUID()}.${extension}`;

    const storagePath = `products/${productId}/${fileName}`;

    uploadedStoragePath = storagePath;

    const fileBuffer = await uploadedFile.arrayBuffer();

    const { error: uploadError } = await tweakMartAdminSupabase.storage
      .from(PRODUCT_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: uploadedFile.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Unable to upload product image: ${uploadError.message}`);
    }

    const { data: publicUrlData } = tweakMartAdminSupabase.storage
      .from(PRODUCT_BUCKET)
      .getPublicUrl(storagePath);

    const imageUrl = publicUrlData.publicUrl;

    const { data: image, error: insertError } = await tweakMartAdminSupabase
      .from("product_images")
      .insert({
        product_id: productId,
        variant_id: null,
        image_url: imageUrl,
        storage_path: storagePath,
        alt_text: product.name,
        display_order: displayOrder,
        is_primary: isFirstImage,
      })
      .select(
        `
    id,
    product_id,
    variant_id,
    image_url,
    storage_path,
    alt_text,
    display_order,
    is_primary,
    created_at
  `
      )
      .single();

    if (insertError) {
      throw insertError;
    }

    uploadedStoragePath = null;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Product image uploaded successfully.",
        image,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to upload TweakMart product image:", error);

    /*
     * If Storage succeeded but the database insert failed,
     * remove the orphaned file from Storage.
     */
    if (uploadedStoragePath) {
      const { error: cleanupError } = await tweakMartAdminSupabase.storage
        .from(PRODUCT_BUCKET)
        .remove([uploadedStoragePath]);

      if (cleanupError) {
        console.error(
          "Failed to clean up orphaned TweakMart product image:",
          cleanupError
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to upload product image.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
};
