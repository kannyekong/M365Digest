import { tweakMartAdminSupabase } from "./supabase-server";

export type TweakMartProductType = "physical" | "digital" | "service";

export type TweakMartProductStatus =
  "draft" | "active" | "inactive" | "archived";

export interface TweakMartProductListItem {
  id: string;
  vendor_id: string;
  category_id: string | null;
  brand_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  product_type: string;
  condition: string;
  status: string;
  base_price: number;
  compare_at_price: number | null;
  currency: string;
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;

  category: {
    id: string;
    name: string;
  } | null;

  brand: {
    id: string;
    name: string;
  } | null;

  vendor: {
    id: string;
    name: string;
  } | null;

  primary_image: {
    id: string;
    image_url: string;
    alt_text: string | null;
  } | null;

  variants_count: number;

  inventory: {
    quantity_available: number;
    quantity_reserved: number;
    track_inventory: boolean;
  };
}

export interface TweakMartProductDetails {
  id: string;
  vendor_id: string;
  category_id: string | null;
  brand_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  product_type: string;
  condition: string;
  status: string;
  base_price: number;
  compare_at_price: number | null;
  currency: string;
  featured: boolean;
  specifications: Record<string, unknown>;
  metadata: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GetTweakMartProductsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  productType?: string;
  categoryId?: string;
  brandId?: string;
  featured?: boolean;
}

export interface TweakMartProductPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TweakMartProductListResult {
  products: TweakMartProductListItem[];
  pagination: TweakMartProductPagination;
}

/* Converts a potentially numeric database value into a safe JavaScript number. */
function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

/* Normalizes a Supabase relation that may be returned as either one object or an array into a single related record. */
function getSingleRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

/* Ensures pagination values remain inside a safe positive range. */
function normalizePositiveInteger(value: number | undefined, fallback: number) {
  if (value === undefined || !Number.isInteger(value) || value < 1) {
    return fallback;
  }

  return value;
}

/* Loads one TweakMart product by its UUID for administration and editing. */
export async function getTweakMartProductById(
  productId: string
): Promise<TweakMartProductDetails | null> {
  const { data, error } = await tweakMartAdminSupabase
    .from("products")
    .select(
      `
          id,
          vendor_id,
          category_id,
          brand_id,
          name,
          slug,
          short_description,
          description,
          product_type,
          condition,
          status,
          base_price,
          compare_at_price,
          currency,
          featured,
          specifications,
          metadata,
          published_at,
          created_at,
          updated_at
        `
    )
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load TweakMart product: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    vendor_id: data.vendor_id,
    category_id: data.category_id,
    brand_id: data.brand_id,
    name: data.name,
    slug: data.slug,
    short_description: data.short_description,
    description: data.description,
    product_type: data.product_type,
    condition: data.condition,
    status: data.status,
    base_price: Number(data.base_price ?? 0),
    compare_at_price:
      data.compare_at_price === null ? null : Number(data.compare_at_price),
    currency: data.currency,
    featured: data.featured,
    specifications: data.specifications ?? {},
    metadata: data.metadata ?? {},
    published_at: data.published_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/* Loads a paginated and filterable list of products for the CloudTweak TweakMart administration module. */
export async function getTweakMartProducts(
  options: GetTweakMartProductsOptions = {}
): Promise<TweakMartProductListResult> {
  const page = normalizePositiveInteger(options.page, 1);

  const pageSize = Math.min(
    normalizePositiveInteger(options.pageSize, 10),
    100
  );

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = tweakMartAdminSupabase.from("products").select(
    `
        id,
        vendor_id,
        category_id,
        brand_id,
        name,
        slug,
        short_description,
        product_type,
        condition,
        status,
        base_price,
        compare_at_price,
        currency,
        featured,
        published_at,
        created_at,
        updated_at,
        category:categories (
          id,
          name
        ),
        brand:brands (
          id,
          name
        ),
        vendor:vendors (
          id,
          name
        )
      `,
    {
      count: "exact",
    }
  );

  /* Applies product search across the most useful administrator-facing text fields. */
  if (options.search?.trim()) {
    const search = options.search.trim();

    query = query.or(
      `name.ilike.%${search}%,slug.ilike.%${search}%,short_description.ilike.%${search}%`
    );
  }

  /* Restricts the list to a selected product status when supplied. */
  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  /* Restricts the list to a selected product type when supplied. */
  if (options.productType && options.productType !== "all") {
    query = query.eq("product_type", options.productType);
  }

  /* Restricts the list to one product category when supplied. */
  if (options.categoryId && options.categoryId !== "all") {
    query = query.eq("category_id", options.categoryId);
  }

  /* Restricts the list to one product brand when supplied. */
  if (options.brandId && options.brandId !== "all") {
    query = query.eq("brand_id", options.brandId);
  }

  /* Restricts the list to featured or non-featured products when explicitly requested. */
  if (options.featured !== undefined) {
    query = query.eq("featured", options.featured);
  }

  const { data, error, count } = await query
    .order("created_at", {
      ascending: false,
    })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to load TweakMart products: ${error.message}`);
  }

  const baseProducts = data ?? [];

  const productIds = baseProducts.map((product) => product.id);

  /* Returns early for an empty page while preserving pagination metadata. */
  if (productIds.length === 0) {
    const total = count ?? 0;

    return {
      products: [],
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  const [imagesResult, variantsResult] = await Promise.all([
    tweakMartAdminSupabase
      .from("product_images")
      .select(
        `
          id,
          product_id,
          image_url,
          alt_text,
          display_order,
          is_primary
        `
      )
      .in("product_id", productIds)
      .order("is_primary", {
        ascending: false,
      })
      .order("display_order", {
        ascending: true,
      }),

    tweakMartAdminSupabase
      .from("product_variants")
      .select(
        `
          id,
          product_id,
          is_active
        `
      )
      .in("product_id", productIds),
  ]);

  if (imagesResult.error) {
    throw new Error(
      `Failed to load TweakMart product images: ${imagesResult.error.message}`
    );
  }

  if (variantsResult.error) {
    throw new Error(
      `Failed to load TweakMart product variants: ${variantsResult.error.message}`
    );
  }

  const variants = variantsResult.data ?? [];

  const variantIds = variants.map((variant) => variant.id);

  const inventoryResult =
    variantIds.length > 0
      ? await tweakMartAdminSupabase
          .from("inventory")
          .select(
            `
              variant_id,
              quantity_available,
              quantity_reserved,
              track_inventory
            `
          )
          .in("variant_id", variantIds)
      : {
          data: [],
          error: null,
        };

  if (inventoryResult.error) {
    throw new Error(
      `Failed to load TweakMart inventory: ${inventoryResult.error.message}`
    );
  }

  const images = imagesResult.data ?? [];

  const inventoryRows = inventoryResult.data ?? [];

  const products = baseProducts.map((product): TweakMartProductListItem => {
    const category = getSingleRelation(product.category);

    const brand = getSingleRelation(product.brand);

    const vendor = getSingleRelation(product.vendor);

    const productVariants = variants.filter(
      (variant) => variant.product_id === product.id
    );

    const productVariantIds = new Set(
      productVariants.map((variant) => variant.id)
    );

    const productInventory = inventoryRows.filter((row) =>
      productVariantIds.has(row.variant_id)
    );

    const primaryImage =
      images.find(
        (image) => image.product_id === product.id && image.is_primary
      ) ??
      images.find((image) => image.product_id === product.id) ??
      null;

    const quantityAvailable = productInventory.reduce(
      (total, row) => total + toNumber(row.quantity_available),
      0
    );

    const quantityReserved = productInventory.reduce(
      (total, row) => total + toNumber(row.quantity_reserved),
      0
    );

    const tracksInventory = productInventory.some((row) => row.track_inventory);

    return {
      id: product.id,
      vendor_id: product.vendor_id,
      category_id: product.category_id,
      brand_id: product.brand_id,
      name: product.name,
      slug: product.slug,
      short_description: product.short_description,
      product_type: product.product_type,
      condition: product.condition,
      status: product.status,
      base_price: toNumber(product.base_price),
      compare_at_price:
        product.compare_at_price === null
          ? null
          : toNumber(product.compare_at_price),
      currency: product.currency,
      featured: product.featured,
      published_at: product.published_at,
      created_at: product.created_at,
      updated_at: product.updated_at,

      category,
      brand,
      vendor,

      primary_image: primaryImage
        ? {
            id: primaryImage.id,
            image_url: primaryImage.image_url,
            alt_text: primaryImage.alt_text,
          }
        : null,

      variants_count: productVariants.length,

      inventory: {
        quantity_available: quantityAvailable,
        quantity_reserved: quantityReserved,
        track_inventory: tracksInventory,
      },
    };
  });

  const total = count ?? 0;

  return {
    products,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
