import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../types/supabase";

export const prerender = false;

interface UpdateReceiptStatusBody {
  receiptId?: string;
  status?: "issued" | "voided" | "refunded";
  notes?: string | null;
}

/**
 * Return a JSON response with the supplied status code.
 */
function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Update one Receipt status using the authenticated finance-staff session.
 */
export const PATCH: APIRoute = async ({ request }) => {
  try {
    const authorizationHeader =
      request.headers.get("authorization");

    if (
      !authorizationHeader?.startsWith("Bearer ")
    ) {
      return jsonResponse(
        {
          success: false,
          message: "Authentication is required.",
        },
        401
      );
    }

    const body =
      (await request.json()) as UpdateReceiptStatusBody;

    if (!body.receiptId) {
      return jsonResponse(
        {
          success: false,
          message: "Receipt ID is required.",
        },
        400
      );
    }

    if (
      !body.status ||
      !["issued", "voided", "refunded"].includes(
        body.status
      )
    ) {
      return jsonResponse(
        {
          success: false,
          message: "A valid Receipt status is required.",
        },
        400
      );
    }

    const supabaseUrl =
      import.meta.env.SUPABASE_URL;

    const anonKey =
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    const serviceRoleKey =
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Receipt status environment variables are incomplete."
      );
    }

    const userSupabase = createClient<Database>(
      supabaseUrl,
      anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: authorizationHeader,
          },
        },
      }
    );

    const adminSupabase = createClient<Database>(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: financeAccess,
      error: financeAccessError,
    } = await userSupabase.rpc(
      "is_finance_staff"
    );

    if (financeAccessError) {
      throw financeAccessError;
    }

    if (!financeAccess) {
      return jsonResponse(
        {
          success: false,
          message:
            "You are not authorized to update Receipt status.",
        },
        403
      );
    }

    const {
      data: existingReceipt,
      error: existingReceiptError,
    } = await adminSupabase
      .from("receipts")
      .select(
        "id,status,voided_at,refunded_at"
      )
      .eq("id", body.receiptId)
      .single();

    if (
      existingReceiptError ||
      !existingReceipt
    ) {
      throw (
        existingReceiptError ??
        new Error("Receipt not found.")
      );
    }

    if (
      existingReceipt.status ===
      body.status
    ) {
      const {
        data: unchangedReceipt,
      } = await adminSupabase
        .from("receipts")
        .select("*")
        .eq("id", body.receiptId)
        .single();

      return jsonResponse({
        success: true,
        receipt: unchangedReceipt,
        message:
          "Receipt status is already up to date.",
      });
    }

    const now =
      new Date().toISOString();

    const statusUpdates = {
      status: body.status,
      notes:
        body.notes?.trim() || null,
      voided_at:
        body.status === "voided"
          ? now
          : body.status === "issued"
            ? null
            : existingReceipt.voided_at,
      refunded_at:
        body.status === "refunded"
          ? now
          : body.status === "issued"
            ? null
            : existingReceipt.refunded_at,
      updated_at: now,
    };

    const {
      data: updatedReceipt,
      error: updateError,
    } = await adminSupabase
      .from("receipts")
      .update(statusUpdates)
      .eq("id", body.receiptId)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    return jsonResponse({
      success: true,
      receipt: updatedReceipt,
      message:
        `Receipt marked as ${body.status}.`,
    });
  } catch (error) {
    console.error(
      "Failed to update Receipt status:",
      error
    );

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "The Receipt status could not be updated.",
      },
      500
    );
  }
};
