import type { APIRoute } from "astro";
import type { Database, Json } from "../../../../types/supabase";
import type {
  ExpenseCategory,
  ExpenseReconciliationStatus,
  ExpenseStatus,
  UpdateExpenseInput,
} from "../../../../types/expense";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

type FinancialTransactionUpdate =
  Database["public"]["Tables"]["financial_transactions"]["Update"];

const ALLOWED_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "operations",
  "marketing",
  "salary",
  "tax",
  "equipment",
  "reimbursement",
  "other",
];

const ALLOWED_EXPENSE_STATUSES: ExpenseStatus[] = [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "refunded",
];

const ALLOWED_RECONCILIATION_STATUSES: ExpenseReconciliationStatus[] = [
  "unreconciled",
  "reconciled",
  "disputed",
];

/**
 * Convert an optional monetary value into a valid non-negative amount.
 */
function normalizeOptionalAmount(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Expense amounts must be valid non-negative numbers.");
  }

  return Number(amount.toFixed(2));
}

/**
 * Update one existing Expense transaction.
 */
export const PATCH: APIRoute = async ({ request, params }) => {
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

    const body = (await request.json()) as UpdateExpenseInput;

    const { data: existingExpense, error: existingExpenseError } =
      await adminSupabase
        .from("financial_transactions")
        .select("*")
        .eq("id", expenseId)
        .eq("transaction_type", "expense")
        .single();

    if (existingExpenseError || !existingExpense) {
      throw existingExpenseError ?? new Error("Expense not found.");
    }

    if (existingExpense.archived_at) {
      throw new Error("Archived Expenses must be restored before editing.");
    }

    const now = new Date().toISOString();

    const updates: FinancialTransactionUpdate = {
      updated_by: userId,
      updated_at: now,
    };

    if (body.transaction_category !== undefined) {
      if (!ALLOWED_EXPENSE_CATEGORIES.includes(body.transaction_category)) {
        throw new Error("A valid Expense category is required.");
      }

      updates.transaction_category = body.transaction_category;
    }

    if (body.provider !== undefined) {
      const provider = body.provider.trim();

      if (!provider) {
        throw new Error("Expense provider cannot be empty.");
      }

      updates.provider = provider;
    }

    if (body.payment_method !== undefined) {
      updates.payment_method = body.payment_method?.trim() || null;
    }

    if (body.description !== undefined) {
      const description = body.description.trim();

      if (!description) {
        throw new Error("Expense description cannot be empty.");
      }

      updates.description = description;
    }

    if (body.internal_notes !== undefined) {
      updates.internal_notes = body.internal_notes?.trim() || null;
    }

    if (body.provider_reference !== undefined) {
      updates.provider_reference = body.provider_reference?.trim() || null;
    }

    if (body.receipt_number !== undefined) {
      updates.receipt_number = body.receipt_number?.trim() || null;
    }

    if (body.bank_account !== undefined) {
      updates.bank_account = body.bank_account?.trim() || null;
    }

    const amount = normalizeOptionalAmount(body.amount);

    if (amount !== undefined) {
      if (amount <= 0) {
        throw new Error("Expense amount must be greater than zero.");
      }

      updates.amount = amount;
      updates.base_amount = amount;
    }

    const feeAmount = normalizeOptionalAmount(body.fee_amount);

    if (feeAmount !== undefined) {
      updates.fee_amount = feeAmount;
    }

    const taxAmount = normalizeOptionalAmount(body.tax_amount);

    if (taxAmount !== undefined) {
      updates.tax_amount = taxAmount;
    }

    if (body.currency !== undefined) {
      const currency = body.currency.trim().toUpperCase();

      if (currency.length !== 3) {
        throw new Error("Expense currency must be a three-letter ISO code.");
      }

      updates.currency = currency;
      updates.base_currency = currency;
    }

    if (body.transaction_date !== undefined) {
      const transactionDate = body.transaction_date.trim();

      if (!transactionDate) {
        throw new Error("Expense transaction date cannot be empty.");
      }

      updates.transaction_date = transactionDate;
    }

    if (body.metadata !== undefined) {
      updates.metadata = body.metadata as Json;
    }

    if (body.status !== undefined) {
      if (!ALLOWED_EXPENSE_STATUSES.includes(body.status)) {
        throw new Error("A valid Expense status is required.");
      }

      updates.status = body.status;

      if (body.status === "paid") {
        updates.paid_at = body.paid_at ?? existingExpense.paid_at ?? now;
      }

      if (body.status !== "paid" && body.paid_at === null) {
        updates.paid_at = null;
      }
    }

    if (body.paid_at !== undefined) {
      updates.paid_at = body.paid_at;
    }

    if (body.reconciliation_status !== undefined) {
      if (
        !ALLOWED_RECONCILIATION_STATUSES.includes(body.reconciliation_status)
      ) {
        throw new Error("A valid reconciliation status is required.");
      }

      updates.reconciliation_status = body.reconciliation_status;

      updates.reconciled_at =
        body.reconciliation_status === "reconciled"
          ? (existingExpense.reconciled_at ?? now)
          : null;
    }

    const { data: expense, error: updateError } = await adminSupabase
      .from("financial_transactions")
      .update(updates)
      .eq("id", expenseId)
      .eq("transaction_type", "expense")
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    return financeJsonResponse({
      success: true,
      expense,
      message: "Expense updated successfully.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
