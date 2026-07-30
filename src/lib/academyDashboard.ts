import { supabase } from "./superbase";
import type { AcademyProgram, AcademyRegistration } from "../types/academy";

/**
 * A recent successful Academy payment shown on the dashboard.
 */
export interface AcademyRecentPayment {
  id: string;
  program_id: string;
  first_name: string;
  last_name: string;
  email: string;
  amount_paid: number | null;
  amount_expected: number | null;
  currency: string;
  payment_reference: string | null;
  payment_provider: string | null;
  paid_at: string | null;
  created_at: string;
  program: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

/**
 * A recent Academy registration shown on the dashboard.
 */
export interface AcademyRecentRegistration {
  id: string;
  program_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  registration_status: AcademyRegistration["registration_status"];
  payment_status: AcademyRegistration["payment_status"];
  created_at: string;
  program: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

/**
 * An upcoming Academy program shown on the dashboard.
 */
export interface AcademyUpcomingProgram {
  id: string;
  title: string;
  slug: string;
  status: AcademyProgram["status"];
  start_date: string | null;
  registration_deadline: string | null;
  registration_open: boolean;
  maximum_students: number | null;
  thumbnail_image_url: string | null;
  hero_image_url: string | null;
}

/**
 * A problem detected in an Academy program configuration.
 */
export interface AcademyProgramAttentionIssue {
  code:
    | "registration_closed"
    | "missing_instructor"
    | "missing_curriculum"
    | "missing_image"
    | "missing_start_date"
    | "missing_certificate_template";

  label: string;
}

/**
 * A program that requires administrator attention.
 */
export interface AcademyProgramRequiringAttention {
  id: string;
  title: string;
  slug: string;
  status: AcademyProgram["status"];
  issues: AcademyProgramAttentionIssue[];
}

/**
 * All statistics and activity required by the Academy dashboard.
 */
export interface AcademyDashboardData {
  totalPrograms: number;
  publishedPrograms: number;
  openPrograms: number;
  totalRegistrations: number;
  confirmedRegistrations: number;
  pendingPayments: number;
  failedPayments: number;
  totalRevenue: number;
  revenueCurrency: string;
  issuedCertificates: number;
  activeInstructors: number;
  recentPayments: AcademyRecentPayment[];
  recentRegistrations: AcademyRecentRegistration[];
  upcomingPrograms: AcademyUpcomingProgram[];
  programsRequiringAttention: AcademyProgramRequiringAttention[];
}

/**
 * Minimal program record used while detecting configuration issues.
 */
interface DashboardProgramRecord {
  id: string;
  title: string;
  slug: string;
  status: AcademyProgram["status"];
  registration_open: boolean;
  start_date: string | null;
  hero_image_url: string | null;
  thumbnail_image_url: string | null;
  banner_image_url: string | null;
  certificate_enabled: boolean;
  certificate_template_id: string | null;
}

/**
 * Count records returned by a Supabase head query.
 */
interface CountQueryResult {
  count: number | null;
  error: Error | null;
}

/**
 * Throw a consistent error when a Supabase dashboard query fails.
 */
function throwDashboardQueryError(queryName: string, error: unknown) {
  console.error(`Academy dashboard query failed: ${queryName}`, error);

  throw new Error(`The Academy dashboard could not load ${queryName}.`);
}

/**
 * Convert a nullable count into a safe number.
 */
function normalizeCount(count: number | null) {
  return count ?? 0;
}

/**
 * Count every record in a supplied Supabase table.
 */
async function countTableRecords(tableName: string): Promise<number> {
  const { count, error } = (await supabase.from(tableName).select("*", {
    count: "exact",
    head: true,
  })) as CountQueryResult;

  if (error) {
    throwDashboardQueryError(`${tableName} count`, error);
  }

  return normalizeCount(count);
}

/**
 * Count records that match one equality filter.
 */
async function countRecordsByField(
  tableName: string,
  field: string,
  value: string | boolean
): Promise<number> {
  const { count, error } = (await supabase
    .from(tableName)
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq(field, value)) as CountQueryResult;

  if (error) {
    throwDashboardQueryError(`${tableName}.${field} count`, error);
  }

  return normalizeCount(count);
}

/**
 * Count payment records that are pending or still processing.
 */
async function countPendingPayments() {
  const { count, error } = await supabase
    .from("academy_registrations")
    .select("*", {
      count: "exact",
      head: true,
    })
    .in("payment_status", ["pending", "processing"]);

  if (error) {
    throwDashboardQueryError("pending payments", error);
  }

  return normalizeCount(count);
}

/**
 * Calculate revenue from registrations whose payments are confirmed.
 */
async function getAcademyRevenue() {
  const { data, error } = await supabase
    .from("academy_registrations")
    .select(
      `
      amount_paid,
      currency
      `
    )
    .eq("payment_status", "paid");

  if (error) {
    throwDashboardQueryError("Academy revenue", error);
  }

  const paidRegistrations = data ?? [];

  // Sum only valid numeric payment values.
  const totalRevenue = paidRegistrations.reduce((total, registration) => {
    const amount = Number(registration.amount_paid ?? 0);

    return Number.isFinite(amount) ? total + amount : total;
  }, 0);

  // Use the first paid registration's currency as the dashboard currency.
  //
  // This assumes Academy programs currently use one primary currency.
  const revenueCurrency =
    paidRegistrations.find((registration) => registration.currency)?.currency ??
    "NGN";

  return {
    totalRevenue,
    revenueCurrency,
  };
}

/**
 * Retrieve the most recent successful Academy payments.
 */
/**
 * Retrieve the most recent successful Academy payments.
 */
async function getRecentPayments(limit = 6): Promise<AcademyRecentPayment[]> {
  // Retrieve paid registrations with their related program.
  const { data, error } = await supabase
    .from("academy_registrations")
    .select(
      `
      id,
      program_id,
      first_name,
      last_name,
      email,
      amount_paid,
      amount_expected,
      currency,
      payment_reference,
      payment_provider,
      paid_at,
      created_at,
      program:academy_programs (
        id,
        title,
        slug
      )
      `
    )
    .eq("payment_status", "paid")
    .order("paid_at", {
      ascending: false,
      nullsFirst: false,
    })
    .limit(limit);

  // Stop when Supabase cannot load recent payments.
  if (error) {
    throwDashboardQueryError("recent payments", error);
  }

  // Normalize Supabase's relation result into one program object.
  return (data ?? []).map((payment) => {
    const relatedProgram = Array.isArray(payment.program)
      ? (payment.program[0] ?? null)
      : (payment.program ?? null);

    return {
      id: payment.id,
      program_id: payment.program_id,
      first_name: payment.first_name,
      last_name: payment.last_name,
      email: payment.email,
      amount_paid: payment.amount_paid,
      amount_expected: payment.amount_expected,
      currency: payment.currency,
      payment_reference: payment.payment_reference,
      payment_provider: payment.payment_provider,
      paid_at: payment.paid_at,
      created_at: payment.created_at,
      program: relatedProgram
        ? {
            id: relatedProgram.id,
            title: relatedProgram.title,
            slug: relatedProgram.slug,
          }
        : null,
    };
  });
}

/**
 * Retrieve the most recent Academy registrations.
 */
/**
 * Retrieve the most recent Academy registrations.
 */
async function getRecentRegistrations(
  limit = 6
): Promise<AcademyRecentRegistration[]> {
  // Retrieve recent registrations with their related program.
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
      created_at,
      program:academy_programs (
        id,
        title,
        slug
      )
      `
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  // Stop when Supabase cannot load the registrations.
  if (error) {
    throwDashboardQueryError("recent registrations", error);
  }

  // Normalize Supabase's relation result into one program object.
  return (data ?? []).map((registration) => {
    const relatedProgram = Array.isArray(registration.program)
      ? (registration.program[0] ?? null)
      : (registration.program ?? null);

    return {
      id: registration.id,
      program_id: registration.program_id,
      first_name: registration.first_name,
      last_name: registration.last_name,
      email: registration.email,
      phone: registration.phone,
      registration_status: registration.registration_status,
      payment_status: registration.payment_status,
      created_at: registration.created_at,
      program: relatedProgram
        ? {
            id: relatedProgram.id,
            title: relatedProgram.title,
            slug: relatedProgram.slug,
          }
        : null,
    };
  });
}

/**
 * Retrieve published programs whose start date has not passed.
 */
async function getUpcomingPrograms(
  limit = 5
): Promise<AcademyUpcomingProgram[]> {
  // Build today's date without a time component for date-column comparisons.
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("academy_programs")
    .select(
      `
      id,
      title,
      slug,
      status,
      start_date,
      registration_deadline,
      registration_open,
      maximum_students,
      thumbnail_image_url,
      hero_image_url
      `
    )
    .eq("status", "published")
    .gte("start_date", today)
    .order("start_date", {
      ascending: true,
    })
    .limit(limit);

  if (error) {
    throwDashboardQueryError("upcoming programs", error);
  }

  return (data ?? []) as AcademyUpcomingProgram[];
}

/**
 * Retrieve the IDs of programs that already have instructors.
 */
async function getProgramIdsWithInstructors() {
  const { data, error } = await supabase
    .from("academy_program_instructors")
    .select("program_id");

  if (error) {
    throwDashboardQueryError("program instructor assignments", error);
  }

  return new Set((data ?? []).map((assignment) => assignment.program_id));
}

/**
 * Retrieve the IDs of programs that already have curriculum modules.
 */
async function getProgramIdsWithCurriculum() {
  const { data, error } = await supabase
    .from("academy_program_modules")
    .select("program_id");

  if (error) {
    throwDashboardQueryError("program curriculum modules", error);
  }

  return new Set((data ?? []).map((module) => module.program_id));
}

/**
 * Detect published programs with incomplete configuration.
 */
async function getProgramsRequiringAttention(): Promise<
  AcademyProgramRequiringAttention[]
> {
  const [programResult, instructorProgramIds, curriculumProgramIds] =
    await Promise.all([
      supabase
        .from("academy_programs")
        .select(
          `
        id,
        title,
        slug,
        status,
        registration_open,
        start_date,
        hero_image_url,
        thumbnail_image_url,
        banner_image_url,
        certificate_enabled,
        certificate_template_id
        `
        )
        .eq("status", "published")
        .order("display_order", {
          ascending: true,
        }),

      getProgramIdsWithInstructors(),

      getProgramIdsWithCurriculum(),
    ]);

  if (programResult.error) {
    throwDashboardQueryError("program attention checks", programResult.error);
  }

  const programs = (programResult.data ?? []) as DashboardProgramRecord[];

  return programs
    .map((program) => {
      const issues: AcademyProgramAttentionIssue[] = [];

      // Flag published programs whose registration is unavailable.
      if (!program.registration_open) {
        issues.push({
          code: "registration_closed",
          label: "Registration is closed",
        });
      }

      // Flag programs that have no assigned instructor.
      if (!instructorProgramIds.has(program.id)) {
        issues.push({
          code: "missing_instructor",
          label: "No instructor assigned",
        });
      }

      // Flag programs that have no curriculum modules.
      if (!curriculumProgramIds.has(program.id)) {
        issues.push({
          code: "missing_curriculum",
          label: "No curriculum modules",
        });
      }

      // Flag programs that have no display image.
      if (
        !program.hero_image_url &&
        !program.thumbnail_image_url &&
        !program.banner_image_url
      ) {
        issues.push({
          code: "missing_image",
          label: "No program image",
        });
      }

      // Flag programs that have no configured start date.
      if (!program.start_date) {
        issues.push({
          code: "missing_start_date",
          label: "Start date is missing",
        });
      }

      // Flag certificate-enabled programs without a certificate template.
      if (program.certificate_enabled && !program.certificate_template_id) {
        issues.push({
          code: "missing_certificate_template",
          label: "Certificate template is missing",
        });
      }

      return {
        id: program.id,
        title: program.title,
        slug: program.slug,
        status: program.status,
        issues,
      };
    })
    .filter((program) => program.issues.length > 0);
}

/**
 * Retrieve every statistic and activity list required by the Academy dashboard.
 */
export async function getAcademyDashboardData(): Promise<AcademyDashboardData> {
  const [
    totalPrograms,
    publishedPrograms,
    openPrograms,
    totalRegistrations,
    confirmedRegistrations,
    pendingPayments,
    failedPayments,
    issuedCertificates,
    activeInstructors,
    revenue,
    recentPayments,
    recentRegistrations,
    upcomingPrograms,
    programsRequiringAttention,
  ] = await Promise.all([
    countTableRecords("academy_programs"),

    countRecordsByField("academy_programs", "status", "published"),

    countRecordsByField("academy_programs", "registration_open", true),

    countTableRecords("academy_registrations"),

    countRecordsByField(
      "academy_registrations",
      "registration_status",
      "confirmed"
    ),

    countPendingPayments(),

    countRecordsByField("academy_registrations", "payment_status", "failed"),

    countRecordsByField("academy_certificates", "status", "generated"),

    countRecordsByField("academy_instructors", "is_active", true),

    getAcademyRevenue(),

    getRecentPayments(),

    getRecentRegistrations(),

    getUpcomingPrograms(),

    getProgramsRequiringAttention(),
  ]);

  return {
    totalPrograms,
    publishedPrograms,
    openPrograms,
    totalRegistrations,
    confirmedRegistrations,
    pendingPayments,
    failedPayments,
    totalRevenue: revenue.totalRevenue,
    revenueCurrency: revenue.revenueCurrency,
    issuedCertificates,
    activeInstructors,
    recentPayments,
    recentRegistrations,
    upcomingPrograms,
    programsRequiringAttention,
  };
}
