import {
  CheckCircle2,
  Edit3,
  ExternalLink,
  Globe2,
  ImageIcon,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import MediaPicker from "../../media/MediaPicker";
import type { ImageAssetWithUrl } from "../../../../types/image-asset";

interface TweakMartBrand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

interface TweakMartBrandInput {
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_active: boolean;
}

interface BrandFormState {
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  website_url: string;
  is_active: boolean;
}

interface BrandsResponse {
  brands?: TweakMartBrand[];
  error?: string;
}

interface BrandMutationResponse {
  brand?: TweakMartBrand;
  success?: boolean;
  error?: string;
}

const DEFAULT_FORM: BrandFormState = {
  name: "",
  slug: "",
  description: "",
  logo_url: "",
  website_url: "",
  is_active: true,
};

/* Converts a brand name or slug into the URL-safe format used by TweakMart. */
function generateBrandSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Converts local form values into the payload accepted by the TweakMart brand API. */
function buildBrandInput(form: BrandFormState): TweakMartBrandInput {
  return {
    name: form.name.trim(),
    slug: generateBrandSlug(form.slug || form.name),
    description: form.description.trim() || null,
    logo_url: form.logo_url.trim() || null,
    website_url: form.website_url.trim() || null,
    is_active: form.is_active,
  };
}

/* Reads a TweakMart brand API response and surfaces backend errors when the request fails. */
async function parseApiResponse<T extends { error?: string }>(
  response: Response,
  fallbackMessage: string
) {
  const result = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(result.error || fallbackMessage);
  }

  return result;
}

/* Renders the TweakMart brand administration interface. */
export default function BrandManager() {
  const [brands, setBrands] = useState<TweakMartBrand[]>([]);
  const [form, setForm] = useState<BrandFormState>(DEFAULT_FORM);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<TweakMartBrand | null>(null);

  const [search, setSearch] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* Loads all TweakMart brands through the protected admin API. */
  const loadBrands = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/tweakmart/brands", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const result = await parseApiResponse<BrandsResponse>(
        response,
        "Brands could not be loaded."
      );

      setBrands(result.brands ?? []);
    } catch (error) {
      console.error("Failed to load TweakMart brands:", error);

      toast.error(
        error instanceof Error ? error.message : "Brands could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* Loads brands after the component hydrates in the browser. */
  useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

  /* Filters brands using their name, slug, description, or website. */
  const filteredBrands = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return brands;
    }

    return brands.filter((brand) => {
      const searchableValue = [
        brand.name,
        brand.slug,
        brand.description,
        brand.website_url,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableValue.includes(normalizedSearch);
    });
  }, [brands, search]);

  /* Assigns an existing Media Library image to the current brand without uploading a duplicate. */
  function handleMediaSelect(asset: ImageAssetWithUrl) {
    updateField("logo_url", asset.public_url);
  }

  /* Updates one brand form field. */
  function updateField<Key extends keyof BrandFormState>(
    field: Key,
    value: BrandFormState[Key]
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  /* Updates the brand name and automatically derives its slug until manually changed. */
  function handleNameChange(value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      name: value,
      slug: slugManuallyEdited ? currentForm.slug : generateBrandSlug(value),
    }));
  }

  /* Updates and normalizes a manually edited brand slug. */
  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);

    updateField("slug", generateBrandSlug(value));
  }

  /* Clears the current brand editing state and restores the default form. */
  function resetForm() {
    setForm(DEFAULT_FORM);
    setEditingBrand(null);
    setSlugManuallyEdited(false);
  }

  /* Populates the form with an existing brand for editing. */
  function startEditing(brand: TweakMartBrand) {
    setEditingBrand(brand);

    setForm({
      name: brand.name,
      slug: brand.slug,
      description: brand.description ?? "",
      logo_url: brand.logo_url ?? "",
      website_url: brand.website_url ?? "",
      is_active: brand.is_active,
    });

    setSlugManuallyEdited(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* Creates or updates a brand through the TweakMart admin API. */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Enter a brand name.");
      return;
    }

    if (!form.slug.trim()) {
      toast.error("Enter a brand slug.");
      return;
    }

    setSaving(true);

    try {
      const input = buildBrandInput(form);

      const endpoint = editingBrand
        ? `/api/admin/tweakmart/brands/${editingBrand.id}`
        : "/api/admin/tweakmart/brands";

      const response = await fetch(endpoint, {
        method: editingBrand ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(input),
      });

      await parseApiResponse<BrandMutationResponse>(
        response,
        editingBrand
          ? "The brand could not be updated."
          : "The brand could not be created."
      );

      toast.success(
        editingBrand
          ? "Brand updated successfully."
          : "Brand created successfully."
      );

      resetForm();

      await loadBrands();
    } catch (error) {
      console.error("Failed to save TweakMart brand:", error);

      toast.error(
        error instanceof Error ? error.message : "The brand could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  /* Deletes an existing brand through the TweakMart admin API after confirmation. */
  async function handleDelete(brand: TweakMartBrand) {
    const confirmed = window.confirm(
      `Delete "${brand.name}"? Products assigned to this brand may prevent deletion.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(brand.id);

    try {
      const response = await fetch(`/api/admin/tweakmart/brands/${brand.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      const result = await parseApiResponse<BrandMutationResponse>(
        response,
        "The brand could not be deleted."
      );

      toast.success("Brand deleted successfully.");

      if (editingBrand?.id === brand.id) {
        resetForm();
      }

      await loadBrands();
    } catch (error) {
      console.error("Failed to delete TweakMart brand:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The brand could not be deleted."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6 mt-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Brands
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage the brands and manufacturers used across the TweakMart
            product catalogue.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <span className="text-slate-500">Total brands</span>

          <span className="ml-2 font-bold text-slate-950">{brands.length}</span>
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
                {editingBrand ? "Edit brand" : "Add brand"}
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Configure how this brand appears across TweakMart.
              </p>
            </div>

            {editingBrand ? (
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
                htmlFor="brand-name"
                className="mb-2 block text-xs font-semibold text-slate-700"
              >
                Brand name *
              </label>

              <input
                id="brand-name"
                type="text"
                value={form.name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Dell"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div>
              <label
                htmlFor="brand-slug"
                className="mb-2 block text-xs font-semibold text-slate-700"
              >
                Slug *
              </label>

              <input
                id="brand-slug"
                type="text"
                value={form.slug}
                onChange={(event) => handleSlugChange(event.target.value)}
                placeholder="dell"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />

              <p className="mt-2 text-[11px] text-slate-400">
                /brands/
                {form.slug || "brand-slug"}
              </p>
            </div>

            <div>
              <label
                htmlFor="brand-description"
                className="mb-2 block text-xs font-semibold text-slate-700"
              >
                Description
              </label>

              <textarea
                id="brand-description"
                rows={4}
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Business and enterprise computing solutions."
                className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="brand-logo"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Brand logo URL
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
                value={form.logo_url}
                onChange={(event) =>
                  updateField("logo_url", event.target.value)
                }
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            {form.logo_url ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={form.logo_url}
                  alt=""
                  className="aspect-[4/3] w-full object-contain p-4"
                />
              </div>
            ) : null}

            <div>
              <label
                htmlFor="brand-website"
                className="mb-2 block text-xs font-semibold text-slate-700"
              >
                Website URL
              </label>

              <input
                id="brand-website"
                type="url"
                value={form.website_url}
                onChange={(event) =>
                  updateField("website_url", event.target.value)
                }
                placeholder="https://www.dell.com"
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
                  Active brand
                </span>

                <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                  Allow this brand to appear across the TweakMart storefront.
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
                  Saving brand...
                </>
              ) : editingBrand ? (
                <>
                  <CheckCircle2 size={16} />
                  Save changes
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add brand
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
                placeholder="Search brands..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <LoaderCircle className="animate-spin text-primary" size={26} />
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <ImageIcon size={30} className="text-slate-300" />

              <p className="mt-3 text-sm font-bold text-slate-900">
                No brands found
              </p>

              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                Add your first TweakMart brand using the form.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredBrands.map((brand) => (
                <article
                  key={brand.id}
                  className="flex flex-col gap-4 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                      {brand.logo_url ? (
                        <img
                          src={brand.logo_url}
                          alt={brand.name}
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <ImageIcon size={22} className="text-slate-300" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-slate-950">
                          {brand.name}
                        </h3>

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                            brand.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {brand.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        /brands/{brand.slug}
                      </p>

                      {brand.description ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                          {brand.description}
                        </p>
                      ) : null}

                      {brand.website_url ? (
                        <a
                          href={brand.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 transition hover:text-primary"
                        >
                          <Globe2 size={12} />
                          Official website
                          <ExternalLink size={11} />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditing(brand)}
                      className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      title="Edit brand"
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(brand)}
                      disabled={deletingId === brand.id}
                      className="inline-flex size-9 items-center justify-center rounded-xl border border-red-200 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                      title="Delete brand"
                    >
                      {deletingId === brand.id ? (
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
        value={form.logo_url}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
}
