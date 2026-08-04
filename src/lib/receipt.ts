import { supabase } from "./superbase";
import type {
  ListReceiptsOptions,
  Receipt,
  ReceiptListResponse,
  ReceiptStatistics,
} from "../types/receipt";

/**
 * Convert PostgreSQL numeric values into safe JavaScript numbers.
 */
function toSafeNumber(value: number | string | null | undefined) {
  const normalizedValue = Number(value ?? 0);

  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

/**
 * Escape special characters used by PostgREST search filters.
 */
function escapePostgrestSearch(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, "\\,")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/**
 * Normalize one Receipt returned by Supabase.
 */
function normalizeReceipt(receipt: Record<string, unknown>): Receipt {
  return {
    id: String(receipt.id),
    receipt_number: String(receipt.receipt_number),
    invoice_id: String(receipt.invoice_id),
    invoice_payment_attempt_id: String(receipt.invoice_payment_attempt_id),
    revenue_transaction_id: String(receipt.revenue_transaction_id),
    invoice_number: String(receipt.invoice_number),
    customer_name: String(receipt.customer_name),
    customer_email: String(receipt.customer_email),
    customer_phone:
      typeof receipt.customer_phone === "string" ? receipt.customer_phone : null,
    amount: toSafeNumber(receipt.amount as number | string | null),
    currency: String(receipt.currency ?? "NGN"),
    payment_reference: String(receipt.payment_reference),
    payment_method:
      typeof receipt.payment_method === "string" ? receipt.payment_method : null,
    payment_provider: String(receipt.payment_provider ?? "paystack"),
    provider_transaction_id:
      receipt.provider_transaction_id === null ||
      receipt.provider_transaction_id === undefined
        ? null
        : toSafeNumber(receipt.provider_transaction_id as number | string),
    gateway_response:
      typeof receipt.gateway_response === "string"
        ? receipt.gateway_response
        : null,
    status: receipt.status as Receipt["status"],
    paid_at: String(receipt.paid_at),
    issued_at: String(receipt.issued_at),
    voided_at:
      typeof receipt.voided_at === "string" ? receipt.voided_at : null,
    refunded_at:
      typeof receipt.refunded_at === "string" ? receipt.refunded_at : null,
    notes: typeof receipt.notes === "string" ? receipt.notes : null,
    metadata:
      receipt.metadata &&
      typeof receipt.metadata === "object" &&
      !Array.isArray(receipt.metadata)
        ? (receipt.metadata as Record<string, unknown>)
        : {},
    created_at: String(receipt.created_at),
    updated_at: String(receipt.updated_at),
  };
}

/**
 * Retrieve paginated Receipt records.
 */
export async function listReceipts({
  page = 1,
  pageSize = 10,
  filters = {},
  sortBy = "paid_at",
  sortDirection = "desc",
}: ListReceiptsOptions = {}): Promise<ReceiptListResponse> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const rangeStart = (safePage - 1) * safePageSize;
  const rangeEnd = rangeStart + safePageSize - 1;

  let query = supabase.from("receipts").select("*", {
    count: "exact",
  });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.provider && filters.provider !== "all") {
    query = query.eq("payment_provider", filters.provider);
  }

  if (filters.currency) {
    query = query.eq("currency", filters.currency.trim().toUpperCase());
  }

  if (filters.dateFrom) {
    query = query.gte("paid_at", `${filters.dateFrom}T00:00:00.000Z`);
  }

  if (filters.dateTo) {
    query = query.lte("paid_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  if (filters.search?.trim()) {
    const searchValue = escapePostgrestSearch(filters.search.trim());

    query = query.or(
      [
        `receipt_number.ilike.%${searchValue}%`,
        `invoice_number.ilike.%${searchValue}%`,
        `customer_name.ilike.%${searchValue}%`,
        `customer_email.ilike.%${searchValue}%`,
        `payment_reference.ilike.%${searchValue}%`,
      ].join(",")
    );
  }

  const { data, error, count } = await query
    .order(sortBy, {
      ascending: sortDirection === "asc",
      nullsFirst: false,
    })
    .range(rangeStart, rangeEnd);

  if (error) {
    console.error("Failed to load Receipts:", error);

    throw error;
  }

  const total = count ?? 0;

  return {
    receipts: (data ?? []).map((receipt) =>
      normalizeReceipt(receipt as Record<string, unknown>)
    ),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

/**
 * Retrieve one Receipt by ID.
 */
export async function getReceiptById(receiptId: string): Promise<Receipt> {
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", receiptId)
    .single();

  if (error) {
    console.error("Failed to load Receipt:", error);

    throw error;
  }

  return normalizeReceipt(data as Record<string, unknown>);
}

/**
 * Retrieve Receipt statistics for the dashboard.
 */
export async function getReceiptStatistics(): Promise<ReceiptStatistics> {
  const currentDate = new Date();
  const currentMonthStart = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1)
  );
  const nextMonthStart = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 1)
  );

  const { data, error } = await supabase
    .from("receipts")
    .select("amount,currency,status,paid_at");

  if (error) {
    console.error("Failed to load Receipt statistics:", error);

    throw error;
  }

  let totalAmount = 0;
  let currentMonthAmount = 0;
  let issuedReceipts = 0;
  let refundedReceipts = 0;
  let voidedReceipts = 0;
  let currency = "NGN";

  for (const receipt of data ?? []) {
    const amount = toSafeNumber(receipt.amount);

    if (receipt.currency) {
      currency = receipt.currency;
    }

    if (receipt.status === "issued") {
      totalAmount += amount;
      issuedReceipts += 1;

      const paidAt = new Date(receipt.paid_at);

      if (
        !Number.isNaN(paidAt.getTime()) &&
        paidAt >= currentMonthStart &&
        paidAt < nextMonthStart
      ) {
        currentMonthAmount += amount;
      }
    }

    if (receipt.status === "refunded") {
      refundedReceipts += 1;
    }

    if (receipt.status === "voided") {
      voidedReceipts += 1;
    }
  }

  return {
    totalAmount,
    currentMonthAmount,
    issuedReceipts,
    refundedReceipts,
    voidedReceipts,
    currency,
  };
}
