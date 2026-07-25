import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./superbase";

import type {
  JobApplication,
  JobApplicationStatus,
  JobApplicationWithOpening,
} from "../types/jobApplication";

const RESUME_BUCKET = "job-application-resumes";
const RESUME_URL_EXPIRY_SECONDS = 60 * 10;

const ALLOWED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const ALLOWED_RESUME_EXTENSIONS = ["pdf", "doc", "docx"] as const;

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

export interface CreateJobApplicationInput {
  id: string;
  job_opening_id: string;

  full_name: string;
  email: string;
  phone: string;
  location?: string | null;

  linkedin_url?: string | null;
  portfolio_url?: string | null;

  years_experience?: number | null;
  current_company?: string | null;
  current_job_title?: string | null;

  cover_letter?: string | null;
  interest_reason?: string | null;
  notice_period?: string | null;
  salary_expectation?: string | null;
  work_authorization?: boolean | null;

  resume_path: string;
  resume_original_name: string;
  resume_mime_type: string;
  resume_size_bytes: number;
}

export interface JobApplicationFilters {
  status?: JobApplicationStatus | "all";
  jobOpeningId?: string;
  search?: string;
}

export interface ResumeValidationResult {
  valid: boolean;
  error: string | null;
  extension: string | null;
}

/**
 * Removes leading and trailing whitespace and converts empty strings to null.
 */
function normalizeOptionalText(value?: string | null): string | null {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

/**
 * Extracts and normalizes the extension from a file name.
 */
function getFileExtension(fileName: string): string {
  const extension = fileName.split(".").pop();

  return extension?.toLowerCase() ?? "";
}

/**
 * Converts unsafe file-name characters into hyphens for storage compatibility.
 */
function sanitizeFileName(fileName: string): string {
  const extension = getFileExtension(fileName);
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");

  const sanitizedName = nameWithoutExtension
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const safeName = sanitizedName || "resume";

  return extension ? `${safeName}.${extension}` : safeName;
}

/**
 * Validates the resume file type, extension and maximum file size.
 */
export function validateResumeFile(file: File): ResumeValidationResult {
  const extension = getFileExtension(file.name);

  if (!file.name.trim()) {
    return {
      valid: false,
      error: "Please select a resume to upload.",
      extension: null,
    };
  }

  if (
    !ALLOWED_RESUME_EXTENSIONS.includes(
      extension as (typeof ALLOWED_RESUME_EXTENSIONS)[number]
    )
  ) {
    return {
      valid: false,
      error: "Your resume must be a PDF, DOC or DOCX file.",
      extension,
    };
  }

  if (
    !ALLOWED_RESUME_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_RESUME_MIME_TYPES)[number]
    )
  ) {
    return {
      valid: false,
      error: "The selected resume file type is not supported.",
      extension,
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: "The selected resume appears to be empty.",
      extension,
    };
  }

  if (file.size > MAX_RESUME_SIZE_BYTES) {
    return {
      valid: false,
      error: "Your resume must not exceed 5 MB.",
      extension,
    };
  }

  return {
    valid: true,
    error: null,
    extension,
  };
}

/**
 * Creates the private storage path used for an applicant's resume.
 */
export function createResumeStoragePath(
  jobOpeningId: string,
  applicationId: string,
  originalFileName: string
): string {
  const safeFileName = sanitizeFileName(originalFileName);

  return `${jobOpeningId}/${applicationId}/${safeFileName}`;
}

/**
 * Uploads a validated resume to the private Supabase Storage bucket.
 *
 * The API endpoint must pass its server-side service-role client here.
 */
export async function uploadJobApplicationResume(
  client: SupabaseClient,
  storagePath: string,
  file: File
): Promise<string> {
  const validationResult = validateResumeFile(file);

  if (!validationResult.valid) {
    throw new Error(validationResult.error ?? "The resume is invalid.");
  }

  const fileBuffer = await file.arrayBuffer();

  const { data, error } = await client.storage
    .from(RESUME_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Unable to upload the resume: ${error.message}`);
  }

  return data.path;
}

/**
 * Removes a resume from private storage.
 *
 * This is used to clean up the uploaded file when the database insert fails.
 */
export async function deleteJobApplicationResume(
  client: SupabaseClient,
  storagePath: string
): Promise<void> {
  const { error } = await client.storage
    .from(RESUME_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Unable to delete the resume: ${error.message}`);
  }
}

/**
 * Inserts a new job application into the database.
 *
 * Public submissions should call this with a server-side service-role client.
 */
export async function submitJobApplication(
  input: CreateJobApplicationInput,
  client: SupabaseClient
): Promise<JobApplication> {
  const applicationPayload = {
    id: input.id,
    job_opening_id: input.job_opening_id,

    full_name: input.full_name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    location: normalizeOptionalText(input.location),

    linkedin_url: normalizeOptionalText(input.linkedin_url),
    portfolio_url: normalizeOptionalText(input.portfolio_url),

    years_experience: input.years_experience ?? null,
    current_company: normalizeOptionalText(input.current_company),
    current_job_title: normalizeOptionalText(input.current_job_title),

    cover_letter: normalizeOptionalText(input.cover_letter),
    interest_reason: normalizeOptionalText(input.interest_reason),
    notice_period: normalizeOptionalText(input.notice_period),
    salary_expectation: normalizeOptionalText(input.salary_expectation),
    work_authorization: input.work_authorization ?? null,

    resume_path: input.resume_path,
    resume_original_name: input.resume_original_name,
    resume_mime_type: input.resume_mime_type,
    resume_size_bytes: input.resume_size_bytes,

    status: "new" satisfies JobApplicationStatus,
  };

  const { data, error } = await client
    .from("job_applications")
    .insert(applicationPayload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to submit the application: ${error.message}`);
  }

  return data as JobApplication;
}

/**
 * Retrieves applications for the admin dashboard with optional filters.
 */
export async function getJobApplications(
  filters: JobApplicationFilters = {}
): Promise<JobApplicationWithOpening[]> {
  let query = supabase
    .from("job_applications")
    .select(
      `
        *,
        job_opening:job_openings (
          id,
          title,
          slug,
          department,
          status
        )
      `
    )
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.jobOpeningId) {
    query = query.eq("job_opening_id", filters.jobOpeningId);
  }

  if (filters.search?.trim()) {
    const searchValue = filters.search.trim();

    query = query.or(
      `full_name.ilike.%${searchValue}%,email.ilike.%${searchValue}%,phone.ilike.%${searchValue}%,current_job_title.ilike.%${searchValue}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to retrieve applications: ${error.message}`);
  }

  return (data ?? []) as JobApplicationWithOpening[];
}

/**
 * Retrieves one application and its associated job opening.
 */

/**
 * Checks whether an email address has already applied for a specific job.
 *
 * The secure application API should pass its service-role client here.
 */
export async function hasExistingJobApplication(
  client: SupabaseClient,
  jobOpeningId: string,
  email: string
): Promise<boolean> {
  const { data, error } = await client
    .from("job_applications")
    .select("id")
    .eq("job_opening_id", jobOpeningId)
    .ilike("email", email.trim())
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to check for an existing application: ${error.message}`
    );
  }

  return Boolean(data);
}

/**
 * Updates an application's recruitment status.
 */
export async function updateJobApplicationStatus(
  applicationId: string,
  status: JobApplicationStatus
): Promise<JobApplication> {
  const updatePayload: {
    status: JobApplicationStatus;
    reviewed_at?: string;
  } = {
    status,
  };

  if (status !== "new") {
    updatePayload.reviewed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("job_applications")
    .update(updatePayload)
    .eq("id", applicationId)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Unable to update the application status: ${error.message}`
    );
  }

  return data as JobApplication;
}

/**
 * Saves private notes written by an administrator.
 */
export async function updateJobApplicationNotes(
  applicationId: string,
  internalNotes: string
): Promise<JobApplication> {
  const { data, error } = await supabase
    .from("job_applications")
    .update({
      internal_notes: normalizeOptionalText(internalNotes),
    })
    .eq("id", applicationId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update the application notes: ${error.message}`);
  }

  return data as JobApplication;
}

/**
 * Generates a temporary signed URL for viewing or downloading a private resume.
 */
export async function getResumeDownloadUrl(
  resumePath: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(resumePath, RESUME_URL_EXPIRY_SECONDS, {
      download: false,
    });

  if (error) {
    throw new Error(`Unable to access the resume: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Deletes an application and its associated resume.
 */
export async function deleteJobApplication(
  applicationId: string
): Promise<void> {
  const { data: application, error: applicationError } = await supabase
    .from("job_applications")
    .select("resume_path")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError) {
    throw new Error(
      `Unable to retrieve the application: ${applicationError.message}`
    );
  }

  if (!application) {
    throw new Error("The application could not be found.");
  }

  const { error: resumeError } = await supabase.storage
    .from(RESUME_BUCKET)
    .remove([application.resume_path]);

  if (resumeError) {
    throw new Error(`Unable to delete the resume: ${resumeError.message}`);
  }

  const { error: applicationDeleteError } = await supabase
    .from("job_applications")
    .delete()
    .eq("id", applicationId);

  if (applicationDeleteError) {
    throw new Error(
      `Unable to delete the application: ${applicationDeleteError.message}`
    );
  }
}
