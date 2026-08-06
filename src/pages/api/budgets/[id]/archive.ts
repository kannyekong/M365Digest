import type { APIRoute } from "astro";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

/**
 * Archive one Budget while preserving its allocations and audit history.
 */
export const POST: APIRoute = async ({ request, params }) => {
  try {
    const budgetId = params.id;

    if (!budgetId) {
      return financeJsonResponse(
        {
          success: false,
          message: "Budget ID is required.",
        },
        400
      );
    }

    const { adminSupabase, userId } = await getFinanceApiClients(request);

    const now = new Date().toISOString();

    const { data: budget, error } = await adminSupabase
      .from("finance_budgets")
      .update({
        archived_at: now,
        updated_by: userId,
        updated_at: now,
      })
      .eq("id", budgetId)
      .is("archived_at", null)
      .select("*")
      .single();

    if (error || !budget) {
      throw error ?? new Error("Budget not found or already archived.");
    }

    return financeJsonResponse({
      success: true,
      budget,
      message: "Budget archived successfully.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
