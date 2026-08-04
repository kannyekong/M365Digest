import type { APIRoute } from "astro";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

/**
 * Archive one Expense while preserving its audit history.
 */
export const POST: APIRoute = async ({ request, params }) => {
  try {
    const expenseId = params.id;

    if (!expenseId) {
      return financeJsonResponse(
        {
          success: false,
          message: "Expense ID is required.",
        },
        400
      );
    }

    const { adminSupabase, userId } = await getFinanceApiClients(request);

    const { data: expense, error } = await adminSupabase
      .from("financial_transactions")
      .update({
        archived_at: new Date().toISOString(),

        updated_by: userId,

        updated_at: new Date().toISOString(),
      })
      .eq("id", expenseId)
      .eq("transaction_type", "expense")
      .is("archived_at", null)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return financeJsonResponse({
      success: true,
      expense,
      message: "Expense archived successfully.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
