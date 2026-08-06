import { LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { createBudget, getBudgetById, updateBudget } from "../../../../lib/budget";
import { getProjectOptions } from "../../../../lib/server/projects";
import type { ProjectOption } from "../../../../types/project";
import type {
  BudgetAllocationInput,
  BudgetDetails,
  BudgetExpenseCategory,
  BudgetStatus,
  BudgetType,
  CreateBudgetInput,
  UpdateBudgetInput,
} from "../../../../types/budget";

interface BudgetFormModalProps {
  open: boolean;
  budgetId?: string | null;
  onClose: () => void;

  onSaved: (budget: BudgetDetails) => void | Promise<void>;
}



interface BudgetAllocationForm {
  id: string;

  transaction_category: BudgetExpenseCategory;

  allocated_amount: string;

  notes: string;
}

interface BudgetFormState {
  name: string;

  description: string;

  budget_type: BudgetType;

  department: string;

  project_code: string;

  currency: string;

  total_amount: string;

  start_date: string;

  end_date: string;

  status: BudgetStatus;

  warning_threshold: string;

  allocations: BudgetAllocationForm[];
}

const BUDGET_TYPES: Array<{
  value: BudgetType;
  label: string;
}> = [
  {
    value: "monthly",
    label: "Monthly",
  },
  {
    value: "quarterly",
    label: "Quarterly",
  },
  {
    value: "annual",
    label: "Annual",
  },
  {
    value: "custom",
    label: "Custom",
  },
];

const BUDGET_STATUSES: Array<{
  value: BudgetStatus;
  label: string;
}> = [
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "active",
    label: "Active",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

const BUDGET_CATEGORIES: Array<{
  value: BudgetExpenseCategory;
  label: string;
}> = [
  {
    value: "operations",
    label: "Operations",
  },
  {
    value: "marketing",
    label: "Marketing",
  },
  {
    value: "salary",
    label: "Salary",
  },
  {
    value: "tax",
    label: "Tax",
  },
  {
    value: "equipment",
    label: "Equipment",
  },
  {
    value: "reimbursement",
    label: "Reimbursement",
  },
  {
    value: "other",
    label: "Other",
  },
];

/**
 * Return today's date in YYYY-MM-DD format.
 */
function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Return a default end date one month from today.
 */
function getDefaultEndDate() {
  const date = new Date();

  date.setMonth(date.getMonth() + 1);

  return date.toISOString().slice(0, 10);
}

/**
 * Create one empty Budget allocation row.
 */
function createEmptyAllocation(
  category: BudgetExpenseCategory = "operations"
): BudgetAllocationForm {
  return {
    id: crypto.randomUUID(),

    transaction_category: category,

    allocated_amount: "",

    notes: "",
  };
}

/**
 * Return the default Budget form values.
 */
function getEmptyBudgetForm(): BudgetFormState {
  return {
    name: "",

    description: "",

    budget_type: "monthly",

    department: "",

    project_code: "",

    currency: "NGN",

    total_amount: "",

    start_date: getTodayDate(),

    end_date: getDefaultEndDate(),

    status: "draft",

    warning_threshold: "80",

    allocations: [createEmptyAllocation()],
  };
}

/**
 * Convert one existing Budget into editable form values.
 */
function getBudgetFormFromDetails(budget: BudgetDetails): BudgetFormState {
  return {
    name: budget.name,

    description: budget.description ?? "",

    budget_type: budget.budget_type,

    department: budget.department ?? "",

    project_code: budget.project_code ?? "",

    currency: budget.currency,

    total_amount: String(budget.total_amount),

    start_date: budget.start_date,

    end_date: budget.end_date,

    status: budget.status,

    warning_threshold: String(budget.warning_threshold),

    allocations: budget.allocations.map((allocation) => ({
      id: allocation.allocation_id,

      transaction_category: allocation.transaction_category,

      allocated_amount: String(allocation.allocated_amount),

      notes: "",
    })),
  };
}

/**
 * Format one Budget amount.
 */
function formatBudgetCurrency(amount: number, currency = "NGN") {
  return `${currency.toUpperCase()} ${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/**
 * Render one reusable Budget form field.
 */
function BudgetField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      {children}
    </label>
  );
}

/**
 * Render the Create and Edit Budget modal.
 */
export default function BudgetFormModal({
  open,
  budgetId,
  onClose,
  onSaved,
}: BudgetFormModalProps) {
  const [form, setForm] = useState<BudgetFormState>(getEmptyBudgetForm());

  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const [loadingProjects, setLoadingProjects] = useState(false);

  const [loadingBudget, setLoadingBudget] = useState(false);

  const [saving, setSaving] = useState(false);

  /**
   * Load all available projects using the existing project service.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    async function loadProjects() {
      setLoadingProjects(true);

      try {
        const projectOptions = await getProjectOptions();

        setProjects(projectOptions);
      } catch (error) {
        console.error("Failed to load project options:", error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Projects could not be loaded."
        );

        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    }

    void loadProjects();
  }, [open]);

  /**
   * Load the selected Budget when editing.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    if (!budgetId) {
      setForm(getEmptyBudgetForm());

      return;
    }

    async function loadBudget() {
      setLoadingBudget(true);

      try {
        const budget = await getBudgetById(budgetId as string);

        setForm(getBudgetFormFromDetails(budget));
      } catch (error) {
        console.error("Failed to load Budget for editing:", error);

        toast.error(
          error instanceof Error
            ? error.message
            : "The Budget could not be loaded."
        );

        onClose();
      } finally {
        setLoadingBudget(false);
      }
    }

    void loadBudget();
  }, [budgetId, onClose, open]);

  const inputClasses =
    "w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white";

  const totalAmount = Number(form.total_amount || 0);

  const allocatedTotal = useMemo(
    () =>
      form.allocations.reduce(
        (total, allocation) => total + Number(allocation.allocated_amount || 0),
        0
      ),
    [form.allocations]
  );

  const allocationDifference = totalAmount - allocatedTotal;

  const usedCategories = useMemo(
    () =>
      new Set(
        form.allocations.map((allocation) => allocation.transaction_category)
      ),
    [form.allocations]
  );

  if (!open) {
    return null;
  }

  /**
   * Update one controlled Budget field.
   */
  function updateField<Key extends keyof BudgetFormState>(
    key: Key,
    value: BudgetFormState[Key]
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  /**
   * Update one Budget allocation field.
   */
  function updateAllocation<Key extends keyof BudgetAllocationForm>(
    allocationId: string,
    key: Key,
    value: BudgetAllocationForm[Key]
  ) {
    setForm((currentForm) => ({
      ...currentForm,

      allocations: currentForm.allocations.map((allocation) =>
        allocation.id === allocationId
          ? {
              ...allocation,
              [key]: value,
            }
          : allocation
      ),
    }));
  }

  /**
   * Add another unused Expense category allocation.
   */
  function addAllocation() {
    const availableCategory = BUDGET_CATEGORIES.find(
      (category) => !usedCategories.has(category.value)
    );

    if (!availableCategory) {
      toast.info("All Expense categories have already been allocated.");

      return;
    }

    setForm((currentForm) => ({
      ...currentForm,

      allocations: [
        ...currentForm.allocations,

        createEmptyAllocation(availableCategory.value),
      ],
    }));
  }

  /**
   * Remove one Budget allocation row.
   */
  function removeAllocation(allocationId: string) {
    if (form.allocations.length === 1) {
      toast.error("A Budget must contain at least one allocation.");

      return;
    }

    setForm((currentForm) => ({
      ...currentForm,

      allocations: currentForm.allocations.filter(
        (allocation) => allocation.id !== allocationId
      ),
    }));
  }

  /**
   * Convert controlled allocation rows into API input.
   */
  function normalizeAllocationInputs(): BudgetAllocationInput[] {
    const seenCategories = new Set<BudgetExpenseCategory>();

    return form.allocations.map((allocation) => {
      const amount = Number(allocation.allocated_amount);

      if (seenCategories.has(allocation.transaction_category)) {
        const categoryLabel =
          BUDGET_CATEGORIES.find(
            (category) => category.value === allocation.transaction_category
          )?.label ?? allocation.transaction_category;

        throw new Error(
          `The ${categoryLabel} category appears more than once.`
        );
      }

      seenCategories.add(allocation.transaction_category);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Each allocation amount must be greater than zero.");
      }

      return {
        transaction_category: allocation.transaction_category,

        allocated_amount: Number(amount.toFixed(2)),

        notes: allocation.notes.trim() || null,
      };
    });
  }

  /**
   * Validate and save the Budget.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = form.name.trim();

    if (!normalizedName) {
      toast.error("Budget name is required.");

      return;
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      toast.error("Total Budget amount must be greater than zero.");

      return;
    }

    const warningThreshold = Number(form.warning_threshold);

    if (
      !Number.isFinite(warningThreshold) ||
      warningThreshold < 0 ||
      warningThreshold > 100
    ) {
      toast.error("Warning threshold must be between 0 and 100.");

      return;
    }

    if (!form.start_date || !form.end_date) {
      toast.error("Budget start and end dates are required.");

      return;
    }

    if (form.end_date < form.start_date) {
      toast.error("Budget end date cannot be earlier than the start date.");

      return;
    }

    const currency = form.currency.trim().toUpperCase();

    if (currency.length !== 3) {
      toast.error("Currency must be a three-letter ISO code.");

      return;
    }

    let allocations: BudgetAllocationInput[];

    try {
      allocations = normalizeAllocationInputs();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The Budget allocations are invalid."
      );

      return;
    }

    const normalizedAllocatedTotal = allocations.reduce(
      (total, allocation) => total + allocation.allocated_amount,
      0
    );

    if (normalizedAllocatedTotal > totalAmount) {
      toast.error(
        "Category allocations cannot exceed the total Budget amount."
      );

      return;
    }

    setSaving(true);

    try {
      const input: CreateBudgetInput = {
        name: normalizedName,

        description: form.description.trim() || null,

        budget_type: form.budget_type,

        department: form.department.trim() || null,

        project_code: form.project_code || null,

        currency,

        total_amount: Number(totalAmount.toFixed(2)),

        start_date: form.start_date,

        end_date: form.end_date,

        status: form.status,

        warning_threshold: Number(warningThreshold.toFixed(2)),

        allocations,
      };

      const savedBudget = budgetId
        ? await updateBudget(budgetId, input as UpdateBudgetInput)
        : await createBudget(input);

      toast.success(
        budgetId
          ? "Budget updated successfully."
          : "Budget created successfully."
      );

      await onSaved(savedBudget);
    } catch (error) {
      console.error("Failed to save Budget:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Budget could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-form-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl"
      >
        <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-6 sm:py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              Finance
            </p>

            <h2
              id="budget-form-title"
              className="mt-1 text-xl font-bold text-slate-950 dark:text-white sm:text-2xl"
            >
              {budgetId ? "Edit Budget" : "Create Budget"}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Define the Budget period and allocate spending across Expense
              categories.
            </p>
          </div>

          <button
            type="button"
            title="Close Budget Form"
            aria-label="Close Budget Form"
            disabled={saving}
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            <X size={18} />
          </button>
        </header>

        {loadingBudget ? (
          <div className="flex min-h-72 items-center justify-center">
            <LoaderCircle
              size={30}
              className="animate-spin text-blue-600 dark:text-blue-400"
            />
          </div>
        ) : (
          <>
            <div className="space-y-6 p-4 sm:p-6">
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <BudgetField label="Budget Name" required>
                    <input
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      placeholder="2026 Operations Budget"
                      className={inputClasses}
                    />
                  </BudgetField>
                </div>

                <div className="sm:col-span-2">
                  <BudgetField label="Description">
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(event) =>
                        updateField("description", event.target.value)
                      }
                      placeholder="Describe the purpose of this Budget"
                      className={inputClasses}
                    />
                  </BudgetField>
                </div>

                <BudgetField label="Budget Type" required>
                  <select
                    value={form.budget_type}
                    onChange={(event) =>
                      updateField(
                        "budget_type",
                        event.target.value as BudgetType
                      )
                    }
                    className={inputClasses}
                  >
                    {BUDGET_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </BudgetField>

                <BudgetField label="Status" required>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField("status", event.target.value as BudgetStatus)
                    }
                    className={inputClasses}
                  >
                    {BUDGET_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </BudgetField>

                <BudgetField label="Department">
                  <input
                    value={form.department}
                    onChange={(event) =>
                      updateField("department", event.target.value)
                    }
                    placeholder="Operations"
                    className={inputClasses}
                  />
                </BudgetField>

                <BudgetField label="Project">
                  <select
                    value={form.project_code}
                    onChange={(event) =>
                      updateField("project_code", event.target.value)
                    }
                    disabled={loadingProjects}
                    className={inputClasses}
                  >
                    <option value="">
                      {loadingProjects
                        ? "Loading projects..."
                        : projects.length === 0
                          ? "No projects available"
                          : "No project selected"}
                    </option>

                    {projects.map((project) => (
                      <option key={project.id} value={project.project_code}>
                        {project.project_code} — {project.name}
                      </option>
                    ))}
                  </select>
                </BudgetField>

                <BudgetField label="Total Amount" required>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.total_amount}
                    onChange={(event) =>
                      updateField("total_amount", event.target.value)
                    }
                    placeholder="0.00"
                    className={inputClasses}
                  />
                </BudgetField>

                <BudgetField label="Currency" required>
                  <input
                    value={form.currency}
                    maxLength={3}
                    onChange={(event) =>
                      updateField("currency", event.target.value.toUpperCase())
                    }
                    placeholder="NGN"
                    className={inputClasses}
                  />
                </BudgetField>

                <BudgetField label="Start Date" required>
                  <input
                    type="date"
                    value={form.start_date}
                    max={form.end_date || undefined}
                    onChange={(event) =>
                      updateField("start_date", event.target.value)
                    }
                    className={inputClasses}
                  />
                </BudgetField>

                <BudgetField label="End Date" required>
                  <input
                    type="date"
                    value={form.end_date}
                    min={form.start_date || undefined}
                    onChange={(event) =>
                      updateField("end_date", event.target.value)
                    }
                    className={inputClasses}
                  />
                </BudgetField>

                <BudgetField label="Warning Threshold (%)" required>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.warning_threshold}
                    onChange={(event) =>
                      updateField("warning_threshold", event.target.value)
                    }
                    className={inputClasses}
                  />
                </BudgetField>
              </section>

              <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950 dark:text-white">
                      Category Allocations
                    </h3>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Allocate the total Budget across Expense categories.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addAllocation}
                    disabled={
                      form.allocations.length >= BUDGET_CATEGORIES.length
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <Plus size={16} />
                    Add Category
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {form.allocations.map((allocation, index) => (
                    <article
                      key={allocation.id}
                      className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 sm:p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Allocation {index + 1}
                        </p>

                        <button
                          type="button"
                          title="Remove Allocation"
                          aria-label="Remove Allocation"
                          onClick={() => removeAllocation(allocation.id)}
                          disabled={form.allocations.length === 1}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <BudgetField label="Expense Category" required>
                          <select
                            value={allocation.transaction_category}
                            onChange={(event) =>
                              updateAllocation(
                                allocation.id,
                                "transaction_category",
                                event.target.value as BudgetExpenseCategory
                              )
                            }
                            className={inputClasses}
                          >
                            {BUDGET_CATEGORIES.map((category) => {
                              const categoryAlreadyUsed = form.allocations.some(
                                (existingAllocation) =>
                                  existingAllocation.id !== allocation.id &&
                                  existingAllocation.transaction_category ===
                                    category.value
                              );

                              return (
                                <option
                                  key={category.value}
                                  value={category.value}
                                  disabled={categoryAlreadyUsed}
                                >
                                  {category.label}
                                </option>
                              );
                            })}
                          </select>
                        </BudgetField>

                        <BudgetField label="Allocated Amount" required>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={allocation.allocated_amount}
                            onChange={(event) =>
                              updateAllocation(
                                allocation.id,
                                "allocated_amount",
                                event.target.value
                              )
                            }
                            placeholder="0.00"
                            className={inputClasses}
                          />
                        </BudgetField>

                        <div className="sm:col-span-2">
                          <BudgetField label="Notes">
                            <input
                              value={allocation.notes}
                              onChange={(event) =>
                                updateAllocation(
                                  allocation.id,
                                  "notes",
                                  event.target.value
                                )
                              }
                              placeholder="Optional allocation notes"
                              className={inputClasses}
                            />
                          </BudgetField>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900 sm:grid-cols-3 sm:p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Total Budget
                    </p>

                    <p className="mt-1 font-bold text-slate-950 dark:text-white">
                      {formatBudgetCurrency(totalAmount, form.currency)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Allocated
                    </p>

                    <p className="mt-1 font-bold text-slate-950 dark:text-white">
                      {formatBudgetCurrency(allocatedTotal, form.currency)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Unallocated
                    </p>

                    <p
                      className={`mt-1 font-bold ${
                        allocationDifference < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {formatBudgetCurrency(
                        allocationDifference,
                        form.currency
                      )}
                    </p>
                  </div>
                </div>

                {allocationDifference < 0 && (
                  <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                    Allocations currently exceed the total Budget amount.
                  </p>
                )}
              </section>
            </div>

            <footer className="sticky bottom-0 z-20 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || loadingBudget || allocationDifference < 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {saving && <LoaderCircle size={16} className="animate-spin" />}

                {saving
                  ? "Saving..."
                  : budgetId
                    ? "Save Changes"
                    : "Create Budget"}
              </button>
            </footer>
          </>
        )}
      </form>
    </div>
  );
}
