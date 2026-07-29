import {
  CheckCircle2,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  createAcademyCategory,
  deleteAcademyCategory,
  generateAcademySlug,
  getAcademyCategories,
  updateAcademyCategory,
} from "../../../lib/academy";
import type { AcademyCategory } from "../../../types/academy";

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

const DEFAULT_CATEGORY_FORM: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  icon: "",
  display_order: 0,
  is_active: true,
};

/**
 * Display and manage Academy program categories.
 */
export default function AcademyCategoriesManager() {
  // Store all Academy categories returned by Supabase.
  const [categories, setCategories] = useState<AcademyCategory[]>([]);

  // Store the current category form values.
  const [form, setForm] = useState<CategoryFormState>(DEFAULT_CATEGORY_FORM);

  // Store the category currently being edited.
  const [editingCategory, setEditingCategory] =
    useState<AcademyCategory | null>(null);

  // Store the current category search value.
  const [searchQuery, setSearchQuery] = useState("");

  // Track whether categories are loading.
  const [loading, setLoading] = useState(true);

  // Track whether the form is being submitted.
  const [submitting, setSubmitting] = useState(false);

  // Store the ID of the category currently being deleted.
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Track whether the slug was manually edited.
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Store a user-facing loading error.
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Retrieve every Academy category from Supabase.
   */
  const loadCategories = useCallback(async () => {
    // Start loading and clear the previous error.
    setLoading(true);
    setErrorMessage("");

    try {
      // Retrieve all available categories.
      const records = await getAcademyCategories();

      // Store the returned records in local state.
      setCategories(records);
    } catch (error) {
      // Log the complete request error for debugging.
      console.error("Failed to load Academy categories:", error);

      // Display a safe error message.
      setErrorMessage("Academy categories could not be loaded.");
    } finally {
      // End the loading state.
      setLoading(false);
    }
  }, []);

  // Load categories after the React island hydrates.
  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  // Filter categories using the current search phrase.
  const filteredCategories = useMemo(() => {
    // Normalize the search value for case-insensitive matching.
    const normalizedSearch = searchQuery.trim().toLowerCase();

    // Return all categories when no search phrase exists.
    if (!normalizedSearch) {
      return categories;
    }

    return categories.filter((category) => {
      // Combine the searchable category values.
      const searchableContent = [
        category.name,
        category.slug,
        category.description,
        category.icon,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableContent.includes(normalizedSearch);
    });
  }, [categories, searchQuery]);

  /**
   * Update one category form field.
   */
  function updateFormField<Key extends keyof CategoryFormState>(
    field: Key,
    value: CategoryFormState[Key]
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  /**
   * Update the category name and automatically generate its slug.
   */
  function handleNameChange(value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      name: value,
      slug: slugManuallyEdited ? currentForm.slug : generateAcademySlug(value),
    }));
  }

  /**
   * Update the category slug manually.
   */
  function handleSlugChange(value: string) {
    // Preserve manual slug changes during future name edits.
    setSlugManuallyEdited(true);

    // Normalize the entered slug.
    updateFormField("slug", generateAcademySlug(value));
  }

  /**
   * Reset the category form to its default state.
   */
  function resetForm() {
    setForm(DEFAULT_CATEGORY_FORM);
    setEditingCategory(null);
    setSlugManuallyEdited(false);
  }

  /**
   * Populate the form with an existing category.
   */
  function handleEdit(category: AcademyCategory) {
    setEditingCategory(category);

    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      icon: category.icon ?? "",
      display_order: category.display_order,
      is_active: category.is_active,
    });

    setSlugManuallyEdited(true);

    // Scroll the form into view on smaller screens.
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /**
   * Create a category or save changes to an existing category.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Prevent the browser from reloading the page.
    event.preventDefault();

    // Prevent duplicate category submissions.
    if (submitting) {
      return;
    }

    // Validate the required category name.
    if (!form.name.trim()) {
      toast.error("Category name is required.");
      return;
    }

    // Validate the required category slug.
    if (!form.slug.trim()) {
      toast.error("Category slug is required.");
      return;
    }

    // Build the sanitized category payload.
    const payload = {
      name: form.name.trim(),
      slug: generateAcademySlug(form.slug),
      description: form.description.trim() || null,
      icon: form.icon.trim() || null,
      display_order: form.display_order,
      is_active: form.is_active,
    };

    // Start the submitting state.
    setSubmitting(true);

    try {
      // Update the selected category when editing.
      if (editingCategory) {
        const updatedCategory = await updateAcademyCategory(
          editingCategory.id,
          payload
        );

        // Replace the updated category in local state.
        setCategories((currentCategories) =>
          currentCategories.map((category) =>
            category.id === updatedCategory.id ? updatedCategory : category
          )
        );

        toast.success(`${updatedCategory.name} has been updated.`);

        resetForm();
        return;
      }

      // Create a new Academy category.
      const createdCategory = await createAcademyCategory(payload);

      // Add the created category to local state.
      setCategories((currentCategories) =>
        [...currentCategories, createdCategory].sort(
          (firstCategory, secondCategory) => {
            if (firstCategory.display_order !== secondCategory.display_order) {
              return firstCategory.display_order - secondCategory.display_order;
            }

            return firstCategory.name.localeCompare(secondCategory.name);
          }
        )
      );

      toast.success(`${createdCategory.name} has been created.`);

      resetForm();
    } catch (error) {
      // Log the complete submission error for debugging.
      console.error("Failed to save Academy category:", error);

      // Display a safe submission error.
      toast.error(
        "The Academy category could not be saved. Check that the slug is unique."
      );
    } finally {
      // End the submitting state.
      setSubmitting(false);
    }
  }

  /**
   * Permanently delete an Academy category.
   */
  async function handleDelete(category: AcademyCategory) {
    // Prevent another deletion from starting.
    if (deletingId) {
      return;
    }

    // Ask the administrator to confirm the deletion.
    const confirmed = window.confirm(
      `Delete "${category.name}"? Programs using this category will become uncategorised.`
    );

    // Stop when the administrator cancels.
    if (!confirmed) {
      return;
    }

    // Store the category currently being deleted.
    setDeletingId(category.id);

    try {
      // Delete the selected category from Supabase.
      await deleteAcademyCategory(category.id);

      // Remove the deleted category from local state.
      setCategories((currentCategories) =>
        currentCategories.filter(
          (currentCategory) => currentCategory.id !== category.id
        )
      );

      // Reset the form if the deleted category was being edited.
      if (editingCategory?.id === category.id) {
        resetForm();
      }

      toast.success(`${category.name} has been deleted.`);
    } catch (error) {
      // Log the complete deletion error for debugging.
      console.error("Failed to delete Academy category:", error);

      // Display a safe deletion error.
      toast.error("The Academy category could not be deleted.");
    } finally {
      // Clear the deleting state.
      setDeletingId(null);
    }
  }

  // Display the initial loading state.
  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="text-center">
          <LoaderCircle
            size={30}
            className="mx-auto animate-spin text-primary"
          />

          <p className="mt-3 text-sm text-slate-500">
            Loading Academy categories...
          </p>
        </div>
      </div>
    );
  }

  // Display the loading error state.
  if (errorMessage) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
        <p className="font-semibold text-red-700">{errorMessage}</p>

        <button
          type="button"
          onClick={() => {
            void loadCategories();
          }}
          className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-24">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {editingCategory ? "Edit Category" : "New Category"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {editingCategory
                ? "Update the selected Academy category."
                : "Create a category for grouping related programs."}
            </p>
          </div>

          {editingCategory ? (
            <button
              type="button"
              onClick={resetForm}
              aria-label="Cancel category editing"
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <X size={19} />
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="category-name"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Category name
            </label>

            <input
              id="category-name"
              type="text"
              value={form.name}
              onChange={(event) => {
                handleNameChange(event.target.value);
              }}
              placeholder="Microsoft 365"
              required
              disabled={submitting}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="category-slug"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              URL slug
            </label>

            <input
              id="category-slug"
              type="text"
              value={form.slug}
              onChange={(event) => {
                handleSlugChange(event.target.value);
              }}
              placeholder="microsoft-365"
              required
              disabled={submitting}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="category-description"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Description
            </label>

            <textarea
              id="category-description"
              value={form.description}
              onChange={(event) => {
                updateFormField("description", event.target.value);
              }}
              placeholder="Training programs covering Microsoft 365 services and administration."
              rows={4}
              disabled={submitting}
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="category-icon"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Icon
            </label>

            <input
              id="category-icon"
              type="text"
              value={form.icon}
              onChange={(event) => {
                updateFormField("icon", event.target.value);
              }}
              placeholder="cloud"
              disabled={submitting}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Store a Lucide icon name or another identifier for future public
              rendering.
            </p>
          </div>

          <div>
            <label
              htmlFor="category-display-order"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Display order
            </label>

            <input
              id="category-display-order"
              type="number"
              min="0"
              value={form.display_order}
              onChange={(event) => {
                updateFormField(
                  "display_order",
                  Number(event.target.value) || 0
                );
              }}
              disabled={submitting}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => {
                updateFormField("is_active", event.target.checked);
              }}
              disabled={submitting}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />

            <span>
              <span className="block text-sm font-semibold text-slate-800">
                Active category
              </span>

              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Active categories can be displayed on public Academy pages.
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : editingCategory ? (
              <CheckCircle2 size={18} />
            ) : (
              <Plus size={18} />
            )}

            {submitting
              ? "Saving category..."
              : editingCategory
                ? "Save changes"
                : "Create category"}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Academy Categories
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {categories.length}{" "}
                {categories.length === 1 ? "category" : "categories"}
              </p>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                }}
                placeholder="Search categories..."
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>
        </div>

        {filteredCategories.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {filteredCategories.map((category) => (
              <article
                key={category.id}
                className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-950">
                      {category.name}
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        category.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {category.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-medium text-primary">
                    /{category.slug}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {category.description ||
                      "No category description has been added."}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>Order: {category.display_order}</span>

                    {category.icon ? <span>Icon: {category.icon}</span> : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleEdit(category);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void handleDelete(category);
                    }}
                    disabled={Boolean(deletingId)}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === category.id ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Search size={24} />
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-950">
              {categories.length > 0
                ? "No matching categories"
                : "No Academy categories yet"}
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {categories.length > 0
                ? "Try using a different search phrase."
                : "Create your first category using the form."}
            </p>

            {categories.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                }}
                className="mt-5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear search
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
