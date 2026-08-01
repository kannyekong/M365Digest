import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

/**
 * Raw financial summary returned by the PostgreSQL function.
 */
interface CompanyFinancialSummaryRow {
  current_month_revenue: number | string | null;
  previous_month_revenue: number | string | null;
  total_revenue: number | string | null;
  current_month_expenses: number | string | null;
  current_month_refunds: number | string | null;
  current_month_net_income: number | string | null;
  pending_income: number | string | null;
  paid_income_transactions: number | string | null;
  growth_percentage: number | string | null;
  currency: string | null;
}

/**
 * Converts PostgreSQL numeric values into safe JavaScript numbers.
 */
function toSafeNumber(value: number | string | null | undefined) {
  const normalizedValue = Number(value ?? 0);

  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

/**
 * Returns a consistent JSON API response.
 */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,

    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Returns the company-wide financial summary for admin interfaces.
 */
export const GET: APIRoute = async () => {
  const supabaseUrl = import.meta.env.SUPABASE_URL;

  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Financial summary environment variables are missing.");

    return jsonResponse(
      {
        success: false,
        message: "Financial information is temporarily unavailable.",
      },
      500
    );
  }

  // Creates a server-only Supabase client with elevated permissions.
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { data, error } = await supabaseAdmin.rpc(
      "get_company_financial_summary"
    );

    if (error) {
      console.error("Failed to load company financial summary:", error);

      return jsonResponse(
        {
          success: false,
          message: "The financial summary could not be loaded.",
        },
        500
      );
    }

    const row = (
      Array.isArray(data) ? data[0] : data
    ) as CompanyFinancialSummaryRow | null;

    return jsonResponse({
      success: true,

      summary: {
        currentMonthRevenue: toSafeNumber(row?.current_month_revenue),

        previousMonthRevenue: toSafeNumber(row?.previous_month_revenue),

        totalRevenue: toSafeNumber(row?.total_revenue),

        currentMonthExpenses: toSafeNumber(row?.current_month_expenses),

        currentMonthRefunds: toSafeNumber(row?.current_month_refunds),

        currentMonthNetIncome: toSafeNumber(row?.current_month_net_income),

        pendingIncome: toSafeNumber(row?.pending_income),

        paidIncomeTransactions: toSafeNumber(row?.paid_income_transactions),

        growthPercentage: toSafeNumber(row?.growth_percentage),

        currency: row?.currency || "NGN",
      },
    });
  } catch (error) {
    console.error("Unexpected financial summary error:", error);

    return jsonResponse(
      {
        success: false,
        message: "The financial summary could not be loaded.",
      },
      500
    );
  }
};
