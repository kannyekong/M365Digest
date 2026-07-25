import type { CareerOpening } from "../../types/careers";
import type { JobApplication } from "../../types/jobApplication";
import { supabaseAdmin } from "./supabase";
import type { JobApplicationWithOpening } from "../../types/jobApplication";

const RESUME_BUCKET = "job-application-resumes";
const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
const MINIMUM_SUBMISSION_TIME_MS = 3_000;

const ALLOWED_RESUME_EXTENSIONS = ["pdf", "doc", "docx"];

const ALLOWED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const NOTICE_PERIOD_OPTIONS = [
  "Immediately available",
  "1 week",
  "2 weeks",
  "1 month",
  "2 months",
  "3 months",
  "More than 3 months",
];

const WORK_AUTHORIZATION_OPTIONS = ["yes", "no", "not_applicable"];

interface ParsedJobApplication {
  jobOpeningId: string;
  jobSlug: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  currentCompany: string;
  currentJobTitle: string;
  yearsExperience: number;
  linkedinUrl: string;
  portfolioUrl: string;
  coverLetter: string;
  interestReason: string;
  noticePeriod: string;
  salaryExpectation: string;
  workAuthorization: string;
  privacyConsent: boolean;
  website: string;
  startedAt: number;
  resume: File;
}

interface ProcessJobApplicationResult {
  application: JobApplication;
  jobOpening: CareerOpening;
}

export class JobApplicationError extends Error {
  statusCode: number;
  fieldErrors?: Record<string, string>;

  /**
   * Creates an application error containing an HTTP status code.
   */
  constructor(
    message: string,
    statusCode = 400,
    fieldErrors?: Record<string, string>
  ) {
    super(message);

    this.name = "JobApplicationError";
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Returns a trimmed text representation of a FormData value.
 */
function getTextValue(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value.trim() : "";
}

export async function getJobApplicationById(
  applicationId: string
): Promise<JobApplicationWithOpening | null> {
  const { data, error } = await supabaseAdmin
    .from("job_applications")
    .select(
      `
        *,
        job_opening:job_openings (
        id,
        title,
        slug,
        department,
        location,
        status
        )
      `
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to retrieve the application: ${error.message}`);
  }

  return data as JobApplicationWithOpening | null;
}
/**
 * Returns the extension from a filename.
 */
function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Removes unsafe characters from a storage filename.
 */
function sanitizeFileName(fileName: string): string {
  const extension = getFileExtension(fileName);

  const nameWithoutExtension = fileName
    .replace(/\.[^/.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .slice(0, 80);

  const safeName = nameWithoutExtension || "resume";

  return `${safeName}.${extension}`;
}

/**
 * Determines whether an email address has valid basic formatting.
 */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

/**
 * Determines whether a phone number has valid international formatting.
 */
function isValidPhone(value: string): boolean {
  return /^\+?[0-9\s().-]{7,20}$/.test(value);
}

/**
 * Determines whether a string is an HTTP or HTTPS URL.
 */
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Determines whether a URL belongs to LinkedIn.
 */
function isValidLinkedInUrl(value: string): boolean {
  if (!isValidUrl(value)) {
    return false;
  }

  const hostname = new URL(value).hostname.toLowerCase();

  return (
    hostname === "linkedin.com" ||
    hostname === "www.linkedin.com" ||
    hostname.endsWith(".linkedin.com")
  );
}

/**
 * Validates a candidate's full name.
 */
function isValidName(value: string): boolean {
  return /^[\p{L}\p{M}'’.\-\s]+$/u.test(value);
}

/**
 * Validates a resume's extension, MIME type, and size.
 */
function validateResume(resume: File): string | null {
  const extension = getFileExtension(resume.name);

  if (!ALLOWED_RESUME_EXTENSIONS.includes(extension)) {
    return "Your resume must be a PDF, DOC, or DOCX file.";
  }

  if (resume.type && !ALLOWED_RESUME_MIME_TYPES.includes(resume.type)) {
    return "The selected resume file type is not supported.";
  }

  if (resume.size === 0) {
    return "The selected resume file is empty.";
  }

  if (resume.size > MAX_RESUME_SIZE_BYTES) {
    return "Your resume must not exceed 5 MB.";
  }

  return null;
}

/**
 * Parses multipart form data into a typed job application.
 */
function parseJobApplicationFormData(formData: FormData): ParsedJobApplication {
  const resumeValue = formData.get("resume");

  if (!(resumeValue instanceof File)) {
    throw new JobApplicationError("Please upload your resume.", 400, {
      resume: "Please upload your resume.",
    });
  }

  const yearsExperienceValue = getTextValue(formData, "yearsExperience");

  return {
    jobOpeningId: getTextValue(formData, "jobOpeningId"),
    jobSlug: getTextValue(formData, "jobSlug"),
    fullName: getTextValue(formData, "fullName"),
    email: getTextValue(formData, "email").toLowerCase(),
    phone: getTextValue(formData, "phone"),
    location: getTextValue(formData, "location"),
    currentCompany: getTextValue(formData, "currentCompany"),
    currentJobTitle: getTextValue(formData, "currentJobTitle"),
    yearsExperience:
      yearsExperienceValue === "" ? Number.NaN : Number(yearsExperienceValue),
    linkedinUrl: getTextValue(formData, "linkedinUrl"),
    portfolioUrl: getTextValue(formData, "portfolioUrl"),
    coverLetter: getTextValue(formData, "coverLetter"),
    interestReason: getTextValue(formData, "interestReason"),
    noticePeriod: getTextValue(formData, "noticePeriod"),
    salaryExpectation: getTextValue(formData, "salaryExpectation"),
    workAuthorization: getTextValue(formData, "workAuthorization"),
    privacyConsent: getTextValue(formData, "privacyConsent") === "true",
    website: getTextValue(formData, "website"),
    startedAt: Number(getTextValue(formData, "startedAt")),
    resume: resumeValue,
  };
}

/**
 * Validates all candidate application fields.
 */
function validateJobApplication(application: ParsedJobApplication): void {
  const errors: Record<string, string> = {};

  if (!application.jobOpeningId) {
    errors.jobOpeningId = "The selected job opening is missing.";
  }

  if (!application.jobSlug) {
    errors.jobSlug = "The selected job opening is invalid.";
  }

  if (!application.fullName) {
    errors.fullName = "Please enter your full name.";
  } else if (
    application.fullName.length < 3 ||
    application.fullName.length > 120
  ) {
    errors.fullName =
      "Your full name must contain between 3 and 120 characters.";
  } else if (!isValidName(application.fullName)) {
    errors.fullName = "Your full name contains unsupported characters.";
  }

  if (!application.email) {
    errors.email = "Please enter your email address.";
  } else if (
    application.email.length > 254 ||
    !isValidEmail(application.email)
  ) {
    errors.email = "Please enter a valid email address.";
  }

  if (!application.phone) {
    errors.phone = "Please enter your phone number.";
  } else if (!isValidPhone(application.phone)) {
    errors.phone = "Please enter a valid phone number.";
  }

  if (!application.location) {
    errors.location = "Please enter your current location.";
  } else if (
    application.location.length < 2 ||
    application.location.length > 120
  ) {
    errors.location =
      "Your location must contain between 2 and 120 characters.";
  }

  if (!application.currentCompany) {
    errors.currentCompany =
      "Please enter your current company or employment status.";
  } else if (application.currentCompany.length > 150) {
    errors.currentCompany =
      "Your current company must not exceed 150 characters.";
  }

  if (!application.currentJobTitle) {
    errors.currentJobTitle =
      "Please enter your current or most recent job title.";
  } else if (
    application.currentJobTitle.length < 2 ||
    application.currentJobTitle.length > 150
  ) {
    errors.currentJobTitle =
      "Your current job title must contain between 2 and 150 characters.";
  }

  if (!Number.isFinite(application.yearsExperience)) {
    errors.yearsExperience = "Years of experience must be a valid number.";
  } else if (
    application.yearsExperience < 0 ||
    application.yearsExperience > 70
  ) {
    errors.yearsExperience = "Years of experience must be between 0 and 70.";
  } else if (!Number.isInteger(application.yearsExperience * 2)) {
    errors.yearsExperience = "Use whole or half-year experience values.";
  }

  if (!application.linkedinUrl) {
    errors.linkedinUrl = "Please provide your LinkedIn profile.";
  } else if (
    application.linkedinUrl.length > 500 ||
    !isValidLinkedInUrl(application.linkedinUrl)
  ) {
    errors.linkedinUrl = "Please enter a valid LinkedIn profile URL.";
  }

  if (
    application.portfolioUrl &&
    (application.portfolioUrl.length > 500 ||
      !isValidUrl(application.portfolioUrl))
  ) {
    errors.portfolioUrl = "Please enter a valid portfolio URL.";
  }

  if (!application.coverLetter) {
    errors.coverLetter = "Please provide a cover letter.";
  } else if (
    application.coverLetter.length < 100 ||
    application.coverLetter.length > 5000
  ) {
    errors.coverLetter =
      "Your cover letter must contain between 100 and 5,000 characters.";
  }

  if (!application.interestReason) {
    errors.interestReason =
      "Please explain why you are interested in this position.";
  } else if (
    application.interestReason.length < 50 ||
    application.interestReason.length > 2500
  ) {
    errors.interestReason =
      "Your response must contain between 50 and 2,500 characters.";
  }

  if (!NOTICE_PERIOD_OPTIONS.includes(application.noticePeriod)) {
    errors.noticePeriod = "Please select a valid notice period.";
  }

  if (!application.salaryExpectation) {
    errors.salaryExpectation = "Please enter your salary expectation.";
  } else if (
    application.salaryExpectation.length < 2 ||
    application.salaryExpectation.length > 150
  ) {
    errors.salaryExpectation =
      "Your salary expectation must contain between 2 and 150 characters.";
  }

  if (!WORK_AUTHORIZATION_OPTIONS.includes(application.workAuthorization)) {
    errors.workAuthorization =
      "Please select a valid work-authorisation option.";
  }

  if (!application.privacyConsent) {
    errors.privacyConsent =
      "You must consent to the processing of your application data.";
  }

  const resumeError = validateResume(application.resume);

  if (resumeError) {
    errors.resume = resumeError;
  }

  if (Object.keys(errors).length > 0) {
    throw new JobApplicationError(
      "Please correct the highlighted application fields.",
      400,
      errors
    );
  }
}

/**
 * Rejects suspicious submissions using the honeypot and submission time.
 */
function validateSpamProtection(application: ParsedJobApplication): void {
  if (application.website) {
    throw new JobApplicationError(
      "The application could not be submitted.",
      400
    );
  }

  if (!Number.isFinite(application.startedAt) || application.startedAt <= 0) {
    throw new JobApplicationError(
      "The application session is invalid. Please refresh the page and try again.",
      400
    );
  }

  const elapsedTime = Date.now() - application.startedAt;

  if (elapsedTime < MINIMUM_SUBMISSION_TIME_MS) {
    throw new JobApplicationError(
      "The application was submitted too quickly. Please review it and try again.",
      429
    );
  }

  const maximumSessionAge = 24 * 60 * 60 * 1000;

  if (elapsedTime > maximumSessionAge) {
    throw new JobApplicationError(
      "Your application session has expired. Please refresh the page and try again.",
      400
    );
  }
}

/**
 * Loads and validates a published job opening that still accepts applications.
 */
async function getAvailableJobOpening(
  jobOpeningId: string,
  jobSlug: string
): Promise<CareerOpening> {
  const currentDate = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("job_openings")
    .select("*")
    .eq("id", jobOpeningId)
    .eq("slug", jobSlug)
    .eq("status", "published")
    .or(`application_deadline.is.null,application_deadline.gte.${currentDate}`)
    .maybeSingle();

  if (error) {
    throw new JobApplicationError(
      "The selected position could not be verified.",
      500
    );
  }

  if (!data) {
    throw new JobApplicationError(
      "This position is unavailable or no longer accepting applications.",
      404
    );
  }

  return data as CareerOpening;
}

/**
 * Prevents the same email from applying to the same opening more than once.
 */
async function validateDuplicateApplication(
  jobOpeningId: string,
  email: string
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("job_applications")
    .select("id")
    .eq("job_opening_id", jobOpeningId)
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    throw new JobApplicationError(
      "We could not verify your existing applications.",
      500
    );
  }

  if (data) {
    throw new JobApplicationError(
      "An application using this email address has already been submitted for this position.",
      409,
      {
        email:
          "This email address has already been used to apply for this position.",
      }
    );
  }
}

/**
 * Creates a temporary application record before uploading the resume.
 */
async function createApplicationRecord(
  application: ParsedJobApplication
): Promise<JobApplication> {
  const { data, error } = await supabaseAdmin
    .from("job_applications")
    .insert({
      job_opening_id: application.jobOpeningId,
      full_name: application.fullName,
      email: application.email,
      phone: application.phone,
      location: application.location,
      linkedin_url: application.linkedinUrl || null,
      portfolio_url: application.portfolioUrl || null,
      years_experience: application.yearsExperience,
      current_company: application.currentCompany,
      current_job_title: application.currentJobTitle,
      cover_letter: application.coverLetter,
      interest_reason: application.interestReason,
      notice_period: application.noticePeriod,
      salary_expectation: application.salaryExpectation,
      work_authorization: application.workAuthorization,
      resume_path: "",
      resume_original_name: application.resume.name,
      resume_mime_type: application.resume.type || "application/octet-stream",
      resume_size_bytes: application.resume.size,
      status: "new",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new JobApplicationError(
      "Your application could not be created.",
      500
    );
  }

  return data as JobApplication;
}

/**
 * Uploads a candidate resume to private Supabase Storage.
 */
async function uploadResume(
  applicationId: string,
  jobOpeningId: string,
  resume: File
): Promise<string> {
  const safeFileName = sanitizeFileName(resume.name);

  const storagePath = `${jobOpeningId}/${applicationId}/${safeFileName}`;

  const fileBuffer = await resume.arrayBuffer();

  const { error } = await supabaseAdmin.storage
    .from(RESUME_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: resume.type || "application/octet-stream",
      upsert: false,
      cacheControl: "3600",
    });

  if (error) {
    throw new JobApplicationError("Your resume could not be uploaded.", 500);
  }

  return storagePath;
}

/**
 * Saves the uploaded resume path on the application record.
 */
async function updateApplicationResumePath(
  applicationId: string,
  resumePath: string
): Promise<JobApplication> {
  const { data, error } = await supabaseAdmin
    .from("job_applications")
    .update({
      resume_path: resumePath,
    })
    .eq("id", applicationId)
    .select("*")
    .single();

  if (error || !data) {
    throw new JobApplicationError(
      "Your application resume could not be linked.",
      500
    );
  }

  return data as JobApplication;
}

/**
 * Removes an incomplete application record after a failed upload.
 */
async function deleteIncompleteApplication(
  applicationId: string
): Promise<void> {
  await supabaseAdmin.from("job_applications").delete().eq("id", applicationId);
}

/**
 * Processes a complete public job application.
 */
export async function processJobApplication(
  formData: FormData
): Promise<ProcessJobApplicationResult> {
  const application = parseJobApplicationFormData(formData);

  validateSpamProtection(application);
  validateJobApplication(application);

  const jobOpening = await getAvailableJobOpening(
    application.jobOpeningId,
    application.jobSlug
  );

  await validateDuplicateApplication(jobOpening.id, application.email);

  const createdApplication = await createApplicationRecord(application);

  try {
    const resumePath = await uploadResume(
      createdApplication.id,
      jobOpening.id,
      application.resume
    );

    const completedApplication = await updateApplicationResumePath(
      createdApplication.id,
      resumePath
    );

    return {
      application: completedApplication,
      jobOpening,
    };
  } catch (error) {
    await deleteIncompleteApplication(createdApplication.id);

    throw error;
  }
}
