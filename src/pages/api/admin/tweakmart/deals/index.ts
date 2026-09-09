import type { APIRoute } from "astro";

import {
  createTweakMartDeal,
  type CreateTweakMartDealInput,
} from "../../../../../lib/tweakmart/deals";

/* Creates a TweakMart promotional offer through the server-side administration layer. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Partial<CreateTweakMartDealInput>;

    if (!body.product_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Product is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!body.title?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Deal title is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (
      typeof body.offer_price !== "number" ||
      !Number.isFinite(body.offer_price)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "A valid offer price is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!body.starts_at || !body.ends_at) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Deal start and end dates are required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const deal = await createTweakMartDeal({
      product_id: body.product_id,
      title: body.title,
      offer_price: body.offer_price,
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      is_active: body.is_active ?? true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "TweakMart deal created successfully.",
        deal,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to create TweakMart deal:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create TweakMart deal.",
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
