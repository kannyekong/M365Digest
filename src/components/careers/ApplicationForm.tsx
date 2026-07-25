import "../../styles/global.css";
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Paperclip,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useRef,
  useMemo,
  useState,
} from "react";

interface ApplicationFormProps {
  jobOpeningId: string;
  jobTitle: string;
  jobSlug: string;
}

interface ApplicationFormValues {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  currentCompany: string;
  currentJobTitle: string;
  yearsExperience: string;
  linkedinUrl: string;
  portfolioUrl: string;
  coverLetter: string;
  interestReason: string;
  noticePeriod: string;
  salaryExpectation: string;
  workAuthorization: string;
  privacyConsent: boolean;
}

type ApplicationFormErrors = Partial<
  Record<keyof ApplicationFormValues | "resume" | "form", string>
>;

interface ApplicationSuccessResponse {
  success: boolean;
  message?: string;
  fieldErrors?: ApplicationFormErrors | null;
  application?: {
    id: string;
    reference?: string | null;
  };
}

const INITIAL_FORM_VALUES: ApplicationFormValues = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  currentCompany: "",
  currentJobTitle: "",
  yearsExperience: "",
  linkedinUrl: "",
  portfolioUrl: "",
  coverLetter: "",
  interestReason: "",
  noticePeriod: "",
  salaryExpectation: "",
  workAuthorization: "",
  privacyConsent: false,
};

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

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

const WORK_AUTHORIZATION_OPTIONS = [
  {
    value: "yes",
    label: "Yes, I am authorised to work in the job location",
  },
  {
    value: "no",
    label: "No, I would require work authorisation or sponsorship",
  },
  {
    value: "not_applicable",
    label: "Not applicable because the position is remote",
  },
];

/**
 * Returns a trimmed version of text used during validation.
 */
function normalizeText(value: string): string {
  return value.trim();
}

/**
 * Validates that a person's name contains reasonable characters.
 */
function isValidName(value: string): boolean {
  return /^[\p{L}\p{M}'’.\-\s]+$/u.test(value);
}

/**
 * Validates an email address using a practical browser-safe pattern.
 */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

/**
 * Validates phone numbers while allowing common international formatting.
 */
function isValidPhone(value: string): boolean {
  return /^\+?[0-9\s().-]{7,20}$/.test(value);
}

/**
 * Validates a URL and requires the HTTP or HTTPS protocol.
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
 * Validates that a LinkedIn URL belongs to LinkedIn.
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
 * Returns the lowercase extension of a file.
 */
function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Formats a file size into a readable value.
 */
function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} bytes`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validates the selected resume file.
 */
function validateResumeFile(file: File | null): string | null {
  if (!file) {
    return "Please upload your resume.";
  }

  const extension = getFileExtension(file.name);

  if (!ALLOWED_RESUME_EXTENSIONS.includes(extension)) {
    return "Your resume must be a PDF, DOC, or DOCX file.";
  }

  if (file.type && !ALLOWED_RESUME_MIME_TYPES.includes(file.type)) {
    return "The selected file type is not supported.";
  }

  if (file.size === 0) {
    return "The selected resume file is empty.";
  }

  if (file.size > MAX_RESUME_SIZE_BYTES) {
    return "Your resume must not exceed 5 MB.";
  }

  return null;
}

/**
 * Validates every form field and returns field-specific messages.
 */
function validateApplicationForm(
  values: ApplicationFormValues,
  resume: File | null
): ApplicationFormErrors {
  const errors: ApplicationFormErrors = {};

  const fullName = normalizeText(values.fullName);
  const email = normalizeText(values.email);
  const phone = normalizeText(values.phone);
  const location = normalizeText(values.location);
  const currentCompany = normalizeText(values.currentCompany);
  const currentJobTitle = normalizeText(values.currentJobTitle);
  const linkedinUrl = normalizeText(values.linkedinUrl);
  const portfolioUrl = normalizeText(values.portfolioUrl);
  const coverLetter = normalizeText(values.coverLetter);
  const interestReason = normalizeText(values.interestReason);
  const noticePeriod = normalizeText(values.noticePeriod);
  const salaryExpectation = normalizeText(values.salaryExpectation);
  const workAuthorization = normalizeText(values.workAuthorization);

  if (!fullName) {
    errors.fullName = "Please enter your full name.";
  } else if (fullName.length < 3) {
    errors.fullName = "Your full name must contain at least 3 characters.";
  } else if (fullName.length > 120) {
    errors.fullName = "Your full name must not exceed 120 characters.";
  } else if (!isValidName(fullName)) {
    errors.fullName = "Your name contains characters that are not supported.";
  }

  if (!email) {
    errors.email = "Please enter your email address.";
  } else if (email.length > 254) {
    errors.email = "Your email address is too long.";
  } else if (!isValidEmail(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!phone) {
    errors.phone = "Please enter your phone number.";
  } else if (!isValidPhone(phone)) {
    errors.phone =
      "Please enter a valid phone number, including the country code where applicable.";
  }

  if (!location) {
    errors.location = "Please enter your current location.";
  } else if (location.length < 2) {
    errors.location = "Please enter a valid location.";
  } else if (location.length > 120) {
    errors.location = "Your location must not exceed 120 characters.";
  }

  if (!currentCompany) {
    errors.currentCompany =
      "Enter your current company or write “Not currently employed”.";
  } else if (currentCompany.length > 150) {
    errors.currentCompany =
      "Your current company must not exceed 150 characters.";
  }

  if (!currentJobTitle) {
    errors.currentJobTitle =
      "Enter your current job title or your most recent job title.";
  } else if (currentJobTitle.length < 2) {
    errors.currentJobTitle = "Please enter a valid current job title.";
  } else if (currentJobTitle.length > 150) {
    errors.currentJobTitle =
      "Your current job title must not exceed 150 characters.";
  }

  if (!values.yearsExperience) {
    errors.yearsExperience =
      "Please enter your years of professional experience.";
  } else {
    const yearsExperience = Number(values.yearsExperience);

    if (!Number.isFinite(yearsExperience)) {
      errors.yearsExperience = "Years of experience must be a valid number.";
    } else if (yearsExperience < 0) {
      errors.yearsExperience = "Years of experience cannot be negative.";
    } else if (yearsExperience > 70) {
      errors.yearsExperience = "Please enter a realistic number of years.";
    } else if (!Number.isInteger(yearsExperience * 2)) {
      errors.yearsExperience =
        "Use whole or half-year values, such as 2 or 2.5.";
    }
  }

  if (!linkedinUrl) {
    errors.linkedinUrl = "Please provide the URL to your LinkedIn profile.";
  } else if (!isValidLinkedInUrl(linkedinUrl)) {
    errors.linkedinUrl = "Please enter a valid LinkedIn profile URL.";
  } else if (linkedinUrl.length > 500) {
    errors.linkedinUrl = "Your LinkedIn URL must not exceed 500 characters.";
  }

  if (portfolioUrl) {
    if (!isValidUrl(portfolioUrl)) {
      errors.portfolioUrl =
        "Please enter a valid portfolio URL beginning with http:// or https://.";
    } else if (portfolioUrl.length > 500) {
      errors.portfolioUrl =
        "Your portfolio URL must not exceed 500 characters.";
    }
  }

  if (!coverLetter) {
    errors.coverLetter = "Please provide a cover letter.";
  } else if (coverLetter.length < 100) {
    errors.coverLetter =
      "Your cover letter must contain at least 100 characters.";
  } else if (coverLetter.length > 5000) {
    errors.coverLetter = "Your cover letter must not exceed 5,000 characters.";
  }

  if (!interestReason) {
    errors.interestReason =
      "Please explain why you are interested in this position.";
  } else if (interestReason.length < 50) {
    errors.interestReason =
      "Your response must contain at least 50 characters.";
  } else if (interestReason.length > 2500) {
    errors.interestReason = "Your response must not exceed 2,500 characters.";
  }

  if (!noticePeriod) {
    errors.noticePeriod = "Please select your current notice period.";
  } else if (!NOTICE_PERIOD_OPTIONS.includes(noticePeriod)) {
    errors.noticePeriod = "Please select a valid notice period.";
  }

  if (!salaryExpectation) {
    errors.salaryExpectation = "Please enter your salary expectation.";
  } else if (salaryExpectation.length < 2) {
    errors.salaryExpectation = "Please provide a valid salary expectation.";
  } else if (salaryExpectation.length > 150) {
    errors.salaryExpectation =
      "Your salary expectation must not exceed 150 characters.";
  }

  if (!workAuthorization) {
    errors.workAuthorization = "Please select your work-authorisation status.";
  } else if (
    !WORK_AUTHORIZATION_OPTIONS.some(
      (option) => option.value === workAuthorization
    )
  ) {
    errors.workAuthorization =
      "Please select a valid work-authorisation option.";
  }

  if (!values.privacyConsent) {
    errors.privacyConsent =
      "You must consent to the processing of your application data.";
  }

  const resumeError = validateResumeFile(resume);

  if (resumeError) {
    errors.resume = resumeError;
  }

  return errors;
}

/**
 * Returns the first validation error so the corresponding field can be focused.
 */
function getFirstErrorKey(
  errors: ApplicationFormErrors
): keyof ApplicationFormErrors | null {
  const errorOrder: Array<keyof ApplicationFormErrors> = [
    "fullName",
    "email",
    "phone",
    "location",
    "currentCompany",
    "currentJobTitle",
    "yearsExperience",
    "linkedinUrl",
    "portfolioUrl",
    "coverLetter",
    "interestReason",
    "noticePeriod",
    "salaryExpectation",
    "workAuthorization",
    "resume",
    "privacyConsent",
  ];

  return errorOrder.find((key) => Boolean(errors[key])) ?? null;
}

/**
 * Displays a complete candidate application form.
 */
export default function ApplicationForm({
  jobOpeningId,
  jobTitle,
  jobSlug,
}: ApplicationFormProps) {
  const [values, setValues] =
    useState<ApplicationFormValues>(INITIAL_FORM_VALUES);
  const [resume, setResume] = useState<File | null>(null);
  const [errors, setErrors] = useState<ApplicationFormErrors>({});
  const [isDraggingResume, setIsDraggingResume] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationReference, setApplicationReference] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startedAt = useMemo(() => Date.now(), []);
  const [website, setWebsite] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  /**
   * Updates a text, textarea, or select value and removes its existing error.
   */
  function handleFieldChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;

    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: undefined,
      form: undefined,
    }));
  }

  /**
   * Updates the privacy-consent checkbox.
   */
  function handleConsentChange(event: ChangeEvent<HTMLInputElement>) {
    setValues((currentValues) => ({
      ...currentValues,
      privacyConsent: event.target.checked,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      privacyConsent: undefined,
      form: undefined,
    }));
  }

  /**
   * Validates and stores a newly selected resume.
   */
  function selectResume(file: File | null) {
    const resumeError = validateResumeFile(file);

    if (resumeError) {
      setResume(null);
      setErrors((currentErrors) => ({
        ...currentErrors,
        resume: resumeError,
      }));

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setResume(file);
    setErrors((currentErrors) => ({
      ...currentErrors,
      resume: undefined,
      form: undefined,
    }));
  }

  /**
   * Processes a resume selected through the file input.
   */
  function handleResumeChange(event: ChangeEvent<HTMLInputElement>) {
    selectResume(event.target.files?.[0] ?? null);
  }

  /**
   * Enables the visual drag state while a file is over the upload area.
   */
  function handleResumeDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingResume(true);
  }

  /**
   * Removes the visual drag state when the file leaves the upload area.
   */
  function handleResumeDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingResume(false);
  }

  /**
   * Processes a resume dropped onto the upload area.
   */
  function handleResumeDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingResume(false);

    selectResume(event.dataTransfer.files?.[0] ?? null);
  }

  /**
   * Removes the currently selected resume.
   */
  function removeResume() {
    setResume(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setErrors((currentErrors) => ({
      ...currentErrors,
      resume: "Please upload your resume.",
    }));
  }

  /**
   * Focuses the first field that failed validation.
   */
  function focusFirstInvalidField(validationErrors: ApplicationFormErrors) {
    const firstErrorKey = getFirstErrorKey(validationErrors);

    if (!firstErrorKey) {
      return;
    }

    const target =
      document.querySelector<HTMLElement>(`[name="${firstErrorKey}"]`) ??
      document.getElementById(
        firstErrorKey === "resume" ? "resume-upload" : firstErrorKey
      );

    target?.focus();
    target?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  /**
   * Builds the multipart form payload expected by the application API.
   */
  function createApplicationFormData(): FormData {
    const formData = new FormData();
    formData.append("website", website);
    formData.append("startedAt", String(startedAt));
    formData.append("jobOpeningId", jobOpeningId);
    formData.append("jobSlug", jobSlug);
    formData.append("fullName", normalizeText(values.fullName));
    formData.append("email", normalizeText(values.email).toLowerCase());
    formData.append("phone", normalizeText(values.phone));
    formData.append("location", normalizeText(values.location));
    formData.append("currentCompany", normalizeText(values.currentCompany));
    formData.append("currentJobTitle", normalizeText(values.currentJobTitle));
    formData.append("yearsExperience", normalizeText(values.yearsExperience));
    formData.append("linkedinUrl", normalizeText(values.linkedinUrl));
    formData.append("portfolioUrl", normalizeText(values.portfolioUrl));
    formData.append("coverLetter", normalizeText(values.coverLetter));
    formData.append("interestReason", normalizeText(values.interestReason));
    formData.append("noticePeriod", normalizeText(values.noticePeriod));
    formData.append(
      "salaryExpectation",
      normalizeText(values.salaryExpectation)
    );
    formData.append(
      "workAuthorization",
      normalizeText(values.workAuthorization)
    );
    formData.append("privacyConsent", String(values.privacyConsent));

    if (resume) {
      formData.append("resume", resume);
    }

    return formData;
  }

  /**
   * Validates and submits the complete job application.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const validationErrors = validateApplicationForm(values, resume);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      focusFirstInvalidField(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      const response = await fetch("/api/careers/apply", {
        method: "POST",
        body: createApplicationFormData(),
      });

      const result = (await response.json()) as ApplicationSuccessResponse;

      if (!response.ok || !result.success) {
        if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
          const serverErrors: ApplicationFormErrors = {
            ...result.fieldErrors,
            form: result.message ?? "Please correct the highlighted fields.",
          };

          setErrors(serverErrors);
          focusFirstInvalidField(serverErrors);
          return;
        }

        throw new Error(
          result.message ?? "Your application could not be submitted."
        );
      }

      setApplicationReference(
        result.application?.reference ?? result.application?.id ?? null
      );
      setIsSubmitted(true);
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "Your application could not be submitted. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div
        className="rounded-3xl border border-emerald-200 bg-emerald-50/70 px-6 py-12 text-center dark:border-emerald-900/60 dark:bg-emerald-950/20 sm:px-10"
        role="status"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
          Application submitted
        </p>

        <h2 className="mt-3 text-3xl font-bold text-heading">
          Thank you for applying
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-600 dark:text-gray-400">
          We have received your application for{" "}
          <span className="font-semibold text-heading">{jobTitle}</span>. Our
          recruitment team will review your information and contact you if you
          are selected for the next stage.
        </p>

        {applicationReference && (
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-emerald-200 bg-white/70 px-5 py-4 dark:border-emerald-900/60 dark:bg-box-bg/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Application reference
            </p>

            <p className="mt-2 break-all font-mono text-sm font-semibold text-heading">
              {applicationReference}
            </p>
          </div>
        )}

        <a
          href="/careers"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
        >
          View other openings
        </a>
      </div>
    );
  }

  const inputClassName =
    "mt-2 w-full rounded-xl border border-box-border bg-transparent px-4 py-3 text-sm text-heading outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";

  const errorInputClassName =
    "border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-700";

  return (
    <form onSubmit={handleSubmit} noValidate className="relative space-y-10">
      {errors.form && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">Application not submitted</p>

            <p className="mt-1 text-sm leading-6">{errors.form}</p>
          </div>
        </div>
      )}

      <fieldset disabled={isSubmitting} className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" />
          </div>

          <div>
            <legend className="text-xl font-bold text-heading">
              Personal information
            </legend>

            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Provide the contact details our recruitment team should use.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-heading">
              Full name <span className="text-red-500">*</span>
            </span>

            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              maxLength={120}
              value={values.fullName}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
              className={`${inputClassName} ${
                errors.fullName ? errorInputClassName : ""
              }`}
              placeholder="Enter your full name"
            />

            {errors.fullName && (
              <p
                id="fullName-error"
                className="mt-2 text-sm text-red-600 dark:text-red-400"
              >
                {errors.fullName}
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-heading">
              Email address <span className="text-red-500">*</span>
            </span>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={values.email}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={`${inputClassName} ${
                errors.email ? errorInputClassName : ""
              }`}
              placeholder="you@example.com"
            />

            {errors.email && (
              <p
                id="email-error"
                className="mt-2 text-sm text-red-600 dark:text-red-400"
              >
                {errors.email}
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-heading">
              Phone number <span className="text-red-500">*</span>
            </span>

            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={20}
              value={values.phone}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "phone-error" : undefined}
              className={`${inputClassName} ${
                errors.phone ? errorInputClassName : ""
              }`}
              placeholder="+234 800 000 0000"
            />

            {errors.phone && (
              <p
                id="phone-error"
                className="mt-2 text-sm text-red-600 dark:text-red-400"
              >
                {errors.phone}
              </p>
            )}
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-heading">
              Current location <span className="text-red-500">*</span>
            </span>

            <input
              id="location"
              name="location"
              type="text"
              autoComplete="address-level2"
              maxLength={120}
              value={values.location}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.location)}
              aria-describedby={errors.location ? "location-error" : undefined}
              className={`${inputClassName} ${
                errors.location ? errorInputClassName : ""
              }`}
              placeholder="City, state and country"
            />

            {errors.location && (
              <p
                id="location-error"
                className="mt-2 text-sm text-red-600 dark:text-red-400"
              >
                {errors.location}
              </p>
            )}
          </label>

          {/* HONEYPOT */}

          <div
            aria-hidden="true"
            className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
          >
            <label htmlFor="website">Website</label>

            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <fieldset
        disabled={isSubmitting}
        className="space-y-6 border-t border-box-border pt-9"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>

          <div>
            <legend className="text-xl font-bold text-heading">
              Professional background
            </legend>

            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Tell us about your present role and professional experience.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-heading">
              Current company <span className="text-red-500">*</span>
            </span>

            <input
              id="currentCompany"
              name="currentCompany"
              type="text"
              autoComplete="organization"
              maxLength={150}
              value={values.currentCompany}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.currentCompany)}
              className={`${inputClassName} ${
                errors.currentCompany ? errorInputClassName : ""
              }`}
              placeholder="Company name or not currently employed"
            />

            {errors.currentCompany && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errors.currentCompany}
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-heading">
              Current job title <span className="text-red-500">*</span>
            </span>

            <input
              id="currentJobTitle"
              name="currentJobTitle"
              type="text"
              autoComplete="organization-title"
              maxLength={150}
              value={values.currentJobTitle}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.currentJobTitle)}
              className={`${inputClassName} ${
                errors.currentJobTitle ? errorInputClassName : ""
              }`}
              placeholder="Your current or most recent title"
            />

            {errors.currentJobTitle && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errors.currentJobTitle}
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-heading">
              Years of experience <span className="text-red-500">*</span>
            </span>

            <input
              id="yearsExperience"
              name="yearsExperience"
              type="number"
              min="0"
              max="70"
              step="0.5"
              inputMode="decimal"
              value={values.yearsExperience}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.yearsExperience)}
              className={`${inputClassName} ${
                errors.yearsExperience ? errorInputClassName : ""
              }`}
              placeholder="For example, 4.5"
            />

            {errors.yearsExperience && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errors.yearsExperience}
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-heading">
              LinkedIn profile <span className="text-red-500">*</span>
            </span>

            <div className="relative">
              <p>LINKEDIN</p>
              <input
                id="linkedinUrl"
                name="linkedinUrl"
                type="url"
                inputMode="url"
                maxLength={500}
                value={values.linkedinUrl}
                onChange={handleFieldChange}
                aria-invalid={Boolean(errors.linkedinUrl)}
                className={`${inputClassName} pl-11 ${
                  errors.linkedinUrl ? errorInputClassName : ""
                }`}
                placeholder="https://www.linkedin.com/in/..."
              />
            </div>

            {errors.linkedinUrl && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errors.linkedinUrl}
              </p>
            )}
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-heading">
              Portfolio or personal website
            </span>

            <input
              id="portfolioUrl"
              name="portfolioUrl"
              type="url"
              inputMode="url"
              maxLength={500}
              value={values.portfolioUrl}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.portfolioUrl)}
              className={`${inputClassName} ${
                errors.portfolioUrl ? errorInputClassName : ""
              }`}
              placeholder="https://yourportfolio.com"
            />

            {errors.portfolioUrl && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errors.portfolioUrl}
              </p>
            )}
          </label>
        </div>
      </fieldset>

      <fieldset
        disabled={isSubmitting}
        className="space-y-6 border-t border-box-border pt-9"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <legend className="text-xl font-bold text-heading">
              Your application
            </legend>

            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Explain your suitability and provide your employment preferences.
            </p>
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-heading">
            Cover letter <span className="text-red-500">*</span>
          </span>

          <textarea
            id="coverLetter"
            name="coverLetter"
            rows={8}
            minLength={100}
            maxLength={5000}
            value={values.coverLetter}
            onChange={handleFieldChange}
            aria-invalid={Boolean(errors.coverLetter)}
            className={`${inputClassName} resize-y ${
              errors.coverLetter ? errorInputClassName : ""
            }`}
            placeholder="Describe your relevant experience, strengths and suitability for this position."
          />

          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              {errors.coverLetter && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.coverLetter}
                </p>
              )}
            </div>

            <p className="shrink-0 text-xs text-gray-500">
              {values.coverLetter.length}/5,000
            </p>
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-heading">
            Why are you interested in this position?{" "}
            <span className="text-red-500">*</span>
          </span>

          <textarea
            id="interestReason"
            name="interestReason"
            rows={5}
            minLength={50}
            maxLength={2500}
            value={values.interestReason}
            onChange={handleFieldChange}
            aria-invalid={Boolean(errors.interestReason)}
            className={`${inputClassName} resize-y ${
              errors.interestReason ? errorInputClassName : ""
            }`}
            placeholder="Tell us why this opportunity interests you and what you hope to contribute."
          />

          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              {errors.interestReason && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.interestReason}
                </p>
              )}
            </div>

            <p className="shrink-0 text-xs text-gray-500">
              {values.interestReason.length}/2,500
            </p>
          </div>
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-heading">
              Notice period <span className="text-red-500">*</span>
            </span>

            <select
              id="noticePeriod"
              name="noticePeriod"
              value={values.noticePeriod}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.noticePeriod)}
              className={`${inputClassName} bg-white dark:bg-box-bg ${
                errors.noticePeriod ? errorInputClassName : ""
              }`}
            >
              <option value="">Select notice period</option>

              {NOTICE_PERIOD_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            {errors.noticePeriod && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errors.noticePeriod}
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-heading">
              Salary expectation <span className="text-red-500">*</span>
            </span>

            <input
              id="salaryExpectation"
              name="salaryExpectation"
              type="text"
              maxLength={150}
              value={values.salaryExpectation}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.salaryExpectation)}
              className={`${inputClassName} ${
                errors.salaryExpectation ? errorInputClassName : ""
              }`}
              placeholder="For example, NGN 500,000 monthly"
            />

            {errors.salaryExpectation && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errors.salaryExpectation}
              </p>
            )}
          </label>
        </div>

        <div>
          <p className="text-sm font-semibold text-heading">
            Work authorisation <span className="text-red-500">*</span>
          </p>

          <div className="mt-3 space-y-3">
            {WORK_AUTHORIZATION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-box-border p-4 transition hover:border-primary/50"
              >
                <input
                  name="workAuthorization"
                  type="radio"
                  value={option.value}
                  checked={values.workAuthorization === option.value}
                  onChange={handleFieldChange}
                  className="mt-0.5 h-4 w-4 border-box-border text-primary focus:ring-primary"
                />

                <span className="text-sm leading-6 text-gray-700 dark:text-gray-300">
                  {option.label}
                </span>
              </label>
            ))}
          </div>

          {errors.workAuthorization && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.workAuthorization}
            </p>
          )}
        </div>
      </fieldset>

      <fieldset
        disabled={isSubmitting}
        className="space-y-5 border-t border-box-border pt-9"
      >
        <div>
          <h3 className="text-xl font-bold text-heading">Resume</h3>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Upload one PDF, DOC, or DOCX file. The maximum file size is 5 MB.
          </p>
        </div>

        {!resume ? (
          <div
            id="resume-upload"
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={handleResumeDragOver}
            onDragLeave={handleResumeDragLeave}
            onDrop={handleResumeDrop}
            className={`cursor-pointer rounded-2xl border-2 border-dashed px-5 py-10 text-center outline-none transition focus:ring-2 focus:ring-primary/20 ${
              errors.resume
                ? "border-red-400 bg-red-50/50 dark:border-red-700 dark:bg-red-950/20"
                : isDraggingResume
                  ? "border-primary bg-primary/10"
                  : "border-box-border bg-gray-50/50 hover:border-primary/50 hover:bg-primary/[0.03] dark:bg-white/[0.02]"
            }`}
          >
            <UploadCloud className="mx-auto h-9 w-9 text-primary" />

            <p className="mt-4 font-semibold text-heading">
              Drop your resume here or click to browse
            </p>

            <p className="mt-2 text-sm text-gray-500">
              PDF, DOC or DOCX · Maximum 5 MB
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Paperclip className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold text-heading">
                  {resume.name}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {formatFileSize(resume.size)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={removeResume}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          name="resume"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleResumeChange}
          className="sr-only"
        />

        {errors.resume && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.resume}
          </p>
        )}
      </fieldset>

      <div className="border-t border-box-border pt-8">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            id="privacyConsent"
            name="privacyConsent"
            type="checkbox"
            checked={values.privacyConsent}
            onChange={handleConsentChange}
            disabled={isSubmitting}
            className="mt-1 h-4 w-4 rounded border-box-border text-primary focus:ring-primary"
          />

          <span className="text-sm leading-6 text-gray-600 dark:text-gray-400">
            I consent to CloudTweak processing the information in this
            application for recruitment and candidate-assessment purposes.{" "}
            <span className="text-red-500">*</span>
          </span>
        </label>

        {errors.privacyConsent && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {errors.privacyConsent}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Submitting application...
            </>
          ) : (
            <>
              <BriefcaseBusiness className="h-5 w-5" />
              Submit application
            </>
          )}
        </button>

        <p className="mt-4 text-center text-xs leading-5 text-gray-500">
          Please review your application carefully before submitting.
          Applications cannot currently be edited after submission.
        </p>
      </div>
    </form>
  );
}
