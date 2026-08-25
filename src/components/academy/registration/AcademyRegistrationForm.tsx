import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";

interface AcademyRegistrationFormProps {
  programId: string;
  programSlug: string;
  programTitle: string;
  programImage?: string | null;
  amount: number;
  currency: string;
  duration?: string | null;
  startDate?: string | null;
  certificateEnabled?: boolean;
  registrationOpen?: boolean;
}

interface RegistrationFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  learningGoal: string;
  referralSource: string;
  availability: string;
}

interface AcademyRegistrationApiResponse {
  success: boolean;
  message: string;
  authorizationUrl?: string;
  registrationId?: string;
  reference?: string;
  resumed?: boolean;
  alreadyRegistered?: boolean;
}

const DEFAULT_FORM_STATE: RegistrationFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "",
  state: "",
  city: "",
  learningGoal: "",
  referralSource: "",
  availability: "",
};

/**
 * Format the displayed program price.
 *
 * The backend still reloads the trusted price from Supabase before
 * initializing Paystack. This frontend value is only for display.
 */
function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency || "NGN"} ${amount.toLocaleString("en-US")}`;
  }
}

/**
 * Format an ISO date for the registration summary.
 */
function formatDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Display the native registration form for one Academy program.
 */
export default function AcademyRegistrationForm({
  programId,
  programSlug,
  programTitle,
  programImage,
  amount,
  currency,
  duration,
  startDate,
  certificateEnabled = true,
  registrationOpen = true,
}: AcademyRegistrationFormProps) {
  // Store all learner registration values.
  const [form, setForm] = useState<RegistrationFormState>(DEFAULT_FORM_STATE);

  // Track whether the registration request is running.
  const [submitting, setSubmitting] = useState(false);

  // Store a page-level submission error.
  const [errorMessage, setErrorMessage] = useState("");

  // Format summary values once unless their source values change.
  const formattedAmount = useMemo(() => {
    return formatPrice(amount, currency);
  }, [amount, currency]);

  const formattedStartDate = useMemo(() => {
    return formatDate(startDate);
  }, [startDate]);

  /**
   * Update one registration form field.
   */
  function updateFormField<Key extends keyof RegistrationFormState>(
    field: Key,
    value: RegistrationFormState[Key]
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  /**
   * Validate the required registration fields before submission.
   */
  function validateForm() {
    if (!form.firstName.trim()) {
      return "First name is required.";
    }

    if (!form.lastName.trim()) {
      return "Last name is required.";
    }

    if (!form.email.trim()) {
      return "Email address is required.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(form.email.trim())) {
      return "Enter a valid email address.";
    }

    if (!form.phone.trim()) {
      return "WhatsApp number is required.";
    }

    if (!form.country.trim()) {
      return "Country is required.";
    }

    return null;
  }

  /**
   * Create or resume the registration and redirect to Paystack.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Prevent the browser from submitting the form normally.
    event.preventDefault();

    // Prevent duplicate requests while one is already active.
    if (submitting || !registrationOpen) {
      return;
    }

    // Clear any error left by a previous request.
    setErrorMessage("");

    // Validate required fields before contacting the API.
    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      toast.error(validationError);

      return;
    }

    // Start the form submission state.
    setSubmitting(true);

    try {
      /*
       * Submit only learner and program identifiers.
       * The amount is deliberately excluded because the API loads the
       * trusted amount directly from Supabase.
       */
      const response = await fetch("/api/academy/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          programId,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          country: form.country.trim(),
          state: form.state.trim() || undefined,
          city: form.city.trim() || undefined,
          learningGoal: form.learningGoal.trim() || undefined,
          referralSource: form.referralSource || undefined,
          availability: form.availability || undefined,
        }),
      });

      // Read the API response regardless of its HTTP status.
      const result = (await response.json()) as AcademyRegistrationApiResponse;

      /*
       * Show rejected registration attempts as a toast.
       * Do not store these as inline form errors because they may be
       * outside the learner's viewport on smaller screens.
       */
      if (!response.ok || !result.success) {
        const message =
          result.message || "Your registration could not be processed.";

        toast.error(message);

        return;
      }

      // Stop when the API does not return a Paystack checkout URL.
      if (!result.authorizationUrl) {
        toast.error(
          "Your registration was created, but payment could not be opened."
        );

        return;
      }

      // Let the learner know when an existing registration was resumed.
      if (result.resumed) {
        toast.info(
          "Your existing registration has been resumed. Redirecting to payment..."
        );
      } else {
        toast.success("Registration created. Redirecting to secure payment...");
      }

      // Redirect the learner to the Paystack authorization page.
      window.location.href = result.authorizationUrl;
    } catch (error) {
      // Log unexpected client-side errors for debugging.
      console.error("Academy registration submission failed:", error);

      toast.error(
        "A network error occurred. Please check your connection and try again."
      );
    } finally {
      // End the loading state when no redirect has occurred.
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <section className="rounded-3xl border border-box-border bg-box-bg p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Academy Registration
          </p>

          <h1 className="mt-3 text-3xl font-bold text-heading-1">
            Register for {programTitle}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-heading-3">
            Complete your details below. Your registration will be saved before
            you are redirected to Paystack for secure payment.
          </p>
        </div>

        {!registrationOpen ? (
          <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Registration is currently closed for this program.
          </div>
        ) : null}

        {errorMessage ? toast.error(errorMessage) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <section>
            <h2 className="text-lg font-bold text-heading-1">
              Personal information
            </h2>

            <p className="mt-1 text-sm text-heading-3">
              Fields marked with an asterisk are required.
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="academy-first-name"
                  className="mb-2 block text-sm font-semibold text-heading-1"
                >
                  First name *
                </label>

                <input
                  id="academy-first-name"
                  type="text"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={(event) => {
                    updateFormField("firstName", event.target.value);
                  }}
                  required
                  disabled={submitting || !registrationOpen}
                  className="min-h-12 w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading-1 outline-none transition placeholder:text-heading-3 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="academy-last-name"
                  className="mb-2 block text-sm font-semibold text-heading-1"
                >
                  Last name *
                </label>

                <input
                  id="academy-last-name"
                  type="text"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={(event) => {
                    updateFormField("lastName", event.target.value);
                  }}
                  required
                  disabled={submitting || !registrationOpen}
                  className="min-h-12 w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading-1 outline-none transition placeholder:text-heading-3 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="academy-email"
                  className="mb-2 block text-sm font-semibold text-heading-1"
                >
                  Email address *
                </label>

                <input
                  id="academy-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => {
                    updateFormField("email", event.target.value);
                  }}
                  required
                  disabled={submitting || !registrationOpen}
                  className="min-h-12 w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading-1 outline-none transition placeholder:text-heading-3 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="academy-phone"
                  className="mb-2 block text-sm font-semibold text-heading-1"
                >
                  WhatsApp number *
                </label>

                <input
                  id="academy-phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) => {
                    updateFormField("phone", event.target.value);
                  }}
                  placeholder="+234..."
                  required
                  disabled={submitting || !registrationOpen}
                  className="min-h-12 w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading-1 outline-none transition placeholder:text-heading-3 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="academy-country"
                  className="mb-2 block text-sm font-semibold text-heading-1"
                >
                  Country *
                </label>

                <input
                  id="academy-country"
                  type="text"
                  autoComplete="country-name"
                  value={form.country}
                  onChange={(event) => {
                    updateFormField("country", event.target.value);
                  }}
                  required
                  disabled={submitting || !registrationOpen}
                  className="min-h-12 w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading-1 outline-none transition placeholder:text-heading-3 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="academy-state"
                  className="mb-2 block text-sm font-semibold text-heading-1"
                >
                  State
                </label>

                <input
                  id="academy-state"
                  type="text"
                  autoComplete="address-level1"
                  value={form.state}
                  onChange={(event) => {
                    updateFormField("state", event.target.value);
                  }}
                  disabled={submitting || !registrationOpen}
                  className="min-h-12 w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading-1 outline-none transition placeholder:text-heading-3 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="academy-city"
                  className="mb-2 block text-sm font-semibold text-heading-1"
                >
                  City
                </label>

                <input
                  id="academy-city"
                  type="text"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(event) => {
                    updateFormField("city", event.target.value);
                  }}
                  disabled={submitting || !registrationOpen}
                  className="min-h-12 w-full rounded-xl border border-box-border bg-body px-4 py-3 text-sm text-heading-1 outline-none transition placeholder:text-heading-3 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>
          </section>

          <section className="border-t border-box-border pt-8">
            <h2 className="text-lg font-bold text-heading-1">
              Learning information
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <label
                  htmlFor="academy-learning-goal"
                  className="mb-2 block text-sm font-semibold text-heading-1"
                >
                  What do you hope to achieve?
                </label>

                <textarea
                  id="academy-learning-goal"
                  value={form.learningGoal}
                  onChange={(event) => {
                    updateFormField("learningGoal", event.target.value);
                  }}
                  placeholder="Tell us about your learning or career goal."
                  rows={5}
                  disabled={submitting || !registrationOpen}
                  className="w-full resize-y rounded-xl border border-box-border bg-body px-4 py-3 text-sm leading-6 text-heading-1 outline-none transition placeholder:text-heading-3 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="academy-referral-source"
                    className="mb-2 block text-sm font-semibold text-heading-1"
                  >
                    How did you hear about us?
                  </label>

                  <select
                    id="academy-referral-source"
                    value={form.referralSource}
                    onChange={(event) => {
                      updateFormField("referralSource", event.target.value);
                    }}
                    disabled={submitting || !registrationOpen}
                    className="min-h-12 w-full rounded-xl border border-box-border bg-body px-4 text-sm text-heading-1 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Select an option</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Google">Google</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Friend or colleague">
                      Friend or colleague
                    </option>
                    <option value="Existing student">Existing student</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="academy-availability"
                    className="mb-2 block text-sm font-semibold text-heading-1"
                  >
                    Preferred learning schedule
                  </label>

                  <select
                    id="academy-availability"
                    value={form.availability}
                    onChange={(event) => {
                      updateFormField("availability", event.target.value);
                    }}
                    disabled={submitting || !registrationOpen}
                    className="min-h-12 w-full rounded-xl border border-box-border bg-body px-4 text-sm text-heading-1 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Select an option</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                    <option value="Weekend">Weekend</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-box-border pt-8">
            <label className="flex items-start gap-3 text-sm leading-6 text-heading-3">
              <input
                type="checkbox"
                required
                disabled={submitting || !registrationOpen}
                className="mt-1 h-4 w-4 shrink-0 rounded border-box-border text-primary focus:ring-primary"
              />

              <span>
                I confirm that the information supplied is accurate and agree to
                the Academy terms, privacy policy and refund policy.
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting || !registrationOpen}
              className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <LockKeyhole size={18} />
              )}

              {submitting
                ? "Preparing secure payment..."
                : `Proceed to payment · ${formattedAmount}`}

              {!submitting ? <ArrowRight size={18} /> : null}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-heading-3">
              Your payment will be processed securely by Paystack.
            </p>
          </div>
        </form>
      </section>

      <aside className="lg:sticky lg:top-24">
        <section className="overflow-hidden rounded-3xl border border-box-border bg-box-bg shadow-xl">
          {programImage ? (
            <img
              src={programImage}
              alt={`${programTitle} cover`}
              className="aspect-video w-full object-cover"
            />
          ) : null}

          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Registration summary
            </p>

            <h2 className="mt-3 text-xl font-bold leading-7 text-heading-1">
              {programTitle}
            </h2>

            <div className="mt-6 space-y-4 border-y border-box-border py-6">
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-heading-3">Program fee</span>

                <span className="text-right text-lg font-bold text-heading-1">
                  {formattedAmount}
                </span>
              </div>

              {duration ? (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-heading-3">Duration</span>

                  <span className="text-right text-sm font-semibold text-heading-1">
                    {duration}
                  </span>
                </div>
              ) : null}

              {formattedStartDate ? (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-heading-3">Start date</span>

                  <span className="text-right text-sm font-semibold text-heading-1">
                    {formattedStartDate}
                  </span>
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-heading-3">Certificate</span>

                <span className="text-right text-sm font-semibold text-heading-1">
                  {certificateEnabled ? "Included" : "Not included"}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-500"
                />

                <p className="text-sm leading-6 text-heading-3">
                  Your registration is saved before payment.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-500"
                />

                <p className="text-sm leading-6 text-heading-3">
                  An incomplete payment can be resumed later using the same
                  email address.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <LockKeyhole
                  size={18}
                  className="mt-0.5 shrink-0 text-primary"
                />

                <p className="text-sm leading-6 text-heading-3">
                  Payment details are handled securely by Paystack.
                </p>
              </div>
            </div>

            <a
              href={`/academy/${programSlug}`}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-3"
            >
              Review program details
              <ArrowRight size={16} />
            </a>
          </div>
        </section>
      </aside>
    </div>
  );
}
