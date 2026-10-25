import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock3,
  CreditCard,
  GraduationCap,
  LockKeyhole,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { getSession } from "../../lib/auth";
import { studentSupabase } from "../../lib/superbase";

type Program = {
  id: string;
  title: string;
  slug: string;
  code: string | null;
  short_description: string | null;
  description: string | null;
  hero_image_url: string | null;
  thumbnail_image_url: string | null;
  duration_value: number | null;
  duration_unit: string | null;
  delivery_mode: string | null;
  certificate_enabled: boolean;
  registration_open: boolean;
  registration_deadline: string | null;
  price: number | null;
  discount_price: number | null;
  currency: string | null;
  show_price: boolean;
};

type StudentProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country: string | null;
};

type ExistingEnrollment = {
  id: string;
  status: string;
};

type CheckoutResponse = {
  success: boolean;
  resumed?: boolean;
  alreadyRegistered?: boolean;
  registrationId?: string;
  reference?: string;
  authorizationUrl?: string;
  message?: string;
};

type Props = {
  programSlug: string;
};

export default function StudentAcademyCheckout({ programSlug }: Props) {
  const [program, setProgram] = useState<Program | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [enrollment, setEnrollment] = useState<ExistingEnrollment | null>(null);
  const [studentEmail, setStudentEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [activePolicy, setActivePolicy] = useState<
    "refund" | "terms" | "privacy" | null
  >(null);

  useEffect(() => {
    // Loads the authenticated student's profile, selected program, and existing enrollment.
    async function loadCheckout() {
      setLoading(true);
      setErrorMessage("");
      setInfoMessage("");

      const {
        data: { session },
      } = await getSession();

      if (!session) {
        window.location.replace("/student/login");
        return;
      }

      const authenticatedEmail = session.user.email;

      if (!authenticatedEmail) {
        setErrorMessage(
          "Your Academy account does not have a valid email address."
        );
        setLoading(false);
        return;
      }

      setStudentEmail(authenticatedEmail);
      // Loads the Academy profile belonging to the authenticated account.
      const { data: profileData, error: profileError } = await studentSupabase
        .from("student_profiles")
        .select("id, first_name, last_name, phone, country")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Failed to load student profile:", profileError);
        setErrorMessage("We could not load your Academy profile.");
        setLoading(false);
        return;
      }

      if (!profileData) {
        window.location.replace("/student/complete-profile");
        return;
      }

      setProfile(profileData);

      // Loads the published program from the trusted Academy database.
      const { data: programData, error: programError } = await studentSupabase
        .from("academy_programs")
        .select(
          `
            id,
            title,
            slug,
            code,
            short_description,
            description,
            hero_image_url,
            thumbnail_image_url,
            duration_value,
            duration_unit,
            delivery_mode,
            certificate_enabled,
            registration_open,
            registration_deadline,
            price,
            discount_price,
            currency,
            show_price
          `
        )
        .eq("slug", programSlug)
        .eq("status", "published")
        .maybeSingle();

      if (programError) {
        console.error("Failed to load Academy program:", programError);
        setErrorMessage("We could not load this program.");
        setLoading(false);
        return;
      }

      if (!programData) {
        setErrorMessage("This program could not be found.");
        setLoading(false);
        return;
      }

      setProgram(programData);

      // Checks whether the student already has an active enrollment.
      const { data: enrollmentData, error: enrollmentError } =
        await studentSupabase
          .from("student_enrollments")
          .select("id, status")
          .eq("student_id", profileData.id)
          .eq("program_id", programData.id)
          .in("status", ["pending", "active", "paused", "completed"])
          .maybeSingle();

      if (enrollmentError) {
        console.error("Failed to load existing enrollment:", enrollmentError);
        setErrorMessage("We could not determine your enrollment status.");
        setLoading(false);
        return;
      }

      setEnrollment(enrollmentData);

      // An already enrolled learner should never create another payment.
      if (enrollmentData) {
        setInfoMessage("You already have an enrollment for this program.");
      }

      setLoading(false);
    }

    loadCheckout();
  }, [programSlug]);

  // Displays every error message through the global React Toastify provider.
  useEffect(() => {
    if (!errorMessage) return;

    toast.error(errorMessage);
  }, [errorMessage]);

  // Displays every informational message through the global React Toastify provider.
  useEffect(() => {
    if (!infoMessage) return;

    toast.info(infoMessage);
  }, [infoMessage]);

  const amount = useMemo(() => {
    if (!program) {
      return null;
    }

    if (program.discount_price !== null) {
      return Number(program.discount_price);
    }

    if (program.price !== null) {
      return Number(program.price);
    }

    return null;
  }, [program]);

  const formattedAmount = useMemo(() => {
    if (amount === null || !program) {
      return null;
    }

    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: program.currency || "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  }, [amount, program]);

  const formattedOriginalAmount = useMemo(() => {
    if (
      !program ||
      program.price === null ||
      program.discount_price === null ||
      Number(program.discount_price) >= Number(program.price)
    ) {
      return null;
    }

    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: program.currency || "NGN",
      maximumFractionDigits: 0,
    }).format(Number(program.price));
  }, [program]);

  const hasDiscount = Boolean(formattedOriginalAmount);

  // Starts or resumes the existing Academy registration through the trusted server endpoint.
  async function handlePayment() {
    if (!program || !profile || processing) {
      return;
    }

    if (enrollment) {
      window.location.href = `/student/courses/${program.slug}`;
      return;
    }

    if (!program.registration_open) {
      setErrorMessage("Registration is currently closed for this program.");
      return;
    }

    if (amount === null || amount <= 0) {
      setErrorMessage(
        "A valid payment amount has not been configured for this program."
      );
      return;
    }

    if (!profile.first_name?.trim() || !profile.last_name?.trim()) {
      setErrorMessage(
        "Please complete your Academy profile before continuing."
      );
      return;
    }

    if (!profile.phone?.trim()) {
      setErrorMessage(
        "Please add your phone number to your Academy profile before continuing."
      );
      return;
    }

    if (!profile.country?.trim()) {
      setErrorMessage(
        "Please add your country to your Academy profile before continuing."
      );
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      /*
       * The existing Academy registration API remains the server-side
       * authority for pricing, registration creation/resumption, and
       * Paystack initialization.
       */
      const response = await fetch("/api/academy/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          programId: program.id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: studentEmail,
          phone: profile.phone,
          country: profile.country,
        }),
      });

      const responseText = await response.text();

      let result: CheckoutResponse | null = null;

      try {
        result = responseText
          ? (JSON.parse(responseText) as CheckoutResponse)
          : null;
      } catch {
        result = null;
      }

      if (!response.ok || !result?.success) {
        if (result?.alreadyRegistered) {
          setInfoMessage(
            "This account already has a completed registration for this program."
          );
        }

        throw new Error(
          result?.message ||
            "We could not initialize your payment. Please try again."
        );
      }

      if (!result.authorizationUrl) {
        throw new Error("Paystack did not return a payment authorization URL.");
      }

      if (result.registrationId) {
        sessionStorage.setItem(
          "academy-pending-registration",
          JSON.stringify({
            registrationId: result.registrationId,
            reference: result.reference ?? null,
            programId: program.id,
            programSlug: program.slug,
          })
        );
      }

      /*
       * Paystack owns the hosted payment step. The student's Supabase
       * authentication remains intact because we are only navigating to
       * the Paystack authorization URL.
       */
      window.location.href = result.authorizationUrl;
    } catch (error) {
      console.error("Academy payment initialization failed:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not initialize your payment."
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1fr_380px]">
          <div className="animate-pulse p-7 md:p-10">
            <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-6 h-10 max-w-xl rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 h-10 max-w-md rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-8 h-5 max-w-lg rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 h-5 max-w-md rounded bg-slate-200 dark:bg-slate-800" />
          </div>

          <div className="min-h-[300px] animate-pulse bg-slate-200 dark:bg-slate-800" />
        </div>

        <div className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
      </div>
    );
  }

  if (errorMessage && !program) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-10 text-center shadow-sm dark:border-red-900/50 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950/40">
          <ShoppingBag size={24} />
        </div>

        <h2 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
          Checkout unavailable
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          {errorMessage}
        </p>

        <a
          href={`/student/courses/${programSlug}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Program
        </a>
      </div>
    );
  }

  if (!program || !profile) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
            <div className="flex items-center gap-3">
              <div>
                <p className="mt-1 text-sm text-slate-900 dark:text-white">
                  Hi, {profile.first_name} {profile.last_name}, see what your
                  enrollment includes below:
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-500"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Full course access
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Access the complete curriculum available for your program.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-500"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Learning progress
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Your lesson progress is tracked inside the Student Portal.
                  </p>
                </div>
              </div>

              {program.certificate_enabled && (
                <div className="flex gap-3">
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-500"
                  />

                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Course certificate
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Earn your Academy certificate after completing the
                      required course criteria.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-500"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Student Portal access
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Continue learning from your authenticated Academy account.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-slate-800 dark:text-slate-200">
                <ShieldCheck size={19} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-orange-500">
                  Secure payment
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  Your payment is protected
                </h2>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Payment is securely processed by Paystack. CloudTweak Academy does
              not receive or store your card details. Your enrollment is
              activated only after the payment has been successfully verified.
            </p>

            <p className="mt-5 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Review our policies before proceeding with your payment.
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href="#"
                type="button"
                onClick={() => setActivePolicy("refund")}
                className="text-sm font-semibold text-orange-600 underline underline-offset-4 hover:text-orange-700 dark:text-orange-400"
              >
                Refund Policy
              </a>

              <a
                href="#"
                type="button"
                onClick={() => setActivePolicy("terms")}
                className="text-sm font-semibold text-orange-600 underline underline-offset-4 hover:text-orange-700 dark:text-orange-400"
              >
                Terms &amp; Conditions
              </a>

              <a
                href="#"
                type="button"
                onClick={() => setActivePolicy("privacy")}
                className="text-sm font-semibold text-orange-600 underline underline-offset-4 hover:text-orange-700 dark:text-orange-400"
              >
                Privacy Policy
              </a>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <LockKeyhole size={18} className="shrink-0 text-emerald-500" />

              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                You will be redirected to Paystack's secure payment page. After
                payment, you can return to your Student Portal.
              </p>
            </div>
          </div>
        </section>

        <aside className="h-fit lg:sticky lg:top-24">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-6 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-orange-500">
                Order summary
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                Complete enrollment
              </h2>
            </div>

            <div className="p-6">
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {program.title}
                  </h3>

                  {program.code && (
                    <p className="mt-1 text-xs text-slate-400">
                      {program.code}
                    </p>
                  )}
                </div>
                <div className="flex h-14 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                  <img
                    src={
                      program.thumbnail_image_url ||
                      program.hero_image_url ||
                      program.hero_image_url ||
                      "/images/academy-placeholder.jpg"
                    }
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-500">Program fee</span>

                  <span className="font-medium text-slate-900 dark:text-white">
                    {formattedOriginalAmount || formattedAmount || "—"}
                  </span>
                </div>

                {hasDiscount && (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Current price
                    </span>

                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formattedAmount}
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                  <div className="flex items-end justify-between gap-4">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Total
                    </span>

                    <span className="text-2xl font-bold text-slate-950 dark:text-white">
                      {formattedAmount || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {enrollment ? (
                <a
                  href={`/student/courses/${program.slug}`}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <CheckCircle2 size={17} />
                  Open My Course
                  <ArrowRight size={16} />
                </a>
              ) : program.registration_open ? (
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={processing}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processing ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Preparing secure payment...
                    </>
                  ) : (
                    <>
                      <CreditCard size={17} />
                      Continue to Paystack
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              ) : (
                <div className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Registration is currently closed.
                </div>
              )}

              <div className="mt-5 flex items-start gap-3">
                <ShieldCheck
                  size={17}
                  className="mt-0.5 shrink-0 text-emerald-500"
                />

                <p className="text-[11px] leading-5 text-slate-400 dark:text-slate-500">
                  Secure payment powered by Paystack. Your course access is
                  activated only after payment confirmation.
                </p>
              </div>

              <a
                href={`/student/courses/${program.slug}`}
                className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-orange-500 dark:text-slate-400"
              >
                <ArrowLeft size={14} />
                Back to program
              </a>
            </div>
          </section>
        </aside>
      </div>
      {activePolicy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setActivePolicy(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-modal-title"
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <h2
                id="policy-modal-title"
                className="text-lg font-bold text-slate-950 dark:text-white"
              >
                {activePolicy === "refund"
                  ? "Refund Policy"
                  : activePolicy === "terms"
                    ? "Terms & Conditions"
                    : "Privacy Policy"}
              </h2>

              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                aria-label="Close policy"
                className="rounded-full p-3 text-sm font-semibold text-red-500 transition bg-red-50 hover:bg-red-500 hover:text-white dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X />
              </button>
            </header>

            <div className="overflow-y-auto px-6 py-5 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {activePolicy === "refund" && (
                <div className="space-y-6">
                  <div>
                    <p className="mt-2">
                      Please read our refund policy carefully before enrolling
                      in any of our bootcamps or training programs.
                    </p>
                  </div>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      1. Enrollment &amp; Commitment
                    </h4>
                    <p className="mt-2">
                      By registering for any CloudTweak bootcamp, course, or
                      training program, you agree to the terms outlined in this
                      Refund Policy.
                    </p>
                    <p className="mt-2">
                      Our programs are structured, instructor-led learning
                      experiences that require upfront planning, resource
                      allocation, and limited seat reservations. As such,
                      refunds are governed by the conditions below.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      2. Refund Eligibility
                    </h4>
                    <p className="mt-2">
                      Students may request a refund within 7 calendar days from
                      the official commencement date of the program.
                    </p>
                    <p className="mt-2">To qualify for a refund:</p>
                    <ul className="mt-2 list-disc space-y-2 pl-5">
                      <li>
                        The request must be submitted within the 7-day refund
                        window.
                      </li>
                      <li>
                        The participant must not have excessively consumed
                        course materials, downloadable resources, or recorded
                        sessions.
                      </li>
                      <li>
                        Refund requests must be submitted officially through our
                        support channel or designated contact email.
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      3. Non-Refundable Period
                    </h4>
                    <p className="mt-2">
                      After 7 days from the program commencement date, all
                      payments become non-refundable.
                    </p>
                    <p className="mt-2">This policy applies regardless of:</p>
                    <ul className="mt-2 list-disc space-y-2 pl-5">
                      <li>Attendance status</li>
                      <li>Scheduling conflicts</li>
                      <li>Change of mind</li>
                      <li>Incomplete participation</li>
                      <li>Failure to complete assignments or labs</li>
                    </ul>
                    <p className="mt-2">
                      By continuing participation beyond the first week, you
                      acknowledge and accept the value and access already
                      provided through the program.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      4. Processing Time
                    </h4>
                    <p className="mt-2">
                      Approved refunds are processed within 5–10 business days
                      depending on your payment provider or financial
                      institution.
                    </p>
                    <p className="mt-2">
                      Refunds will be issued using the original payment method
                      whenever possible.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      5. Program Transfers
                    </h4>
                    <p className="mt-2">
                      In certain situations, eligible participants may request:
                    </p>
                    <ul className="mt-2 list-disc space-y-2 pl-5">
                      <li>Transfer to a future cohort</li>
                      <li>Credit toward another training program</li>
                    </ul>
                    <p className="mt-2">
                      Transfer requests are reviewed on a case-by-case basis and
                      are not guaranteed.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      6. Cancellation by CloudTweak
                    </h4>
                    <p className="mt-2">
                      If a program is canceled by CloudTweak for operational
                      reasons, enrolled participants will receive either:
                    </p>
                    <ul className="mt-2 list-disc space-y-2 pl-5">
                      <li>A full refund</li>
                      <li>
                        The option to transfer enrollment to a future session
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      7. Chargebacks &amp; Payment Disputes
                    </h4>
                    <p className="mt-2">
                      Initiating unauthorized chargebacks or payment disputes
                      without first contacting our support team may result in:
                    </p>
                    <ul className="mt-2 list-disc space-y-2 pl-5">
                      <li>Immediate suspension from the program</li>
                      <li>
                        Revocation of access to course materials and communities
                      </li>
                      <li>Restriction from future enrollments</li>
                    </ul>
                    <p className="mt-2">
                      We encourage all participants to contact us directly so we
                      can resolve concerns professionally and efficiently.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      8. Contact Us
                    </h4>
                    <p className="mt-2"></p>
                    <p>
                      For refund inquiries or billing-related questions, please
                      contact CloudTweak Academy through our designated support
                      channel or contact email. {"  "}
                      <span className="text-orange-500">
                        support@cloudtweak.net
                      </span>
                    </p>
                  </section>
                </div>
              )}

              {activePolicy === "terms" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      CloudTweak Academy Terms &amp; Conditions
                    </h3>
                    <p className="mt-2">
                      By enrolling in any CloudTweak program or using our
                      platform, you agree to comply with these terms.
                    </p>
                  </div>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      1. Eligibility
                    </h4>
                    <p className="mt-2">
                      Participants must be at least 18 years old or have the
                      permission of a parent or guardian before enrolling in any
                      CloudTweak program.
                    </p>
                    <p className="mt-2">
                      You are responsible for ensuring that your device,
                      internet connection, and software environment are adequate
                      for participating in online training.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      2. Enrollment &amp; Payments
                    </h4>
                    <p className="mt-2">
                      Enrollment into any bootcamp or training program is
                      confirmed only after successful payment processing.
                    </p>
                    <p className="mt-2">
                      CloudTweak reserves the right to refuse, suspend, or
                      cancel enrollment in situations involving payment
                      disputes, fraudulent activity, or violations of these
                      terms.
                    </p>
                    <p className="mt-2">
                      All pricing displayed on our platform is subject to change
                      without prior notice.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      3. Refund Policy
                    </h4>
                    <p className="mt-2">
                      Refund requests are governed by our official Refund
                      Policy.
                    </p>
                    <p className="mt-2">
                      Participants may request refunds only within the eligible
                      refund period stated in the Refund Policy page.
                    </p>
                    <p className="mt-2">
                      After the refund eligibility window expires, all payments
                      become non-refundable.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActivePolicy("refund")}
                      className="mt-3 font-semibold text-orange-600 underline underline-offset-4 hover:text-orange-700 dark:text-orange-400"
                    >
                      Read our Refund Policy
                    </button>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      4. Intellectual Property
                    </h4>
                    <p className="mt-2">
                      All training materials, presentations, labs, recordings,
                      documentation, videos, and downloadable resources provided
                      by CloudTweak remain the intellectual property of
                      CloudTweak Academy.
                    </p>
                    <p className="mt-2">Participants may not:</p>
                    <ul className="mt-2 list-disc space-y-2 pl-5">
                      <li>Redistribute course materials.</li>
                      <li>
                        Resell or commercially reproduce training content.
                      </li>
                      <li>Share private learning resources publicly.</li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      5. Account &amp; Access Restrictions
                    </h4>
                    <p className="mt-2">
                      Access to training platforms, communities, labs, and
                      recordings is intended solely for the enrolled
                      participant.
                    </p>
                    <p className="mt-2">
                      Sharing accounts, login credentials, or private access
                      links with unauthorized individuals is prohibited.
                    </p>
                    <p className="mt-2">
                      CloudTweak reserves the right to suspend or revoke access
                      where misuse or unauthorized sharing is detected.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      6. Code of Conduct
                    </h4>
                    <p className="mt-2">
                      Participants are expected to maintain respectful,
                      professional, and constructive behavior throughout all
                      CloudTweak programs and communities.
                    </p>
                    <p className="mt-2">
                      Harassment, abuse, discrimination, disruptive conduct, or
                      malicious behavior toward instructors, staff, or fellow
                      participants will not be tolerated.
                    </p>
                    <p className="mt-2">
                      Violations may result in immediate removal from the
                      program without refund.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      7. No Employment Guarantee
                    </h4>
                    <p className="mt-2">
                      CloudTweak Academy provides educational and practical
                      training experiences designed to improve participants’
                      technical skills.
                    </p>
                    <p className="mt-2">
                      However, enrollment or completion of any program does not
                      guarantee:
                    </p>
                    <ul className="mt-2 list-disc space-y-2 pl-5">
                      <li>Employment opportunities.</li>
                      <li>Job placement.</li>
                      <li>Certification success.</li>
                      <li>Career advancement outcomes.</li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      8. Third-Party Services
                    </h4>
                    <p className="mt-2">
                      Certain practical labs or demonstrations may involve
                      third-party platforms, including Microsoft 365 services,
                      Microsoft Azure, Power Platform, or other external tools.
                    </p>
                    <p className="mt-2">
                      CloudTweak is not responsible for outages, service
                      interruptions, pricing changes, or policy changes
                      introduced by third-party providers.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      9. Limitation of Liability
                    </h4>
                    <p className="mt-2">
                      CloudTweak Academy shall not be held liable for:
                    </p>
                    <ul className="mt-2 list-disc space-y-2 pl-5">
                      <li>Indirect or consequential losses.</li>
                      <li>Technical interruptions or platform downtime.</li>
                      <li>
                        Personal business or career decisions made based on
                        training content.
                      </li>
                    </ul>
                    <p className="mt-2">
                      All services are provided on an “as available” basis.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      10. Changes to Programs &amp; Content
                    </h4>
                    <p className="mt-2">
                      CloudTweak reserves the right to modify, update, improve,
                      or restructure training materials, schedules, instructors,
                      and program content at any time.
                    </p>
                    <p className="mt-2">
                      We continuously improve our curriculum to align with
                      evolving Microsoft technologies and industry best
                      practices.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      11. Termination of Access
                    </h4>
                    <p className="mt-2">
                      CloudTweak may suspend or terminate access to any
                      participant who violates these Terms &amp; Conditions,
                      engages in misconduct, or compromises the integrity of our
                      learning environment.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      12. Privacy
                    </h4>
                    <p className="mt-2">
                      Your use of CloudTweak services may involve the collection
                      and processing of limited personal information required
                      for enrollment, communication, and service delivery.
                    </p>
                    <p className="mt-2">
                      Additional information regarding data handling practices
                      may be outlined in our Privacy Policy.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActivePolicy("privacy")}
                      className="mt-3 font-semibold text-orange-600 underline underline-offset-4 hover:text-orange-700 dark:text-orange-400"
                    >
                      Read our Privacy Policy
                    </button>
                  </section>

                  <section>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      13. Contact Information
                    </h4>

                    <p>
                      If you have questions regarding these Terms and
                      conditions, or your personal information, please contact:{" "}
                      {"  "}
                      <span className="text-orange-500">
                        support@cloudtweak.net
                      </span>
                    </p>
                  </section>
                </div>
              )}

              {activePolicy === "privacy" && (
                <div className="space-y-6">
                  <p>
                    CloudTweak Academy (“CloudTweak”, “we”, “our”, or “us”)
                    respects your privacy and is committed to protecting your
                    personal information.
                  </p>

                  <p>
                    This Privacy Policy explains how we collect, use, store, and
                    protect your information when you use our website, enroll in
                    our bootcamps, access training resources, or interact with
                    our services.
                  </p>

                  <section className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      1. Information We Collect
                    </h3>
                    <p>
                      We may collect personal and technical information
                      including:
                    </p>
                    <ul className="list-disc space-y-1 pl-6">
                      <li>Full name and contact details</li>
                      <li>Email address and communication records</li>
                      <li>Payment and billing information</li>
                      <li>Enrollment and training activity</li>
                      <li>Device, browser, and IP address information</li>
                      <li>Website analytics and usage data</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      2. How We Use Your Information
                    </h3>
                    <p>We use collected information to:</p>
                    <ul className="list-disc space-y-1 pl-6">
                      <li>Process enrollments and payments</li>
                      <li>Deliver training programs and learning resources</li>
                      <li>Provide customer support and communication</li>
                      <li>
                        Improve our website, services, and learning experience
                      </li>
                      <li>Monitor platform security and prevent abuse</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      3. Payment Information
                    </h3>
                    <p>
                      Payments may be processed through trusted third-party
                      payment providers.
                    </p>
                    <p>
                      CloudTweak does not directly store complete credit card or
                      banking details on our servers unless explicitly stated by
                      the payment provider.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      4. Cookies &amp; Analytics
                    </h3>
                    <p>
                      Our website may use cookies, analytics tools, and tracking
                      technologies to improve user experience and understand
                      website usage patterns.
                    </p>
                    <p>Cookies may be used for:</p>
                    <ul className="list-disc space-y-1 pl-6">
                      <li>Session management</li>
                      <li>Analytics and performance monitoring</li>
                      <li>Improving website functionality</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      5. Data Sharing
                    </h3>
                    <p>
                      CloudTweak does not sell, rent, or trade your personal
                      information to third parties.
                    </p>
                    <p>
                      We may share limited information with trusted service
                      providers strictly for operational purposes such as:
                    </p>
                    <ul className="list-disc space-y-1 pl-6">
                      <li>Payment processing</li>
                      <li>Email communication services</li>
                      <li>Analytics and infrastructure hosting</li>
                    </ul>
                    <p>
                      These providers are expected to maintain appropriate
                      security and confidentiality standards.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      6. Data Security
                    </h3>
                    <p>
                      We implement reasonable administrative, technical, and
                      organizational measures to help protect your information
                      against unauthorized access, disclosure, or misuse.
                    </p>
                    <p>
                      However, no internet-based platform or storage system can
                      be guaranteed to be completely secure.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      7. Retention of Information
                    </h3>
                    <p>
                      We may retain certain information for operational, legal,
                      compliance, educational, or support purposes.
                    </p>
                    <p>
                      Retention periods may vary depending on the type of data
                      collected and applicable business requirements.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      8. Third-Party Platforms
                    </h3>
                    <p>
                      CloudTweak training programs may integrate with
                      third-party platforms such as Microsoft 365, Microsoft
                      Azure, Tally, Selar, Chatbase, or other external services.
                    </p>
                    <p>
                      Your interactions with third-party services are governed
                      by their respective privacy policies and terms.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      9. Your Rights
                    </h3>
                    <p>
                      Depending on your location and applicable laws, you may
                      have rights relating to your personal information,
                      including the ability to:
                    </p>
                    <ul className="list-disc space-y-1 pl-6">
                      <li>Request access to your data</li>
                      <li>Request correction of inaccurate information</li>
                      <li>Request deletion of certain information</li>
                      <li>Opt out of non-essential communications</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      10. Children's Privacy
                    </h3>
                    <p>
                      CloudTweak Academy services are not directed toward
                      children under 13 years old.
                    </p>
                    <p>
                      We do not knowingly collect personal information from
                      children without appropriate parental consent.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      11. Changes to This Policy
                    </h3>
                    <p>
                      CloudTweak may update or revise this Privacy Policy
                      periodically to reflect operational, legal, or
                      technological changes.
                    </p>
                    <p>
                      Continued use of our services after updates constitutes
                      acceptance of the revised policy.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      12. Contact Us
                    </h3>
                    <p>
                      If you have questions regarding this Privacy Policy or
                      your personal information, please contact: {"  "}
                      <span className="text-orange-500">
                        support@cloudtweak.net
                      </span>
                    </p>
                  </section>
                </div>
              )}
            </div>

            <footer className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                className="w-full rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Return to checkout
              </button>
            </footer>
          </section>
        </div>
      )}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}
