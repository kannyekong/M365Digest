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
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { getSession } from "../../lib/auth";
import { supabase } from "../../lib/superbase";

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
      const { data: profileData, error: profileError } = await supabase
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
      const { data: programData, error: programError } = await supabase
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
      const { data: enrollmentData, error: enrollmentError } = await supabase
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
      {/* {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          {errorMessage}
        </div>
      )} */}

      <section className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="p-7 md:p-10 lg:p-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
              <Sparkles size={13} />
              Enrollment
            </span>

            {program.code && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {program.code}
              </span>
            )}
          </div>

          <h1 className="mt-6 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 dark:text-white md:text-4xl">
            Secure your place in{" "}
            <span className="text-orange-500">{program.title}</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {program.short_description ||
              "Complete your enrollment and continue your learning journey with CloudTweak Academy."}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <Clock3 size={18} className="text-orange-500" />

              <p className="mt-3 text-xs text-slate-400">Duration</p>

              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {program.duration_value
                  ? `${program.duration_value} ${program.duration_unit ?? ""}`
                  : "Flexible"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <GraduationCap size={18} className="text-blue-500" />

              <p className="mt-3 text-xs text-slate-400">Delivery</p>

              <p className="mt-1 text-sm font-semibold capitalize text-slate-900 dark:text-white">
                {program.delivery_mode || "Online"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <Award size={18} className="text-emerald-500" />

              <p className="mt-3 text-xs text-slate-400">Certificate</p>

              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {program.certificate_enabled ? "Included" : "Not included"}
              </p>
            </div>
          </div>
        </div>

        <div className="relative min-h-[300px] overflow-hidden lg:min-h-full">
          <img
            src={
              program.hero_image_url ||
              program.hero_image_url ||
              program.thumbnail_image_url ||
              "/images/academy-placeholder.jpg"
            }
            alt={program.title}
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

          <div className="absolute bottom-6 left-6 right-6">
            <div className="rounded-2xl border border-white/20 bg-white/90 p-4 shadow-xl backdrop-blur dark:bg-slate-950/90">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Your enrollment
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {profile.first_name} {profile.last_name}
              </p>

              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                Your Academy account
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-950/40">
                <CheckCircle2 size={19} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-orange-500">
                  Included
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  What your enrollment includes
                </h2>
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
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
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                  <img
                    src={
                      program.thumbnail_image_url ||
                      program.hero_image_url ||
                      program.hero_image_url ||
                      "/images/academy-placeholder.jpg"
                    }
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>

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
