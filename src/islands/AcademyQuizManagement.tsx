import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Filter,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ConfirmModal from "./ConfirmModal";
import QuizBuilder from "./QuizBuilder";
import { supabase } from "../lib/supabase/client";
import type { AcademyProgram, AcademyQuiz } from "../types/academy";

interface QuizManagementRow extends AcademyQuiz {
  program: {
    id: string;
    title: string;
    slug: string;
  } | null;
  module: {
    id: string;
    title: string;
    module_number: number;
  } | null;
  lesson: {
    id: string;
    title: string;
  } | null;
  questionCount: number;
}

interface QuizManagementProps {
  initialProgramId?: string | null;
}

const PAGE_SIZE = 10;

/**
 * Convert an internal quiz target into a readable label.
 */
function getTargetLabel(quiz: QuizManagementRow) {
  if (quiz.lesson) {
    return `Lesson: ${quiz.lesson.title}`;
  }

  if (quiz.module) {
    return `Module ${quiz.module.module_number}: ${quiz.module.title}`;
  }

  return "Unassigned target";
}

/**
 * Convert a quiz publication state into readable text.
 */
function getPublicationLabel(isPublished: boolean) {
  return isPublished ? "Published" : "Draft";
}

/**
 * Display and manage all Academy quizzes from one central admin screen.
 */
export default function AcademyQuizManagement({
  initialProgramId = null,
}: QuizManagementProps) {
  const [quizzes, setQuizzes] = useState<QuizManagementRow[]>([]);
  const [programs, setPrograms] = useState<AcademyProgram[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [programFilter, setProgramFilter] = useState(initialProgramId ?? "");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft"
  >("all");

  const [page, setPage] = useState(1);

  const [editingQuiz, setEditingQuiz] = useState<QuizManagementRow | null>(
    null
  );

  const [confirmQuiz, setConfirmQuiz] = useState<QuizManagementRow | null>(
    null
  );

  const [confirmPublishQuiz, setConfirmPublishQuiz] =
    useState<QuizManagementRow | null>(null);

  const [confirmLoading, setConfirmLoading] = useState(false);

  /**
   * Load all Academy programs used by the program filter.
   */
  const loadPrograms = useCallback(async () => {
    const { data, error } = await supabase
      .from("academy_programs")
      .select("*")
      .order("title", { ascending: true });

    if (error) {
      throw error;
    }

    setPrograms((data ?? []) as AcademyProgram[]);
  }, []);

  /**
   * Load all quizzes together with their curriculum targets.
   */
  const loadQuizzes = useCallback(async () => {
    const { data, error } = await supabase
      .from("academy_quizzes")
      .select(
        `
        *,
        program:academy_programs(
          id,
          title,
          slug
        ),
        module:academy_program_modules(
          id,
          title,
          module_number
        ),
        lesson:academy_program_lessons(
          id,
          title
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const quizRows = data ?? [];

    const quizIds = quizRows.map((quiz) => quiz.id);

    let questionCounts: Record<string, number> = {};

    if (quizIds.length > 0) {
      const { data: questionRows, error: questionError } = await supabase
        .from("academy_quiz_questions")
        .select("id, quiz_id")
        .in("quiz_id", quizIds);

      if (questionError) {
        throw questionError;
      }

      questionCounts = (questionRows ?? []).reduce<Record<string, number>>(
        (counts, question) => {
          counts[question.quiz_id] = (counts[question.quiz_id] ?? 0) + 1;

          return counts;
        },
        {}
      );
    }

    setQuizzes(
      quizRows.map((quiz) => ({
        ...quiz,
        program: Array.isArray(quiz.program)
          ? (quiz.program[0] ?? null)
          : (quiz.program ?? null),
        module: Array.isArray(quiz.module)
          ? (quiz.module[0] ?? null)
          : (quiz.module ?? null),
        lesson: Array.isArray(quiz.lesson)
          ? (quiz.lesson[0] ?? null)
          : (quiz.lesson ?? null),
        questionCount: questionCounts[quiz.id] ?? 0,
      })) as QuizManagementRow[]
    );
  }, []);

  /**
   * Load all data required by the quiz management screen.
   */
  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      await Promise.all([loadPrograms(), loadQuizzes()]);
    } catch (error) {
      console.error("Failed to load Academy quizzes:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load Academy quizzes."
      );
    } finally {
      setLoading(false);
    }
  }, [loadPrograms, loadQuizzes]);

  /**
   * Refresh the quiz list without replacing the entire page state.
   */
  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadQuizzes();
      toast.success("Quiz list refreshed.");
    } catch (error) {
      console.error("Failed to refresh Academy quizzes:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to refresh quizzes."
      );
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Load Academy data when the component mounts.
   */
  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredQuizzes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      const matchesSearch =
        !normalizedSearch ||
        quiz.title.toLowerCase().includes(normalizedSearch) ||
        quiz.program?.title.toLowerCase().includes(normalizedSearch) ||
        quiz.module?.title.toLowerCase().includes(normalizedSearch) ||
        quiz.lesson?.title.toLowerCase().includes(normalizedSearch);

      const matchesProgram =
        !programFilter || quiz.program_id === programFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && quiz.is_published) ||
        (statusFilter === "draft" && !quiz.is_published);

      return matchesSearch && matchesProgram && matchesStatus;
    });
  }, [quizzes, searchTerm, programFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQuizzes.length / PAGE_SIZE));

  const paginatedQuizzes = filteredQuizzes.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  /**
   * Keep pagination valid when filters reduce the result set.
   */
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  /**
   * Delete the selected quiz after confirmation.
   */
  const handleDeleteQuiz = async () => {
    if (!confirmQuiz) {
      return;
    }

    setConfirmLoading(true);

    try {
      const { error } = await supabase
        .from("academy_quizzes")
        .delete()
        .eq("id", confirmQuiz.id);

      if (error) {
        throw error;
      }

      setQuizzes((current) =>
        current.filter((quiz) => quiz.id !== confirmQuiz.id)
      );

      toast.success("Quiz deleted successfully.");
      setConfirmQuiz(null);
    } catch (error) {
      console.error("Failed to delete quiz:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to delete quiz."
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  /**
   * Publish or unpublish a quiz after confirmation.
   */
  const handleTogglePublished = async () => {
    if (!confirmPublishQuiz) {
      return;
    }

    setConfirmLoading(true);

    const nextPublished = !confirmPublishQuiz.is_published;

    try {
      const { data, error } = await supabase
        .from("academy_quizzes")
        .update({
          is_published: nextPublished,
          updated_at: new Date().toISOString(),
        })
        .eq("id", confirmPublishQuiz.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setQuizzes((current) =>
        current.map((quiz) =>
          quiz.id === confirmPublishQuiz.id
            ? {
                ...quiz,
                is_published: data.is_published,
                updated_at: data.updated_at,
              }
            : quiz
        )
      );

      toast.success(
        nextPublished
          ? "Quiz published successfully."
          : "Quiz moved back to draft."
      );

      setConfirmPublishQuiz(null);
    } catch (error) {
      console.error("Failed to update quiz publication state:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update quiz publication state."
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  /**
   * Close the quiz editor after a successful save.
   */
  const handleQuizSaved = async () => {
    setEditingQuiz(null);

    try {
      await loadQuizzes();
    } catch (error) {
      console.error("Failed to refresh quizzes after update:", error);

      toast.error("Quiz saved, but the quiz list could not be refreshed.");
    }
  };

  /**
   * Close the editor after the quiz has been deleted.
   */
  const handleQuizDeleted = async () => {
    setEditingQuiz(null);
    await loadQuizzes();
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-primary" />

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Loading Academy quizzes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
                  Quiz Management
                </h1>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Manage Academy assessments, publishing and quiz configuration.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/admin/academy/programs"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Create from Curriculum
            </a>

            <button
              type="button"
              onClick={() => {
                void handleRefresh();
              }}
              disabled={refreshing}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              Refresh
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total Quizzes
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
              {quizzes.length}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Published
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {quizzes.filter((quiz) => quiz.is_published).length}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Drafts
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-600">
              {quizzes.filter((quiz) => !quiz.is_published).length}
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder="Search quizzes, programs or lessons..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <select
              value={programFilter}
              onChange={(event) => {
                setProgramFilter(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              <option value="">All Programs</option>

              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.title}
                </option>
              ))}
            </select>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(
                    event.target.value as "all" | "published" | "draft"
                  );
                  setPage(1);
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {paginatedQuizzes.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <AlertTriangle className="mx-auto h-8 w-8 text-slate-400" />

              <h2 className="mt-4 font-semibold text-slate-900 dark:text-white">
                No quizzes found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                No quizzes match the current search and filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                  <tr className="text-left">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Quiz
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Program
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Target
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Questions
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Pass
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedQuizzes.map((quiz) => (
                    <tr
                      key={quiz.id}
                      className="transition hover:bg-slate-50/70 dark:hover:bg-slate-950/50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {quiz.title}
                        </p>

                        {quiz.description && (
                          <p className="mt-1 max-w-sm truncate text-xs text-slate-500 dark:text-slate-400">
                            {quiz.description}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {quiz.program?.title ?? "Unknown program"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {getTargetLabel(quiz)}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {quiz.questionCount}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {quiz.passing_score}%
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            quiz.is_published
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                          }`}
                        >
                          {quiz.is_published ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}

                          {getPublicationLabel(quiz.is_published)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuiz(quiz);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConfirmPublishQuiz(quiz);
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            {quiz.is_published ? "Unpublish" : "Publish"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConfirmQuiz(quiz);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Page {page} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => {
                  setPage((current) => Math.max(1, current - 1));
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => {
                  setPage((current) => Math.min(totalPages, current + 1));
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      {editingQuiz && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:p-6">
          <div className="mx-auto min-h-full max-w-6xl py-4">
            <QuizBuilder
              programId={editingQuiz.program_id}
              moduleId={editingQuiz.module_id}
              lessonId={editingQuiz.lesson_id}
              quiz={editingQuiz}
              onSaved={handleQuizSaved}
              onDeleted={handleQuizDeleted}
              onCancel={() => {
                setEditingQuiz(null);
              }}
            />
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmQuiz)}
        title="Delete Quiz"
        message={
          confirmQuiz
            ? `Delete "${confirmQuiz.title}"? This will permanently delete the quiz, its questions and answer options.`
            : ""
        }
        confirmText="Delete Quiz"
        cancelText="Cancel"
        variant="danger"
        loading={confirmLoading}
        onConfirm={handleDeleteQuiz}
        onCancel={() => {
          if (!confirmLoading) {
            setConfirmQuiz(null);
          }
        }}
      />

      <ConfirmModal
        open={Boolean(confirmPublishQuiz)}
        title={
          confirmPublishQuiz?.is_published ? "Unpublish Quiz" : "Publish Quiz"
        }
        message={
          confirmPublishQuiz
            ? confirmPublishQuiz.is_published
              ? `Move "${confirmPublishQuiz.title}" back to draft? Students will no longer be able to access it.`
              : `Publish "${confirmPublishQuiz.title}"? Students will be able to access it when the quiz becomes available.`
            : ""
        }
        confirmText={confirmPublishQuiz?.is_published ? "Unpublish" : "Publish"}
        cancelText="Cancel"
        variant={confirmPublishQuiz?.is_published ? "danger" : "primary"}
        loading={confirmLoading}
        onConfirm={handleTogglePublished}
        onCancel={() => {
          if (!confirmLoading) {
            setConfirmPublishQuiz(null);
          }
        }}
      />
    </>
  );
}
