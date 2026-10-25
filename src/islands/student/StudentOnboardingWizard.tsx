import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  X,
} from "lucide-react";

interface OnboardingStep {
  title: string;
  description: string;
  icon: typeof Sparkles;
}

interface StudentOnboardingTipsProps {
  finishHref?: string;
}

const steps: OnboardingStep[] = [
  {
    title: "Welcome to CloudTweak Academy",
    description:
      "Welcome aboard! This dashboard is your home for managing your learning journey.",
    icon: Sparkles,
  },
  {
    title: "Discover your courses",
    description:
      "Explore available programs, review their details, and find courses that match your goals.",
    icon: BookOpen,
  },
  {
    title: "Learn at your own pace",
    description:
      "Open your enrolled courses, work through lessons, and build practical skills step by step.",
    icon: GraduationCap,
  },
  {
    title: "You're ready to begin!",
    description:
      "Explore all available courses and choose where you want your learning journey to take you.",
    icon: CheckCircle2,
  },
];

// Each step has a dedicated floating-card position on larger screens.
const positions = [
  "left-6 top-6",
  "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
  "right-6 top-6",
  "left-6 top-1/2 -translate-y-1/2",
] as const;

export default function StudentOnboardingTips({
  finishHref = "/student/courses",
}: StudentOnboardingTipsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  // Show onboarding only when a new sign-in has requested it.
  // Consume the flag immediately so page navigation cannot trigger it again.
  useEffect(() => {
    const onboardingPending =
      sessionStorage.getItem("cloudtweak_student_onboarding_pending") ===
      "true";

    if (onboardingPending) {
      sessionStorage.removeItem("cloudtweak_student_onboarding_pending");
      setCurrentStep(0);
      setVisible(true);
    }
  }, []);

  // Move forward one step without exceeding the final step.
  function handleNext() {
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  }

  // Return to the previous step without going below the first step.
  function handleBack() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  // Dismiss the guide without navigating away from the dashboard.
  function handleDismiss() {
    setVisible(false);
  }

  // Finish onboarding and take the student to the all-courses page.
  function handleFinish() {
    setVisible(false);
    window.location.assign(finishHref);
  }

  if (!visible) {
    return null;
  }

  const step = steps[currentStep];
  const StepIcon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const position = positions[currentStep];

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[90] cursor-default bg-slate-950/55 backdrop-blur-[2px]"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-onboarding-title"
        aria-describedby="student-onboarding-description"
        aria-live="polite"
        className={`fixed z-[100] w-[calc(100vw-2rem)] max-w-sm ${position} max-sm:!bottom-4 max-sm:!left-4 max-sm:!right-4 max-sm:!top-auto max-sm:!translate-x-0 max-sm:!translate-y-0`}
      >
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/30 dark:border-slate-700 dark:bg-slate-900">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-orange-300/20 blur-3xl dark:bg-orange-500/10"
          />

          <div className="relative p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
                <StepIcon size={21} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-400">
                  Student guide
                </p>

                <h2
                  id="student-onboarding-title"
                  className="mt-1 text-base font-bold leading-6 text-slate-900 dark:text-white"
                >
                  {step.title}
                </h2>
              </div>

              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {currentStep + 1}/{steps.length}
              </span>
            </div>

            <p
              id="student-onboarding-description"
              className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300"
            >
              {step.description}
            </p>

            <div className="mt-5">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-sky-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isFirst}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-900"
                  >
                    <X size={14} />
                    Dismiss
                  </button>

                  {isLast ? (
                    <button
                      type="button"
                      onClick={handleFinish}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                    >
                      Finish
                      <CheckCircle2 size={15} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                    >
                      Next
                      <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
