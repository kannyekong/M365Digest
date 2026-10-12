import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, FileText, Link2, LoaderCircle, PlayCircle } from "lucide-react";
import { studentSupabase } from "../../lib/superbase";

type Resource = {
  id: string; lesson_id: string; title: string; description: string | null;
  resource_type: string; external_url: string | null; storage_path: string | null;
  is_published: boolean; available_from: string | null; available_until: string | null;
  display_order: number;
};
type ResourceGroup = { programId: string; programTitle: string; programSlug: string; lessonId: string; lessonTitle: string; resources: Resource[] };

function getResourceIcon(type: string) {
  if (type === "video") return PlayCircle;
  if (type === "link") return Link2;
  return FileText;
}

export default function StudentResourcesLibrary() {
  const [groups, setGroups] = useState<ResourceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Loads only published, currently available resources belonging to the student's enrollments.
  useEffect(() => {
    let active = true;
    async function loadResources() {
      try {
        const { data: { session }, error: sessionError } = await studentSupabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          window.location.replace("/student/login");
          return;
        }

        const { data: student, error: studentError } = await studentSupabase
          .from("student_profiles").select("id").eq("user_id", session.user.id).maybeSingle();
        if (studentError) throw studentError;
        if (!student) {
          window.location.replace("/student/login");
          return;
        }

        const { data: enrollments, error: enrollmentError } = await studentSupabase
          .from("student_enrollments")
          .select("id, program_id, academy_programs(id, title, slug)")
          .eq("student_id", student.id);
        if (enrollmentError) throw enrollmentError;

        const programById = new Map<string, { title: string; slug: string }>();
        (enrollments ?? []).forEach((enrollment: any) => {
          const program = Array.isArray(enrollment.academy_programs) ? enrollment.academy_programs[0] : enrollment.academy_programs;
          if (program) programById.set(enrollment.program_id, { title: program.title, slug: program.slug });
        });
        const programIds = [...programById.keys()];
        if (programIds.length === 0) {
          if (active) setGroups([]);
          return;
        }

        const { data: modules, error: modulesError } = await studentSupabase
          .from("academy_program_modules").select("id, program_id, title")
          .in("program_id", programIds);
        if (modulesError) throw modulesError;
        const moduleIds = (modules ?? []).map((module) => module.id);
        if (moduleIds.length === 0) {
          if (active) setGroups([]);
          return;
        }

        const { data: lessons, error: lessonsError } = await studentSupabase
          .from("academy_program_lessons").select("id, module_id, title")
          .in("module_id", moduleIds);
        if (lessonsError) throw lessonsError;
        const lessonIds = (lessons ?? []).map((lesson) => lesson.id);
        if (lessonIds.length === 0) {
          if (active) setGroups([]);
          return;
        }

        const { data: resources, error: resourcesError } = await studentSupabase
          .from("academy_program_resources")
          .select("id, lesson_id, title, description, resource_type, external_url, storage_path, is_published, available_from, available_until, display_order")
          .in("lesson_id", lessonIds)
          .eq("is_published", true)
          .order("display_order", { ascending: true });
        if (resourcesError) throw resourcesError;

        const now = Date.now();
        const available = (resources ?? []).filter((resource) =>
          (!resource.available_from || new Date(resource.available_from).getTime() <= now) &&
          (!resource.available_until || new Date(resource.available_until).getTime() >= now)
        );
        const lessonById = new Map((lessons ?? []).map((lesson) => [lesson.id, lesson]));
        const moduleById = new Map((modules ?? []).map((module) => [module.id, module]));
        const grouped = new Map<string, ResourceGroup>();
        available.forEach((resource) => {
          const lesson = lessonById.get(resource.lesson_id);
          const module = lesson ? moduleById.get(lesson.module_id) : null;
          const program = module ? programById.get(module.program_id) : null;
          if (!lesson || !module || !program) return;
          const key = `${module.program_id}:${lesson.id}`;
          if (!grouped.has(key)) grouped.set(key, {
            programId: module.program_id, programTitle: program.title, programSlug: program.slug,
            lessonId: lesson.id, lessonTitle: lesson.title, resources: []
          });
          grouped.get(key)!.resources.push(resource as Resource);
        });
        if (active) setGroups([...grouped.values()].sort((a, b) => a.programTitle.localeCompare(b.programTitle) || a.lessonTitle.localeCompare(b.lessonTitle)));
      } catch (cause) {
        console.error("Failed to load enrolled-course resources:", cause);
        if (active) setError("We couldn't load your course resources. Please refresh and try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadResources();
    return () => { active = false; };
  }, []);

  if (loading) return <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading your course resources...</div>;
  if (error) return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>;
  if (groups.length === 0) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900"><BookOpen className="mx-auto h-10 w-10 text-slate-400" /><h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No course resources yet</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">Published resources from your enrolled courses will appear here when your instructor makes them available.</p><a href="/student/courses" className="mt-5 inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">View my courses</a></div>;

  return <div className="space-y-6">{groups.map((group) => <section key={group.lessonId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-200 p-5 dark:border-slate-800"><p className="text-xs font-semibold uppercase tracking-wide text-primary">{group.programTitle}</p><h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{group.lessonTitle}</h2></div><div className="divide-y divide-slate-100 dark:divide-slate-800">{group.resources.map((resource) => { const Icon = getResourceIcon(resource.resource_type); const url = resource.external_url || resource.storage_path; return <article key={resource.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={20} /></div><div className="min-w-0 flex-1"><h3 className="font-semibold text-slate-900 dark:text-white">{resource.title}</h3>{resource.description ? <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{resource.description}</p> : null}<p className="mt-1 text-xs capitalize text-slate-400">{resource.resource_type.replaceAll("_", " ")}</p></div>{url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200"><ExternalLink size={16} /> Open resource</a> : <span className="text-xs text-slate-400">Resource link unavailable</span>}</article>; })}</div></section>)}</div>;
}
