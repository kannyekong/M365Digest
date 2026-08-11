export type ImageAssetCategory =
  | "general"
  | "website"
  | "blog"
  | "academy"
  | "projects"
  | "clients"
  | "marketing";

export interface ImageAsset {
  id: string;

  file_name: string;

  original_file_name: string;

  storage_bucket: string;

  storage_path: string;

  mime_type: string;

  file_size: number;

  width: number | null;

  height: number | null;

  alt_text: string | null;

  title: string | null;

  description: string | null;

  category: ImageAssetCategory;

  uploaded_by: string | null;

  created_at: string;

  updated_at: string;

  archived_at: string | null;

  metadata: Record<string, unknown>;
}

export interface ImageAssetWithUrl extends ImageAsset {
  public_url: string;
}

export interface UploadImageAssetInput {
  file: File;

  category?: ImageAssetCategory;

  altText?: string | null;

  title?: string | null;

  description?: string | null;
}

export interface UpdateImageAssetInput {
  category?: ImageAssetCategory;

  altText?: string | null;

  title?: string | null;

  description?: string | null;
}

export interface ImageAssetFilters {
  search?: string;

  category?: ImageAssetCategory | "all";

  includeArchived?: boolean;
}

export interface ImageAssetListResult {
  assets: ImageAssetWithUrl[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
}
