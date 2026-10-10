import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  LoaderCircle,
  Search,
  Sparkles,
} from "lucide-react";

import { getSession } from "../../lib/auth";
import { supabase } from "../../lib/superbase";

type StudentProfile = {
  id: string;
};

type Enrollment = {
  id: string;
  program_id: string;
  status:
    "pending" | "active" | "paused" | "completed" | "cancelled" | "expired";
  start_date: string | null;
  end_date: string | null;
  completed_at: string | null;
};

type AcademyProgram = {
  id: string;
  title: string;
  slug: string;
  code: string | null;
  short_description: string | null;
  hero_image_url: string | null;
  thumbnail_image_url: string | null;
  price: number;
  discount_price: number | null;
  currency: string;
  duration_value: number | null;
  duration_unit: string | null;
  delivery_mode: string;
  certificate_enabled: boolean;
  featured: boolean;
  registration_open: boolean;
  status: string;
};

type CourseCard = AcademyProgram & {
  enrollment: Enrollment;
};

type StudentCoursesState = {
  loading: boolean;
  error: string;
  enrollments: Enrollment[];
  programs: AcademyProgram[];
};

const initialState: StudentCoursesState = {
  loading: true,
  error: "",
  enrollments: [],
  programs: [],
};

/**
 * Formats an Academy program price for display using its configured currency.
 */
function formatPrice(
  price: number,
  currency: string,
  discountPrice: number | null
) {
  const amount = discountPrice ?? price;

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency || "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a program duration into a readable label.
 */
function formatDuration(
  durationValue: number | null,
  durationUnit: string | null
) {
  if (!durationValue || !durationUnit) {
    return "Self-paced";
  }

  const normalizedUnit =
    durationValue === 1 ? durationUnit.replace(/s$/, "") : durationUnit;

  return `${durationValue} ${normalizedUnit}`;
}

/**
 * Returns the label and visual state for an enrollment status.
 */
function getEnrollmentStatus(status: Enrollment["status"]) {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className:
          "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400",
      };

    case "pending":
      return {
        label: "Pending",
        className:
          "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400",
      };

    case "paused":
      return {
        label: "Paused",
        className:
          "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
      };

    case "completed":
      return {
        label: "Completed",
        className:
          "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
      };

    default:
      return {
        label: status,
        className:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
      };
  }
}

export default function StudentCourses() {
  const [state, setState] = useState<StudentCoursesState>(initialState);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Loads the authenticated student's profile, enrollments, and Academy programs.
    async function loadCourses() {
      setState((current) => ({
        ...current,
        loading: true,
        error: "",
      }));

      const {
        data: { session },
      } = await getSession();

      if (!session) {
        window.location.replace("/student/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Failed to load student profile:", profileError);

        setState((current) => ({
          ...current,
          loading: false,
          error: "We could not load your student profile.",
        }));

        return;
      }

      if (!profileData) {
        window.location.replace("/student/complete-profile");
        return;
      }

      const profile = profileData as StudentProfile;

      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("student_enrollments")
        .select(
          `
              id,
              program_id,
              status,
              start_date,
              end_date,
              completed_at
            `
        )
        .eq("student_id", profile.id)
        .order("created_at", { ascending: false });

      if (enrollmentError) {
        console.error("Failed to load student enrollments:", enrollmentError);

        setState((current) => ({
          ...current,
          loading: false,
          error: "We could not load your enrolled courses.",
        }));

        return;
      }

      const enrollments = (enrollmentData ?? []) as Enrollment[];

      const enrolledProgramIds = [
        ...new Set(enrollments.map((enrollment) => enrollment.program_id)),
      ];

      let enrolledPrograms: AcademyProgram[] = [];

      if (enrolledProgramIds.length > 0) {
        const { data: enrolledProgramData, error: enrolledProgramError } =
          await supabase
            .from("academy_programs")
            .select(
              `
                id,
                title,
                slug,
                code,
                short_description,
                hero_image_url,
                thumbnail_image_url,
                price,
                discount_price,
                currency,
                duration_value,
                duration_unit,
                delivery_mode,
                certificate_enabled,
                featured,
                registration_open,
                status
              `
            )
            .in("id", enrolledProgramIds);

        if (enrolledProgramError) {
          console.error(
            "Failed to load enrolled Academy programs:",
            enrolledProgramError
          );
        } else {
          enrolledPrograms = (enrolledProgramData ?? []) as AcademyProgram[];
        }
      }

      // Loads published Academy programs separately for the public catalog.
      const { data: catalogData, error: catalogError } = await supabase
        .from("academy_programs")
        .select(
          `
            id,
            title,
            slug,
            code,
            short_description,
            hero_image_url,
            thumbnail_image_url,
            price,
            discount_price,
            currency,
            duration_value,
            duration_unit,
            delivery_mode,
            certificate_enabled,
            featured,
            registration_open,
            status
          `
        )
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("display_order", { ascending: true })
        .order("published_at", { ascending: false });

      if (catalogError) {
        console.error("Failed to load Academy catalog:", catalogError);
      }

      setState({
        loading: false,
        error: "",
        enrollments,
        programs: (catalogData ?? []) as AcademyProgram[],
      });
    }

    void loadCourses();
  }, []);

  const filteredPrograms = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return state.programs;
    }

    return state.programs.filter((program) => {
      return (
        program.title.toLowerCase().includes(normalizedSearch) ||
        program.short_description?.toLowerCase().includes(normalizedSearch) ||
        program.code?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [search, state.programs]);

  const enrolledProgramIds = useMemo(
    () => new Set(state.enrollments.map((enrollment) => enrollment.program_id)),
    [state.enrollments]
  );

  if (state.loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-2xl bg-white shadow-sm dark:bg-slate-900"
            />
          ))}
        </div>

        <div className="h-96 animate-pulse rounded-2xl bg-white shadow-sm dark:bg-slate-900" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm dark:border-red-900/50 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/40">
          <Clock3 size={22} />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
          Something went wrong
        </h2>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {state.error}
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Displays published Academy programs that are available in the catalog. */}
      <section>
        <div className="relative mb-4 flex w-full justify-center">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300"
          />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search programs..."
            className="w-full rounded-xl border-4 border-orange-500 bg-white py-6 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 placeholder:text-2xl focus:border-orange-700 focus:ring-2 focus:ring-orange-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {filteredPrograms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
            <Search size={24} className="mx-auto text-slate-400" />

            <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">
              No programs found
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Try another search term.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredPrograms.map((program) => {
              const enrolled = enrolledProgramIds.has(program.id);
              const image =
                program.thumbnail_image_url ?? program.hero_image_url;

              return (
                <article
                  key={program.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {image ? (
                      <img
                        src={image}
                        alt={program.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <GraduationCap
                          size={42}
                          className="text-slate-300 dark:text-slate-600"
                        />
                      </div>
                    )}

                    {program.featured && (
                      <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                        <Sparkles size={12} />
                        Featured
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                      {program.code ?? "Academy Program"}
                    </p>

                    <h3 className="mt-2 line-clamp-2 font-semibold text-slate-900 dark:text-white">
                      {program.title}
                    </h3>

                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {program.short_description ??
                        "Build practical skills with CloudTweak Academy."}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-400">Program fee</p>

                        <p className="mt-0.5 font-bold text-slate-900 dark:text-white">
                          {program.status === "published" && program.price > 0
                            ? formatPrice(
                                program.price,
                                program.currency,
                                program.discount_price
                              )
                            : "Contact us"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-400">Delivery</p>

                        <p className="mt-0.5 text-xs font-medium capitalize text-slate-700 dark:text-slate-300">
                          {program.delivery_mode}
                        </p>
                      </div>
                    </div>

                    {enrolled ? (
                      <a
                        href={`/student/courses/${program.slug}`}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
                      >
                        <CheckCircle2 size={16} />
                        Open My Course
                      </a>
                    ) : (
                      <a
                        href={`/student/courses/${program.slug}`}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        View Program
                        <ArrowRight size={16} />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
