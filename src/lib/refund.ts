import { supabase } from "./superbase";
import type {
  ApproveRefundInput,
  CancelRefundInput,
  CreateRefundInput,
  FinanceRefund,
  FinanceRefundListItem,
  ListRefundsOptions,
  ProcessRefundInput,
  RefundListResponse,
  RefundStatistics,
  RefundableTransaction,
  RejectRefundInput,
} from "../types/refund";

/**
 * Convert a PostgreSQL numeric value into a safe JavaScript number.
 */
function toSafeNumber(value: number | string | null | undefined) {
  const normalizedValue = Number(value ?? 0);

  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

/**
 * Escape characters that have a special meaning in PostgREST search expressions.
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
 * Normalize one raw Refund database record.
 */
function normalizeRefund(refund: Record<string, unknown>): FinanceRefund {
  return {
    id: String(refund.id ?? ""),

    refund_reference: String(refund.refund_reference ?? ""),

    original_transaction_id: String(refund.original_transaction_id ?? ""),

    invoice_id:
      typeof refund.invoice_id === "string" ? refund.invoice_id : null,

    receipt_id:
      typeof refund.receipt_id === "string" ? refund.receipt_id : null,

    provider: refund.provider as FinanceRefund["provider"],

    provider_refund_reference:
      typeof refund.provider_refund_reference === "string"
        ? refund.provider_refund_reference
        : null,

    payment_method:
      typeof refund.payment_method === "string" ? refund.payment_method : null,

    requested_amount: toSafeNumber(
      refund.requested_amount as number | string | null
    ),

    approved_amount:
      refund.approved_amount === null || refund.approved_amount === undefined
        ? null
        : toSafeNumber(refund.approved_amount as number | string),

    refunded_amount: toSafeNumber(
      refund.refunded_amount as number | string | null
    ),

    currency: String(refund.currency ?? "NGN"),

    reason: String(refund.reason ?? ""),

    internal_notes:
      typeof refund.internal_notes === "string" ? refund.internal_notes : null,

    status: refund.status as FinanceRefund["status"],

    requested_at: String(refund.requested_at ?? ""),

    approved_at:
      typeof refund.approved_at === "string" ? refund.approved_at : null,

    processed_at:
      typeof refund.processed_at === "string" ? refund.processed_at : null,

    failed_at: typeof refund.failed_at === "string" ? refund.failed_at : null,

    rejected_at:
      typeof refund.rejected_at === "string" ? refund.rejected_at : null,

    cancelled_at:
      typeof refund.cancelled_at === "string" ? refund.cancelled_at : null,

    requested_by:
      typeof refund.requested_by === "string" ? refund.requested_by : null,

    approved_by:
      typeof refund.approved_by === "string" ? refund.approved_by : null,

    processed_by:
      typeof refund.processed_by === "string" ? refund.processed_by : null,

    rejected_by:
      typeof refund.rejected_by === "string" ? refund.rejected_by : null,

    provider_payload:
      refund.provider_payload && typeof refund.provider_payload === "object"
        ? (refund.provider_payload as Record<string, unknown>)
        : {},

    metadata:
      refund.metadata && typeof refund.metadata === "object"
        ? (refund.metadata as Record<string, unknown>)
        : {},

    created_at: String(refund.created_at ?? ""),

    updated_at: String(refund.updated_at ?? ""),

    archived_at:
      typeof refund.archived_at === "string" ? refund.archived_at : null,
  };
}

/**
 * Normalize one raw refundable transaction view record.
 */
function normalizeRefundableTransaction(
  transaction: Record<string, unknown>
): RefundableTransaction {
  return {
    transaction_id: String(transaction.transaction_id ?? ""),

    internal_reference: String(transaction.internal_reference ?? ""),

    provider_reference:
      typeof transaction.provider_reference === "string"
        ? transaction.provider_reference
        : null,

    invoice_number:
      typeof transaction.invoice_number === "string"
        ? transaction.invoice_number
        : null,

    receipt_number:
      typeof transaction.receipt_number === "string"
        ? transaction.receipt_number
        : null,

    customer_name:
      typeof transaction.customer_name === "string"
        ? transaction.customer_name
        : null,

    customer_email:
      typeof transaction.customer_email === "string"
        ? transaction.customer_email
        : null,

    description: String(transaction.description ?? ""),

    provider: String(transaction.provider ?? ""),

    payment_method:
      typeof transaction.payment_method === "string"
        ? transaction.payment_method
        : null,

    amount: toSafeNumber(transaction.amount as number | string | null),

    refunded_amount: toSafeNumber(
      transaction.refunded_amount as number | string | null
    ),

    refundable_amount: toSafeNumber(
      transaction.refundable_amount as number | string | null
    ),

    currency: String(transaction.currency ?? "NGN"),

    status: String(transaction.status ?? ""),

    transaction_date: String(transaction.transaction_date ?? ""),

    paid_at:
      typeof transaction.paid_at === "string" ? transaction.paid_at : null,

    source_table:
      typeof transaction.source_table === "string"
        ? transaction.source_table
        : null,

    source_id:
      typeof transaction.source_id === "string" ? transaction.source_id : null,
  };
}

/**
 * Retrieve authenticated headers for protected Refund API requests.
 */
async function getRefundAuthorizationHeaders() {
  const { data: sessionResult, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken = sessionResult.session?.access_token;

  if (!accessToken) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

/**
 * Parse one Refund API response safely.
 */
async function parseRefundApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const responseText = await response.text();

    console.error("Refund API returned a non-JSON response:", {
      status: response.status,
      url: response.url,
      responseText,
    });

    throw new Error(
      response.status === 404
        ? "The Refund API route was not found. Verify the route file and restart Astro."
        : `The Refund API returned an unexpected response (${response.status}).`
    );
  }

  const result = (await response.json()) as {
    success?: boolean;
    message?: string;
    refund?: T;
    data?: T;
  };

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ??
        `The Refund request failed with status ${response.status}.`
    );
  }

  const responseData = result.refund ?? result.data;

  if (!responseData) {
    throw new Error("The Refund API returned no data.");
  }

  return responseData;
}

/**
 * Retrieve transactions that still have a refundable balance.
 */
export async function listRefundableTransactions(): Promise<
  RefundableTransaction[]
> {
  const { data, error } = await supabase
    .from("finance_refundable_transactions")
    .select("*")
    .order("paid_at", {
      ascending: false,
      nullsFirst: false,
    });

  if (error) {
    console.error("Failed to load refundable transactions:", error);

    throw error;
  }

  return (data ?? []).map((transaction) =>
    normalizeRefundableTransaction(transaction as Record<string, unknown>)
  );
}

/**
 * Retrieve paginated Refund records.
 */
export async function listRefunds({
  page = 1,
  pageSize = 10,
  filters = {},
  sortBy = "requested_at",
  sortDirection = "desc",
}: ListRefundsOptions = {}): Promise<RefundListResponse> {
  const safePage = Math.max(1, page);

  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const rangeStart = (safePage - 1) * safePageSize;

  const rangeEnd = rangeStart + safePageSize - 1;

  let query = supabase.from("finance_refunds").select("*", {
    count: "exact",
  });

  if (filters.archived) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.provider && filters.provider !== "all") {
    query = query.eq("provider", filters.provider);
  }

  if (filters.currency?.trim()) {
    query = query.eq("currency", filters.currency.trim().toUpperCase());
  }

  if (filters.dateFrom) {
    query = query.gte("requested_at", `${filters.dateFrom}T00:00:00.000Z`);
  }

  if (filters.dateTo) {
    query = query.lte("requested_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  if (filters.search?.trim()) {
    const searchValue = escapePostgrestSearch(filters.search.trim());

    query = query.or(
      [
        `refund_reference.ilike.%${searchValue}%`,
        `provider_refund_reference.ilike.%${searchValue}%`,
        `reason.ilike.%${searchValue}%`,
        `internal_notes.ilike.%${searchValue}%`,
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
    console.error("Failed to load Refunds:", error);

    throw error;
  }

  const refunds = (data ?? []).map((refund) =>
    normalizeRefund(refund as Record<string, unknown>)
  );

  const transactionIds = [
    ...new Set(refunds.map((refund) => refund.original_transaction_id)),
  ];

  const transactionMap = new Map<string, Record<string, unknown>>();

  if (transactionIds.length > 0) {
    const { data: transactions, error: transactionError } = await supabase
      .from("financial_transactions")
      .select(
        `
        id,
        internal_reference,
        customer_name,
        customer_email,
        description,
        amount,
        refunded_amount
        `
      )
      .in("id", transactionIds);

    if (transactionError) {
      console.error(
        "Failed to load original Refund transactions:",
        transactionError
      );

      throw transactionError;
    }

    for (const transaction of transactions ?? []) {
      transactionMap.set(
        transaction.id,
        transaction as Record<string, unknown>
      );
    }
  }

  const refundItems: FinanceRefundListItem[] = refunds.map((refund) => {
    const transaction = transactionMap.get(refund.original_transaction_id);

    const originalAmount = toSafeNumber(
      transaction?.amount as number | string | null
    );

    const previousRefundedAmount = toSafeNumber(
      transaction?.refunded_amount as number | string | null
    );

    return {
      ...refund,

      transaction_reference:
        typeof transaction?.internal_reference === "string"
          ? transaction.internal_reference
          : null,

      customer_name:
        typeof transaction?.customer_name === "string"
          ? transaction.customer_name
          : null,

      customer_email:
        typeof transaction?.customer_email === "string"
          ? transaction.customer_email
          : null,

      transaction_description:
        typeof transaction?.description === "string"
          ? transaction.description
          : null,

      original_amount: originalAmount,

      previous_refunded_amount: previousRefundedAmount,

      available_refund_amount: Math.max(
        originalAmount - previousRefundedAmount,
        0
      ),
    };
  });

  const total = count ?? 0;

  return {
    refunds: refundItems,

    total,

    page: safePage,

    pageSize: safePageSize,

    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

/**
 * Retrieve Refund dashboard statistics.
 */
export async function getRefundStatistics(): Promise<RefundStatistics> {
  const { data, error } = await supabase
    .from("finance_refunds")
    .select(
      `
      requested_amount,
      approved_amount,
      refunded_amount,
      status,
      currency
      `
    )
    .is("archived_at", null);

  if (error) {
    console.error("Failed to load Refund statistics:", error);

    throw error;
  }

  const statistics: RefundStatistics = {
    totalRequested: 0,

    totalApproved: 0,

    totalRefunded: 0,

    requestedCount: 0,

    approvedCount: 0,

    processingCount: 0,

    successfulCount: 0,

    failedCount: 0,

    rejectedCount: 0,

    cancelledCount: 0,

    currency: "NGN",
  };

  for (const refund of data ?? []) {
    statistics.totalRequested += toSafeNumber(refund.requested_amount);

    statistics.totalApproved += toSafeNumber(refund.approved_amount);

    statistics.totalRefunded += toSafeNumber(refund.refunded_amount);

    statistics.currency = refund.currency || statistics.currency;

    switch (refund.status) {
      case "requested":
        statistics.requestedCount += 1;
        break;

      case "approved":
        statistics.approvedCount += 1;
        break;

      case "processing":
        statistics.processingCount += 1;
        break;

      case "successful":
        statistics.successfulCount += 1;
        break;

      case "failed":
        statistics.failedCount += 1;
        break;

      case "rejected":
        statistics.rejectedCount += 1;
        break;

      case "cancelled":
        statistics.cancelledCount += 1;
        break;
    }
  }

  return statistics;
}

/**
 * Create one Refund request.
 */
export async function createRefund(
  input: CreateRefundInput
): Promise<FinanceRefund> {
  const headers = await getRefundAuthorizationHeaders();

  const response = await fetch("/api/refunds", {
    method: "POST",

    headers,

    body: JSON.stringify(input),
  });

  return parseRefundApiResponse<FinanceRefund>(response);
}

/**
 * Approve one Refund request.
 */
export async function approveRefund(
  refundId: string,
  input: ApproveRefundInput
): Promise<FinanceRefund> {
  const headers = await getRefundAuthorizationHeaders();

  const response = await fetch(
    `/api/refunds/${encodeURIComponent(refundId)}/approve`,
    {
      method: "POST",

      headers,

      body: JSON.stringify(input),
    }
  );

  return parseRefundApiResponse<FinanceRefund>(response);
}

/**
 * Reject one Refund request.
 */
export async function rejectRefund(
  refundId: string,
  input: RejectRefundInput
): Promise<FinanceRefund> {
  const headers = await getRefundAuthorizationHeaders();

  const response = await fetch(
    `/api/refunds/${encodeURIComponent(refundId)}/reject`,
    {
      method: "POST",

      headers,

      body: JSON.stringify(input),
    }
  );

  return parseRefundApiResponse<FinanceRefund>(response);
}

/**
 * Process one approved Refund.
 */
export async function processRefund(
  refundId: string,
  input: ProcessRefundInput
): Promise<FinanceRefund> {
  const headers = await getRefundAuthorizationHeaders();

  const response = await fetch(
    `/api/refunds/${encodeURIComponent(refundId)}/process`,
    {
      method: "POST",

      headers,

      body: JSON.stringify(input),
    }
  );

  return parseRefundApiResponse<FinanceRefund>(response);
}

/**
 * Cancel one Refund request.
 */
export async function cancelRefund(
  refundId: string,
  input: CancelRefundInput = {}
): Promise<FinanceRefund> {
  const headers = await getRefundAuthorizationHeaders();

  const response = await fetch(
    `/api/refunds/${encodeURIComponent(refundId)}/cancel`,
    {
      method: "POST",

      headers,

      body: JSON.stringify(input),
    }
  );

  return parseRefundApiResponse<FinanceRefund>(response);
}
