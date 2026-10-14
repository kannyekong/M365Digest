import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

type ProgramRelation = {
  id: string;
  title: string;
  slug: string;
  code: string | null;
  certificate_enabled: boolean;
};

type RegistrationRow = {
  id: string;
  program_id: string;
  first_name: string;
  last_name: string;
  email: string;
  registration_status: string;
  certificate_status: string;
  completed_at: string | null;
  program: ProgramRelation | ProgramRelation[] | null;
};

type CertificateRow = {
  id: string;
  registration_id: string;
  certificate_number: string;
  verification_code: string;
  recipient_name: string;
  program_title: string;
  issue_date: string;
  completion_date: string | null;
  file_url: string | null;
  status: string;
  generated_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
};

/** Return a private, non-cacheable JSON response. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      Vary: "Authorization",
    },
  });
}

/** Normalize a Supabase one-to-one join into one program record. */
function normalizeProgram(
  value: ProgramRelation | ProgramRelation[] | null
): ProgramRelation | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

/** Return only the signed-in learner's completed, certificate-enabled programs. */
export const GET: APIRoute = async ({ request }) => {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ success: false, message: "Please sign in to view your certificates." }, 401);
  }

  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ success: false, message: "Certificate service is unavailable." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const accessToken = authorization.slice("Bearer ".length).trim();
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user?.email) {
      return jsonResponse({ success: false, message: "Your session has expired. Please sign in again." }, 401);
    }

    const requestedSlug = new URL(request.url).searchParams.get("slug")?.trim();
    const { data: rows, error: registrationsError } = await supabase
      .from("academy_registrations")
      .select(`
        id, program_id, first_name, last_name, email,
        registration_status, certificate_status, completed_at,
        program:academy_programs ( id, title, slug, code, certificate_enabled )
      `)
      .ilike("email", user.email)
      .order("completed_at", { ascending: false, nullsFirst: false });

    if (registrationsError) throw registrationsError;

    const completed = ((rows ?? []) as unknown as RegistrationRow[])
      .map((registration) => ({ ...registration, program: normalizeProgram(registration.program) }))
      .filter((registration) =>
        Boolean(registration.program?.certificate_enabled) &&
        (registration.registration_status === "completed" || Boolean(registration.completed_at)) &&
        Boolean(registration.program?.slug) &&
        (!requestedSlug || registration.program?.slug === requestedSlug)
      );

    if (completed.length === 0) {
      return jsonResponse({ success: true, certificates: [], certificate: null });
    }

    const registrationIds = [...new Set(completed.map((registration) => registration.id))];
    const { data: certificateRows, error: certificatesError } = await supabase
      .from("academy_certificates")
      .select(`
        id, registration_id, certificate_number, verification_code,
        recipient_name, program_title, issue_date, completion_date,
        file_url, status, generated_at, revoked_at, revocation_reason
      `)
      .in("registration_id", registrationIds);

    if (certificatesError) throw certificatesError;

    const certificatesByRegistration = new Map<string, CertificateRow>();
    for (const certificate of (certificateRows ?? []) as unknown as CertificateRow[]) {
      certificatesByRegistration.set(certificate.registration_id, certificate);
    }

    // Deduplicate registrations for the same program, preferring the newest completed registration.
    const bySlug = new Map<string, Record<string, unknown>>();
    for (const registration of completed) {
      const program = registration.program!;
      const storedCertificate = certificatesByRegistration.get(registration.id) ?? null;
      const revoked = storedCertificate?.status === "revoked";
      const issued = storedCertificate?.status === "generated" && Boolean(storedCertificate.file_url) && !revoked;
      const status = revoked ? "revoked" : issued ? "issued" : "eligible";
      const result = {
        registrationId: registration.id,
        programId: program.id,
        programTitle: program.title,
        programSlug: program.slug,
        programCode: program.code,
        recipientName: storedCertificate?.recipient_name || `${registration.first_name} ${registration.last_name}`.trim(),
        status,
        completedAt: registration.completed_at,
        certificate: storedCertificate ? {
          id: storedCertificate.id,
          certificateNumber: storedCertificate.certificate_number,
          verificationCode: storedCertificate.verification_code,
          issueDate: storedCertificate.issue_date,
          completionDate: storedCertificate.completion_date || registration.completed_at,
          fileUrl: issued ? storedCertificate.file_url : null,
          revokedAt: storedCertificate.revoked_at,
          revocationReason: revoked ? storedCertificate.revocation_reason : null,
        } : null,
      };
      if (!bySlug.has(program.slug)) bySlug.set(program.slug, result);
    }

    const certificates = [...bySlug.values()];
    return jsonResponse({
      success: true,
      certificates,
      certificate: requestedSlug ? certificates[0] ?? null : null,
    });
  } catch (error) {
    console.error("Student certificate lookup failed:", error);
    return jsonResponse({ success: false, message: "Your certificates could not be loaded. Please try again." }, 500);
  }
};
