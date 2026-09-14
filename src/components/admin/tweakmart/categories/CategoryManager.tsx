import {
  CheckCircle2,
  Edit3,
  ImageIcon,
  LoaderCircle,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import MediaPicker from "../../media/MediaPicker";
import type { ImageAssetWithUrl } from "../../../../types/image-asset";

interface TweakMartCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  featured: boolean;
  display_order: number;
  created_at: string | null;
  updated_at: string | null;
}

interface TweakMartCategoryInput {
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  featured: boolean;
  display_order: number;
}

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_active: boolean;
  featured: boolean;
  display_order: string;
}

interface CategoriesResponse {
  success: boolean;
  message?: string;
  categories?: TweakMartCategory[];
}

interface CategoryMutationResponse {
  success: boolean;
  message?: string;
  category?: TweakMartCategory;
}

const DEFAULT_FORM: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  is_active: true,
  featured: false,
  display_order: "0",
};

/* Converts a category name or slug into the URL-safe format used by TweakMart. */
function generateCategorySlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Converts local form values into the payload accepted by the TweakMart category API. */
function buildCategoryInput(form: CategoryFormState): TweakMartCategoryInput {
  return {
    name: form.name.trim(),
    slug: generateCategorySlug(form.slug || form.name),
    description: form.description.trim() || null,
    image_url: form.image_url.trim() || null,
    is_active: form.is_active,
    featured: form.featured,
    display_order: Math.max(0, Number(form.display_order) || 0),
  };
}

/* Reads an API response and throws its backend message when the request fails. */
async function parseApiResponse<
  T extends { success: boolean; message?: string },
>(response: Response) {
  const result = (await response.json()) as T;

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || "The TweakMart request could not be completed."
    );
  }

  return result;
}

/* Renders the TweakMart category administration interface. */
export default function CategoryManager() {
  const [categories, setCategories] = useState<TweakMartCategory[]>([]);
  const [form, setForm] = useState<CategoryFormState>(DEFAULT_FORM);

  const [editingCategory, setEditingCategory] =
    useState<TweakMartCategory | null>(null);

  const [search, setSearch] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* Loads all TweakMart categories through the protected admin API. */
  const loadCategories = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/tweakmart/categories", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const result = await parseApiResponse<CategoriesResponse>(response);

      setCategories(result.categories ?? []);
    } catch (error) {
      console.error("Failed to load TweakMart categories:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Categories could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* Loads categories after the component hydrates in the browser. */
  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  /* Filters categories using their name, slug, or description. */
  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return categories;
    }

    return categories.filter((category) => {
      const searchableValue = [
        category.name,
        category.slug,
        category.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableValue.includes(normalizedSearch);
    });
  }, [categories, search]);

  /* Updates one category form field. */
  function updateField<Key extends keyof CategoryFormState>(
    field: Key,
    value: CategoryFormState[Key]
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  /* Assigns an existing Media Library image to the current brand without uploading a duplicate. */
  function handleMediaSelect(asset: ImageAssetWithUrl) {
    updateField("image_url", asset.public_url);
  }

  /* Updates the category name and automatically derives its slug until manually changed. */
  function handleNameChange(value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      name: value,
      slug: slugManuallyEdited ? currentForm.slug : generateCategorySlug(value),
    }));
  }

  /* Updates and normalizes a manually edited category slug. */
  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);

    updateField("slug", generateCategorySlug(value));
  }

  /* Clears the current category editing state and restores the default form. */
  function resetForm() {
    setForm(DEFAULT_FORM);
    setEditingCategory(null);
    setSlugManuallyEdited(false);
  }

  /* Populates the form with an existing category for editing. */
  function startEditing(category: TweakMartCategory) {
    setEditingCategory(category);

    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      image_url: category.image_url ?? "",
      is_active: category.is_active,
      featured: category.featured,
      display_order: String(category.display_order),
    });

    setSlugManuallyEdited(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* Creates or updates a category through the TweakMart admin API. */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Enter a category name.");
      return;
    }

    if (!form.slug.trim()) {
      toast.error("Enter a category slug.");
      return;
    }

    setSaving(true);

    try {
      const input = buildCategoryInput(form);

      const endpoint = editingCategory
        ? `/api/admin/tweakmart/categories/${editingCategory.id}`
        : "/api/admin/tweakmart/categories";

      const response = await fetch(endpoint, {
        method: editingCategory ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(input),
      });

      const result = await parseApiResponse<CategoryMutationResponse>(response);

      toast.success(
        result.message ||
          (editingCategory
            ? "Category updated successfully."
            : "Category created successfully.")
      );

      resetForm();

      await loadCategories();
    } catch (error) {
      console.error("Failed to save TweakMart category:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The category could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  /* Deletes an existing category through the TweakMart admin API after confirmation. */
  async function handleDelete(category: TweakMartCategory) {
    const confirmed = window.confirm(
      `Delete "${category.name}"? Products assigned to this category may prevent deletion.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(category.id);

    try {
      const response = await fetch(
        `/api/admin/tweakmart/categories/${category.id}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = await parseApiResponse<CategoryMutationResponse>(response);

      toast.success(result.message || "Category deleted successfully.");

      if (editingCategory?.id === category.id) {
        resetForm();
      }

      await loadCategories();
    } catch (error) {
      console.error("Failed to delete TweakMart category:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The category could not be deleted."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5 mt-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Categories
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Organize TweakMart products and control which categories appear on
            the storefront.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <span className="text-slate-500">Total categories</span>

          <span className="ml-2 font-bold text-slate-950">
            {categories.length}
          </span>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">
                {editingCategory ? "Edit category" : "Add category"}
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Configure how this category appears across TweakMart.
              </p>
            </div>

            {editingCategory ? (
              <button
                type="button"
                onClick={resetForm}
                className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                title="Cancel editing"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="category-name"
                className="mb-2 block text-xs font-semibold text-slate-700"
              >
                Category name *
              </label>

              <input
                id="category-name"
                type="text"
                value={form.name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Computers & Laptops"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div>
              <label
                htmlFor="category-slug"
                className="mb-2 block text-xs font-semibold text-slate-700"
              >
                Slug *
              </label>

              <input
                id="category-slug"
                type="text"
                value={form.slug}
                onChange={(event) => handleSlugChange(event.target.value)}
                placeholder="computers-laptops"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />

              <p className="mt-2 text-[11px] text-slate-400">
                /collections/{form.slug || "category-slug"}
              </p>
            </div>

            <div>
              <label
                htmlFor="category-description"
                className="mb-2 block text-xs font-semibold text-slate-700"
              >
                Description
              </label>

              <textarea
                id="category-description"
                rows={4}
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Laptops, desktops, workstations and related computing products."
                className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="brand-logo"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Category image URL
                </label>

                <button
                  type="button"
                  onClick={() => setMediaPickerOpen(true)}
                  className="text-[11px] font-bold text-primary transition hover:opacity-70"
                >
                  Choose from library
                </button>
              </div>

              <input
                id="brand-logo"
                type="url"
                value={form.image_url}
                onChange={(event) =>
                  updateField("image_url", event.target.value)
                }
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            {form.image_url ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={form.image_url}
                  alt=""
                  className="aspect-[4/3] w-full object-contain p-4"
                />
              </div>
            ) : null}

            <div>
              <label
                htmlFor="display-order"
                className="mb-2 block text-xs font-semibold text-slate-700"
              >
                Display order
              </label>

              <input
                id="display-order"
                type="number"
                min="0"
                step="1"
                value={form.display_order}
                onChange={(event) =>
                  updateField("display_order", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateField("is_active", event.target.checked)
                }
                className="mt-0.5"
              />

              <span>
                <span className="block text-xs font-bold text-slate-700">
                  Active category
                </span>

                <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                  Allow customers to browse this category.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) =>
                  updateField("featured", event.target.checked)
                }
                className="mt-0.5"
              />

              <span>
                <span className="block text-xs font-bold text-slate-700">
                  Featured category
                </span>

                <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                  Allow this category to appear in the homepage category
                  section.
                </span>
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  Saving category...
                </>
              ) : editingCategory ? (
                <>
                  <CheckCircle2 size={16} />
                  Save changes
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add category
                </>
              )}
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search categories..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <LoaderCircle className="animate-spin text-primary" size={26} />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <ImageIcon size={30} className="text-slate-300" />

              <p className="mt-3 text-sm font-bold text-slate-900">
                No categories found
              </p>

              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                Add your first TweakMart category using the form.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredCategories.map((category) => (
                <article
                  key={category.id}
                  className="flex flex-col gap-4 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <ImageIcon size={22} className="text-slate-300" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-slate-950">
                          {category.name}
                        </h3>

                        {category.featured ? (
                          <span
                            title="Featured category"
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700"
                          >
                            <Star size={11} />
                            Featured
                          </span>
                        ) : null}

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                            category.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {category.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        /collections/{category.slug}
                      </p>

                      {category.description ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                          {category.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditing(category)}
                      className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      title="Edit category"
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(category)}
                      disabled={deletingId === category.id}
                      className="inline-flex size-9 items-center justify-center rounded-xl border border-red-200 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                      title="Delete category"
                    >
                      {deletingId === category.id ? (
                        <LoaderCircle size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      <MediaPicker
        open={mediaPickerOpen}
        value={form.image_url}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
}
