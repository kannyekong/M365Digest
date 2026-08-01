import { supabase } from "./superbase";

/**
 * Financial summary returned by the Academy dashboard query.
 */
export interface AcademyFinancialSummary {
  currentMonthRevenue: number;

  previousMonthRevenue: number;

  totalRevenue: number;

  paidTransactions: number;

  pendingRevenue: number;

  growthPercentage: number;

  currency: string;
}

/**
 * Raw result returned by the Supabase financial-summary function.
 */
interface AcademyFinancialSummaryRow {
  current_month_revenue: number | string | null;

  previous_month_revenue: number | string | null;

  total_revenue: number | string | null;

  paid_transactions: number | string | null;

  pending_revenue: number | string | null;

  growth_percentage: number | string | null;

  currency: string | null;
}

/**
 * Convert a possible PostgreSQL numeric value into a safe number.
 */
function toSafeNumber(value: number | string | null | undefined) {
  const normalizedValue = Number(value ?? 0);

  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

/**
 * Retrieve the real Academy financial summary.
 */
export async function getAcademyFinancialSummary(): Promise<AcademyFinancialSummary> {
  const { data, error } = await supabase.rpc("get_academy_financial_summary");

  if (error) {
    console.error("Failed to load Academy financial summary:", error);

    throw error;
  }

  const row = (
    Array.isArray(data) ? data[0] : data
  ) as AcademyFinancialSummaryRow | null;

  return {
    currentMonthRevenue: toSafeNumber(row?.current_month_revenue),

    previousMonthRevenue: toSafeNumber(row?.previous_month_revenue),

    totalRevenue: toSafeNumber(row?.total_revenue),

    paidTransactions: toSafeNumber(row?.paid_transactions),

    pendingRevenue: toSafeNumber(row?.pending_revenue),

    growthPercentage: toSafeNumber(row?.growth_percentage),

    currency: row?.currency || "NGN",
  };
}
