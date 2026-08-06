import type { APIRoute } from "astro";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

/**
 * Restore one archived Budget.
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

    const { data: budget, error } = await adminSupabase
      .from("finance_budgets")
      .update({
        archived_at: null,

        updated_by: userId,

        updated_at: new Date().toISOString(),
      })
      .eq("id", budgetId)
      .not("archived_at", "is", null)
      .select("*")
      .single();

    if (error || !budget) {
      throw error ?? new Error("Budget not found or is not archived.");
    }

    return financeJsonResponse({
      success: true,
      budget,
      message: "Budget restored successfully.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
