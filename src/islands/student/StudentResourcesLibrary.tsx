import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Link2,
  LoaderCircle,
  PlayCircle,
} from "lucide-react";
import { studentSupabase } from "../../lib/superbase";

type Resource = {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  resource_type: string;
  external_url: string | null;
  storage_path: string | null;
  is_published: boolean;
  available_from: string | null;
  available_until: string | null;
  display_order: number;
};
type ResourceGroup = {
  programId: string;
  programTitle: string;
  programSlug: string;
  lessonId: string;
  lessonTitle: string;
  resources: Resource[];
};

type ProgramResource = Resource & {
  lessonTitle: string;
};

type ProgramCard = {
  programId: string;
  programTitle: string;
  programSlug: string;
  resources: ProgramResource[];
};

function getResourceIcon(type: string) {
  if (type === "video") return PlayCircle;
  if (type === "link") return Link2;
  return FileText;
}

export default function StudentResourcesLibrary() {
  const [groups, setGroups] = useState<ResourceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [programPage, setProgramPage] = useState(1);
  const [resourcePages, setResourcePages] = useState<Record<string, number>>(
    {}
  );

  // Loads only published, currently available resources belonging to the student's enrollments.
  useEffect(() => {
    let active = true;
    async function loadResources() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await studentSupabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          window.location.replace("/student/login");
          return;
        }

        const { data: student, error: studentError } = await studentSupabase
          .from("student_profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (studentError) throw studentError;
        if (!student) {
          window.location.replace("/student/login");
          return;
        }

        const { data: enrollments, error: enrollmentError } =
          await studentSupabase
            .from("student_enrollments")
            .select("id, program_id, academy_programs(id, title, slug, status)")
            .eq("student_id", student.id);

        if (enrollmentError) throw enrollmentError;

        const programById = new Map<string, { title: string; slug: string }>();

        // Exclude archived programs while retaining the student's enrollment records.
        (enrollments ?? []).forEach((enrollment: any) => {
          const program = Array.isArray(enrollment.academy_programs)
            ? enrollment.academy_programs[0]
            : enrollment.academy_programs;

          if (program && program.status !== "archived") {
            programById.set(enrollment.program_id, {
              title: program.title,
              slug: program.slug,
            });
          }
        });

        const programIds = [...programById.keys()];

        if (programIds.length === 0) {
          if (active) setGroups([]);
          return;
        }

        const { data: modules, error: modulesError } = await studentSupabase
          .from("academy_program_modules")
          .select("id, program_id, title")
          .in("program_id", programIds);
        if (modulesError) throw modulesError;
        const moduleIds = (modules ?? []).map((module) => module.id);
        if (moduleIds.length === 0) {
          if (active) setGroups([]);
          return;
        }

        const { data: lessons, error: lessonsError } = await studentSupabase
          .from("academy_program_lessons")
          .select("id, module_id, title")
          .in("module_id", moduleIds);
        if (lessonsError) throw lessonsError;
        const lessonIds = (lessons ?? []).map((lesson) => lesson.id);
        if (lessonIds.length === 0) {
          if (active) setGroups([]);
          return;
        }

        const { data: resources, error: resourcesError } = await studentSupabase
          .from("academy_program_resources")
          .select(
            "id, lesson_id, title, description, resource_type, external_url, storage_path, is_published, available_from, available_until, display_order"
          )
          .in("lesson_id", lessonIds)
          .eq("is_published", true)
          .order("display_order", { ascending: true });
        if (resourcesError) throw resourcesError;

        const now = Date.now();
        const available = (resources ?? []).filter(
          (resource) =>
            (!resource.available_from ||
              new Date(resource.available_from).getTime() <= now) &&
            (!resource.available_until ||
              new Date(resource.available_until).getTime() >= now)
        );
        const lessonById = new Map(
          (lessons ?? []).map((lesson) => [lesson.id, lesson])
        );
        const moduleById = new Map(
          (modules ?? []).map((module) => [module.id, module])
        );
        const grouped = new Map<string, ResourceGroup>();
        available.forEach((resource) => {
          const lesson = lessonById.get(resource.lesson_id);
          const module = lesson ? moduleById.get(lesson.module_id) : null;
          const program = module ? programById.get(module.program_id) : null;
          if (!lesson || !module || !program) return;
          const key = `${module.program_id}:${lesson.id}`;
          if (!grouped.has(key))
            grouped.set(key, {
              programId: module.program_id,
              programTitle: program.title,
              programSlug: program.slug,
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              resources: [],
            });
          grouped.get(key)!.resources.push(resource as Resource);
        });
        if (active)
          setGroups(
            [...grouped.values()].sort(
              (a, b) =>
                a.programTitle.localeCompare(b.programTitle) ||
                a.lessonTitle.localeCompare(b.lessonTitle)
            )
          );
      } catch (cause) {
        console.error("Failed to load enrolled-course resources:", cause);
        if (active)
          setError(
            "We couldn't load your course resources. Please refresh and try again."
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadResources();
    return () => {
      active = false;
    };
  }, []);

  // Combines lesson groups into program cards while preserving each resource's lesson title.
  const programCards: ProgramCard[] = Array.from(
    groups
      .reduce((programMap, group) => {
        let program = programMap.get(group.programId);

        if (!program) {
          program = {
            programId: group.programId,
            programTitle: group.programTitle,
            programSlug: group.programSlug,
            resources: [],
          };

          programMap.set(group.programId, program);
        }

        program.resources.push(
          ...group.resources.map((resource) => ({
            ...resource,
            lessonTitle: group.lessonTitle,
          }))
        );

        return programMap;
      }, new Map<string, ProgramCard>())
      .values()
  ).sort((a, b) => a.programTitle.localeCompare(b.programTitle));

  // Limits the overall page to four program cards.
  const programsPerPage = 4;
  const totalProgramPages = Math.ceil(programCards.length / programsPerPage);
  const visiblePrograms = programCards.slice(
    (programPage - 1) * programsPerPage,
    programPage * programsPerPage
  );

  // Returns the five resources belonging to the selected page of a program card.
  const getVisibleResources = (program: ProgramCard) => {
    const currentPage = resourcePages[program.programId] ?? 1;
    const startIndex = (currentPage - 1) * 2;

    return program.resources.slice(startIndex, startIndex + 2);
  };

  if (loading)
    return (
      <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500">
        <LoaderCircle className="h-5 w-5 animate-spin" /> Loading your course
        resources...
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
      >
        {error}
      </div>
    );
  if (groups.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <BookOpen className="mx-auto h-10 w-10 text-slate-400" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
          No course resources yet
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
          Published resources from your enrolled courses will appear here when
          your instructor makes them available.
        </p>
        <a
          href="/student/courses"
          className="mt-5 inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          View my courses
        </a>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
        {visiblePrograms.map((program) => {
          const currentResourcePage = resourcePages[program.programId] ?? 1;
          const totalResourcePages = Math.ceil(program.resources.length / 5);
          const visibleResources = getVisibleResources(program);

          return (
            <section
              key={program.programId}
              className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-200 p-5 ">
                <div className=" dark:border-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {program.programTitle}
                  </p>

                  <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                    Program Resources
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {program.resources.length} available{" "}
                    {program.resources.length === 1 ? "resource" : "resources"}
                  </p>
                </div>

                <div className="ml-auto shrink-0 bg-orange-50 p-3 text-orange-500 dark:bg-orange-600 rounded-2xl">
                  <BookOpen className="h-6 w-6 " />
                </div>
              </div>

              <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                {visibleResources.map((resource) => {
                  const Icon = getResourceIcon(resource.resource_type);
                  const url = resource.external_url || resource.storage_path;

                  return (
                    <article
                      key={resource.id}
                      className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon size={20} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {resource.title}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {resource.lessonTitle}
                        </p>

                        {resource.description && (
                          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {resource.description}
                          </p>
                        )}
                        <span className="mt-1 px-2 py-0.5 rounded-2xl bg-orange-50 text-xs capitalize text-orange-500">
                          {resource.resource_type.replaceAll("_", " ")}
                        </span>
                      </div>

                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-orange-500 hover:text-white dark:border-slate-700 dark:text-slate-200"
                        >
                          <ExternalLink size={16} />
                          Open resource
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Resource link unavailable
                        </span>
                      )}
                    </article>
                  );
                })}
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {(currentResourcePage - 1) * 2 + 1}–
                  {Math.min(currentResourcePage * 2, program.resources.length)}{" "}
                  of {program.resources.length}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentResourcePage === 1}
                    onClick={() =>
                      setResourcePages((previous) => ({
                        ...previous,
                        [program.programId]: currentResourcePage - 1,
                      }))
                    }
                    className="rounded-full border border-slate-400 p-3 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
                    aria-label={`Previous resources for ${program.programTitle}`}
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    type="button"
                    disabled={currentResourcePage === totalResourcePages}
                    onClick={() =>
                      setResourcePages((previous) => ({
                        ...previous,
                        [program.programId]: currentResourcePage + 1,
                      }))
                    }
                    className="rounded-full border border-slate-400 p-3 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
                    aria-label={`Next resources for ${program.programTitle}`}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {totalProgramPages > 1 && (
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {(programPage - 1) * programsPerPage + 1}–
            {Math.min(programPage * programsPerPage, programCards.length)} of{" "}
            {programCards.length} programs
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={programPage === 1}
              onClick={() => setProgramPage((page) => Math.max(1, page - 1))}
              className="rounded-full border border-slate-200 p-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="flex items-center px-2 text-sm text-slate-500 dark:text-slate-400">
              Page {programPage} of {totalProgramPages}
            </span>

            <button
              type="button"
              disabled={programPage === totalProgramPages}
              onClick={() =>
                setProgramPage((page) => Math.min(totalProgramPages, page + 1))
              }
              className="rounded-full border border-slate-200 p-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
