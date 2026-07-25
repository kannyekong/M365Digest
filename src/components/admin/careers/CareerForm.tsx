import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  LoaderCircle,
  Save,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  createCareerOpening,
  generateCareerSlug,
  getCareerOpeningById,
  updateCareerOpening,
} from "../../../lib/careers";
import type {
  CareerOpening,
  CareerOpeningInput,
  CareerStatus,
  EmploymentType,
  WorkplaceType,
} from "../../../types/careers";

interface CareerFormProps {
  careerId?: string;
}

interface CareerFormState {
  title: string;
  slug: string;
  department: string;
  location: string;
  employment_type: EmploymentType;
  workplace_type: WorkplaceType;
  summary: string;
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  salary_min: string;
  salary_max: string;
  salary_currency: string;
  show_salary: boolean;
  application_url: string;
  application_email: string;
  application_deadline: string;
  status: CareerStatus;
  featured: boolean;
}

interface CareerFormErrors {
  title?: string;
  slug?: string;
  summary?: string;
  description?: string;
  application?: string;
  salary?: string;
}

const INITIAL_FORM_STATE: CareerFormState = {
  title: "",
  slug: "",
  department: "",
  location: "",
  employment_type: "full_time",
  workplace_type: "remote",
  summary: "",
  description: "",
  responsibilities: "",
  requirements: "",
  benefits: "",
  salary_min: "",
  salary_max: "",
  salary_currency: "NGN",
  show_salary: false,
  application_url: "",
  application_email: "",
  application_deadline: "",
  status: "draft",
  featured: false,
};

// Convert an ISO date value into the format expected by a date input.
function formatDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  return value.split("T")[0];
}

// Convert a nullable database number into a safe form string.
function formatNumberInputValue(value: number | null) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

// Convert a career opening record into editable form state.
function mapCareerOpeningToForm(careerOpening: CareerOpening): CareerFormState {
  return {
    title: careerOpening.title,
    slug: careerOpening.slug,
    department: careerOpening.department || "",
    location: careerOpening.location || "",
    employment_type: careerOpening.employment_type,
    workplace_type: careerOpening.workplace_type,
    summary: careerOpening.summary,
    description: careerOpening.description,
    responsibilities: careerOpening.responsibilities || "",
    requirements: careerOpening.requirements || "",
    benefits: careerOpening.benefits || "",
    salary_min: formatNumberInputValue(careerOpening.salary_min),
    salary_max: formatNumberInputValue(careerOpening.salary_max),
    salary_currency: careerOpening.salary_currency || "NGN",
    show_salary: careerOpening.show_salary,
    application_url: careerOpening.application_url || "",
    application_email: careerOpening.application_email || "",
    application_deadline: formatDateInputValue(
      careerOpening.application_deadline
    ),
    status: careerOpening.status,
    featured: careerOpening.featured,
  };
}

// Convert an optional string into either a trimmed value or null.
function getOptionalString(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue || null;
}

// Convert an optional numeric form value into either a number or null.
function getOptionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

// Convert the form state into the structure expected by Supabase.
function mapFormToCareerInput(
  form: CareerFormState,
  existingCareerOpening: CareerOpening | null
): CareerOpeningInput {
  const isBeingPublished = form.status === "published";

  return {
    title: form.title.trim(),
    slug: form.slug.trim(),
    department: getOptionalString(form.department),
    location: getOptionalString(form.location),
    employment_type: form.employment_type,
    workplace_type: form.workplace_type,
    summary: form.summary.trim(),
    description: form.description.trim(),
    responsibilities: getOptionalString(form.responsibilities),
    requirements: getOptionalString(form.requirements),
    benefits: getOptionalString(form.benefits),
    salary_min: getOptionalNumber(form.salary_min),
    salary_max: getOptionalNumber(form.salary_max),
    salary_currency: form.salary_currency.trim() || "NGN",
    show_salary: form.show_salary,
    application_url: getOptionalString(form.application_url),
    application_email: getOptionalString(form.application_email),
    application_deadline: form.application_deadline
      ? new Date(`${form.application_deadline}T23:59:59`).toISOString()
      : null,
    status: form.status,
    featured: form.featured,
    published_at: isBeingPublished
      ? existingCareerOpening?.published_at || new Date().toISOString()
      : existingCareerOpening?.published_at || null,
  };
}

// Validate the required form fields before saving.
function validateCareerForm(form: CareerFormState) {
  const errors: CareerFormErrors = {};

  if (!form.title.trim()) {
    errors.title = "Enter a job title.";
  }

  if (!form.slug.trim()) {
    errors.slug = "Enter a URL slug.";
  }

  if (!form.summary.trim()) {
    errors.summary = "Enter a short job summary.";
  }

  if (!form.description.trim()) {
    errors.description = "Enter the full job description.";
  }

  if (
    form.status === "published" &&
    !form.application_url.trim() &&
    !form.application_email.trim()
  ) {
    errors.application =
      "Published jobs require an application URL or email address.";
  }

  const minimumSalary = getOptionalNumber(form.salary_min);
  const maximumSalary = getOptionalNumber(form.salary_max);

  if (
    minimumSalary !== null &&
    maximumSalary !== null &&
    minimumSalary > maximumSalary
  ) {
    errors.salary =
      "The minimum salary cannot be greater than the maximum salary.";
  }

  return errors;
}

// Display a reusable form for creating and editing career openings.
export default function CareerForm({ careerId }: CareerFormProps) {
  const isEditing = Boolean(careerId);

  const [form, setForm] = useState<CareerFormState>(INITIAL_FORM_STATE);

  const [careerOpening, setCareerOpening] = useState<CareerOpening | null>(
    null
  );

  const [errors, setErrors] = useState<CareerFormErrors>({});

  const [loading, setLoading] = useState(isEditing);

  const [saving, setSaving] = useState(false);

  const [slugWasEdited, setSlugWasEdited] = useState(false);

  const pageTitle = useMemo(() => {
    return isEditing ? "Edit job opening" : "Add job opening";
  }, [isEditing]);

  // Retrieve the existing job when the form is being used for editing.
  const loadCareerOpening = useCallback(async () => {
    if (!careerId) {
      return;
    }

    setLoading(true);

    try {
      const record = await getCareerOpeningById(careerId);

      setCareerOpening(record);
      setForm(mapCareerOpeningToForm(record));
      setSlugWasEdited(true);
    } catch (error) {
      console.error("Failed to load career opening:", error);
      toast.error("The job opening could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [careerId]);

  // Load the existing job after the edit form hydrates.
  useEffect(() => {
    void loadCareerOpening();
  }, [loadCareerOpening]);

  // Update one form field while preserving the remaining values.
  const updateField = useCallback(
    <Key extends keyof CareerFormState>(
      field: Key,
      value: CareerFormState[Key]
    ) => {
      setForm((currentForm) => ({
        ...currentForm,
        [field]: value,
      }));

      setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined,
      }));
    },
    []
  );

  // Update the title and automatically generate its slug until manually edited.
  const handleTitleChange = useCallback(
    (value: string) => {
      setForm((currentForm) => ({
        ...currentForm,
        title: value,
        slug: slugWasEdited ? currentForm.slug : generateCareerSlug(value),
      }));

      setErrors((currentErrors) => ({
        ...currentErrors,
        title: undefined,
        slug: undefined,
      }));
    },
    [slugWasEdited]
  );

  // Update and normalize the manually entered slug.
  const handleSlugChange = useCallback((value: string) => {
    setSlugWasEdited(true);

    setForm((currentForm) => ({
      ...currentForm,
      slug: generateCareerSlug(value),
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      slug: undefined,
    }));
  }, []);

  // Save the current form as either a new or existing career opening.
  const saveCareerOpening = useCallback(
    async (statusOverride?: CareerStatus) => {
      if (saving) {
        return;
      }

      const formToSave: CareerFormState = {
        ...form,
        status: statusOverride || form.status,
      };

      const validationErrors = validateCareerForm(formToSave);

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        toast.error("Please correct the highlighted fields.");
        return;
      }

      setSaving(true);
      setErrors({});

      try {
        const careerInput = mapFormToCareerInput(formToSave, careerOpening);

        if (careerId) {
          await updateCareerOpening(careerId, careerInput);
          toast.success("The job opening has been updated.");
        } else {
          await createCareerOpening(careerInput);
          toast.success("The job opening has been created.");
        }

        window.location.href = "/admin/careers";
      } catch (error) {
        console.error("Failed to save career opening:", error);

        const errorMessage = error instanceof Error ? error.message : "";

        if (
          errorMessage.toLowerCase().includes("duplicate") ||
          errorMessage.toLowerCase().includes("slug")
        ) {
          setErrors((currentErrors) => ({
            ...currentErrors,
            slug: "This slug is already being used by another job.",
          }));

          toast.error("Choose a different job slug.");
        } else {
          toast.error("The job opening could not be saved.");
        }
      } finally {
        setSaving(false);
      }
    },
    [careerId, careerOpening, form, saving]
  );

  // Render a loading state while retrieving an existing job.
  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-box-border bg-white/70 dark:bg-box-bg/70">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-primary" />

          <p className="mt-3 text-sm text-heading-3">Loading job opening...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-12">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void saveCareerOpening();
        }}
        className="space-y-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <a
              href="/admin/careers"
              className="inline-flex items-center gap-2 text-sm font-medium text-heading-3 transition hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to career openings
            </a>

            <h1 className="mt-4 text-3xl font-semibold text-heading-1">
              {pageTitle}
            </h1>

            <p className="mt-2 text-sm leading-6 text-heading-3">
              Create and manage the information displayed for this opportunity.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void saveCareerOpening("draft")}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-box-border px-5 text-sm font-medium text-heading-1 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-800"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save draft
            </button>

            <button
              type="button"
              onClick={() => void saveCareerOpening("published")}
              disabled={saving}
              className="inline-flex items-center justify-center py-4 gap-2 rounded-2xl bg-primary px-5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Publish opening
            </button>
          </div>
        </div>

        <FormSection
          title="Basic information"
          description="Enter the main identifying details for the position."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Job title"
              htmlFor="career-title"
              required
              error={errors.title}
            >
              <input
                id="career-title"
                type="text"
                value={form.title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="Microsoft 365 Support Engineer"
                className={getInputClasses(Boolean(errors.title))}
              />
            </FormField>

            <FormField
              label="URL slug"
              htmlFor="career-slug"
              required
              error={errors.slug}
            >
              <div className="flex min-h-12 overflow-hidden rounded-2xl border border-box-border bg-transparent focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                <span className="flex items-center border-r border-box-border px-3 text-sm text-heading-3">
                  /careers/
                </span>

                <input
                  id="career-slug"
                  type="text"
                  value={form.slug}
                  onChange={(event) => handleSlugChange(event.target.value)}
                  placeholder="microsoft-365-support-engineer"
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm text-heading-1 outline-none"
                />
              </div>
            </FormField>

            <FormField label="Department" htmlFor="career-department">
              <input
                id="career-department"
                type="text"
                value={form.department}
                onChange={(event) =>
                  updateField("department", event.target.value)
                }
                placeholder="Cloud Operations"
                className={getInputClasses()}
              />
            </FormField>

            <FormField label="Location" htmlFor="career-location">
              <input
                id="career-location"
                type="text"
                value={form.location}
                onChange={(event) =>
                  updateField("location", event.target.value)
                }
                placeholder="Lagos, Nigeria"
                className={getInputClasses()}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          title="Employment details"
          description="Define the contract and workplace arrangement."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Employment type" htmlFor="career-employment-type">
              <select
                id="career-employment-type"
                value={form.employment_type}
                onChange={(event) =>
                  updateField(
                    "employment_type",
                    event.target.value as EmploymentType
                  )
                }
                className={getInputClasses()}
              >
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="temporary">Temporary</option>
              </select>
            </FormField>

            <FormField label="Workplace type" htmlFor="career-workplace-type">
              <select
                id="career-workplace-type"
                value={form.workplace_type}
                onChange={(event) =>
                  updateField(
                    "workplace_type",
                    event.target.value as WorkplaceType
                  )
                }
                className={getInputClasses()}
              >
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </FormField>
          </div>
        </FormSection>

        <FormSection
          title="Job content"
          description="Describe the role and what successful applicants will do."
        >
          <div className="space-y-5">
            <FormField
              label="Short summary"
              htmlFor="career-summary"
              required
              error={errors.summary}
              description="This will be used on job cards and previews."
            >
              <textarea
                id="career-summary"
                value={form.summary}
                onChange={(event) => updateField("summary", event.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Help customers resolve complex Microsoft 365 and cloud support issues."
                className={getTextareaClasses(Boolean(errors.summary))}
              />
            </FormField>

            <FormField
              label="Job description"
              htmlFor="career-description"
              required
              error={errors.description}
            >
              <textarea
                id="career-description"
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={8}
                placeholder="Provide a detailed overview of the role..."
                className={getTextareaClasses(Boolean(errors.description))}
              />
            </FormField>

            <FormField
              label="Responsibilities"
              htmlFor="career-responsibilities"
              description="Enter each responsibility on a separate line."
            >
              <textarea
                id="career-responsibilities"
                value={form.responsibilities}
                onChange={(event) =>
                  updateField("responsibilities", event.target.value)
                }
                rows={6}
                placeholder={`Administer Microsoft 365 tenants\nTroubleshoot Exchange Online incidents\nDocument technical solutions`}
                className={getTextareaClasses()}
              />
            </FormField>

            <FormField
              label="Requirements"
              htmlFor="career-requirements"
              description="Enter each requirement on a separate line."
            >
              <textarea
                id="career-requirements"
                value={form.requirements}
                onChange={(event) =>
                  updateField("requirements", event.target.value)
                }
                rows={6}
                placeholder={`Three years of technical support experience\nStrong Microsoft 365 knowledge\nExcellent written communication`}
                className={getTextareaClasses()}
              />
            </FormField>

            <FormField
              label="Benefits"
              htmlFor="career-benefits"
              description="Enter each benefit on a separate line."
            >
              <textarea
                id="career-benefits"
                value={form.benefits}
                onChange={(event) =>
                  updateField("benefits", event.target.value)
                }
                rows={5}
                placeholder={`Remote working\nProfessional development\nHealth insurance`}
                className={getTextareaClasses()}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          title="Application details"
          description="Choose how candidates should apply for this role."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Application URL" htmlFor="career-application-url">
              <input
                id="career-application-url"
                type="url"
                value={form.application_url}
                onChange={(event) => {
                  updateField("application_url", event.target.value);
                  setErrors((currentErrors) => ({
                    ...currentErrors,
                    application: undefined,
                  }));
                }}
                placeholder="https://forms.example.com/apply"
                className={getInputClasses(Boolean(errors.application))}
              />
            </FormField>

            <FormField
              label="Application email"
              htmlFor="career-application-email"
            >
              <input
                id="career-application-email"
                type="email"
                value={form.application_email}
                onChange={(event) => {
                  updateField("application_email", event.target.value);
                  setErrors((currentErrors) => ({
                    ...currentErrors,
                    application: undefined,
                  }));
                }}
                placeholder="careers@cloudtweak.net"
                className={getInputClasses(Boolean(errors.application))}
              />
            </FormField>

            <FormField
              label="Application deadline"
              htmlFor="career-application-deadline"
            >
              <input
                id="career-application-deadline"
                type="date"
                value={form.application_deadline}
                onChange={(event) =>
                  updateField("application_deadline", event.target.value)
                }
                className={getInputClasses()}
              />
            </FormField>
          </div>

          {errors.application ? (
            <p className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">
              {errors.application}
            </p>
          ) : null}
        </FormSection>

        <FormSection
          title="Compensation"
          description="Optionally display a salary range on the public job page."
        >
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-box-border p-4">
            <input
              type="checkbox"
              checked={form.show_salary}
              onChange={(event) =>
                updateField("show_salary", event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-box-border text-primary focus:ring-primary"
            />

            <span>
              <span className="block text-sm font-medium text-heading-1">
                Show salary publicly
              </span>

              <span className="mt-1 block text-sm text-heading-3">
                Candidates will see the salary range on the careers page.
              </span>
            </span>
          </label>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <FormField label="Currency" htmlFor="career-salary-currency">
              <select
                id="career-salary-currency"
                value={form.salary_currency}
                onChange={(event) =>
                  updateField("salary_currency", event.target.value)
                }
                disabled={!form.show_salary}
                className={getInputClasses()}
              >
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="CAD">CAD</option>
              </select>
            </FormField>

            <FormField label="Minimum salary" htmlFor="career-salary-min">
              <input
                id="career-salary-min"
                type="number"
                min="0"
                step="1"
                value={form.salary_min}
                onChange={(event) => {
                  updateField("salary_min", event.target.value);
                  setErrors((currentErrors) => ({
                    ...currentErrors,
                    salary: undefined,
                  }));
                }}
                disabled={!form.show_salary}
                placeholder="250000"
                className={getInputClasses(Boolean(errors.salary))}
              />
            </FormField>

            <FormField label="Maximum salary" htmlFor="career-salary-max">
              <input
                id="career-salary-max"
                type="number"
                min="0"
                step="1"
                value={form.salary_max}
                onChange={(event) => {
                  updateField("salary_max", event.target.value);
                  setErrors((currentErrors) => ({
                    ...currentErrors,
                    salary: undefined,
                  }));
                }}
                disabled={!form.show_salary}
                placeholder="450000"
                className={getInputClasses(Boolean(errors.salary))}
              />
            </FormField>
          </div>

          {errors.salary ? (
            <p className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">
              {errors.salary}
            </p>
          ) : null}
        </FormSection>

        <FormSection
          title="Publishing"
          description="Control the visibility and prominence of this opening."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Status" htmlFor="career-status">
              <select
                id="career-status"
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value as CareerStatus)
                }
                className={getInputClasses()}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
              </select>
            </FormField>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-box-border p-4 md:mt-7">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) =>
                  updateField("featured", event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-box-border text-primary focus:ring-primary"
              />

              <span>
                <span className="block text-sm font-medium text-heading-1">
                  Featured opening
                </span>

                <span className="mt-1 block text-sm text-heading-3">
                  Display this opportunity more prominently.
                </span>
              </span>
            </label>
          </div>
        </FormSection>

        <div className="flex flex-col-reverse gap-3 rounded-3xl border border-box-border bg-white/70 p-5 sm:flex-row sm:justify-end dark:bg-box-bg/70">
          <a
            href="/admin/careers"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-box-border px-5 text-sm font-medium text-heading-1 transition hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </a>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <BriefcaseBusiness className="h-4 w-4" />
            )}

            {saving
              ? "Saving..."
              : isEditing
                ? "Update opening"
                : "Create opening"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface FormSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

// Display a consistent card for each group of career fields.
function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="rounded-3xl border border-box-border bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-7 dark:bg-box-bg/70">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-heading-1">{title}</h2>

        <p className="mt-1 text-sm leading-6 text-heading-3">{description}</p>
      </div>

      {children}
    </section>
  );
}

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: React.ReactNode;
}

// Display a field label, its control and supporting validation message.
function FormField({
  label,
  htmlFor,
  required = false,
  description,
  error,
  children,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium text-heading-1"
      >
        {label}

        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>

      {children}

      {description ? (
        <p className="mt-2 text-xs leading-5 text-heading-3">{description}</p>
      ) : null}

      {error ? (
        <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// Return the shared styling for text, number, date and select fields.
function getInputClasses(hasError = false) {
  return [
    "min-h-12 w-full rounded-2xl border bg-transparent px-4 text-sm text-heading-1 outline-none transition",
    "placeholder:text-heading-3 disabled:cursor-not-allowed disabled:opacity-50",
    hasError
      ? "border-red-500 focus:ring-4 focus:ring-red-500/10"
      : "border-box-border focus:border-primary focus:ring-4 focus:ring-primary/10",
  ].join(" ");
}

// Return the shared styling for multiline text fields.
function getTextareaClasses(hasError = false) {
  return [
    "w-full resize-y rounded-2xl border bg-transparent px-4 py-3 text-sm leading-6 text-heading-1 outline-none transition",
    "placeholder:text-heading-3",
    hasError
      ? "border-red-500 focus:ring-4 focus:ring-red-500/10"
      : "border-box-border focus:border-primary focus:ring-4 focus:ring-primary/10",
  ].join(" ");
}
