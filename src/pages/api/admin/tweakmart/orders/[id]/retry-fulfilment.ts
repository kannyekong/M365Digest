import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

import { tweakMartAdminSupabase } from "../../../../../../lib/tweakmart/supabase-server";
import type { Database } from "../../../../../../types/supabase";

export const prerender = false;

interface RetryFulfillmentResult {
  success?: boolean;
  already_processed?: boolean;
  code?: string;
  message?: string;
  order_id?: string;
  order_number?: string;
  payment_status?: string;
  order_status?: string;
  inventory_status?: string;
  reservations_created?: number;
  inventory_groups_fulfilled?: number;
}

/* Returns a consistent JSON response from the TweakMart admin API. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/*
 * Verifies the CloudTweak access token supplied by the current
 * administrator before privileged TweakMart operations are allowed.
 */
async function verifyCloudTweakUser(authorizationHeader: string) {
  const supabaseUrl =
    import.meta.env.SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL;

  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "CloudTweak authentication environment variables are incomplete."
    );
  }

  const userSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: authorizationHeader,
      },
    },
  });

  const { data, error } = await userSupabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

/*
 * Retries inventory fulfillment for a paid TweakMart order that
 * entered manual review after its original reservation was released.
 */
export const POST: APIRoute = async ({ params, request }) => {
  try {
    const orderId = params.id?.trim();

    if (!orderId) {
      return jsonResponse(
        {
          success: false,
          message: "Order ID is required.",
        },
        400
      );
    }

    /*
     * Never allow the privileged TweakMart client to be reached until
     * the requesting CloudTweak session has been authenticated.
     */
    const authorizationHeader = request.headers.get("authorization");

    if (!authorizationHeader?.startsWith("Bearer ")) {
      return jsonResponse(
        {
          success: false,
          message: "Authentication is required.",
        },
        401
      );
    }

    const authenticatedUser = await verifyCloudTweakUser(authorizationHeader);

    if (!authenticatedUser) {
      return jsonResponse(
        {
          success: false,
          message: "Your session could not be verified. Please sign in again.",
        },
        401
      );
    }

    /*
     * The RPC performs the actual transaction, including locking the
     * order/inventory, validating stock, creating recovery reservations,
     * consuming inventory, and confirming the order.
     */
    const { data, error } = await tweakMartAdminSupabase.rpc(
      "retry_tweakmart_order_fulfillment",
      {
        p_order_id: orderId,
      }
    );

    if (error) {
      console.error("TweakMart retry fulfillment RPC failed:", error);

      return jsonResponse(
        {
          success: false,
          message: error.message || "Unable to retry order fulfillment.",
        },
        400
      );
    }

    const result = data as RetryFulfillmentResult | null;

    if (!result) {
      return jsonResponse(
        {
          success: false,
          message: "TweakMart returned no fulfillment result.",
        },
        500
      );
    }

    /*
     * Business validation failures such as insufficient inventory are
     * returned by the RPC as structured unsuccessful results.
     */
    if (!result.success) {
      return jsonResponse(
        {
          success: false,
          code: result.code ?? "fulfillment_failed",
          message: result.message || "The order could not be fulfilled.",
          result,
        },
        result.code === "order_not_found" ? 404 : 409
      );
    }

    return jsonResponse({
      success: true,
      message:
        result.message ||
        `${result.order_number ?? "The order"} was fulfilled successfully.`,
      result,
    });
  } catch (error) {
    console.error("TweakMart retry fulfillment API failed:", error);

    return jsonResponse(
      {
        success: false,
        message: "Unable to retry fulfillment at this time.",
      },
      500
    );
  }
};
