import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { startStudentQuiz, submitStudentQuiz } from "../../lib/academy";

import type {
  StudentQuizAttemptPayload,
  StudentQuizResult,
} from "../../types/academy";

interface StudentQuizPlayerProps {
  quizId: string;
  enrollmentId: string;
  onComplete?: (result: StudentQuizResult) => void;
  onProceed?: (result: StudentQuizResult) => void;
}

/**
 * Stores the selected option IDs for each question in the active attempt.
 */
type QuizAnswers = Record<string, string[]>;

/**
 * Displays and manages one randomized student quiz attempt.
 *
 * The component does not calculate correctness or scores.
 * The Supabase RPC remains the authoritative grading source.
 */
export default function StudentQuizPlayer({
  quizId,
  enrollmentId,
  onComplete,
  onProceed,
}: StudentQuizPlayerProps) {
  const [attempt, setAttempt] = useState<StudentQuizAttemptPayload | null>(
    null
  );

  const [answers, setAnswers] = useState<QuizAnswers>({});

  const [currentIndex, setCurrentIndex] = useState(0);

  const [result, setResult] = useState<StudentQuizResult | null>(null);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [retrying, setRetrying] = useState(false);

  /**
   * Returns the currently visible question.
   */
  const currentQuestion = useMemo(() => {
    if (!attempt) {
      return null;
    }

    return attempt.questions[currentIndex] ?? null;
  }, [attempt, currentIndex]);

  /**
   * Determines whether the current question has at least one selected option.
   */
  const currentQuestionAnswered = useMemo(() => {
    if (!currentQuestion) {
      return false;
    }

    return (answers[currentQuestion.questionId] ?? []).length > 0;
  }, [answers, currentQuestion]);

  /**
   * Determines whether every question in the current attempt has an answer.
   */
  const allQuestionsAnswered = useMemo(() => {
    if (!attempt || attempt.questions.length === 0) {
      return false;
    }

    return attempt.questions.every(
      (question) => (answers[question.questionId] ?? []).length > 0
    );
  }, [answers, attempt]);

  /**
   * Starts or resumes the student's current quiz attempt.
   */
  const loadQuiz = async () => {
    setLoading(true);
    setResult(null);
    setCurrentIndex(0);

    try {
      const payload = await startStudentQuiz(quizId, enrollmentId);

      setAttempt(payload);

      const initialAnswers: QuizAnswers = {};

      payload.questions.forEach((question) => {
        initialAnswers[question.questionId] = question.selectedOptionIds ?? [];
      });

      setAnswers(initialAnswers);
    } catch (error) {
      console.error("Failed to load student quiz:", error);

      toast.error(
        error instanceof Error ? error.message : "Unable to load this quiz."
      );

      setAttempt(null);
      setAnswers({});
    } finally {
      setLoading(false);
    }
  };

  /**
   * Loads the quiz whenever its quiz or enrollment target changes.
   */
  useEffect(() => {
    void loadQuiz();
  }, [quizId, enrollmentId]);

  /**
   * Updates the selected options for the current question.
   */
  const handleOptionChange = (optionId: string) => {
    if (!currentQuestion || submitting || result) {
      return;
    }

    const questionId = currentQuestion.questionId;

    setAnswers((current) => {
      const existing = current[questionId] ?? [];

      if (currentQuestion.questionType === "multiple_choice") {
        const selected = existing.includes(optionId);

        return {
          ...current,
          [questionId]: selected
            ? existing.filter((id) => id !== optionId)
            : [...existing, optionId],
        };
      }

      return {
        ...current,
        [questionId]: [optionId],
      };
    });
  };

  /**
   * Moves to the previous quiz question.
   */
  const handlePrevious = () => {
    setCurrentIndex((current) => Math.max(current - 1, 0));
  };

  /**
   * Moves to the next quiz question after requiring an answer.
   */
  const handleNext = () => {
    if (!attempt) {
      return;
    }

    if (!currentQuestionAnswered) {
      toast.error("Please select an answer before continuing.");
      return;
    }

    setCurrentIndex((current) =>
      Math.min(current + 1, attempt.questions.length - 1)
    );
  };

  /**
   * Submits the student's answers to the server for authoritative grading.
   */
  const handleSubmit = async () => {
    if (!attempt) {
      return;
    }

    if (!allQuestionsAnswered) {
      toast.error("Please answer every question before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const submission = attempt.questions.map((question) => ({
        questionId: question.questionId,
        selectedOptionIds: answers[question.questionId] ?? [],
      }));

      const quizResult = await submitStudentQuiz(attempt.attemptId, submission);

      setResult(quizResult);

      onComplete?.(quizResult);

      if (quizResult.passed) {
        toast.success(`Quiz passed with ${quizResult.percentage.toFixed(0)}%.`);
      } else {
        toast.error(
          `Quiz not passed. You scored ${quizResult.percentage.toFixed(0)}%.`
        );
      }
    } catch (error) {
      console.error("Failed to submit student quiz:", error);

      toast.error(
        error instanceof Error ? error.message : "Unable to submit your quiz."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Starts a fresh randomized attempt after a failed attempt.
   */
  const handleRetry = async () => {
    setRetrying(true);

    try {
      await loadQuiz();
    } finally {
      setRetrying(false);
    }
  };

  /**
   * Allows a passed student to continue to the next learning stage.
   */
  const handleProceed = () => {
    if (!result?.passed) {
      return;
    }

    onProceed?.(result);
  };

  if (loading) {
    return (
      <section className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3 text-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-indigo-500" />

          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Loading quiz...
          </p>
        </div>
      </section>
    );
  }

  if (!attempt) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <CircleAlert className="h-10 w-10 text-amber-500" />

          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
            Quiz unavailable
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            We could not load this assessment. Please try again.
          </p>

          <button
            type="button"
            onClick={() => void loadQuiz()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </section>
    );
  }

  if (result) {
    return (
      <QuizResult
        result={result}
        passingScore={attempt.passingScore}
        attemptNumber={attempt.attemptNumber}
        maxAttempts={attempt.maxAttempts}
        retrying={retrying}
        onRetry={handleRetry}
        onProceed={handleProceed}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-md text-center">
          <CircleAlert className="mx-auto h-10 w-10 text-amber-500" />

          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
            This quiz has no questions
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            The assessment is not ready yet. Please contact your instructor.
          </p>
        </div>
      </section>
    );
  }

  const selectedOptionIds = answers[currentQuestion.questionId] ?? [];

  const isLastQuestion = currentIndex === attempt.questions.length - 1;

  const progressPercent =
    attempt.questions.length > 0
      ? ((currentIndex + 1) / attempt.questions.length) * 100
      : 0;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-500">
              Assessment
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {attempt.title}
            </h2>

            {attempt.description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {attempt.description}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-center dark:bg-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Passing score
            </p>

            <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
              {attempt.passingScore}%
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>
              Question {currentIndex + 1} of {attempt.questions.length}
            </span>

            <span>{Math.round(progressPercent)}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {getQuestionTypeLabel(currentQuestion.questionType)}
            </span>

            <h3 className="mt-4 text-lg font-semibold leading-7 text-slate-900 dark:text-white">
              {currentQuestion.questionText}
            </h3>

            {currentQuestion.questionType === "multiple_choice" ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Select all answers that apply.
              </p>
            ) : null}
          </div>

          <div className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {currentQuestion.points}{" "}
            {currentQuestion.points === 1 ? "point" : "points"}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {currentQuestion.options.map((option) => {
            const selected = selectedOptionIds.includes(option.id);

            return (
              <button
                key={option.id}
                type="button"
                disabled={submitting}
                onClick={() => handleOptionChange(option.id)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                  selected
                    ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${
                    currentQuestion.questionType === "multiple_choice"
                      ? "rounded-md"
                      : "rounded-full"
                  } ${
                    selected
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {selected ? <CheckCircle2 className="h-4 w-4" /> : null}
                </span>

                <span className="text-sm font-medium leading-6 text-slate-700 dark:text-slate-200">
                  {option.optionText}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentIndex === 0 || submitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {!isLastQuestion ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !allQuestionsAnswered}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Quiz
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>

      {!allQuestionsAnswered ? (
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Answer every question before submitting the assessment.
        </p>
      ) : null}
    </section>
  );
}

interface QuizResultProps {
  result: StudentQuizResult;
  passingScore: number;
  attemptNumber: number;
  maxAttempts: number | null;
  retrying: boolean;
  onRetry: () => void;
  onProceed: () => void;
}

/**
 * Displays the server-generated quiz result and the available next action.
 */
function QuizResult({
  result,
  passingScore,
  attemptNumber,
  maxAttempts,
  retrying,
  onRetry,
  onProceed,
}: QuizResultProps) {
  const attemptsRemaining =
    maxAttempts === null ? null : Math.max(maxAttempts - attemptNumber, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-xl text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            result.passed
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
              : "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
          }`}
        >
          {result.passed ? (
            <Trophy className="h-8 w-8" />
          ) : (
            <XCircle className="h-8 w-8" />
          )}
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Quiz Result
        </p>

        <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
          {result.passed ? "Congratulations!" : "Keep Going"}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {result.passed
            ? "You passed this assessment and can continue to the next learning stage."
            : `You need at least ${passingScore}% to pass this assessment.`}
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <ResultStat
            label="Score"
            value={`${result.percentage.toFixed(0)}%`}
          />

          <ResultStat label="Required" value={`${passingScore}%`} />

          <ResultStat label="Attempt" value={String(attemptNumber)} />
        </div>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {result.passed ? (
            <button
              type="button"
              onClick={onProceed}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : attemptsRemaining === null || attemptsRemaining > 0 ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {retrying ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Preparing retry...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Retry Quiz
                </>
              )}
            </button>
          ) : (
            <div className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Maximum attempts reached
            </div>
          )}
        </div>

        {!result.passed && attemptsRemaining !== null ? (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            {attemptsRemaining}{" "}
            {attemptsRemaining === 1 ? "attempt" : "attempts"} remaining.
          </p>
        ) : null}
      </div>
    </section>
  );
}

interface ResultStatProps {
  label: string;
  value: string;
}

/**
 * Displays one compact quiz-result statistic.
 */
function ResultStat({ label, value }: ResultStatProps) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-4 dark:bg-slate-800/70">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

/**
 * Converts the internal quiz question type into a student-facing label.
 */
function getQuestionTypeLabel(
  questionType: "single_choice" | "multiple_choice" | "true_false"
) {
  switch (questionType) {
    case "multiple_choice":
      return "Multiple choice";

    case "true_false":
      return "True / False";

    case "single_choice":
    default:
      return "Single choice";
  }
}
