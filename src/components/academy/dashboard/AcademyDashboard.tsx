import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  GraduationCap,
  LoaderCircle,
  RefreshCw,
  UserRoundCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAcademyDashboardData,
  type AcademyDashboardData,
  type AcademyRecentPayment,
  type AcademyRecentRegistration,
  type AcademyUpcomingProgram,
} from "../../../lib/academyDashboard";

interface DashboardMetric {
  label: string;
  value: string;
  description: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
  color: string;
}

/**
 * Format a currency amount for the Academy dashboard.
 */
function formatCurrency(amount: number, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-US")}`;
  }
}

/**
 * Format a date for compact dashboard display.
 */
function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Format a date with time for recent activity.
 */
function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * Convert an underscore-separated status into a readable label.
 */
function formatStatus(value: string) {
  return value
    .split("_")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Return the payment-status badge classes.
 */
function getPaymentStatusClasses(status: string) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700";

    case "failed":
      return "bg-red-100 text-red-700";

    case "processing":
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

/**
 * Return the registration-status badge classes.
 */
function getRegistrationStatusClasses(status: string) {
  switch (status) {
    case "confirmed":
    case "enrolled":
    case "completed":
      return "bg-emerald-100 text-emerald-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

/**
 * Display one dashboard metric card.
 */
function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metric.icon;

  return (
    <a
      href={metric.href}
      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-${metric.color} text-primary`}
        >
          <Icon size={21} />
        </div>

        <ArrowRight
          size={17}
          className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-primary"
        />
      </div>

      <p className="mt-2 text-2xl font-bold text-slate-950">{metric.value}</p>

      <p className="text-sm font-semibold text-slate-700">
        {metric.label}
      </p>

      <p className="text-xs leading-5 text-slate-500">
        {metric.description}
      </p>
    </a>
  );
}

/**
 * Display one recent Academy payment.
 */
function RecentPaymentRow({ payment }: { payment: AcademyRecentPayment }) {
  const amount = payment.amount_paid ?? payment.amount_expected ?? 0;

  return (
    <article className="flex flex-col gap-4 border-b border-slate-200 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-slate-950">
          {payment.first_name} {payment.last_name}
        </p>

        <p className="mt-1 truncate text-sm text-slate-500">
          {payment.program?.title ?? "Unknown Academy program"}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {formatDateTime(payment.paid_at ?? payment.created_at)}
        </p>
      </div>

      <div className="shrink-0 text-left sm:text-right">
        <p className="font-bold text-emerald-600">
          {formatCurrency(Number(amount), payment.currency)}
        </p>

        <p className="mt-1 max-w-[210px] truncate text-xs text-slate-400">
          {payment.payment_reference ?? "No payment reference"}
        </p>
      </div>
    </article>
  );
}

/**
 * Display one recent Academy registration.
 */
function RecentRegistrationRow({
  registration,
}: {
  registration: AcademyRecentRegistration;
}) {
  return (
    <article className="flex flex-col gap-4 border-b border-slate-200 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-slate-950">
          {registration.first_name} {registration.last_name}
        </p>

        <p className="mt-1 truncate text-sm text-slate-500">
          {registration.program?.title ?? "Unknown Academy program"}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {formatDateTime(registration.created_at)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getRegistrationStatusClasses(
            registration.registration_status
          )}`}
        >
          {formatStatus(registration.registration_status)}
        </span>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentStatusClasses(
            registration.payment_status
          )}`}
        >
          {formatStatus(registration.payment_status)}
        </span>
      </div>
    </article>
  );
}

/**
 * Display one upcoming Academy program.
 */
function UpcomingProgramCard({ program }: { program: AcademyUpcomingProgram }) {
  const image = program.thumbnail_image_url ?? program.hero_image_url;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {image ? (
        <img
          src={image}
          alt={`${program.title} cover`}
          className="h-32 w-full object-cover"
        />
      ) : (
        <div className="flex h-32 items-center justify-center bg-slate-100 text-slate-400">
          <GraduationCap size={34} />
        </div>
      )}

      <div className="p-4">
        <h3 className="font-semibold text-slate-950">{program.title}</h3>

        <div className="mt-3 space-y-2 text-xs text-slate-500">
          <p className="flex items-center gap-2">
            <CalendarDays size={14} className="text-primary" />
            Starts {formatDate(program.start_date)}
          </p>

          <p>
            {program.registration_open
              ? "Registration open"
              : "Registration closed"}
          </p>
        </div>

        <a
          href={`/admin/academy/programs/${program.id}`}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          Manage program
          <ArrowRight size={15} />
        </a>
      </div>
    </article>
  );
}

/**
 * Display the Academy administration dashboard.
 */
export default function AcademyDashboard() {
  // Store the complete dashboard response.
  const [dashboardData, setDashboardData] =
    useState<AcademyDashboardData | null>(null);

  // Track the initial and manual refresh state.
  const [loading, setLoading] = useState(true);

  // Store a safe loading error for the interface.
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Load all Academy dashboard data.
   */
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const data = await getAcademyDashboardData();

      setDashboardData(data);
    } catch (error) {
      console.error("Failed to load Academy dashboard:", error);

      setErrorMessage("The Academy dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load dashboard data after the component hydrates.
  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Build the dashboard metric cards.
  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!dashboardData) {
      return [];
    }

    return [
      {
        label: "Total Programs",
        value: dashboardData.totalPrograms.toLocaleString(),
        description: `${dashboardData.publishedPrograms} published`,
        href: "/admin/academy/programs",
        icon: BookOpen,
        color: "blue-100",
      },
      {
        label: "Open Programs",
        value: dashboardData.openPrograms.toLocaleString(),
        description: "Currently accepting registrations",
        href: "/admin/academy/programs",
        icon: GraduationCap,
        color: "orange-100",
      },
      {
        label: "Registrations",
        value: dashboardData.totalRegistrations.toLocaleString(),
        description: `${dashboardData.confirmedRegistrations} confirmed`,
        href: "/admin/academy/registrations",
        icon: Users,
        color: "yellow-100",
      },
      {
        label: "Total Revenue",
        value: formatCurrency(
          dashboardData.totalRevenue,
          dashboardData.revenueCurrency
        ),
        description: "Confirmed Academy payments",
        href: "/admin/academy/payments",
        icon: CircleDollarSign,
        color: "green-100",
      },
      {
        label: "Pending Payments",
        value: dashboardData.pendingPayments.toLocaleString(),
        description: "Pending and processing transactions",
        href: "/admin/academy/payments?status=pending",
        icon: WalletCards,
        color: "purple-100",
      },
      {
        label: "Failed Payments",
        value: dashboardData.failedPayments.toLocaleString(),
        description: "Payments requiring review",
        href: "/admin/academy/payments?status=failed",
        icon: AlertTriangle,
        color: "red-100",
      },
      {
        label: "Active Instructors",
        value: dashboardData.activeInstructors.toLocaleString(),
        description: "Available Academy instructors",
        href: "/admin/bootcamp/instructors",
        icon: UserRoundCheck,
        color:"green-100"
      },
      {
        label: "Certificates Issued",
        value: dashboardData.issuedCertificates.toLocaleString(),
        description: "Generated Academy certificates",
        href: "/admin/academy/certificates",
        icon: Award,
        color:"purple-100"
      },
    ];
  }, [dashboardData]);

  // Display the loading state.
  if (loading && !dashboardData) {
    return (
      <div className="flex min-h-[460px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-primary" />

          <p className="mt-3 text-sm text-slate-500">
            Loading Academy dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Display the loading error state.
  if (errorMessage || !dashboardData) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-600" />

        <p className="mt-4 font-semibold text-red-700">
          {errorMessage || "The Academy dashboard is unavailable."}
        </p>

        <button
          type="button"
          onClick={() => {
            void loadDashboard();
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-full">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            CloudTweak Academy
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Academy Overview
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Monitor programs, registrations, payments, instructors and
            certificates from one place.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadDashboard();
          }}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Recent Payments
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest confirmed Academy transactions.
              </p>
            </div>

            <a
              href="/admin/academy/payments"
              className="text-sm font-semibold text-primary"
            >
              View all
            </a>
          </div>

          <div className="mt-5">
            {dashboardData.recentPayments.length > 0 ? (
              dashboardData.recentPayments.map((payment) => (
                <RecentPaymentRow key={payment.id} payment={payment} />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <CircleDollarSign className="mx-auto h-7 w-7 text-slate-400" />

                <p className="mt-3 font-semibold text-slate-700">
                  No payments yet
                </p>
              </div>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Recent Registrations
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest learners across all programs.
              </p>
            </div>

            <a
              href="/admin/academy/registrations"
              className="text-sm font-semibold text-primary"
            >
              View all
            </a>
          </div>

          <div className="mt-5">
            {dashboardData.recentRegistrations.length > 0 ? (
              dashboardData.recentRegistrations.map((registration) => (
                <RecentRegistrationRow
                  key={registration.id}
                  registration={registration}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <Users className="mx-auto h-7 w-7 text-slate-400" />

                <p className="mt-3 font-semibold text-slate-700">
                  No registrations yet
                </p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Upcoming Programs
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Published programs with future start dates.
            </p>
          </div>

          {dashboardData.upcomingPrograms.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {dashboardData.upcomingPrograms.map((program) => (
                <UpcomingProgramCard key={program.id} program={program} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <CalendarDays className="mx-auto h-7 w-7 text-slate-400" />

              <p className="mt-3 font-semibold text-slate-700">
                No upcoming programs
              </p>
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Requires Attention
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Published programs with incomplete setup.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {dashboardData.programsRequiringAttention.length > 0 ? (
              dashboardData.programsRequiringAttention.map((program) => (
                <article
                  key={program.id}
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900">
                        {program.title}
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {program.issues.map((issue) => (
                          <span
                            key={issue.code}
                            className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-700"
                          >
                            {issue.label}
                          </span>
                        ))}
                      </div>

                      <a
                        href={`/admin/academy/programs/${program.id}`}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-700"
                      >
                        Fix program
                        <ArrowRight size={15} />
                      </a>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
                <UserRoundCheck className="mx-auto h-7 w-7 text-emerald-600" />

                <p className="mt-3 font-semibold text-emerald-700">
                  Everything looks good
                </p>

                <p className="mt-1 text-sm text-emerald-600">
                  No published program requires attention.
                </p>
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
