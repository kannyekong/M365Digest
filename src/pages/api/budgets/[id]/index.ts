import type { APIRoute } from "astro";
import type {
  BudgetAllocationInput,
  BudgetExpenseCategory,
  BudgetStatus,
  BudgetType,
  UpdateBudgetInput,
} from "../../../../types/budget";
import type { Database } from "../../../../types/supabase";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../../lib/server/finance-api";

export const prerender = false;

type BudgetUpdate = Database["public"]["Tables"]["finance_budgets"]["Update"];

type BudgetAllocationInsert =
  Database["public"]["Tables"]["finance_budget_allocations"]["Insert"];

type BudgetAllocationRow =
  Database["public"]["Tables"]["finance_budget_allocations"]["Row"];

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
 * Normalize one optional positive amount.
 */
function normalizeOptionalPositiveAmount(value: unknown, fieldName: string) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${fieldName} must be greater than zero.`);
  }

  return Number(amount.toFixed(2));
}

/**
 * Normalize one optional warning threshold.
 */
function normalizeOptionalThreshold(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const threshold = Number(value);

  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    throw new Error("Warning threshold must be between 0 and 100.");
  }

  return Number(threshold.toFixed(2));
}

/**
 * Validate replacement Budget allocations.
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

    const allocatedAmount = Number(allocation.allocated_amount);

    if (!Number.isFinite(allocatedAmount) || allocatedAmount <= 0) {
      throw new Error("Allocated amounts must be greater than zero.");
    }

    return {
      transaction_category: allocation.transaction_category,

      allocated_amount: Number(allocatedAmount.toFixed(2)),

      notes: allocation.notes?.trim() || null,
    };
  });
}

/**
 * Update one Budget and optionally replace its allocations.
 */
export const PATCH: APIRoute = async ({ request, params }) => {
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

    const body = (await request.json()) as UpdateBudgetInput;

    const { data: existingBudget, error: existingBudgetError } =
      await adminSupabase
        .from("finance_budgets")
        .select("*")
        .eq("id", budgetId)
        .single();

    if (existingBudgetError || !existingBudget) {
      throw existingBudgetError ?? new Error("Budget not found.");
    }

    if (existingBudget.archived_at) {
      throw new Error("Archived Budgets must be restored before editing.");
    }

    const updates: BudgetUpdate = {
      updated_by: userId,

      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      const name = body.name.trim();

      if (!name) {
        throw new Error("Budget name cannot be empty.");
      }

      updates.name = name;
    }

    if (body.description !== undefined) {
      updates.description = body.description?.trim() || null;
    }

    if (body.budget_type !== undefined) {
      if (!ALLOWED_BUDGET_TYPES.includes(body.budget_type)) {
        throw new Error("A valid Budget type is required.");
      }

      updates.budget_type = body.budget_type;
    }

    if (body.department !== undefined) {
      updates.department = body.department?.trim() || null;
    }

    if (body.project_code !== undefined) {
      updates.project_code = body.project_code?.trim() || null;
    }

    if (body.currency !== undefined) {
      const currency = body.currency.trim().toUpperCase();

      if (currency.length !== 3) {
        throw new Error("Budget currency must be a three-letter ISO code.");
      }

      updates.currency = currency;
    }

    const totalAmount = normalizeOptionalPositiveAmount(
      body.total_amount,
      "Total Budget amount"
    );

    if (totalAmount !== undefined) {
      updates.total_amount = totalAmount;
    }

    const warningThreshold = normalizeOptionalThreshold(body.warning_threshold);

    if (warningThreshold !== undefined) {
      updates.warning_threshold = warningThreshold;
    }

    if (body.start_date !== undefined) {
      if (!body.start_date) {
        throw new Error("Budget start date cannot be empty.");
      }

      updates.start_date = body.start_date;
    }

    if (body.end_date !== undefined) {
      if (!body.end_date) {
        throw new Error("Budget end date cannot be empty.");
      }

      updates.end_date = body.end_date;
    }

    const effectiveStartDate = body.start_date ?? existingBudget.start_date;

    const effectiveEndDate = body.end_date ?? existingBudget.end_date;

    if (effectiveEndDate < effectiveStartDate) {
      throw new Error("Budget end date cannot be earlier than its start date.");
    }

    if (body.status !== undefined) {
      if (!ALLOWED_BUDGET_STATUSES.includes(body.status)) {
        throw new Error("A valid Budget status is required.");
      }

      updates.status = body.status;
    }

    let normalizedAllocations: ReturnType<typeof normalizeAllocations> | null =
      null;

    if (body.allocations !== undefined) {
      normalizedAllocations = normalizeAllocations(body.allocations);

      const effectiveTotalAmount =
        totalAmount ?? Number(existingBudget.total_amount);

      const allocatedTotal = normalizedAllocations.reduce(
        (total, allocation) => total + allocation.allocated_amount,
        0
      );

      if (allocatedTotal > effectiveTotalAmount) {
        throw new Error(
          "Category allocations cannot exceed the total Budget amount."
        );
      }
    }

    const { data: updatedBudget, error: updateError } = await adminSupabase
      .from("finance_budgets")
      .update(updates)
      .eq("id", budgetId)
      .select("*")
      .single();

    if (updateError || !updatedBudget) {
      throw updateError ?? new Error("The Budget could not be updated.");
    }

    if (normalizedAllocations) {
      const { data: previousAllocations, error: previousAllocationsError } =
        await adminSupabase
          .from("finance_budget_allocations")
          .select("*")
          .eq("budget_id", budgetId);

      if (previousAllocationsError) {
        throw previousAllocationsError;
      }

      const { error: deleteError } = await adminSupabase
        .from("finance_budget_allocations")
        .delete()
        .eq("budget_id", budgetId);

      if (deleteError) {
        throw deleteError;
      }

      const allocationInserts: BudgetAllocationInsert[] =
        normalizedAllocations.map((allocation) => ({
          budget_id: budgetId,

          transaction_category: allocation.transaction_category,

          allocated_amount: allocation.allocated_amount,

          notes: allocation.notes,
        }));

      const { error: insertError } = await adminSupabase
        .from("finance_budget_allocations")
        .insert(allocationInserts);

      if (insertError) {
        /**
         * Restore the former allocations if replacement fails.
         */
        if (previousAllocations && previousAllocations.length > 0) {
          const rollbackRows: BudgetAllocationInsert[] =
            previousAllocations.map((allocation: BudgetAllocationRow) => ({
              id: allocation.id,

              budget_id: allocation.budget_id,

              transaction_category: allocation.transaction_category,

              allocated_amount: allocation.allocated_amount,

              notes: allocation.notes,

              created_at: allocation.created_at,

              updated_at: allocation.updated_at,
            }));

          await adminSupabase
            .from("finance_budget_allocations")
            .insert(rollbackRows);
        }

        throw insertError;
      }
    }

    const { data: savedAllocations, error: savedAllocationsError } =
      await adminSupabase
        .from("finance_budget_allocations")
        .select("*")
        .eq("budget_id", budgetId)
        .order("transaction_category", {
          ascending: true,
        });

    if (savedAllocationsError) {
      throw savedAllocationsError;
    }

    return financeJsonResponse({
      success: true,

      budget: {
        ...updatedBudget,

        allocations: savedAllocations ?? [],
      },

      message: "Budget updated successfully.",
    });
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
