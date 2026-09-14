import {
  Check,
  CircleDot,
  PackageCheck,
  PackageOpen,
  Settings2,
  Truck,
} from "lucide-react";

interface OrderLifecycleProps {
  status?: string | null;
}

interface LifecycleStep {
  key: string;
  label: string;
  icon: React.ElementType;
  matches: string[];
}

const lifecycleSteps: LifecycleStep[] = [
  {
    key: "pending_confirmation",
    label: "Order pending confirmation",
    icon: CircleDot,
    matches: ["pending"],
  },
  {
    key: "processing_started",
    label: "Processing started",
    icon: Settings2,
    matches: ["confirmed"],
  },
  {
    key: "fulfilment_started",
    label: "Fulfilment started",
    icon: PackageOpen,
    matches: ["processing"],
  },
  {
    key: "ready_for_dispatch",
    label: "Ready for dispatch",
    icon: PackageCheck,
    matches: ["ready_for_delivery"],
  },
  {
    key: "dispatched",
    label: "Dispatched",
    icon: Truck,
    matches: ["out_for_delivery"],
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: Check,
    matches: ["delivered"],
  },
];

/* Normalizes workflow statuses so database values can be matched safely. */
function normalizeStatus(status?: string | null) {
  return status?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
}

/* Finds the active lifecycle stage from the current POD/order status. */
function getCurrentStepIndex(status?: string | null) {
  const normalizedStatus = normalizeStatus(status);

  const matchedIndex = lifecycleSteps.findIndex((step) =>
    step.matches.some((match) => normalizeStatus(match) === normalizedStatus)
  );

  return matchedIndex >= 0 ? matchedIndex : 0;
}

export default function OrderLifecycle({ status }: OrderLifecycleProps) {
  const currentStepIndex = getCurrentStepIndex(status);

  return (
    <section className="rounded-xl  bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className=""></div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[720px] items-start">
          {lifecycleSteps.map((step, index) => {
            const Icon = step.icon;

            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div key={step.key} className="flex min-w-0 flex-1 items-start">
                <div className="flex w-[105px] shrink-0 flex-col items-center text-center">
                  <div
                    className={[
                      "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-200",

                      isCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "",

                      isCurrent
                        ? "border-blue-600 bg-blue-600 text-white ring-2 ring-blue-100 dark:ring-blue-950"
                        : "",

                      !isCompleted && !isCurrent
                        ? "border-slate-300 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : (
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                  </div>

                  <p
                    className={[
                      "mt-2 max-w-[105px] text-[11px] font-medium leading-[15px]",

                      isCompleted
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "",

                      isCurrent ? "text-blue-600 dark:text-blue-400" : "",

                      !isCompleted && !isCurrent
                        ? "text-slate-500 dark:text-slate-400"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {step.label}
                  </p>

                  {isCurrent && (
                    <span className="mt-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      Current
                    </span>
                  )}
                </div>

                {index < lifecycleSteps.length - 1 && (
                  <div className="mt-[13px] flex-1 px-1">
                    <div
                      className={[
                        "h-px w-full transition-colors duration-200",

                        index < currentStepIndex
                          ? "bg-emerald-500"
                          : index === currentStepIndex
                            ? "bg-blue-300 dark:bg-blue-800"
                            : "bg-slate-200 dark:bg-slate-800",
                      ].join(" ")}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
