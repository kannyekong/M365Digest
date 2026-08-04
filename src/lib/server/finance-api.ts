import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/supabase";

export interface FinanceApiClients {
  userSupabase: SupabaseClient<Database>;
  adminSupabase: SupabaseClient<Database>;
  userId: string;
}

/**
 * Return a JSON response using a consistent Finance API structure.
 */
export function financeJsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,

    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Create authenticated and service-role Supabase clients for Finance APIs.
 */
export async function getFinanceApiClients(
  request: Request
): Promise<FinanceApiClients> {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new Error("Authentication is required.");
  }

  const accessToken = authorizationHeader.slice("Bearer ".length);

  const supabaseUrl =
    import.meta.env.SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL;

  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Finance API environment variables are incomplete.");
  }

  const userSupabase = createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },

    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const adminSupabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userResult, error: userError } =
    await userSupabase.auth.getUser(accessToken);

  if (userError || !userResult.user) {
    throw new Error("Your session is invalid or has expired.");
  }

  const { data: financeAccess, error: financeAccessError } =
    await userSupabase.rpc("is_finance_staff");

  if (financeAccessError) {
    throw financeAccessError;
  }

  if (!financeAccess) {
    throw new Error("You are not authorized to manage Finance records.");
  }

  return {
    userSupabase,
    adminSupabase,
    userId: userResult.user.id,
  };
}

/**
 * Convert one unknown error into an appropriate Finance API response.
 */
export function handleFinanceApiError(error: unknown) {
  console.error("Finance API request failed:", error);

  const message =
    error instanceof Error
      ? error.message
      : "The Finance request could not be completed.";

  const status =
    message === "Authentication is required."
      ? 401
      : message.includes("invalid or has expired")
        ? 401
        : message.includes("not authorized")
          ? 403
          : 500;

  return financeJsonResponse(
    {
      success: false,
      message,
    },
    status
  );
}
