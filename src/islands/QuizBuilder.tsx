import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  ClipboardCheck,
  GripVertical,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

import ConfirmModal from "./ConfirmModal";

import {
  createAcademyQuiz,
  createAcademyQuizOption,
  createAcademyQuizQuestion,
  deleteAcademyQuiz,
  deleteAcademyQuizOption,
  deleteAcademyQuizQuestion,
  getAcademyQuizOptions,
  getAcademyQuizQuestions,
  updateAcademyQuiz,
  updateAcademyQuizOption,
  updateAcademyQuizQuestion,
} from "../lib/academy";

import type {
  AcademyQuiz,
  AcademyQuizInput,
  AcademyQuizOption,
  AcademyQuizQuestion,
  AcademyQuizQuestionInput,
  AcademyQuizQuestionType,
} from "../types/academy";

interface QuizBuilderProps {
  programId: string;
  moduleId?: string | null;
  lessonId?: string | null;
  quiz?: AcademyQuiz | null;
  onSaved?: (quiz: AcademyQuiz) => void;
  onDeleted?: () => void;
  onCancel?: () => void;
}

interface QuestionDraft extends AcademyQuizQuestion {
  options: AcademyQuizOption[];
}

interface ConfirmState {
  type:
    | "delete-quiz"
    | "update-quiz"
    | "delete-question"
    | "update-question"
    | "delete-option"
    | "update-option";
  questionId?: string;
  optionId?: string;
  question?: AcademyQuizQuestion;
  option?: AcademyQuizOption;
}

const QUESTION_TYPES: {
  value: AcademyQuizQuestionType;
  label: string;
}[] = [
  {
    value: "single_choice",
    label: "Single Choice",
  },
  {
    value: "multiple_choice",
    label: "Multiple Choice",
  },
  {
    value: "true_false",
    label: "True / False",
  },
];

/**
 * Builds a temporary quiz option used while creating a new question.
 */
function createDraftOption(
  questionId: string,
  displayOrder: number
): AcademyQuizOption {
  return {
    id: `draft-option-${crypto.randomUUID()}`,
    question_id: questionId,
    option_text: "",
    is_correct: false,
    display_order: displayOrder,
    created_at: "",
    updated_at: "",
  };
}

/**
 * Builds a temporary question used while creating a new quiz question.
 */
function createDraftQuestion(
  quizId: string,
  displayOrder: number
): QuestionDraft {
  const id = `draft-question-${crypto.randomUUID()}`;

  return {
    id,
    quiz_id: quizId,
    question_text: "",
    question_type: "single_choice",
    points: 1,
    explanation: null,
    display_order: displayOrder,
    created_at: "",
    updated_at: "",
    options: [createDraftOption(id, 0), createDraftOption(id, 1)],
  };
}

/**
 * QuizBuilder manages quiz metadata, questions, answer options,
 * publishing settings, and administrative CRUD operations.
 */
export default function QuizBuilder({
  programId,
  moduleId = null,
  lessonId = null,
  quiz = null,
  onSaved,
  onDeleted,
  onCancel,
}: QuizBuilderProps) {
  const editingQuiz = Boolean(quiz);

  const [title, setTitle] = useState(quiz?.title ?? "");
  const [description, setDescription] = useState(quiz?.description ?? "");
  const [passingScore, setPassingScore] = useState(quiz?.passing_score ?? 80);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(
    quiz?.max_attempts ?? null
  );
  const [isRequired, setIsRequired] = useState(quiz?.is_required ?? true);
  const [isPublished, setIsPublished] = useState(quiz?.is_published ?? false);

  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const [confirmLoading, setConfirmLoading] = useState(false);

  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null
  );

  // Stores the existing quiz ID when the builder is editing an existing quiz.
  const existingQuizId = quiz?.id ?? null;

  const isDirty = useMemo(() => {
    if (!quiz) {
      return true;
    }

    return (
      title.trim() !== quiz.title ||
      description !== (quiz.description ?? "") ||
      passingScore !== quiz.passing_score ||
      maxAttempts !== quiz.max_attempts ||
      isRequired !== quiz.is_required ||
      isPublished !== quiz.is_published
    );
  }, [
    quiz,
    title,
    description,
    passingScore,
    maxAttempts,
    isRequired,
    isPublished,
  ]);

  /**
   * Loads the questions and answer options for an existing quiz.
   */
  useEffect(() => {
    const quizId: string | null = existingQuizId;

    if (typeof quizId !== "string") {
      setQuestions([]);
      return;
    }

    let cancelled = false;

    async function loadQuestions(quizId: string) {
      setLoadingQuestions(true);

      try {
        const questionRows = await getAcademyQuizQuestions(quizId);

        const questionWithOptions = await Promise.all(
          questionRows.map(async (question) => {
            const options = await getAcademyQuizOptions(question.id);

            return {
              ...question,
              options,
            };
          })
        );

        if (!cancelled) {
          setQuestions(questionWithOptions);
        }
      } catch (error) {
        console.error("Failed to load quiz questions:", error);

        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to load quiz questions."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingQuestions(false);
        }
      }
    }

    void loadQuestions(quizId);

    return () => {
      cancelled = true;
    };
  }, [existingQuizId]);

  /**
   * Updates a question draft in local state.
   */
  const updateQuestionDraft = (
    questionId: string,
    updates: Partial<QuestionDraft>
  ) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId ? { ...question, ...updates } : question
      )
    );
  };

  /**
   * Updates an option draft in local state.
   */
  const updateOptionDraft = (
    questionId: string,
    optionId: string,
    updates: Partial<AcademyQuizOption>
  ) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) {
          return question;
        }

        return {
          ...question,
          options: question.options.map((option) =>
            option.id === optionId ? { ...option, ...updates } : option
          ),
        };
      })
    );
  };

  /**
   * Adds a new question to the quiz.
   */
  const handleAddQuestion = () => {
    const quizId = quiz?.id ?? "draft-quiz";

    const question = createDraftQuestion(quizId, questions.length);

    setQuestions((current) => [...current, question]);
    setExpandedQuestionId(question.id);
  };

  /**
   * Adds an answer option to an existing question.
   */
  const handleAddOption = (questionId: string) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) {
          return question;
        }

        const option = createDraftOption(questionId, question.options.length);

        return {
          ...question,
          options: [...question.options, option],
        };
      })
    );
  };

  /**
   * Removes an unsaved option immediately.
   * Persisted options are handled through ConfirmModal.
   */
  const handleRemoveOption = (
    questionId: string,
    option: AcademyQuizOption
  ) => {
    if (!option.id || option.id.startsWith("draft-option-")) {
      setQuestions((current) =>
        current.map((question) =>
          question.id === questionId
            ? {
                ...question,
                options: question.options.filter(
                  (item) => item.id !== option.id
                ),
              }
            : question
        )
      );

      return;
    }

    setConfirmState({
      type: "delete-option",
      questionId,
      optionId: option.id,
      option,
    });
  };

  /**
   * Removes an unsaved question immediately.
   * Persisted questions are handled through ConfirmModal.
   */
  const handleRemoveQuestion = (question: QuestionDraft) => {
    if (question.id.startsWith("draft-question-")) {
      setQuestions((current) =>
        current.filter((item) => item.id !== question.id)
      );

      return;
    }

    setConfirmState({
      type: "delete-question",
      questionId: question.id,
      question,
    });
  };

  /**
   * Opens the confirmation modal before updating an existing quiz.
   */
  const handleRequestQuizUpdate = () => {
    if (!quiz) {
      return;
    }

    setConfirmState({
      type: "update-quiz",
    });
  };

  /**
   * Opens the confirmation modal for a question update.
   */
  const handleRequestQuestionUpdate = (question: QuestionDraft) => {
    if (question.id.startsWith("draft-question-")) {
      return;
    }

    setConfirmState({
      type: "update-question",
      questionId: question.id,
      question,
    });
  };

  /**
   * Opens the confirmation modal for an existing option update.
   */
  const handleRequestOptionUpdate = (option: AcademyQuizOption) => {
    if (option.id.startsWith("draft-option-")) {
      return;
    }

    setConfirmState({
      type: "update-option",
      optionId: option.id,
      option,
    });
  };

  /**
   * Saves quiz metadata for a new quiz.
   */
  const createQuiz = async (): Promise<AcademyQuiz | null> => {
    if (!title.trim()) {
      toast.error("Quiz title is required.");
      return null;
    }

    if (passingScore < 0 || passingScore > 100) {
      toast.error("Passing score must be between 0 and 100.");
      return null;
    }

    const input: AcademyQuizInput = {
      program_id: programId,
      module_id: moduleId,
      lesson_id: lessonId,
      title: title.trim(),
      description: description.trim() || null,
      passing_score: passingScore,
      max_attempts: maxAttempts,
      is_required: isRequired,
      is_published: isPublished,
      display_order: 0,
    };

    const createdQuiz = await createAcademyQuiz(input);

    toast.success("Quiz created successfully.");

    onSaved?.(createdQuiz);

    return createdQuiz;
  };

  /**
   * Saves quiz metadata after the user confirms an existing-record update.
   */
  const updateQuizRecord = async () => {
    const quizId = existingQuizId;

    if (!quizId) {
      toast.error("Quiz ID is missing.");
      return;
    }

    setConfirmLoading(true);

    try {
      const updatedQuiz = await updateAcademyQuiz(quizId, {
        title: title.trim(),
        description: description.trim() || null,
        passing_score: passingScore,
        max_attempts: maxAttempts,
        is_required: isRequired,
        is_published: isPublished,
      });

      toast.success("Quiz updated successfully.");
      setConfirmState(null);

      onSaved?.(updatedQuiz);
    } catch (error) {
      console.error("Failed to update quiz:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to update quiz."
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  /**
   * Deletes an existing quiz after confirmation.
   */
  const deleteQuizRecord = async () => {
    const quizId = existingQuizId;

    if (!quizId) {
      toast.error("Quiz ID is missing.");
      return;
    }

    setConfirmLoading(true);

    try {
      await deleteAcademyQuiz(quizId);

      toast.success("Quiz deleted successfully.");
      setConfirmState(null);

      onDeleted?.();
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
   * Saves a newly created question and its options.
   */
  const saveNewQuestion = async (question: QuestionDraft) => {
    const quizId = existingQuizId;

    if (!quizId) {
      toast.error("Save the quiz before adding questions.");
      return;
    }

    if (!question.question_text.trim()) {
      toast.error("Question text is required.");
      return;
    }

    if (question.options.length === 0) {
      toast.error("Add at least one answer option.");
      return;
    }

    if (!question.options.some((option) => option.is_correct)) {
      toast.error("Select at least one correct answer.");
      return;
    }

    try {
      const input: AcademyQuizQuestionInput = {
        quiz_id: quizId,
        question_text: question.question_text.trim(),
        question_type: question.question_type,
        points: question.points,
        explanation: question.explanation?.trim() || null,
        display_order: question.display_order,
      };

      const createdQuestion = await createAcademyQuizQuestion(input);

      const createdOptions: AcademyQuizOption[] = [];

      for (const [index, option] of question.options.entries()) {
        const createdOption = await createAcademyQuizOption({
          question_id: createdQuestion.id,
          option_text: option.option_text.trim(),
          is_correct: option.is_correct,
          display_order: index,
        });

        createdOptions.push(createdOption);
      }

      setQuestions((current) =>
        current.map((item) =>
          item.id === question.id
            ? {
                ...createdQuestion,
                options: createdOptions,
              }
            : item
        )
      );

      toast.success("Question added successfully.");
    } catch (error) {
      console.error("Failed to create question:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to create question."
      );
    }
  };

  /**
   * Updates an existing question after confirmation.
   */
  const updateQuestionRecord = async () => {
    if (
      !confirmState ||
      confirmState.type !== "update-question" ||
      !confirmState.question
    ) {
      return;
    }

    setConfirmLoading(true);

    try {
      const question = confirmState.question;

      const updatedQuestion = await updateAcademyQuizQuestion(question.id, {
        question_text: question.question_text.trim(),
        question_type: question.question_type,
        points: question.points,
        explanation: question.explanation?.trim() || null,
        display_order: question.display_order,
      });

      setQuestions((current) =>
        current.map((item) =>
          item.id === question.id
            ? {
                ...item,
                ...updatedQuestion,
              }
            : item
        )
      );

      toast.success("Question updated successfully.");
      setConfirmState(null);
    } catch (error) {
      console.error("Failed to update question:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to update question."
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  /**
   * Deletes an existing question after confirmation.
   */
  const deleteQuestionRecord = async () => {
    if (
      !confirmState ||
      confirmState.type !== "delete-question" ||
      !confirmState.questionId
    ) {
      return;
    }

    setConfirmLoading(true);

    try {
      await deleteAcademyQuizQuestion(confirmState.questionId);

      setQuestions((current) =>
        current.filter((question) => question.id !== confirmState.questionId)
      );

      toast.success("Question deleted successfully.");
      setConfirmState(null);
    } catch (error) {
      console.error("Failed to delete question:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to delete question."
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  /**
   * Updates an existing option after confirmation.
   */
  const updateOptionRecord = async () => {
    if (
      !confirmState ||
      confirmState.type !== "update-option" ||
      !confirmState.option
    ) {
      return;
    }

    setConfirmLoading(true);

    try {
      const option = confirmState.option;

      const updatedOption = await updateAcademyQuizOption(option.id, {
        option_text: option.option_text.trim(),
        is_correct: option.is_correct,
        display_order: option.display_order,
      });

      setQuestions((current) =>
        current.map((question) => ({
          ...question,
          options: question.options.map((item) =>
            item.id === option.id
              ? {
                  ...item,
                  ...updatedOption,
                }
              : item
          ),
        }))
      );

      toast.success("Answer option updated successfully.");
      setConfirmState(null);
    } catch (error) {
      console.error("Failed to update answer option:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update answer option."
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  /**
   * Deletes an existing option after confirmation.
   */
  const deleteOptionRecord = async () => {
    if (
      !confirmState ||
      confirmState.type !== "delete-option" ||
      !confirmState.optionId
    ) {
      return;
    }

    setConfirmLoading(true);

    try {
      await deleteAcademyQuizOption(confirmState.optionId);

      setQuestions((current) =>
        current.map((question) => ({
          ...question,
          options: question.options.filter(
            (option) => option.id !== confirmState.optionId
          ),
        }))
      );

      toast.success("Answer option deleted successfully.");
      setConfirmState(null);
    } catch (error) {
      console.error("Failed to delete answer option:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete answer option."
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  /**
   * Executes the action currently selected in ConfirmModal.
   */
  const handleConfirmAction = async () => {
    if (!confirmState) {
      return;
    }

    switch (confirmState.type) {
      case "update-quiz":
        await updateQuizRecord();
        break;

      case "delete-quiz":
        await deleteQuizRecord();
        break;

      case "update-question":
        await updateQuestionRecord();
        break;

      case "delete-question":
        await deleteQuestionRecord();
        break;

      case "update-option":
        await updateOptionRecord();
        break;

      case "delete-option":
        await deleteOptionRecord();
        break;
    }
  };

  /**
   * Handles the primary Save Quiz action.
   * New quizzes are created immediately; existing quizzes require confirmation.
   */
  const handleSaveQuiz = async () => {
    if (editingQuiz) {
      handleRequestQuizUpdate();
      return;
    }

    setSavingQuiz(true);

    try {
      await createQuiz();
    } catch (error) {
      console.error("Failed to create quiz:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to create quiz."
      );
    } finally {
      setSavingQuiz(false);
    }
  };

  /**
   * Returns the confirmation modal configuration for the current action.
   */
  const getConfirmModalConfig = () => {
    if (!confirmState) {
      return null;
    }

    switch (confirmState.type) {
      case "update-quiz":
        return {
          title: "Update Quiz",
          message: "Are you sure you want to save these changes to this quiz?",
          confirmText: "Update Quiz",
          variant: "primary" as const,
        };

      case "delete-quiz":
        return {
          title: "Delete Quiz",
          message:
            "This will permanently delete the quiz, its questions, and its answer options.",
          confirmText: "Delete Quiz",
          variant: "danger" as const,
        };

      case "update-question":
        return {
          title: "Update Question",
          message:
            "Are you sure you want to save these changes to this question?",
          confirmText: "Update Question",
          variant: "primary" as const,
        };

      case "delete-question":
        return {
          title: "Delete Question",
          message:
            "This will permanently delete this question and all of its answer options.",
          confirmText: "Delete Question",
          variant: "danger" as const,
        };

      case "update-option":
        return {
          title: "Update Answer Option",
          message:
            "Are you sure you want to save these changes to this answer option?",
          confirmText: "Update Option",
          variant: "primary" as const,
        };

      case "delete-option":
        return {
          title: "Delete Answer Option",
          message: "This will permanently delete this answer option.",
          confirmText: "Delete Option",
          variant: "danger" as const,
        };
    }
  };

  const confirmModalConfig = getConfirmModalConfig();

  return (
    <>
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-indigo-500" />

                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {editingQuiz ? "Edit Quiz" : "Create Quiz"}
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Configure the assessment and its questions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveQuiz}
                disabled={savingQuiz}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <Save className="h-4 w-4" />

                {savingQuiz
                  ? "Saving..."
                  : editingQuiz
                    ? "Update Quiz"
                    : "Create Quiz"}
              </button>

              {editingQuiz && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmState({
                      type: "delete-quiz",
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Quiz Title
              </span>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Module 1 Assessment"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Passing Score
              </span>

              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={passingScore}
                  onChange={(event) =>
                    setPassingScore(Number(event.target.value))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />

                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  %
                </span>
              </div>
            </label>

            <label className="space-y-2 lg:col-span-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Description
              </span>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Describe what this assessment evaluates..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Maximum Attempts
              </span>

              <input
                type="number"
                min={1}
                value={maxAttempts ?? ""}
                onChange={(event) =>
                  setMaxAttempts(
                    event.target.value ? Number(event.target.value) : null
                  )
                }
                placeholder="Unlimited"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <div className="flex flex-col justify-end gap-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(event) => setIsRequired(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />

                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Required assessment
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(event) => setIsPublished(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />

                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Published
                </span>
              </label>
            </div>
          </div>
        </div>

        {editingQuiz && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Questions
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Build the questions and answer options students will see.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add Question
              </button>
            </div>

            {loadingQuestions ? (
              <div className="mt-6 space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : questions.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
                <ClipboardCheck className="mx-auto h-8 w-8 text-slate-400" />

                <p className="mt-3 font-medium text-slate-700 dark:text-slate-300">
                  No questions yet
                </p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Add your first question to begin building this assessment.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {questions.map((question, questionIndex) => {
                  const expanded = expandedQuestionId === question.id;

                  const isDraft = question.id.startsWith("draft-question-");

                  return (
                    <article
                      key={question.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 dark:bg-slate-950">
                        <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedQuestionId(expanded ? null : question.id)
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                            {questionIndex + 1}
                          </span>

                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                            {question.question_text || "Untitled question"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedQuestionId(expanded ? null : question.id)
                          }
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                        >
                          {expanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(question)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {expanded && (
                        <div className="space-y-5 p-5">
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="space-y-2 md:col-span-2">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Question
                              </span>

                              <textarea
                                value={question.question_text}
                                onChange={(event) =>
                                  updateQuestionDraft(question.id, {
                                    question_text: event.target.value,
                                  })
                                }
                                rows={3}
                                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                              />
                            </label>

                            <label className="space-y-2">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Question Type
                              </span>

                              <select
                                value={question.question_type}
                                onChange={(event) =>
                                  updateQuestionDraft(question.id, {
                                    question_type: event.target
                                      .value as AcademyQuizQuestionType,
                                  })
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                              >
                                {QUESTION_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="space-y-2">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Points
                              </span>

                              <input
                                type="number"
                                min={0.01}
                                step={0.5}
                                value={question.points}
                                onChange={(event) =>
                                  updateQuestionDraft(question.id, {
                                    points: Number(event.target.value),
                                  })
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                              />
                            </label>

                            <label className="space-y-2 md:col-span-2">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Explanation
                              </span>

                              <textarea
                                value={question.explanation ?? ""}
                                onChange={(event) =>
                                  updateQuestionDraft(question.id, {
                                    explanation: event.target.value,
                                  })
                                }
                                rows={2}
                                placeholder="Explain why the correct answer is correct..."
                                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                              />
                            </label>
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                  Answer Options
                                </h4>

                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Select the correct answer(s).
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddOption(question.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <CirclePlus className="h-3.5 w-3.5" />
                                Add Option
                              </button>
                            </div>

                            <div className="mt-4 space-y-3">
                              {question.options.map((option, optionIndex) => (
                                <div
                                  key={option.id}
                                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                                >
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {String.fromCharCode(65 + optionIndex)}
                                  </span>

                                  <input
                                    value={option.option_text}
                                    onChange={(event) =>
                                      updateOptionDraft(
                                        question.id,
                                        option.id,
                                        {
                                          option_text: event.target.value,
                                        }
                                      )
                                    }
                                    placeholder={`Option ${String.fromCharCode(
                                      65 + optionIndex
                                    )}`}
                                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                  />

                                  <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                                    <input
                                      type={
                                        question.question_type ===
                                        "multiple_choice"
                                          ? "checkbox"
                                          : "radio"
                                      }
                                      name={`correct-${question.id}`}
                                      checked={option.is_correct}
                                      onChange={(event) => {
                                        if (
                                          question.question_type ===
                                          "multiple_choice"
                                        ) {
                                          updateOptionDraft(
                                            question.id,
                                            option.id,
                                            {
                                              is_correct: event.target.checked,
                                            }
                                          );

                                          return;
                                        }

                                        setQuestions((current) =>
                                          current.map((item) =>
                                            item.id === question.id
                                              ? {
                                                  ...item,
                                                  options: item.options.map(
                                                    (currentOption) => ({
                                                      ...currentOption,
                                                      is_correct:
                                                        currentOption.id ===
                                                        option.id,
                                                    })
                                                  ),
                                                }
                                              : item
                                          )
                                        );
                                      }}
                                    />
                                    Correct
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveOption(question.id, option)
                                    }
                                    className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                            {!isDraft && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRequestQuestionUpdate(question)
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Pencil className="h-4 w-4" />
                                Save Changes
                              </button>
                            )}

                            {isDraft && (
                              <button
                                type="button"
                                onClick={() => saveNewQuestion(question)}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                              >
                                <Check className="h-4 w-4" />
                                Save Question
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {confirmModalConfig && (
        <ConfirmModal
          open={Boolean(confirmState)}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          confirmText={confirmModalConfig.confirmText}
          cancelText="Cancel"
          variant={confirmModalConfig.variant}
          loading={confirmLoading}
          onConfirm={handleConfirmAction}
          onCancel={() => {
            if (!confirmLoading) {
              setConfirmState(null);
            }
          }}
        />
      )}
    </>
  );
}
