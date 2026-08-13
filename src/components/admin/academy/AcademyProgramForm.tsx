import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  createAcademyProgram,
  generateAcademySlug,
  getAcademyCategories,
  getAcademyCertificateTemplates,
  getAcademyProgramById,
  updateAcademyProgram,
} from "../../../lib/academy";
import type { AcademyProgramInput } from "../../../lib/academy";
import type {
  AcademyCategory,
  AcademyCertificateTemplate,
  AcademyDeliveryMode,
  AcademyProgramStatus,
} from "../../../types/academy";
import ProgramListField from "./ProgramListField";
import ImageUploader from "../../../blog/ImageUploader";

interface AcademyProgramFormProps {
  mode?: "create" | "edit";
  programId?: string;
}

type AcademyProgramFormState = AcademyProgramInput;

const DEFAULT_PROGRAM_FORM: AcademyProgramFormState = {
  category_id: null,
  certificate_template_id: null,
  title: "",
  slug: "",
  code: null,
  short_description: null,
  description: null,
  hero_image_url: null,
  thumbnail_image_url: null,
  banner_image_url: null,
  delivery_mode: "online",
  location: null,
  duration_value: null,
  duration_unit: null,
  session_schedule: null,
  price: 0,
  discount_price: null,
  currency: "NGN",
  show_price: true,
  start_date: null,
  end_date: null,
  registration_deadline: null,
  maximum_students: null,
  registration_open: false,
  certificate_enabled: true,
  featured: false,
  status: "draft",
  display_order: 0,
  learning_outcomes: [""],
  prerequisites: [""],
  target_audience: [""],
  tools_covered: [""],
  seo_title: null,
  seo_description: null,
};

/**
 * Convert a nullable string into the value expected by a text input.
 */
function toInputValue(value: string | null | undefined) {
  return value ?? "";
}

/**
 * Convert a nullable number into the value expected by a number input.
 */
function toNumberInputValue(value: number | null | undefined) {
  return value ?? "";
}

/**
 * Convert an empty input value into a nullable string.
 */
function toNullableString(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue || null;
}

/**
 * Convert an empty number input into a nullable number.
 */
function toNullableNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isNaN(parsedValue) ? null : parsedValue;
}

/**
 * Convert an ISO date into the value expected by a datetime-local input.
 */
function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

/**
 * Convert a datetime-local value into an ISO date string.
 */
function toISOStringOrNull(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Remove empty values from a repeatable list.
 */
function cleanProgramList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

/**
 * Display the form used to create or edit an Academy program.
 */
export default function AcademyProgramForm({
  mode = "create",
  programId,
}: AcademyProgramFormProps) {
  // Store the current Academy program form values.
  const [form, setForm] =
    useState<AcademyProgramFormState>(DEFAULT_PROGRAM_FORM);

  // Store the available Academy categories.
  const [categories, setCategories] = useState<AcademyCategory[]>([]);

  // Store the available certificate templates.
  const [certificateTemplates, setCertificateTemplates] = useState<
    AcademyCertificateTemplate[]
  >([]);

  // Track whether the initial form data is loading.
  const [loading, setLoading] = useState(true);

  // Track whether the form is being submitted.
  const [submitting, setSubmitting] = useState(false);

  // Track whether the slug was manually edited.
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Store a user-facing loading error.
  const [errorMessage, setErrorMessage] = useState("");

  // Determine whether this form is editing an existing program.
  const isEditMode = mode === "edit";

  /**
   * Update one field in the Academy program form.
   */
  function updateFormField<Key extends keyof AcademyProgramFormState>(
    field: Key,
    value: AcademyProgramFormState[Key]
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  /**
   * Update the title and automatically generate the slug when appropriate.
   */
  function handleTitleChange(value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      title: value,
      slug: slugManuallyEdited ? currentForm.slug : generateAcademySlug(value),
    }));
  }

  /**
   * Update the slug and mark it as manually edited.
   */
  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    updateFormField("slug", generateAcademySlug(value));
  }

  /**
   * Load categories, certificate templates, and an existing program.
   */
  const loadFormData = useCallback(async () => {
    if (isEditMode && !programId) {
      setErrorMessage("A program ID is required to edit this Academy program.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [categoryRecords, certificateTemplateRecords] = await Promise.all([
        getAcademyCategories(),
        getAcademyCertificateTemplates(),
      ]);

      setCategories(categoryRecords);
      setCertificateTemplates(certificateTemplateRecords);

      if (!isEditMode || !programId) {
        return;
      }

      const program = await getAcademyProgramById(programId);

      setForm({
        category_id: program.category_id,
        certificate_template_id: program.certificate_template_id,
        title: program.title,
        slug: program.slug,
        code: program.code,
        short_description: program.short_description,
        description: program.description,
        hero_image_url: program.hero_image_url,
        thumbnail_image_url: program.thumbnail_image_url,
        banner_image_url: program.banner_image_url,
        delivery_mode: program.delivery_mode,
        location: program.location,
        duration_value: program.duration_value,
        duration_unit: program.duration_unit,
        session_schedule: program.session_schedule,
        price: program.price,
        discount_price: program.discount_price,
        currency: program.currency,
        show_price: program.show_price,
        start_date: program.start_date,
        end_date: program.end_date,
        registration_deadline: program.registration_deadline,
        maximum_students: program.maximum_students,
        registration_open: program.registration_open,
        certificate_enabled: program.certificate_enabled,
        featured: program.featured,
        status: program.status,
        display_order: program.display_order,
        learning_outcomes:
          program.learning_outcomes.length > 0
            ? program.learning_outcomes
            : [""],
        prerequisites:
          program.prerequisites.length > 0 ? program.prerequisites : [""],
        target_audience:
          program.target_audience.length > 0 ? program.target_audience : [""],
        tools_covered:
          program.tools_covered.length > 0 ? program.tools_covered : [""],
        seo_title: program.seo_title,
        seo_description: program.seo_description,
      });

      setSlugManuallyEdited(true);
    } catch (error) {
      console.error("Failed to load Academy program form:", error);
      setErrorMessage("The Academy program form could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [isEditMode, programId]);

  // Load the form data after the component hydrates.
  useEffect(() => {
    void loadFormData();
  }, [loadFormData]);

  /**
   * Validate and submit the Academy program form.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    if (!form.title.trim()) {
      toast.error("Program title is required.");
      return;
    }

    if (!form.slug.trim()) {
      toast.error("Program slug is required.");
      return;
    }

    if (form.discount_price !== null && form.discount_price > form.price) {
      toast.error("Discount price cannot be greater than the regular price.");
      return;
    }

    if (
      form.start_date &&
      form.end_date &&
      new Date(form.end_date).getTime() < new Date(form.start_date).getTime()
    ) {
      toast.error("End date cannot be earlier than the start date.");
      return;
    }

    const payload: AcademyProgramInput = {
      ...form,
      title: form.title.trim(),
      slug: generateAcademySlug(form.slug),
      code: form.code?.trim() || null,
      short_description: form.short_description?.trim() || null,
      description: form.description?.trim() || null,
      hero_image_url: form.hero_image_url?.trim() || null,
      thumbnail_image_url: form.thumbnail_image_url?.trim() || null,
      banner_image_url: form.banner_image_url?.trim() || null,
      location: form.location?.trim() || null,
      session_schedule: form.session_schedule?.trim() || null,
      currency: form.currency.trim().toUpperCase() || "NGN",
      learning_outcomes: cleanProgramList(form.learning_outcomes),
      prerequisites: cleanProgramList(form.prerequisites),
      target_audience: cleanProgramList(form.target_audience),
      tools_covered: cleanProgramList(form.tools_covered),
      seo_title: form.seo_title?.trim() || null,
      seo_description: form.seo_description?.trim() || null,
    };

    setSubmitting(true);

    try {
      if (isEditMode && programId) {
        const updatedProgram = await updateAcademyProgram(programId, payload);

        toast.success(`${updatedProgram.title} has been updated.`);

        window.location.href = "/admin/academy/programs";
        return;
      }

      const createdProgram = await createAcademyProgram(payload);

      toast.success(`${createdProgram.title} has been created.`);

      window.location.href = `/admin/academy/programs/${createdProgram.id}/edit`;
    } catch (error) {
      console.error("Failed to save Academy program:", error);
      toast.error("The Academy program could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  // Display the initial loading state.
  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="text-center">
          <LoaderCircle
            size={32}
            className="mx-auto animate-spin text-primary"
          />

          <p className="mt-3 text-sm text-slate-500">
            Loading Academy program form...
          </p>
        </div>
      </div>
    );
  }

  // Display the loading error state.
  if (errorMessage) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
        <p className="font-semibold text-red-700">{errorMessage}</p>

        <button
          type="button"
          onClick={() => {
            void loadFormData();
          }}
          className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <a
            href="/admin/academy/programs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft size={17} />
            Back to programs
          </a>

          <h1 className="mt-2 text-xl font-bold text-slate-950">
            {isEditMode ? "Edit Academy Program" : "Create Academy Program"}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {isEditMode
              ? "Update the program details, pricing, media and publishing settings."
              : "Create a bootcamp, workshop, masterclass or training program."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isEditMode && programId && (
            <>
              <a
                href={`/admin/academy/programs/${programId}/instructors`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
              >
                Manage Instructors
              </a>

              <a
                href={`/admin/academy/programs/${programId}/curriculum`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
              >
                Manage Curriculum
              </a>
            </>
          )}

          <div
            className={`rounded-2xl border px-4 py-1 text-xs ${
              form.status === "published"
                ? "border-green-600 bg-green-600 text-white"
                : form.status === "draft"
                  ? "border-yellow-400 bg-yellow-400 text-black"
                  : "border-slate-300 bg-slate-600 text-white"
            }`}
          >
            <p
              className={
                form.status === "draft" ? "text-black/70" : "text-white"
              }
            >
              Program status:
            </p>

            <p className="mt-1 font-semibold capitalize">{form.status}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-slate-950">
              General Information
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Add the primary details used to identify and describe this
              program.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="program-title"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Program title
              </label>

              <input
                id="program-title"
                type="text"
                value={form.title}
                onChange={(event) => {
                  handleTitleChange(event.target.value);
                }}
                placeholder="Microsoft 365 Administration Bootcamp"
                required
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="program-slug"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                URL slug
              </label>

              <input
                id="program-slug"
                type="text"
                value={form.slug}
                onChange={(event) => {
                  handleSlugChange(event.target.value);
                }}
                placeholder="microsoft-365-administration"
                required
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Public URL: /academy/{form.slug || "program-slug"}
              </p>
            </div>

            <div>
              <label
                htmlFor="program-code"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Program code
              </label>

              <input
                id="program-code"
                type="text"
                value={toInputValue(form.code)}
                onChange={(event) => {
                  updateFormField("code", toNullableString(event.target.value));
                }}
                placeholder="M365-ADMIN-001"
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase text-slate-900 outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="program-category"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Category
              </label>

              <select
                id="program-category"
                value={form.category_id ?? ""}
                onChange={(event) => {
                  updateFormField("category_id", event.target.value || null);
                }}
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Select a category</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="program-delivery-mode"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Delivery mode
              </label>

              <select
                id="program-delivery-mode"
                value={form.delivery_mode}
                onChange={(event) => {
                  updateFormField(
                    "delivery_mode",
                    event.target.value as AcademyDeliveryMode
                  );
                }}
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="online">Online</option>
                <option value="onsite">Onsite</option>
                <option value="hybrid">Hybrid</option>
                <option value="self_paced">Self-paced</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="program-location"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Location
              </label>

              <input
                id="program-location"
                type="text"
                value={toInputValue(form.location)}
                onChange={(event) => {
                  updateFormField(
                    "location",
                    toNullableString(event.target.value)
                  );
                }}
                placeholder="Online or Lagos, Nigeria"
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="program-short-description"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Short description
              </label>

              <textarea
                id="program-short-description"
                value={toInputValue(form.short_description)}
                onChange={(event) => {
                  updateFormField(
                    "short_description",
                    toNullableString(event.target.value)
                  );
                }}
                placeholder="A concise summary displayed on program cards and listing pages."
                rows={3}
                disabled={submitting}
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="program-description"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Full description
              </label>

              <textarea
                id="program-description"
                value={toInputValue(form.description)}
                onChange={(event) => {
                  updateFormField(
                    "description",
                    toNullableString(event.target.value)
                  );
                }}
                placeholder="Describe the program, its purpose and the experience students should expect."
                rows={8}
                disabled={submitting}
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-slate-950">
              Schedule and Capacity
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Configure the program duration, dates, schedule and student
              capacity.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="duration-value"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Duration value
              </label>

              <input
                id="duration-value"
                type="number"
                min="1"
                value={toNumberInputValue(form.duration_value)}
                onChange={(event) => {
                  updateFormField(
                    "duration_value",
                    toNullableNumber(event.target.value)
                  );
                }}
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="duration-unit"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Duration unit
              </label>

              <select
                id="duration-unit"
                value={form.duration_unit ?? ""}
                onChange={(event) => {
                  updateFormField("duration_unit", event.target.value || null);
                }}
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Select duration unit</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="session-schedule"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Session schedule
              </label>

              <input
                id="session-schedule"
                type="text"
                value={toInputValue(form.session_schedule)}
                onChange={(event) => {
                  updateFormField(
                    "session_schedule",
                    toNullableString(event.target.value)
                  );
                }}
                placeholder="Saturdays, 10:00 AM – 1:00 PM"
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="start-date"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Start date
              </label>

              <input
                id="start-date"
                type="datetime-local"
                value={toDateTimeLocalValue(form.start_date)}
                onChange={(event) => {
                  updateFormField(
                    "start_date",
                    toISOStringOrNull(event.target.value)
                  );
                }}
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="end-date"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                End date
              </label>

              <input
                id="end-date"
                type="datetime-local"
                value={toDateTimeLocalValue(form.end_date)}
                onChange={(event) => {
                  updateFormField(
                    "end_date",
                    toISOStringOrNull(event.target.value)
                  );
                }}
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="registration-deadline"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Registration deadline
              </label>

              <input
                id="registration-deadline"
                type="datetime-local"
                value={toDateTimeLocalValue(form.registration_deadline)}
                onChange={(event) => {
                  updateFormField(
                    "registration_deadline",
                    toISOStringOrNull(event.target.value)
                  );
                }}
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="maximum-students"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Maximum students
              </label>

              <input
                id="maximum-students"
                type="number"
                min="1"
                value={toNumberInputValue(form.maximum_students)}
                onChange={(event) => {
                  updateFormField(
                    "maximum_students",
                    toNullableNumber(event.target.value)
                  );
                }}
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-slate-950">Pricing</h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Configure the public price and optional discount.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label
                htmlFor="program-price"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Regular price
              </label>

              <input
                id="program-price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => {
                  updateFormField("price", Number(event.target.value) || 0);
                }}
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="discount-price"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Discount price
              </label>

              <input
                id="discount-price"
                type="number"
                min="0"
                step="0.01"
                value={toNumberInputValue(form.discount_price)}
                onChange={(event) => {
                  updateFormField(
                    "discount_price",
                    toNullableNumber(event.target.value)
                  );
                }}
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="currency"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Currency
              </label>

              <input
                id="currency"
                type="text"
                maxLength={3}
                value={form.currency}
                onChange={(event) => {
                  updateFormField("currency", event.target.value.toUpperCase());
                }}
                placeholder="NGN"
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-slate-950">Media</h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Add image URLs used across the public Academy pages.
            </p>
          </div>

          <div className="grid gap-8">
            <ImageUploader
              label="Hero image"
              description="The large image displayed at the top of the program landing page."
              value={form.hero_image_url}
              bucket="cms-media"
              previewClassName="h-72"
              onChange={(url) => {
                updateFormField("hero_image_url", url);
              }}
              onRemove={() => {
                updateFormField("hero_image_url", null);
              }}
            />

            <ImageUploader
              label="Thumbnail image"
              description="The compact image displayed on program cards and listing pages."
              value={form.thumbnail_image_url}
              bucket="cms-media"
              previewClassName="h-52"
              onChange={(url) => {
                updateFormField("thumbnail_image_url", url);
              }}
              onRemove={() => {
                updateFormField("thumbnail_image_url", null);
              }}
            />

            <ImageUploader
              label="Banner image"
              description="An optional wide image used in promotional Academy sections."
              value={form.banner_image_url}
              bucket="cms-media"
              previewClassName="h-60"
              onChange={(url) => {
                updateFormField("banner_image_url", url);
              }}
              onRemove={() => {
                updateFormField("banner_image_url", null);
              }}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-slate-950">
              Program Content
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Add the outcomes, prerequisites, audience and tools associated
              with this program.
            </p>
          </div>

          <div className="space-y-8">
            <ProgramListField
              label="Learning outcomes"
              description="What students should be able to do after completing the program."
              values={form.learning_outcomes}
              placeholder="Configure and manage a Microsoft 365 tenant"
              onChange={(values) => {
                updateFormField("learning_outcomes", values);
              }}
            />

            <ProgramListField
              label="Prerequisites"
              description="Knowledge or experience students should have before registering."
              values={form.prerequisites}
              placeholder="Basic knowledge of Microsoft 365"
              onChange={(values) => {
                updateFormField("prerequisites", values);
              }}
            />

            <ProgramListField
              label="Target audience"
              description="The people this program is designed for."
              values={form.target_audience}
              placeholder="IT support professionals"
              onChange={(values) => {
                updateFormField("target_audience", values);
              }}
            />

            <ProgramListField
              label="Tools covered"
              description="Products, services and technologies taught during the program."
              values={form.tools_covered}
              placeholder="Exchange Online"
              onChange={(values) => {
                updateFormField("tools_covered", values);
              }}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-slate-950">
              Certificate and SEO
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Assign a certificate template and configure search metadata.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="certificate-template"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Certificate template
              </label>

              <select
                id="certificate-template"
                value={form.certificate_template_id ?? ""}
                onChange={(event) => {
                  updateFormField(
                    "certificate_template_id",
                    event.target.value || null
                  );
                }}
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Use default template</option>

                {certificateTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="seo-title"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                SEO title
              </label>

              <input
                id="seo-title"
                type="text"
                value={toInputValue(form.seo_title)}
                onChange={(event) => {
                  updateFormField(
                    "seo_title",
                    toNullableString(event.target.value)
                  );
                }}
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="seo-description"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                SEO description
              </label>

              <textarea
                id="seo-description"
                value={toInputValue(form.seo_description)}
                onChange={(event) => {
                  updateFormField(
                    "seo_description",
                    toNullableString(event.target.value)
                  );
                }}
                rows={4}
                disabled={submitting}
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-slate-950">Publishing</h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Choose how this program should behave across the Academy.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="program-status"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Program status
              </label>

              <select
                id="program-status"
                value={form.status}
                onChange={(event) => {
                  updateFormField(
                    "status",
                    event.target.value as AcademyProgramStatus
                  );
                }}
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="display-order"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Display order
              </label>

              <input
                id="display-order"
                type="number"
                min="0"
                value={form.display_order}
                onChange={(event) => {
                  updateFormField(
                    "display_order",
                    Number(event.target.value) || 0
                  );
                }}
                disabled={submitting}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => {
                  updateFormField("featured", event.target.checked);
                }}
                disabled={submitting}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Featured program
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Show this program in featured Academy sections.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={form.registration_open}
                onChange={(event) => {
                  updateFormField("registration_open", event.target.checked);
                }}
                disabled={submitting}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Registration open
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Permit students to register for this program.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={form.certificate_enabled}
                onChange={(event) => {
                  updateFormField("certificate_enabled", event.target.checked);
                }}
                disabled={submitting}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Certificate enabled
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Allow certificates to be generated for eligible students.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={form.show_price}
                onChange={(event) => {
                  updateFormField("show_price", event.target.checked);
                }}
                disabled={submitting}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Display price
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Show the program price on public pages.
                </span>
              </span>
            </label>
          </div>
        </section>

        <div className="sticky bottom-4 z-20 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-end">
          <a
            href="/admin/academy/programs"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </a>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}

            {submitting
              ? "Saving program..."
              : isEditMode
                ? "Save changes"
                : "Create program"}
          </button>
        </div>
      </form>
    </div>
  );
}
