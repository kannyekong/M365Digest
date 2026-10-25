import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LoaderCircle,
  Search,
  Sparkles,
} from "lucide-react";

import { getSession } from "../../lib/auth";

import { studentSupabase } from "../../lib/superbase";

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
  const [enrolledPage, setEnrolledPage] = useState(1);
  const enrolledPageSize = 6;
  const [catalogPrograms, setCatalogPrograms] = useState<AcademyProgram[]>([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotalCount, setCatalogTotalCount] = useState(0);
  const [loadingCatalogPage, setLoadingCatalogPage] = useState(false);
  const catalogPageSize = 9;
  const catalogTotalPages = Math.max(
    1,
    Math.ceil(catalogTotalCount / catalogPageSize)
  );

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

      const { data: profileData, error: profileError } = await studentSupabase

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

      const { data: enrollmentData, error: enrollmentError } =
        await studentSupabase

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
          await studentSupabase

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

      const {
        data: catalogData,
        error: catalogError,
        count: catalogCount,
      } = await studentSupabase

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

          `,
          { count: "exact" }
        )

        .eq("status", "published")

        .order("featured", { ascending: false })

        .order("display_order", { ascending: true })

        .order("published_at", { ascending: false })
        .range(0, catalogPageSize - 1);

      if (catalogError) {
        console.error("Failed to load Academy catalog:", catalogError);
      }

      setState({
        loading: false,

        error: "",

        enrollments,

        programs: Array.from(
          new Map<string, AcademyProgram>(
            [
              ...enrolledPrograms,
              ...((catalogData ?? []) as AcademyProgram[]),
            ].map((program) => [program.id, program])
          ).values()
        ),
      });
      setCatalogPrograms((catalogData ?? []) as AcademyProgram[]);
      setCatalogTotalCount(catalogCount ?? (catalogData ?? []).length);
      setCatalogPage(1);
    }

    void loadCourses();
  }, []);

  const enrolledCourses = useMemo<CourseCard[]>(() => {
    const programMap = new Map<string, AcademyProgram>(
      state.programs.map((program) => [program.id, program])
    );

    return state.enrollments

      .map((enrollment) => {
        const program = programMap.get(enrollment.program_id);

        if (!program) {
          return null;
        }

        return {
          ...program,

          enrollment,
        };
      })

      .filter((course): course is CourseCard => course !== null);
  }, [state.enrollments, state.programs]);

  const enrolledTotalPages = Math.max(
    1,
    Math.ceil(enrolledCourses.length / enrolledPageSize)
  );
  const paginatedEnrolledCourses = useMemo(() => {
    const start = (enrolledPage - 1) * enrolledPageSize;
    return enrolledCourses.slice(start, start + enrolledPageSize);
  }, [enrolledCourses, enrolledPage, enrolledPageSize]);

  useEffect(() => {
    setEnrolledPage((page) => Math.min(page, enrolledTotalPages));
  }, [enrolledTotalPages]);

  // Fetches one page of published Academy programs directly from Supabase.
  async function loadCatalogPage(page: number) {
    if (loadingCatalogPage || page < 1 || page > catalogTotalPages) return;
    setLoadingCatalogPage(true);
    try {
      const from = (page - 1) * catalogPageSize;
      const to = from + catalogPageSize - 1;
      const { data, error, count } = await studentSupabase
        .from("academy_programs")
        .select(
          `id, title, slug, code, short_description, hero_image_url, thumbnail_image_url, price, discount_price, currency, duration_value, duration_unit, delivery_mode, certificate_enabled, featured, registration_open, status`,
          { count: "exact" }
        )
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("display_order", { ascending: true })
        .order("published_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      setCatalogPrograms((data ?? []) as AcademyProgram[]);
      setCatalogTotalCount(count ?? 0);
      setCatalogPage(page);
      // Keep enrolled programs available for the Enrolled Courses section.
      setState((current) => ({
        ...current,
        programs: Array.from(
          new Map<string, AcademyProgram>(
            [...current.programs, ...((data ?? []) as AcademyProgram[])].map(
              (program) => [program.id, program]
            )
          ).values()
        ),
      }));
    } catch (err) {
      console.error("Failed to load Academy catalog page:", err);
    } finally {
      setLoadingCatalogPage(false);
    }
  }

  const filteredPrograms = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return catalogPrograms;
    }

    return catalogPrograms.filter((program) => {
      return (
        program.title.toLowerCase().includes(normalizedSearch) ||
        program.short_description?.toLowerCase().includes(normalizedSearch) ||
        program.code?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [search, catalogPrograms]);

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
      {/* Displays the student's currently enrolled Academy programs. */}

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-500">
            enrolled courses
          </p>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <BookOpen size={24} />
            </div>

            <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">
              You haven't enrolled in a course yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Explore the Academy below and choose a program to begin your
              learning journey.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {paginatedEnrolledCourses.map((course) => {
              const status = getEnrollmentStatus(course.enrollment.status);
              const enrolled = enrolledProgramIds.has(course.id);

              return (
                <article
                  key={course.enrollment.id}

                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {course.thumbnail_image_url || course.hero_image_url ? (
                      <img
                        src={
                          course.thumbnail_image_url ??
                          course.hero_image_url ??
                          ""
                        }

                        alt={course.title}

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

                    <div className="absolute left-4 top-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex flex-row justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                        {course.code ?? "Academy Program"}
                      </p>
                      {enrolled && (
                        <span>
                          {" "}
                          <p className="inline-flex gap-1 justify-center items-center rounded-full bg-green-500 px-2 py-0.5 text-xs text-white">
                            <CheckCircle2 size={16} />
                            Enrolled
                          </p>
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 line-clamp-2 font-semibold text-slate-900 dark:text-white">
                      {course.title}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {course.short_description ??
                        "Continue your CloudTweak Academy learning journey."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
                        <Clock3 size={13} />

                        {formatDuration(
                          course.duration_value,

                          course.duration_unit
                        )}
                      </span>

                      {course.certificate_enabled && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
                          <CheckCircle2 size={13} />
                          Certificate
                        </span>
                      )}
                    </div>

                    <a
                      href={`/student/courses/${course.slug}`}

                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                    >
                      Open Course
                      <ArrowRight size={16} />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {(enrolledPage - 1) * enrolledPageSize + 1}–
            {Math.min(enrolledPage * enrolledPageSize, enrolledCourses.length)}{" "}
            of {enrolledCourses.length} enrolled courses
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEnrolledPage((page) => Math.max(1, page - 1))}
              disabled={enrolledPage === 1}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 p-3 text-sm disabled:opacity-40 dark:border-slate-700"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Page {enrolledPage} of {enrolledTotalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setEnrolledPage((page) =>
                  Math.min(enrolledTotalPages, page + 1)
                )
              }
              disabled={enrolledPage >= enrolledTotalPages}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 p-3 text-sm disabled:opacity-40 dark:border-slate-700"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Displays published Academy programs that are available in the catalog. */}

      <section>
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              Explore Other Courses
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Discover published CloudTweak Academy programs.
            </p>
          </div>

          <div className="relative w-full md:max-w-xs">
            <Search
              size={17}

              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"

              value={search}

              onChange={(event) => setSearch(event.target.value)}

              placeholder="Search programs..."

              className="w-full rounded-xl border-3 border-orange-500 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
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
                    <div className="flex flex-row justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                        {program.code ?? "Academy Program"}
                      </p>
                      {enrolled && (
                        <span>
                          {" "}
                          <p className="inline-flex gap-1 justify-center items-center rounded-full bg-green-500 px-2 py-0.5 text-xs text-white">
                            <CheckCircle2 size={16} />
                            Enrolled
                          </p>
                        </span>
                      )}
                    </div>

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

                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
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

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {catalogTotalCount === 0
              ? "No courses available"
              : `Showing page ${catalogPage} of ${catalogTotalPages} · ${catalogTotalCount} total courses`}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => void loadCatalogPage(catalogPage - 1)}
              disabled={catalogPage <= 1 || loadingCatalogPage}
              aria-label="Previous course page"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 p-3 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: catalogTotalPages }, (_, index) => index + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === catalogTotalPages ||
                  Math.abs(page - catalogPage) <= 1
              )
              .map((page, index, pages) => (
                <span key={page} className="contents">
                  {index > 0 && page - pages[index - 1] > 1 && (
                    <span className="px-1 text-slate-400" aria-hidden="true">
                      …
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void loadCatalogPage(page)}
                    disabled={loadingCatalogPage || page === catalogPage}
                    aria-current={page === catalogPage ? "page" : undefined}
                    aria-label={`Go to course page ${page}`}
                    className={`min-w-10 rounded-full px-3 py-2.5 text-sm font-semibold transition disabled:cursor-default ${page === catalogPage ? "bg-orange-500 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                  >
                    {page}
                  </button>
                </span>
              ))}
            <button
              type="button"
              onClick={() => void loadCatalogPage(catalogPage + 1)}
              disabled={catalogPage >= catalogTotalPages || loadingCatalogPage}
              aria-label="Next course page"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 p-3 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        {loadingCatalogPage && (
          <p
            className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400"
            role="status"
          >
            <LoaderCircle size={16} className="animate-spin" /> Loading
            courses...
          </p>
        )}
      </section>
    </div>
  );
}
