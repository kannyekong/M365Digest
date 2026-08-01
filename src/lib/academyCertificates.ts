import { supabase } from "./superbase";
import type {
  AcademyCertificate,
  AcademyCertificateStatus,
} from "../types/academy";

/**
 * Minimal Academy program information attached to a certificate.
 */
export interface AcademyCertificateProgram {
  id: string;

  title: string;

  slug: string;

  code: string | null;
}

/**
 * Minimal registration information attached to a certificate.
 */
export interface AcademyCertificateRegistration {
  id: string;

  first_name: string;

  last_name: string;

  email: string;

  registration_status: string;

  certificate_status: AcademyCertificateStatus;
}

/**
 * Minimal certificate template information attached to a certificate.
 */
export interface AcademyCertificateTemplateSummary {
  id: string;

  name: string;

  template_key: string;

  orientation: "landscape" | "portrait";

  is_active: boolean;
}

/**
 * Certificate record used by the Academy admin interface.
 *
 * The original relation properties are removed so this interface can
 * use the smaller joined records returned by the admin queries.
 */
export interface AcademyCertificateRecord extends Omit<
  AcademyCertificate,
  "program" | "registration" | "template"
> {
  program: AcademyCertificateProgram | null;

  registration: AcademyCertificateRegistration | null;

  template: AcademyCertificateTemplateSummary | null;
}

/**
 * Registration that is eligible for certificate generation.
 */
export interface AcademyCertificateEligibleRegistration {
  id: string;

  program_id: string;

  first_name: string;

  last_name: string;

  email: string;

  completed_at: string | null;

  certificate_status: AcademyCertificateStatus;

  program: AcademyCertificateProgram | null;
}

/**
 * Filters supported by the Academy certificate management screen.
 */
export interface AcademyCertificateFilters {
  search?: string;

  programId?: string;

  status?: AcademyCertificateStatus | "all";

  templateId?: string;

  dateFrom?: string;

  dateTo?: string;
}

/**
 * Sorting fields supported by the certificate table.
 */
export type AcademyCertificateSortField =
  | "created_at"
  | "generated_at"
  | "issue_date"
  | "recipient_name"
  | "program_title"
  | "certificate_number"
  | "status";

/**
 * Options accepted by the paginated certificate query.
 */
export interface ListAcademyCertificatesOptions {
  page?: number;

  pageSize?: number;

  filters?: AcademyCertificateFilters;

  sortBy?: AcademyCertificateSortField;

  sortDirection?: "asc" | "desc";
}

/**
 * Paginated certificate query response.
 */
export interface AcademyCertificateListResponse {
  certificates: AcademyCertificateRecord[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
}

/**
 * Academy certificate statistics displayed in the admin interface.
 */
export interface AcademyCertificateStatistics {
  totalCertificates: number;

  generatedCertificates: number;

  revokedCertificates: number;

  eligibleRegistrations: number;

  certificatesThisMonth: number;
}

/**
 * Values used when creating an Academy certificate.
 */
export interface CreateAcademyCertificateInput {
  registration_id: string;

  program_id: string;

  template_id?: string | null;

  certificate_number: string;

  verification_code: string;

  recipient_name: string;

  program_title: string;

  issue_date: string;

  completion_date?: string | null;

  file_url?: string | null;

  generated_by?: string | null;

  metadata?: Record<string, unknown>;
}

/**
 * Values administrators can update on an Academy certificate.
 */
export interface UpdateAcademyCertificateInput {
  template_id?: string | null;

  certificate_number?: string;

  verification_code?: string;

  recipient_name?: string;

  program_title?: string;

  issue_date?: string;

  completion_date?: string | null;

  file_url?: string | null;

  status?: AcademyCertificateStatus;

  revoked_at?: string | null;

  revocation_reason?: string | null;

  metadata?: Record<string, unknown>;
}

/**
 * Normalize a Supabase one-to-one relation.
 *
 * Supabase may type joined relations as either one object or an array
 * containing one object.
 */
function normalizeRelation<Relation>(
  relation: Relation | Relation[] | null | undefined
): Relation | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

/**
 * Escape characters that have special meaning inside PostgREST filters.
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
 * Normalize one raw Supabase certificate result.
 */
function normalizeCertificateRecord(
  certificate: Record<string, unknown> & {
    program?: AcademyCertificateProgram | AcademyCertificateProgram[] | null;

    registration?:
      AcademyCertificateRegistration | AcademyCertificateRegistration[] | null;

    template?:
      | AcademyCertificateTemplateSummary
      | AcademyCertificateTemplateSummary[]
      | null;
  }
): AcademyCertificateRecord {
  return {
    id: String(certificate.id),

    registration_id: String(certificate.registration_id),

    program_id: String(certificate.program_id),

    template_id:
      typeof certificate.template_id === "string"
        ? certificate.template_id
        : null,

    certificate_number: String(certificate.certificate_number ?? ""),

    verification_code: String(certificate.verification_code ?? ""),

    recipient_name: String(certificate.recipient_name ?? ""),

    program_title: String(certificate.program_title ?? ""),

    issue_date: String(certificate.issue_date ?? ""),

    completion_date:
      typeof certificate.completion_date === "string"
        ? certificate.completion_date
        : null,

    file_url:
      typeof certificate.file_url === "string" ? certificate.file_url : null,

    status: certificate.status as AcademyCertificateStatus,

    generated_by:
      typeof certificate.generated_by === "string"
        ? certificate.generated_by
        : null,

    generated_at: String(certificate.generated_at ?? ""),

    revoked_at:
      typeof certificate.revoked_at === "string"
        ? certificate.revoked_at
        : null,

    revocation_reason:
      typeof certificate.revocation_reason === "string"
        ? certificate.revocation_reason
        : null,

    metadata:
      typeof certificate.metadata === "object" && certificate.metadata !== null
        ? (certificate.metadata as Record<string, unknown>)
        : {},

    created_at: String(certificate.created_at),

    updated_at: String(certificate.updated_at),

    program: normalizeRelation(certificate.program),

    registration: normalizeRelation(certificate.registration),

    template: normalizeRelation(certificate.template),
  };
}
/**
 * Retrieve paginated Academy certificates.
 */
export async function listAcademyCertificates({
  page = 1,
  pageSize = 10,
  filters = {},
  sortBy = "generated_at",
  sortDirection = "desc",
}: ListAcademyCertificatesOptions = {}): Promise<AcademyCertificateListResponse> {
  // Keep pagination values within a safe range.
  const safePage = Math.max(1, page);

  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const rangeStart = (safePage - 1) * safePageSize;

  const rangeEnd = rangeStart + safePageSize - 1;

  // Start the certificate query with related program,
  // registration and template records.
  let query = supabase.from("academy_certificates").select(
    `
      id,
      registration_id,
      program_id,
      template_id,
      certificate_number,
      verification_code,
      recipient_name,
      program_title,
      issue_date,
      completion_date,
      file_url,
      status,
      generated_by,
      generated_at,
      revoked_at,
      revocation_reason,
      metadata,
      created_at,
      updated_at,
      program:academy_programs (
        id,
        title,
        slug,
        code
      ),
      registration:academy_registrations (
        id,
        first_name,
        last_name,
        email,
        registration_status,
        certificate_status
      ),
      template:academy_certificate_templates (
        id,
        name,
        template_key,
        orientation,
        is_active
      )
      `,
    {
      count: "exact",
    }
  );

  // Filter certificates by Academy program.
  if (filters.programId) {
    query = query.eq("program_id", filters.programId);
  }

  // Filter certificates by lifecycle status.
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  // Filter certificates by template.
  if (filters.templateId) {
    query = query.eq("template_id", filters.templateId);
  }

  // Filter certificates issued on or after the selected date.
  if (filters.dateFrom) {
    query = query.gte("issue_date", filters.dateFrom);
  }

  // Filter certificates issued on or before the selected date.
  if (filters.dateTo) {
    query = query.lte("issue_date", filters.dateTo);
  }

  // Search recipient, program, certificate number and verification code.
  if (filters.search?.trim()) {
    const searchValue = escapePostgrestSearch(filters.search.trim());

    query = query.or(
      [
        `recipient_name.ilike.%${searchValue}%`,
        `program_title.ilike.%${searchValue}%`,
        `certificate_number.ilike.%${searchValue}%`,
        `verification_code.ilike.%${searchValue}%`,
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
    console.error("Failed to load Academy certificates:", error);

    throw error;
  }

  // Normalize Supabase relations into stable single objects.
  const certificates = (data ?? []).map((certificate) =>
    normalizeCertificateRecord(
      certificate as Record<string, unknown> & {
        program?:
          AcademyCertificateProgram | AcademyCertificateProgram[] | null;

        registration?:
          | AcademyCertificateRegistration
          | AcademyCertificateRegistration[]
          | null;

        template?:
          | AcademyCertificateTemplateSummary
          | AcademyCertificateTemplateSummary[]
          | null;
      }
    )
  );

  const total = count ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  return {
    certificates,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}

/**
 * Retrieve one Academy certificate by its ID.
 */
export async function getAcademyCertificateById(
  certificateId: string
): Promise<AcademyCertificateRecord> {
  const { data, error } = await supabase
    .from("academy_certificates")
    .select(
      `
      id,
      registration_id,
      program_id,
      template_id,
      certificate_number,
      verification_code,
      recipient_name,
      program_title,
      issue_date,
      completion_date,
      file_url,
      status,
      generated_by,
      generated_at,
      revoked_at,
      revocation_reason,
      metadata,
      created_at,
      updated_at,
      program:academy_programs (
        id,
        title,
        slug,
        code
      ),
      registration:academy_registrations (
        id,
        first_name,
        last_name,
        email,
        registration_status,
        certificate_status
      ),
      template:academy_certificate_templates (
        id,
        name,
        template_key,
        orientation,
        is_active
      )
      `
    )
    .eq("id", certificateId)
    .single();

  if (error) {
    console.error("Failed to load Academy certificate:", error);

    throw error;
  }

  return normalizeCertificateRecord(
    data as Record<string, unknown> & {
      program?: AcademyCertificateProgram | AcademyCertificateProgram[] | null;

      registration?:
        | AcademyCertificateRegistration
        | AcademyCertificateRegistration[]
        | null;

      template?:
        | AcademyCertificateTemplateSummary
        | AcademyCertificateTemplateSummary[]
        | null;
    }
  );
}

/**
 * Retrieve one certificate using its public verification code.
 */
export async function getAcademyCertificateByVerificationCode(
  verificationCode: string
): Promise<AcademyCertificateRecord | null> {
  const normalizedVerificationCode = verificationCode.trim();

  // Return no result for an empty verification code.
  if (!normalizedVerificationCode) {
    return null;
  }

  const { data, error } = await supabase
    .from("academy_certificates")
    .select(
      `
      id,
      registration_id,
      program_id,
      template_id,
      certificate_number,
      verification_code,
      recipient_name,
      program_title,
      issue_date,
      completion_date,
      file_url,
      status,
      generated_by,
      generated_at,
      revoked_at,
      revocation_reason,
      metadata,
      created_at,
      updated_at,
      program:academy_programs (
        id,
        title,
        slug,
        code
      ),
      registration:academy_registrations (
        id,
        first_name,
        last_name,
        email,
        registration_status,
        certificate_status
      ),
      template:academy_certificate_templates (
        id,
        name,
        template_key,
        orientation,
        is_active
      )
      `
    )
    .eq("verification_code", normalizedVerificationCode)
    .maybeSingle();

  if (error) {
    console.error("Failed to verify Academy certificate:", error);

    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizeCertificateRecord(
    data as Record<string, unknown> & {
      program?: AcademyCertificateProgram | AcademyCertificateProgram[] | null;

      registration?:
        | AcademyCertificateRegistration
        | AcademyCertificateRegistration[]
        | null;

      template?:
        | AcademyCertificateTemplateSummary
        | AcademyCertificateTemplateSummary[]
        | null;
    }
  );
}
/**
 * Retrieve learners who are eligible for certificate generation.
 */
export async function listCertificateEligibleRegistrations(): Promise<
  AcademyCertificateEligibleRegistration[]
> {
  // Load completed registrations whose certificate status is eligible.
  const { data, error } = await supabase
    .from("academy_registrations")
    .select(
      `
      id,
      program_id,
      first_name,
      last_name,
      email,
      completed_at,
      certificate_status,
      program:academy_programs (
        id,
        title,
        slug,
        code
      )
      `
    )
    .eq("registration_status", "completed")
    .eq("certificate_status", "eligible")
    .order("completed_at", {
      ascending: false,
      nullsFirst: false,
    });

  // Stop when the eligible registration query fails.
  if (error) {
    console.error("Failed to load certificate-eligible registrations:", error);

    throw error;
  }

  // Normalize the related program into one stable object.
  return (data ?? []).map((registration) => ({
    id: registration.id,

    program_id: registration.program_id,

    first_name: registration.first_name,

    last_name: registration.last_name,

    email: registration.email,

    completed_at: registration.completed_at,

    certificate_status: registration.certificate_status,

    program: normalizeRelation(registration.program),
  }));
}

/**
 * Create an Academy certificate.
 */
export async function createAcademyCertificate(
  values: CreateAcademyCertificateInput
): Promise<AcademyCertificateRecord> {
  // Create the certificate and return its related records.
  const { data, error } = await supabase
    .from("academy_certificates")
    .insert({
      ...values,

      status: "generated",

      generated_at: new Date().toISOString(),
    })
    .select(
      `
      id,
      registration_id,
      program_id,
      template_id,
      certificate_number,
      verification_code,
      recipient_name,
      program_title,
      issue_date,
      completion_date,
      file_url,
      status,
      generated_by,
      generated_at,
      revoked_at,
      revocation_reason,
      metadata,
      created_at,
      updated_at,
      program:academy_programs (
        id,
        title,
        slug,
        code
      ),
      registration:academy_registrations (
        id,
        first_name,
        last_name,
        email,
        registration_status,
        certificate_status
      ),
      template:academy_certificate_templates (
        id,
        name,
        template_key,
        orientation,
        is_active
      )
      `
    )
    .single();

  // Stop when certificate creation fails.
  if (error) {
    console.error("Failed to create Academy certificate:", error);

    throw error;
  }

  // Mark the registration certificate status as generated.
  const { error: registrationError } = await supabase
    .from("academy_registrations")
    .update({
      certificate_status: "generated",
    })
    .eq("id", values.registration_id);

  // Log the synchronization error without discarding the certificate.
  if (registrationError) {
    console.error(
      "Certificate created, but registration status update failed:",
      registrationError
    );
  }

  // Return the certificate using the stable admin shape.
  return normalizeCertificateRecord(
    data as Record<string, unknown> & {
      program?: AcademyCertificateProgram | AcademyCertificateProgram[] | null;

      registration?:
        | AcademyCertificateRegistration
        | AcademyCertificateRegistration[]
        | null;

      template?:
        | AcademyCertificateTemplateSummary
        | AcademyCertificateTemplateSummary[]
        | null;
    }
  );
}

/**
 * Update an existing Academy certificate.
 */
export async function updateAcademyCertificate(
  certificateId: string,
  updates: UpdateAcademyCertificateInput
): Promise<AcademyCertificateRecord> {
  // Update the certificate and return its related records.
  const { data, error } = await supabase
    .from("academy_certificates")
    .update(updates)
    .eq("id", certificateId)
    .select(
      `
      id,
      registration_id,
      program_id,
      template_id,
      certificate_number,
      verification_code,
      recipient_name,
      program_title,
      issue_date,
      completion_date,
      file_url,
      status,
      generated_by,
      generated_at,
      revoked_at,
      revocation_reason,
      metadata,
      created_at,
      updated_at,
      program:academy_programs (
        id,
        title,
        slug,
        code
      ),
      registration:academy_registrations (
        id,
        first_name,
        last_name,
        email,
        registration_status,
        certificate_status
      ),
      template:academy_certificate_templates (
        id,
        name,
        template_key,
        orientation,
        is_active
      )
      `
    )
    .single();

  // Stop when the certificate update fails.
  if (error) {
    console.error("Failed to update Academy certificate:", error);

    throw error;
  }

  // Return the certificate using the normalized admin shape.
  return normalizeCertificateRecord(
    data as Record<string, unknown> & {
      program?: AcademyCertificateProgram | AcademyCertificateProgram[] | null;

      registration?:
        | AcademyCertificateRegistration
        | AcademyCertificateRegistration[]
        | null;

      template?:
        | AcademyCertificateTemplateSummary
        | AcademyCertificateTemplateSummary[]
        | null;
    }
  );
}
/**
 * Revoke an Academy certificate and synchronize the registration status.
 */
export async function revokeAcademyCertificate(
  certificate: AcademyCertificateRecord,
  reason: string
): Promise<AcademyCertificateRecord> {
  // Require a clear reason before revoking the certificate.
  const normalizedReason = reason.trim();

  if (!normalizedReason) {
    throw new Error("A revocation reason is required.");
  }

  // Update the certificate record first.
  const updatedCertificate = await updateAcademyCertificate(certificate.id, {
    status: "revoked",

    revoked_at: new Date().toISOString(),

    revocation_reason: normalizedReason,
  });

  // Keep the registration certificate status synchronized.
  const { error } = await supabase
    .from("academy_registrations")
    .update({
      certificate_status: "revoked",
    })
    .eq("id", certificate.registration_id);

  // Log synchronization issues without discarding the successful revocation.
  if (error) {
    console.error(
      "Certificate revoked, but registration status update failed:",
      error
    );
  }

  return updatedCertificate;
}

/**
 * Restore a previously revoked Academy certificate.
 */
export async function restoreAcademyCertificate(
  certificate: AcademyCertificateRecord
): Promise<AcademyCertificateRecord> {
  // Return the certificate to generated status.
  const updatedCertificate = await updateAcademyCertificate(certificate.id, {
    status: "generated",

    revoked_at: null,

    revocation_reason: null,
  });

  // Return the related registration certificate status to generated.
  const { error } = await supabase
    .from("academy_registrations")
    .update({
      certificate_status: "generated",
    })
    .eq("id", certificate.registration_id);

  // Log synchronization issues without discarding the restored certificate.
  if (error) {
    console.error(
      "Certificate restored, but registration status update failed:",
      error
    );
  }

  return updatedCertificate;
}

/**
 * Delete an Academy certificate created for testing or in error.
 *
 * Production certificates should normally be revoked instead of deleted.
 */
export async function deleteAcademyCertificate(
  certificate: AcademyCertificateRecord
) {
  // Delete the certificate record.
  const { error } = await supabase
    .from("academy_certificates")
    .delete()
    .eq("id", certificate.id);

  // Stop when the certificate deletion fails.
  if (error) {
    console.error("Failed to delete Academy certificate:", error);

    throw error;
  }

  // Return the registration to eligible status so another certificate can be generated.
  const { error: registrationError } = await supabase
    .from("academy_registrations")
    .update({
      certificate_status: "eligible",
    })
    .eq("id", certificate.registration_id);

  // Log synchronization issues after a successful certificate deletion.
  if (registrationError) {
    console.error(
      "Certificate deleted, but registration status update failed:",
      registrationError
    );
  }
}
/**
 * Retrieve Academy programs for certificate filtering.
 */
export async function listAcademyProgramsForCertificateFilters() {
  // Load every Academy program in alphabetical order.
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

  // Stop when program filters cannot be loaded.
  if (error) {
    console.error("Failed to load certificate program filters:", error);

    throw error;
  }

  return data ?? [];
}

/**
 * Retrieve active Academy certificate templates.
 */
export async function listActiveAcademyCertificateTemplates() {
  // Load active templates with the default template first.
  const { data, error } = await supabase
    .from("academy_certificate_templates")
    .select(
      `
      id,
      name,
      template_key,
      orientation,
      is_default,
      is_active
      `
    )
    .eq("is_active", true)
    .order("is_default", {
      ascending: false,
    })
    .order("name", {
      ascending: true,
    });

  // Stop when certificate templates cannot be loaded.
  if (error) {
    console.error("Failed to load Academy certificate templates:", error);

    throw error;
  }

  return data ?? [];
}

/**
 * Retrieve Academy certificate statistics.
 */
export async function getAcademyCertificateStatistics(): Promise<AcademyCertificateStatistics> {
  // Calculate the beginning of the current month.
  const currentDate = new Date();

  const monthStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).toISOString();

  // Run all certificate statistic queries in parallel.
  const [
    totalResult,
    generatedResult,
    revokedResult,
    eligibleResult,
    monthlyResult,
  ] = await Promise.all([
    supabase.from("academy_certificates").select("*", {
      count: "exact",
      head: true,
    }),

    supabase
      .from("academy_certificates")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "generated"),

    supabase
      .from("academy_certificates")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "revoked"),

    supabase
      .from("academy_registrations")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("registration_status", "completed")
      .eq("certificate_status", "eligible"),

    supabase
      .from("academy_certificates")
      .select("*", {
        count: "exact",
        head: true,
      })
      .gte("generated_at", monthStart),
  ]);

  // Detect the first query error, if any.
  const queryError =
    totalResult.error ||
    generatedResult.error ||
    revokedResult.error ||
    eligibleResult.error ||
    monthlyResult.error;

  // Stop when one of the statistic queries fails.
  if (queryError) {
    console.error("Failed to load Academy certificate statistics:", queryError);

    throw queryError;
  }

  return {
    totalCertificates: totalResult.count ?? 0,

    generatedCertificates: generatedResult.count ?? 0,

    revokedCertificates: revokedResult.count ?? 0,

    eligibleRegistrations: eligibleResult.count ?? 0,

    certificatesThisMonth: monthlyResult.count ?? 0,
  };
}

/**
 * Retrieve certificate records for CSV export.
 */
export async function exportAcademyCertificates(
  filters: AcademyCertificateFilters = {}
): Promise<AcademyCertificateRecord[]> {
  // Reuse the certificate list query with a larger page size.
  const result = await listAcademyCertificates({
    page: 1,

    pageSize: 100,

    filters,

    sortBy: "generated_at",

    sortDirection: "desc",
  });

  return result.certificates;
}
