import type { APIRoute } from "astro";
import type {
  CreateExpenseInput,
  ExpenseCategory,
  ExpenseReconciliationStatus,
  ExpenseStatus,
} from "../../../types/expense";
import {
  financeJsonResponse,
  getFinanceApiClients,
  handleFinanceApiError,
} from "../../../lib/server/finance-api";
import type { Json } from "../../../types/supabase";

export const prerender = false;

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
 * Convert one value into a valid non-negative monetary amount.
 */
function normalizeAmount(value: unknown, fallback = 0) {
  const amount = Number(value ?? fallback);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Expense amounts must be valid non-negative numbers.");
  }

  return Number(amount.toFixed(2));
}

/**
 * Generate a readable internal Expense reference.
 */
function generateExpenseReference() {
  const timestamp = Date.now();

  const randomPart = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();

  return `EXP-${timestamp}-${randomPart}`;
}

/**
 * Validate and normalize a new Expense request.
 */
function normalizeCreateExpenseInput(body: CreateExpenseInput) {
  if (!body.description?.trim()) {
    throw new Error("Expense description is required.");
  }

  if (!ALLOWED_EXPENSE_CATEGORIES.includes(body.transaction_category)) {
    throw new Error("A valid Expense category is required.");
  }

  if (!body.provider?.trim().toLowerCase().replace(/\s+/g, "_")) {
    throw new Error("Expense provider is required.");
  }

  const amount = normalizeAmount(body.amount);

  if (amount <= 0) {
    throw new Error("Expense amount must be greater than zero.");
  }

  const feeAmount = normalizeAmount(body.fee_amount);

  const taxAmount = normalizeAmount(body.tax_amount);

  const status = body.status ?? "pending";

  if (!ALLOWED_EXPENSE_STATUSES.includes(status)) {
    throw new Error("A valid Expense status is required.");
  }

  const reconciliationStatus = body.reconciliation_status ?? "unreconciled";

  if (!ALLOWED_RECONCILIATION_STATUSES.includes(reconciliationStatus)) {
    throw new Error("A valid reconciliation status is required.");
  }

  const transactionDate = body.transaction_date?.trim();

  if (!transactionDate) {
    throw new Error("Expense transaction date is required.");
  }

  const currency = (body.currency ?? "NGN").trim().toUpperCase();

  if (currency.length !== 3) {
    throw new Error("Expense currency must be a three-letter ISO code.");
  }

  return {
    amount,
    feeAmount,
    taxAmount,
    status,
    reconciliationStatus,
    transactionDate,
    currency,
  };
}

/**
 * Create one Expense transaction.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { adminSupabase, userId } = await getFinanceApiClients(request);

    const body = (await request.json()) as CreateExpenseInput;

    const normalized = normalizeCreateExpenseInput(body);

    const paidAt =
      normalized.status === "paid"
        ? (body.paid_at ?? new Date().toISOString())
        : (body.paid_at ?? null);

    const reconciledAt =
      normalized.reconciliationStatus === "reconciled"
        ? new Date().toISOString()
        : null;

    const { data: expense, error: expenseError } = await adminSupabase
      .from("financial_transactions")
      .insert({
        transaction_type: "expense",

        transaction_category: body.transaction_category,

        provider: body.provider.trim(),

        payment_method: body.payment_method?.trim() || null,

        source_table: "manual_expenses",

        source_id: null,

        customer_name: null,

        customer_email: null,

        customer_phone: null,

        description: body.description.trim(),

        internal_notes: body.internal_notes?.trim() || null,

        internal_reference: generateExpenseReference(),

        provider_reference: body.provider_reference?.trim() || null,

        invoice_number: null,

        receipt_number: body.receipt_number?.trim() || null,

        bank_account: body.bank_account?.trim() || null,

        amount: normalized.amount,

        fee_amount: normalized.feeAmount,

        tax_amount: normalized.taxAmount,

        refunded_amount: 0,

        currency: normalized.currency,

        base_currency: normalized.currency,

        exchange_rate: 1,

        base_amount: normalized.amount,

        status: normalized.status,

        reconciliation_status: normalized.reconciliationStatus,

        transaction_date: normalized.transactionDate,

        paid_at: paidAt,

        reconciled_at: reconciledAt,

        provider_payload: {},

        metadata: (body.metadata as Json) ?? {},

        created_by: userId,

        updated_by: userId,

        archived_at: null,
      })
      .select("*")
      .single();

    if (expenseError) {
      throw expenseError;
    }

    return financeJsonResponse(
      {
        success: true,
        expense,
        message: "Expense created successfully.",
      },
      201
    );
  } catch (error) {
    return handleFinanceApiError(error);
  }
};
