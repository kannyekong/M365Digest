import type { APIRoute } from "astro";
import type {
  BudgetAllocationInput,
  BudgetExpenseCategory,
  BudgetStatus,
  BudgetType,
  CreateBudgetInput,
} from "../../../types/budget";
import type { Database, Json } from "../../../types/supabase";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../lib/server/finance-api";

export const prerender = false;

type BudgetInsert = Database["public"]["Tables"]["finance_budgets"]["Insert"];

type BudgetAllocationInsert =
  Database["public"]["Tables"]["finance_budget_allocations"]["Insert"];

const ALLOWED_BUDGET_TYPES: BudgetType[] = [
  "monthly",
  "quarterly",
  "annual",
  "custom",
];

const ALLOWED_BUDGET_STATUSES: BudgetStatus[] = [
  "draft",
  "active",
  "completed",
  "cancelled",
];

const ALLOWED_EXPENSE_CATEGORIES: BudgetExpenseCategory[] = [
  "operations",
  "marketing",
  "salary",
  "tax",
  "equipment",
  "reimbursement",
  "other",
];

/**
 * Convert one monetary value into a valid positive number.
 */
function normalizePositiveAmount(value: unknown, fieldName: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${fieldName} must be greater than zero.`);
  }

  return Number(amount.toFixed(2));
}

/**
 * Convert one threshold value into a valid percentage.
 */
function normalizeWarningThreshold(value: unknown) {
  const threshold = Number(value ?? 80);

  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    throw new Error("Warning threshold must be between 0 and 100.");
  }

  return Number(threshold.toFixed(2));
}

/**
 * Validate one Budget allocation list and prevent duplicate categories.
 */
function normalizeAllocations(allocations: BudgetAllocationInput[]) {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    throw new Error("At least one Budget allocation is required.");
  }

  const seenCategories = new Set<BudgetExpenseCategory>();

  return allocations.map((allocation) => {
    if (!ALLOWED_EXPENSE_CATEGORIES.includes(allocation.transaction_category)) {
      throw new Error("A valid Budget allocation category is required.");
    }

    if (seenCategories.has(allocation.transaction_category)) {
      throw new Error(
        `The ${allocation.transaction_category} category appears more than once.`
      );
    }

    seenCategories.add(allocation.transaction_category);

    return {
      transaction_category: allocation.transaction_category,

      allocated_amount: normalizePositiveAmount(
        allocation.allocated_amount,
        "Allocated amount"
      ),

      notes: allocation.notes?.trim() || null,
    };
  });
}

/**
 * Create one Budget and its category allocations.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { adminSupabase, userId } = await getFinanceApiClients(request);

    const body = (await request.json()) as CreateBudgetInput;

    const name = body.name?.trim();

    if (!name) {
      throw new Error("Budget name is required.");
    }

    if (!ALLOWED_BUDGET_TYPES.includes(body.budget_type)) {
      throw new Error("A valid Budget type is required.");
    }

    const status = body.status ?? "draft";

    if (!ALLOWED_BUDGET_STATUSES.includes(status)) {
      throw new Error("A valid Budget status is required.");
    }

    const totalAmount = normalizePositiveAmount(
      body.total_amount,
      "Total Budget amount"
    );

    const warningThreshold = normalizeWarningThreshold(body.warning_threshold);

    const currency = (body.currency ?? "NGN").trim().toUpperCase();

    if (currency.length !== 3) {
      throw new Error("Budget currency must be a three-letter ISO code.");
    }

    if (!body.start_date || !body.end_date) {
      throw new Error("Budget start and end dates are required.");
    }

    if (body.end_date < body.start_date) {
      throw new Error("Budget end date cannot be earlier than its start date.");
    }

    const allocations = normalizeAllocations(body.allocations);

    const allocatedTotal = allocations.reduce(
      (total, allocation) => total + allocation.allocated_amount,
      0
    );

    if (allocatedTotal > totalAmount) {
      throw new Error(
        "Category allocations cannot exceed the total Budget amount."
      );
    }

    const budgetInsert: BudgetInsert = {
      name,

      description: body.description?.trim() || null,

      budget_type: body.budget_type,

      department: body.department?.trim() || null,

      project_code: body.project_code?.trim() || null,

      currency,

      total_amount: totalAmount,

      start_date: body.start_date,

      end_date: body.end_date,

      status,

      warning_threshold: warningThreshold,

      created_by: userId,

      updated_by: userId,

      archived_at: null,
    };

    const { data: budget, error: budgetError } = await adminSupabase
      .from("finance_budgets")
      .insert(budgetInsert)
      .select("*")
      .single();

    if (budgetError || !budget) {
      throw budgetError ?? new Error("The Budget could not be created.");
    }

    const allocationInserts: BudgetAllocationInsert[] = allocations.map(
      (allocation) => ({
        budget_id: budget.id,

        transaction_category: allocation.transaction_category,

        allocated_amount: allocation.allocated_amount,

        notes: allocation.notes,
      })
    );

    const { error: allocationError } = await adminSupabase
      .from("finance_budget_allocations")
      .insert(allocationInserts);

    if (allocationError) {
      /**
       * Remove the new Budget if its allocations fail.
       * The foreign-key cascade removes any partial allocation rows.
       */
      await adminSupabase.from("finance_budgets").delete().eq("id", budget.id);

      throw allocationError;
    }

    const { data: savedAllocations, error: savedAllocationsError } =
      await adminSupabase
        .from("finance_budget_allocations")
        .select("*")
        .eq("budget_id", budget.id)
        .order("transaction_category", {
          ascending: true,
        });

    if (savedAllocationsError) {
      throw savedAllocationsError;
    }

    return financeJsonResponse(
      {
        success: true,

        budget: {
          ...budget,

          allocations: savedAllocations ?? [],
        },

        message: "Budget created successfully.",
      },
      201
    );
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
