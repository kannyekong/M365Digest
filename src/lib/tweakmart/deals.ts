import { tweakMartAdminSupabase } from "./supabase-server";

export interface TweakMartDealProduct {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  compare_at_price: number | null;
  currency: string;
  status: string;

  brand: {
    id: string;
    name: string;
  } | null;

  primary_image: {
    id: string;
    image_url: string;
    alt_text: string | null;
  } | null;
}

export interface TweakMartDeal {
  id: string;
  product_id: string;
  title: string;
  offer_price: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product: TweakMartDealProduct | null;
}

export interface TweakMartDealProductOption {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  compare_at_price: number | null;
  currency: string;
  status: string;

  brand: {
    id: string;
    name: string;
  } | null;
}

export interface CreateTweakMartDealInput {
  product_id: string;
  title: string;
  offer_price: number;
  starts_at: string;
  ends_at: string;
  is_active?: boolean;
}

export interface UpdateTweakMartDealInput {
  product_id?: string;
  title?: string;
  offer_price?: number;
  starts_at?: string;
  ends_at?: string;
  is_active?: boolean;
}

/* Converts database numeric values into safe JavaScript numbers. */
function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

/* Normalizes a Supabase relation that may be returned as an object or an array. */
function getSingleRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

/* Loads all TweakMart deals for CloudTweak administration. */
export async function getTweakMartDeals(): Promise<TweakMartDeal[]> {
  const { data, error } = await tweakMartAdminSupabase
    .from("product_offers")
    .select(
      `
        id,
        product_id,
        title,
        offer_price,
        starts_at,
        ends_at,
        is_active,
        created_at,
        updated_at,
        product:products (
          id,
          name,
          slug,
          base_price,
          compare_at_price,
          currency,
          status,
          brand:brands (
            id,
            name
          )
        )
      `
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(`Unable to load TweakMart deals: ${error.message}`);
  }

  const deals = data ?? [];

  const productIds = [...new Set(deals.map((deal) => deal.product_id))];

  /*
   * Loads product images separately so the administration query remains
   * independent of the product image relationship shape.
   */
  const { data: images, error: imagesError } =
    productIds.length > 0
      ? await tweakMartAdminSupabase
          .from("product_images")
          .select(
            `
              id,
              product_id,
              image_url,
              alt_text,
              is_primary,
              display_order
            `
          )
          .in("product_id", productIds)
          .order("is_primary", {
            ascending: false,
          })
          .order("display_order", {
            ascending: true,
          })
      : {
          data: [],
          error: null,
        };

  if (imagesError) {
    throw new Error(
      `Unable to load TweakMart deal product images: ${imagesError.message}`
    );
  }

  return deals.map((deal): TweakMartDeal => {
    const product = getSingleRelation(deal.product);

    const primaryImage =
      (images ?? []).find(
        (image) => image.product_id === deal.product_id && image.is_primary
      ) ??
      (images ?? []).find((image) => image.product_id === deal.product_id) ??
      null;

    return {
      id: deal.id,
      product_id: deal.product_id,
      title: deal.title,
      offer_price: toNumber(deal.offer_price),
      starts_at: deal.starts_at,
      ends_at: deal.ends_at,
      is_active: deal.is_active,
      created_at: deal.created_at,
      updated_at: deal.updated_at,

      product: product
        ? {
            id: product.id,
            name: product.name,
            slug: product.slug,
            base_price: toNumber(product.base_price),
            compare_at_price:
              product.compare_at_price === null
                ? null
                : toNumber(product.compare_at_price),
            currency: product.currency ?? "NGN",
            status: product.status,
            brand: getSingleRelation(product.brand),

            primary_image: primaryImage
              ? {
                  id: primaryImage.id,
                  image_url: primaryImage.image_url,
                  alt_text: primaryImage.alt_text,
                }
              : null,
          }
        : null,
    };
  });
}

/* Loads active products that can be selected when creating or editing a deal. */
export async function getTweakMartDealProductOptions(): Promise<
  TweakMartDealProductOption[]
> {
  const { data, error } = await tweakMartAdminSupabase
    .from("products")
    .select(
      `
        id,
        name,
        slug,
        base_price,
        compare_at_price,
        currency,
        status,
        brand:brands (
          id,
          name
        )
      `
    )
    .eq("status", "active")
    .not("published_at", "is", null)
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(`Unable to load TweakMart deal products: ${error.message}`);
  }

  return (data ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    base_price: toNumber(product.base_price),
    compare_at_price:
      product.compare_at_price === null
        ? null
        : toNumber(product.compare_at_price),
    currency: product.currency ?? "NGN",
    status: product.status,
    brand: getSingleRelation(product.brand),
  }));
}

/* Loads one TweakMart deal by its UUID. */
export async function getTweakMartDealById(
  dealId: string
): Promise<TweakMartDeal | null> {
  const deals = await getTweakMartDeals();

  return deals.find((deal) => deal.id === dealId) ?? null;
}

/* Checks whether an enabled deal overlaps another enabled deal for the same product. */
export async function hasOverlappingTweakMartDeal(
  productId: string,
  startsAt: string,
  endsAt: string,
  excludeDealId?: string
) {
  let query = tweakMartAdminSupabase
    .from("product_offers")
    .select("id")
    .eq("product_id", productId)
    .eq("is_active", true)
    .lt("starts_at", endsAt)
    .gt("ends_at", startsAt);

  /* Excludes the current deal when validating an edit operation. */
  if (excludeDealId) {
    query = query.neq("id", excludeDealId);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    throw new Error(
      `Unable to validate overlapping TweakMart deals: ${error.message}`
    );
  }

  return (data ?? []).length > 0;
}

/* Creates a promotional offer after validating the selected product and promotion period. */
export async function createTweakMartDeal(
  input: CreateTweakMartDealInput
): Promise<TweakMartDeal> {
  const product = await getProductForDealValidation(input.product_id);

  validateDealInput({
    title: input.title,
    offerPrice: input.offer_price,
    basePrice: product.base_price,
    startsAt: input.starts_at,
    endsAt: input.ends_at,
  });

  const isActive = input.is_active ?? true;

  /* Prevents multiple enabled promotions from competing for the same product period. */
  if (isActive) {
    const overlaps = await hasOverlappingTweakMartDeal(
      input.product_id,
      input.starts_at,
      input.ends_at
    );

    if (overlaps) {
      throw new Error(
        "This product already has an active deal that overlaps the selected period."
      );
    }
  }

  const { data, error } = await tweakMartAdminSupabase
    .from("product_offers")
    .insert({
      product_id: input.product_id,
      title: input.title.trim(),
      offer_price: input.offer_price,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      is_active: isActive,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to create TweakMart deal: ${error.message}`);
  }

  const createdDeal = await getTweakMartDealById(data.id);

  if (!createdDeal) {
    throw new Error("The deal was created but could not be reloaded.");
  }

  return createdDeal;
}

/* Updates an existing promotional offer after validating its resulting state. */
export async function updateTweakMartDeal(
  dealId: string,
  input: UpdateTweakMartDealInput
): Promise<TweakMartDeal> {
  const existingDeal = await getTweakMartDealById(dealId);

  if (!existingDeal) {
    throw new Error("TweakMart deal not found.");
  }

  const productId = input.product_id ?? existingDeal.product_id;

  const product = await getProductForDealValidation(productId);

  const title = input.title ?? existingDeal.title;

  const offerPrice = input.offer_price ?? existingDeal.offer_price;

  const startsAt = input.starts_at ?? existingDeal.starts_at;

  const endsAt = input.ends_at ?? existingDeal.ends_at;

  const isActive = input.is_active ?? existingDeal.is_active;

  validateDealInput({
    title,
    offerPrice,
    basePrice: product.base_price,
    startsAt,
    endsAt,
  });

  /* Prevents an edited or re-enabled promotion from overlapping another enabled deal. */
  if (isActive) {
    const overlaps = await hasOverlappingTweakMartDeal(
      productId,
      startsAt,
      endsAt,
      dealId
    );

    if (overlaps) {
      throw new Error(
        "This product already has another active deal that overlaps the selected period."
      );
    }
  }

  const { error } = await tweakMartAdminSupabase
    .from("product_offers")
    .update({
      product_id: productId,
      title: title.trim(),
      offer_price: offerPrice,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: isActive,
    })
    .eq("id", dealId);

  if (error) {
    throw new Error(`Unable to update TweakMart deal: ${error.message}`);
  }

  const updatedDeal = await getTweakMartDealById(dealId);

  if (!updatedDeal) {
    throw new Error("The deal was updated but could not be reloaded.");
  }

  return updatedDeal;
}

/* Enables or disables an existing TweakMart promotional offer. */
export async function setTweakMartDealActiveState(
  dealId: string,
  isActive: boolean
): Promise<TweakMartDeal> {
  const existingDeal = await getTweakMartDealById(dealId);

  if (!existingDeal) {
    throw new Error("TweakMart deal not found.");
  }

  /* Revalidates overlap before a disabled promotion is re-enabled. */
  if (isActive) {
    const overlaps = await hasOverlappingTweakMartDeal(
      existingDeal.product_id,
      existingDeal.starts_at,
      existingDeal.ends_at,
      dealId
    );

    if (overlaps) {
      throw new Error(
        "This deal cannot be enabled because another active deal overlaps its period."
      );
    }
  }

  const { error } = await tweakMartAdminSupabase
    .from("product_offers")
    .update({
      is_active: isActive,
    })
    .eq("id", dealId);

  if (error) {
    throw new Error(
      `Unable to ${isActive ? "enable" : "disable"} TweakMart deal: ${error.message}`
    );
  }

  const updatedDeal = await getTweakMartDealById(dealId);

  if (!updatedDeal) {
    throw new Error("The deal was updated but could not be reloaded.");
  }

  return updatedDeal;
}

/* Permanently deletes a TweakMart promotional offer. */
export async function deleteTweakMartDeal(dealId: string) {
  const { error } = await tweakMartAdminSupabase
    .from("product_offers")
    .delete()
    .eq("id", dealId);

  if (error) {
    throw new Error(`Unable to delete TweakMart deal: ${error.message}`);
  }
}

/* Loads the minimum product data required for server-side deal validation. */
async function getProductForDealValidation(productId: string) {
  const { data, error } = await tweakMartAdminSupabase
    .from("products")
    .select(
      `
        id,
        name,
        base_price,
        status,
        published_at
      `
    )
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to validate TweakMart product: ${error.message}`);
  }

  if (!data) {
    throw new Error("The selected TweakMart product does not exist.");
  }

  if (data.status !== "active" || !data.published_at) {
    throw new Error(
      "Deals can only be created for active, published products."
    );
  }

  return {
    id: data.id,
    name: data.name,
    base_price: toNumber(data.base_price),
  };
}

/* Validates promotion pricing and scheduling before a deal is written to TweakMart. */
function validateDealInput({
  title,
  offerPrice,
  basePrice,
  startsAt,
  endsAt,
}: {
  title: string;
  offerPrice: number;
  basePrice: number;
  startsAt: string;
  endsAt: string;
}) {
  if (!title.trim()) {
    throw new Error("Deal title is required.");
  }

  if (!Number.isFinite(offerPrice) || offerPrice < 0) {
    throw new Error("Enter a valid offer price.");
  }

  if (offerPrice >= basePrice) {
    throw new Error(
      "Offer price must be lower than the product's regular selling price."
    );
  }

  const startTime = new Date(startsAt).getTime();

  const endTime = new Date(endsAt).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    throw new Error("Enter a valid deal start and end date.");
  }

  if (endTime <= startTime) {
    throw new Error("Deal end date must be later than its start date.");
  }
}
