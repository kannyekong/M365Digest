import { supabase } from "./superbase";
import type {
  AcademyPaymentStatus,
  AcademyRegistrationStatus,
} from "../types/academy";

/**
 * Minimal Academy program details attached to a payment.
 */
export interface AcademyPaymentProgram {
  id: string;
  title: string;
  slug: string;
  code: string | null;
}

/**
 * Academy payment record derived from an Academy registration.
 */
export interface AcademyPaymentRecord {
  id: string;

  program_id: string;

  first_name: string;

  last_name: string;

  email: string;

  phone: string | null;

  registration_status: AcademyRegistrationStatus;

  payment_status: AcademyPaymentStatus;

  payment_reference: string | null;

  payment_provider: string | null;

  amount_expected: number | null;

  amount_paid: number | null;

  currency: string;

  paid_at: string | null;

  created_at: string;

  updated_at: string;

  metadata: Record<string, unknown>;

  program: AcademyPaymentProgram | null;
}

/**
 * Filters supported by the Academy payments screen.
 */
export interface AcademyPaymentFilters {
  search?: string;

  programId?: string;

  paymentStatus?: AcademyPaymentStatus | "all";

  paymentProvider?: string | "all";

  dateFrom?: string;

  dateTo?: string;
}

/**
 * Sorting fields supported by the payment table.
 */
export type AcademyPaymentSortField =
  | "created_at"
  | "paid_at"
  | "first_name"
  | "last_name"
  | "amount_expected"
  | "amount_paid"
  | "payment_status";

/**
 * Options accepted by the paginated payment query.
 */
export interface ListAcademyPaymentsOptions {
  page?: number;

  pageSize?: number;

  filters?: AcademyPaymentFilters;

  sortBy?: AcademyPaymentSortField;

  sortDirection?: "asc" | "desc";
}

/**
 * Paginated payment query response.
 */
export interface AcademyPaymentListResponse {
  payments: AcademyPaymentRecord[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
}

/**
 * Academy payment statistics displayed above the table.
 */
export interface AcademyPaymentStatistics {
  totalTransactions: number;

  paidPayments: number;

  pendingPayments: number;

  failedPayments: number;

  refundedPayments: number;

  cancelledPayments: number;

  totalRevenue: number;

  pendingValue: number;

  refundedValue: number;

  currency: string;
}

/**
 * Values an administrator can update on a payment.
 */
export interface UpdateAcademyPaymentInput {
  payment_status?: AcademyPaymentStatus;

  registration_status?: AcademyRegistrationStatus;

  payment_reference?: string | null;

  payment_provider?: string | null;

  amount_paid?: number | null;

  paid_at?: string | null;

  metadata?: Record<string, unknown>;
}

/**
 * Normalize the Academy program relation returned by Supabase.
 *
 * Depending on generated relation types, Supabase may return one
 * object or an array containing one object.
 */
function normalizeProgramRelation(
  program: AcademyPaymentProgram | AcademyPaymentProgram[] | null | undefined
): AcademyPaymentProgram | null {
  if (Array.isArray(program)) {
    return program[0] ?? null;
  }

  return program ?? null;
}

/**
 * Normalize one raw Supabase registration into a payment record.
 */
function normalizePaymentRecord(
  payment: Record<string, unknown> & {
    program?: AcademyPaymentProgram | AcademyPaymentProgram[] | null;
  }
): AcademyPaymentRecord {
  return {
    id: String(payment.id),

    program_id: String(payment.program_id),

    first_name: String(payment.first_name ?? ""),

    last_name: String(payment.last_name ?? ""),

    email: String(payment.email ?? ""),

    phone: typeof payment.phone === "string" ? payment.phone : null,

    registration_status:
      payment.registration_status as AcademyRegistrationStatus,

    payment_status: payment.payment_status as AcademyPaymentStatus,

    payment_reference:
      typeof payment.payment_reference === "string"
        ? payment.payment_reference
        : null,

    payment_provider:
      typeof payment.payment_provider === "string"
        ? payment.payment_provider
        : null,

    amount_expected:
      payment.amount_expected === null || payment.amount_expected === undefined
        ? null
        : Number(payment.amount_expected),

    amount_paid:
      payment.amount_paid === null || payment.amount_paid === undefined
        ? null
        : Number(payment.amount_paid),

    currency: String(payment.currency ?? "NGN"),

    paid_at: typeof payment.paid_at === "string" ? payment.paid_at : null,

    created_at: String(payment.created_at),

    updated_at: String(payment.updated_at),

    metadata:
      typeof payment.metadata === "object" && payment.metadata !== null
        ? (payment.metadata as Record<string, unknown>)
        : {},

    program: normalizeProgramRelation(payment.program),
  };
}

/**
 * Escape characters that have special meaning in PostgREST search.
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
 * Return the amount that best represents a payment record.
 */
function getEffectivePaymentAmount(
  payment: Pick<AcademyPaymentRecord, "amount_paid" | "amount_expected">
) {
  return Number(payment.amount_paid ?? payment.amount_expected ?? 0);
}

/**
 * Retrieve paginated Academy payment records.
 */
export async function listAcademyPayments({
  page = 1,
  pageSize = 10,
  filters = {},
  sortBy = "created_at",
  sortDirection = "desc",
}: ListAcademyPaymentsOptions = {}): Promise<AcademyPaymentListResponse> {
  // Keep pagination values within a safe range.
  const safePage = Math.max(1, page);

  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const rangeStart = (safePage - 1) * safePageSize;

  const rangeEnd = rangeStart + safePageSize - 1;

  // Start the payment query using Academy registration records.
  let query = supabase.from("academy_registrations").select(
    `
      id,
      program_id,
      first_name,
      last_name,
      email,
      phone,
      registration_status,
      payment_status,
      payment_reference,
      payment_provider,
      amount_expected,
      amount_paid,
      currency,
      paid_at,
      created_at,
      updated_at,
      metadata,
      program:academy_programs (
        id,
        title,
        slug,
        code
      )
      `,
    {
      count: "exact",
    }
  );

  // Filter payments by Academy program.
  if (filters.programId) {
    query = query.eq("program_id", filters.programId);
  }

  // Filter by payment status.
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }

  // Filter by payment provider.
  if (filters.paymentProvider && filters.paymentProvider !== "all") {
    query = query.eq("payment_provider", filters.paymentProvider);
  }

  // Filter records created on or after the selected date.
  if (filters.dateFrom) {
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  }

  // Filter records created on or before the selected date.
  if (filters.dateTo) {
    query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  // Search learner details and payment identifiers.
  if (filters.search?.trim()) {
    const searchValue = escapePostgrestSearch(filters.search.trim());

    query = query.or(
      [
        `first_name.ilike.%${searchValue}%`,
        `last_name.ilike.%${searchValue}%`,
        `email.ilike.%${searchValue}%`,
        `phone.ilike.%${searchValue}%`,
        `payment_reference.ilike.%${searchValue}%`,
        `payment_provider.ilike.%${searchValue}%`,
      ].join(",")
    );
  }

  // Apply sorting and pagination.
  const { data, error, count } = await query
    .order(sortBy, {
      ascending: sortDirection === "asc",
      nullsFirst: false,
    })
    .range(rangeStart, rangeEnd);

  if (error) {
    console.error("Failed to load Academy payments:", error);

    throw error;
  }

  const payments = (data ?? []).map((payment) =>
    normalizePaymentRecord(
      payment as Record<string, unknown> & {
        program?: AcademyPaymentProgram | AcademyPaymentProgram[] | null;
      }
    )
  );

  const total = count ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  return {
    payments,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}

/**
 * Retrieve one Academy payment by registration ID.
 */
export async function getAcademyPaymentById(
  paymentId: string
): Promise<AcademyPaymentRecord> {
  const { data, error } = await supabase
    .from("academy_registrations")
    .select(
      `
      id,
      program_id,
      first_name,
      last_name,
      email,
      phone,
      registration_status,
      payment_status,
      payment_reference,
      payment_provider,
      amount_expected,
      amount_paid,
      currency,
      paid_at,
      created_at,
      updated_at,
      metadata,
      program:academy_programs (
        id,
        title,
        slug,
        code
      )
      `
    )
    .eq("id", paymentId)
    .single();

  if (error) {
    console.error("Failed to load Academy payment:", error);

    throw error;
  }

  return normalizePaymentRecord(
    data as Record<string, unknown> & {
      program?: AcademyPaymentProgram | AcademyPaymentProgram[] | null;
    }
  );
}

/**
 * Update an Academy payment record.
 */
export async function updateAcademyPayment(
  paymentId: string,
  updates: UpdateAcademyPaymentInput
): Promise<AcademyPaymentRecord> {
  const { data, error } = await supabase
    .from("academy_registrations")
    .update(updates)
    .eq("id", paymentId)
    .select(
      `
      id,
      program_id,
      first_name,
      last_name,
      email,
      phone,
      registration_status,
      payment_status,
      payment_reference,
      payment_provider,
      amount_expected,
      amount_paid,
      currency,
      paid_at,
      created_at,
      updated_at,
      metadata,
      program:academy_programs (
        id,
        title,
        slug,
        code
      )
      `
    )
    .single();

  if (error) {
    console.error("Failed to update Academy payment:", error);

    throw error;
  }

  return normalizePaymentRecord(
    data as Record<string, unknown> & {
      program?: AcademyPaymentProgram | AcademyPaymentProgram[] | null;
    }
  );
}

/**
 * Mark an Academy payment as paid.
 *
 * Changing payment_status to paid also activates the database
 * notification trigger that was added earlier.
 */
export async function markAcademyPaymentPaid(payment: AcademyPaymentRecord) {
  return updateAcademyPayment(payment.id, {
    payment_status: "paid",

    registration_status:
      payment.registration_status === "pending"
        ? "confirmed"
        : payment.registration_status,

    amount_paid: payment.amount_paid ?? payment.amount_expected,

    paid_at: payment.paid_at ?? new Date().toISOString(),

    payment_provider: payment.payment_provider ?? "manual",
  });
}

/**
 * Mark an Academy payment as failed.
 */
export async function markAcademyPaymentFailed(paymentId: string) {
  return updateAcademyPayment(paymentId, {
    payment_status: "failed",
  });
}

/**
 * Mark an Academy payment as refunded.
 *
 * This records the administrative status only. A real Paystack refund
 * must still be created through Paystack before this action is used.
 */
export async function markAcademyPaymentRefunded(paymentId: string) {
  return updateAcademyPayment(paymentId, {
    payment_status: "refunded",
  });
}

/**
 * Mark an Academy payment as cancelled.
 */
export async function markAcademyPaymentCancelled(paymentId: string) {
  return updateAcademyPayment(paymentId, {
    payment_status: "cancelled",
  });
}

/**
 * Retrieve unique payment providers used by Academy transactions.
 */
export async function listAcademyPaymentProviders() {
  const { data, error } = await supabase
    .from("academy_registrations")
    .select("payment_provider")
    .not("payment_provider", "is", null);

  if (error) {
    console.error("Failed to load Academy payment providers:", error);

    throw error;
  }

  return Array.from(
    new Set(
      (data ?? [])
        .map((record) => record.payment_provider as string | null)
        .filter((provider): provider is string => Boolean(provider))
    )
  ).sort((firstProvider, secondProvider) =>
    firstProvider.localeCompare(secondProvider)
  );
}

/**
 * Retrieve all Academy programs used by the payments filter.
 */
export async function listAcademyProgramsForPaymentFilters() {
  const { data, error } = await supabase
    .from("academy_programs")
    .select(
      `
      id,
      title,
      slug,
      code,
      status
      `
    )
    .order("title", {
      ascending: true,
    });

  if (error) {
    console.error("Failed to load Academy payment program filters:", error);

    throw error;
  }

  return data ?? [];
}

/**
 * Retrieve payment statistics using the active filters.
 */
export async function getAcademyPaymentStatistics(
  filters: AcademyPaymentFilters = {}
): Promise<AcademyPaymentStatistics> {
  // Retrieve matching payments without pagination.
  const result = await listAcademyPayments({
    page: 1,
    pageSize: 100,
    filters,
    sortBy: "created_at",
    sortDirection: "desc",
  });

  const payments = result.payments;

  const paidPayments = payments.filter(
    (payment) => payment.payment_status === "paid"
  );

  const pendingPayments = payments.filter(
    (payment) =>
      payment.payment_status === "pending" ||
      payment.payment_status === "processing"
  );

  const failedPayments = payments.filter(
    (payment) => payment.payment_status === "failed"
  );

  const refundedPayments = payments.filter(
    (payment) => payment.payment_status === "refunded"
  );

  const cancelledPayments = payments.filter(
    (payment) => payment.payment_status === "cancelled"
  );

  // Sum confirmed revenue from paid transactions.
  const totalRevenue = paidPayments.reduce(
    (total, payment) => total + Number(payment.amount_paid ?? 0),
    0
  );

  // Sum the expected value of pending transactions.
  const pendingValue = pendingPayments.reduce(
    (total, payment) => total + Number(payment.amount_expected ?? 0),
    0
  );

  // Sum the value attached to refunded transactions.
  const refundedValue = refundedPayments.reduce(
    (total, payment) => total + getEffectivePaymentAmount(payment),
    0
  );

  const currency =
    payments.find((payment) => payment.currency)?.currency ?? "NGN";

  return {
    totalTransactions: result.total,
    paidPayments: paidPayments.length,
    pendingPayments: pendingPayments.length,
    failedPayments: failedPayments.length,
    refundedPayments: refundedPayments.length,
    cancelledPayments: cancelledPayments.length,
    totalRevenue,
    pendingValue,
    refundedValue,
    currency,
  };
}

/**
 * Retrieve payment records for CSV export.
 */
export async function exportAcademyPayments(
  filters: AcademyPaymentFilters = {}
): Promise<AcademyPaymentRecord[]> {
  const result = await listAcademyPayments({
    page: 1,
    pageSize: 100,
    filters,
    sortBy: "created_at",
    sortDirection: "desc",
  });

  return result.payments;
}
