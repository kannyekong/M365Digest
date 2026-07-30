import { supabase } from "./superbase";
import type {
  AcademyPaymentStatus,
  AcademyRegistration,
  AcademyRegistrationStatus,
} from "../types/academy";

/**
 * A simplified Academy program attached to a registration record.
 */
export interface AcademyRegistrationProgram {
  id: string;
  title: string;
  slug: string;
  code: string | null;
}

/**
 * Registration record used by the Academy admin interface.
 *
 * The original AcademyRegistration program relation is removed so this
 * interface can use the smaller program shape returned by this query.
 */
export interface AcademyRegistrationRecord extends Omit<
  AcademyRegistration,
  "program"
> {
  program: AcademyRegistrationProgram | null;
}

/**
 * Filters supported by the Academy registrations admin page.
 */
export interface AcademyRegistrationFilters {
  search?: string;
  programId?: string;
  registrationStatus?: AcademyRegistrationStatus | "all";
  paymentStatus?: AcademyPaymentStatus | "all";
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Options used when retrieving paginated registration records.
 */
export interface ListAcademyRegistrationsOptions {
  page?: number;
  pageSize?: number;
  filters?: AcademyRegistrationFilters;
  sortBy?:
    | "created_at"
    | "first_name"
    | "last_name"
    | "amount_paid"
    | "payment_status"
    | "registration_status";
  sortDirection?: "asc" | "desc";
}

/**
 * Response returned by the paginated registration query.
 */
export interface AcademyRegistrationListResponse {
  registrations: AcademyRegistrationRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Values that an administrator can update on a registration.
 */
export interface UpdateAcademyRegistrationInput {
  registration_status?: AcademyRegistrationStatus;
  payment_status?: AcademyPaymentStatus;
  certificate_status?: AcademyRegistration["certificate_status"];
  amount_paid?: number | null;
  payment_reference?: string | null;
  payment_provider?: string | null;
  paid_at?: string | null;
  completed_at?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Normalize a joined Supabase program relation.
 *
 * Depending on generated Supabase types, the relation may be returned
 * as one object or as an array containing one object.
 */
function normalizeProgramRelation(
  program:
    AcademyRegistrationProgram | AcademyRegistrationProgram[] | null | undefined
): AcademyRegistrationProgram | null {
  if (Array.isArray(program)) {
    return program[0] ?? null;
  }

  return program ?? null;
}

/**
 * Escape characters that have special meaning inside a PostgREST filter.
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
 * Retrieve paginated Academy registrations for the admin interface.
 */
export async function listAcademyRegistrations({
  page = 1,
  pageSize = 10,
  filters = {},
  sortBy = "created_at",
  sortDirection = "desc",
}: ListAcademyRegistrationsOptions = {}): Promise<AcademyRegistrationListResponse> {
  // Keep pagination values within a safe range.
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const rangeStart = (safePage - 1) * safePageSize;
  const rangeEnd = rangeStart + safePageSize - 1;

  // Start the registration query with the related program.
  let query = supabase.from("academy_registrations").select(
    `
      *,
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

  // Filter registrations by the selected program.
  if (filters.programId) {
    query = query.eq("program_id", filters.programId);
  }

  // Filter registrations by learner registration status.
  if (filters.registrationStatus && filters.registrationStatus !== "all") {
    query = query.eq("registration_status", filters.registrationStatus);
  }

  // Filter registrations by payment status.
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }

  // Filter registrations created on or after the selected date.
  if (filters.dateFrom) {
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  }

  // Filter registrations created on or before the selected date.
  if (filters.dateTo) {
    query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  // Search learner details and payment references.
  if (filters.search?.trim()) {
    const searchValue = escapePostgrestSearch(filters.search.trim());

    query = query.or(
      [
        `first_name.ilike.%${searchValue}%`,
        `last_name.ilike.%${searchValue}%`,
        `email.ilike.%${searchValue}%`,
        `phone.ilike.%${searchValue}%`,
        `payment_reference.ilike.%${searchValue}%`,
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
    console.error("Failed to load Academy registrations:", error);

    throw error;
  }

  // Normalize the joined program relation for every registration.
  const registrations = (data ?? []).map((registration) => ({
    ...registration,
    program: normalizeProgramRelation(registration.program),
  })) as AcademyRegistrationRecord[];

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  return {
    registrations,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}

/**
 * Retrieve one Academy registration by its ID.
 */
export async function getAcademyRegistrationById(
  registrationId: string
): Promise<AcademyRegistrationRecord> {
  const { data, error } = await supabase
    .from("academy_registrations")
    .select(
      `
      *,
      program:academy_programs (
        id,
        title,
        slug,
        code
      )
      `
    )
    .eq("id", registrationId)
    .single();

  if (error) {
    console.error("Failed to load Academy registration:", error);

    throw error;
  }

  return {
    ...data,
    program: normalizeProgramRelation(data.program),
  } as AcademyRegistrationRecord;
}

/**
 * Update an Academy registration.
 */
export async function updateAcademyRegistration(
  registrationId: string,
  updates: UpdateAcademyRegistrationInput
): Promise<AcademyRegistrationRecord> {
  const { data, error } = await supabase
    .from("academy_registrations")
    .update(updates)
    .eq("id", registrationId)
    .select(
      `
      *,
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
    console.error("Failed to update Academy registration:", error);

    throw error;
  }

  return {
    ...data,
    program: normalizeProgramRelation(data.program),
  } as AcademyRegistrationRecord;
}

/**
 * Mark a registration as confirmed.
 */
export async function confirmAcademyRegistration(registrationId: string) {
  return updateAcademyRegistration(registrationId, {
    registration_status: "confirmed",
  });
}

/**
 * Mark a confirmed learner as enrolled.
 */
export async function enrollAcademyRegistration(registrationId: string) {
  return updateAcademyRegistration(registrationId, {
    registration_status: "enrolled",
  });
}

/**
 * Mark a learner as having completed the program.
 */
export async function completeAcademyRegistration(registrationId: string) {
  return updateAcademyRegistration(registrationId, {
    registration_status: "completed",
    certificate_status: "eligible",
    completed_at: new Date().toISOString(),
  });
}

/**
 * Cancel an Academy registration.
 */
export async function cancelAcademyRegistration(registrationId: string) {
  return updateAcademyRegistration(registrationId, {
    registration_status: "cancelled",
  });
}

/**
 * Delete one Academy registration.
 *
 * This should generally be reserved for test records or registrations
 * created in error. Paid registrations should normally be retained.
 */
export async function deleteAcademyRegistration(registrationId: string) {
  const { error } = await supabase
    .from("academy_registrations")
    .delete()
    .eq("id", registrationId);

  if (error) {
    console.error("Failed to delete Academy registration:", error);

    throw error;
  }
}

/**
 * Retrieve all Academy programs for registration filtering.
 */
export async function listAcademyProgramsForRegistrationFilters() {
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
    console.error("Failed to load Academy program filters:", error);

    throw error;
  }

  return data ?? [];
}

/**
 * Retrieve registration records for CSV export.
 */
export async function exportAcademyRegistrations(
  filters: AcademyRegistrationFilters = {}
): Promise<AcademyRegistrationRecord[]> {
  // Use a large page size because this request is intended for exports.
  const result = await listAcademyRegistrations({
    page: 1,
    pageSize: 100,
    filters,
    sortBy: "created_at",
    sortDirection: "desc",
  });

  return result.registrations;
}
