import { useMemo, useState } from "react";
import ConfirmModal from "../../../../islands/ConfirmModal";
import ProductImageManager from "./ProductImageManager";
import type { TweakMartProductDetails } from "../../../../lib/tweakmart/products";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  PackagePlus,
  Save,
} from "lucide-react";

import type { TweakMartProductFormOptions } from "../../../../lib/tweakmart/product-options";

interface ProductFormProps {
  options: TweakMartProductFormOptions;
  product?: TweakMartProductDetails | null;
}

interface ProductFormState {
  name: string;
  slug: string;
  vendor_id: string;
  category_id: string;
  brand_id: string;
  product_type: string;
  condition: string;
  status: string;
  base_price: string;
  compare_at_price: string;
  currency: string;
  short_description: string;
  description: string;
  featured: boolean;
}

interface CreateProductResponse {
  success: boolean;
  message?: string;
  product?: {
    id: string;
    name: string;
    slug: string;
  };
}

/* Generates a URL-friendly product slug from a product name. */
function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Renders the reusable TweakMart product creation form. */
export default function ProductForm({
  options,
  product = null,
}: ProductFormProps) {
  const defaultVendorId =
    options.vendors.length === 1 ? options.vendors[0].id : "";

  const isEditing = Boolean(product);
  const [form, setForm] = useState<ProductFormState>({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    vendor_id: product?.vendor_id ?? defaultVendorId,
    category_id: product?.category_id ?? "",
    brand_id: product?.brand_id ?? "",
    product_type: product?.product_type ?? "physical",
    condition: product?.condition ?? "new",
    status: product?.status ?? "draft",
    base_price: product ? String(product.base_price) : "",
    compare_at_price:
      product?.compare_at_price !== null &&
      product?.compare_at_price !== undefined
        ? String(product.compare_at_price)
        : "",
    currency: product?.currency ?? "NGN",
    short_description: product?.short_description ?? "",
    description: product?.description ?? "",
    featured: product?.featured ?? false,
  });

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    Boolean(product)
  );

  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.slug.trim().length > 0 &&
      form.vendor_id.length > 0 &&
      form.base_price.length > 0 &&
      !saving
    );
  }, [form, saving]);

  /* Updates a text or select field in the product form state. */
  function updateField(field: keyof ProductFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /* Updates the product name and automatically derives its slug until the administrator edits the slug manually. */
  function handleNameChange(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugManuallyEdited ? current.slug : createSlug(value),
    }));
  }

  /* Updates the product slug and marks it as manually controlled by the administrator. */
  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);

    setForm((current) => ({
      ...current,
      slug: createSlug(value),
    }));
  }

  /* Sends the base product to the server and continues to its edit page after creation. */
  /* Persists the current product form either by creating a new product or updating the existing one. */
  async function saveProduct() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const basePrice = Number(form.base_price);

      const compareAtPrice = form.compare_at_price.trim()
        ? Number(form.compare_at_price)
        : null;

      const endpoint = isEditing
        ? `/api/admin/tweakmart/products/${product?.id}`
        : "/api/admin/tweakmart/products";

      const response = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...form,
          base_price: basePrice,
          compare_at_price: compareAtPrice,
        }),
      });

      const result = (await response.json()) as CreateProductResponse;

      if (!response.ok || !result.success || !result.product) {
        throw new Error(
          result.message ??
            `Unable to ${isEditing ? "update" : "create"} product.`
        );
      }

      setSuccess(
        result.message ??
          `Product ${isEditing ? "updated" : "created"} successfully.`
      );

      if (!isEditing) {
        window.setTimeout(() => {
          window.location.href = `/admin/tweakmart/products/${result.product?.id}`;
        }, 600);
      }
    } catch (submitError) {
      console.error(
        `Failed to ${isEditing ? "update" : "create"} product:`,
        submitError
      );

      setError(
        submitError instanceof Error
          ? submitError.message
          : `Unable to ${isEditing ? "update" : "create"} product.`
      );
    } finally {
      setSaving(false);
      setConfirmUpdateOpen(false);
    }
  }

  /* Handles product form submission and requests confirmation before modifying an existing product. */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    if (isEditing) {
      setConfirmUpdateOpen(true);
      return;
    }

    void saveProduct();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 size={17} />
            {success}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Product information
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Add the core information customers will see in the TweakMart
                  catalogue.
                </p>
              </div>

              <div className="mt-6 grid gap-5">
                <div>
                  <label
                    htmlFor="product-name"
                    className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Product name *
                  </label>

                  <input
                    id="product-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(event) => handleNameChange(event.target.value)}
                    placeholder="e.g. Dell Latitude 7450"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="product-slug"
                    className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Product slug *
                  </label>

                  <input
                    id="product-slug"
                    type="text"
                    required
                    value={form.slug}
                    onChange={(event) => handleSlugChange(event.target.value)}
                    placeholder="dell-latitude-7450"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />

                  <p className="mt-2 text-[11px] text-slate-400">
                    Used in the product storefront URL.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="short-description"
                    className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Short description
                  </label>

                  <textarea
                    id="short-description"
                    rows={3}
                    value={form.short_description}
                    onChange={(event) =>
                      updateField("short_description", event.target.value)
                    }
                    placeholder="A short summary for catalogue cards and product previews."
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="product-description"
                    className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Full description
                  </label>

                  <textarea
                    id="product-description"
                    rows={8}
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    placeholder="Describe the product, its capabilities, use cases, and important details."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 resize-y"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Pricing
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Configure the standard and optional comparison price.
                </p>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label
                    htmlFor="base-price"
                    className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Base price *
                  </label>

                  <input
                    id="base-price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.base_price}
                    onChange={(event) =>
                      updateField("base_price", event.target.value)
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="compare-price"
                    className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Compare-at price
                  </label>

                  <input
                    id="compare-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.compare_at_price}
                    onChange={(event) =>
                      updateField("compare_at_price", event.target.value)
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="currency"
                    className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Currency
                  </label>

                  <select
                    id="currency"
                    value={form.currency}
                    onChange={(event) =>
                      updateField("currency", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 resize-y"
                  >
                    <option value="NGN">NGN</option>
                  </select>
                </div>
              </div>
            </section>
            {isEditing && product ? (
              <ProductImageManager productId={product.id} />
            ) : null}
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Organisation
              </h2>

              <div className="mt-5 space-y-5">
                <div>
                  <label
                    htmlFor="vendor"
                    className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Vendor *
                  </label>

                  <select
                    id="vendor"
                    required
                    value={form.vendor_id}
                    onChange={(event) =>
                      updateField("vendor_id", event.target.value)
                    }
                    className="w-full"
                  >
                    <option value="">Select vendor</option>

                    {options.vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Category
                  </label>

                  <select
                    id="category"
                    value={form.category_id}
                    onChange={(event) =>
                      updateField("category_id", event.target.value)
                    }
                    className="w-full"
                  >
                    <option value="">Uncategorized</option>

                    {options.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="brand"
                    className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Brand
                  </label>

                  <select
                    id="brand"
                    value={form.brand_id}
                    onChange={(event) =>
                      updateField("brand_id", event.target.value)
                    }
                    className="w-full"
                  >
                    <option value="">No brand</option>

                    {options.brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Product settings
              </h2>

              <div className="mt-5 space-y-5">
                <div>
                  <label
                    htmlFor="product-type"
                    className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Product type
                  </label>

                  <select
                    id="product-type"
                    value={form.product_type}
                    onChange={(event) =>
                      updateField("product_type", event.target.value)
                    }
                    className="w-full"
                  >
                    <option value="physical">Physical</option>
                    <option value="digital">Digital</option>
                    <option value="service">Service</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="condition"
                    className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Condition
                  </label>

                  <select
                    id="condition"
                    value={form.condition}
                    onChange={(event) =>
                      updateField("condition", event.target.value)
                    }
                    className="w-full"
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="status"
                    className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Status
                  </label>

                  <select
                    id="status"
                    value={form.status}
                    onChange={(event) =>
                      updateField("status", event.target.value)
                    }
                    className="w-full"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        featured: event.target.checked,
                      }))
                    }
                    className="mt-0.5"
                  />

                  <span>
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Featured product
                    </span>

                    <span className="mt-1 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                      Highlight this product in featured TweakMart catalogue
                      areas.
                    </span>
                  </span>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex gap-3">
                <PackagePlus
                  size={18}
                  className="mt-0.5 shrink-0 text-primary"
                />

                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {isEditing ? "Product management" : "Images & inventory"}
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    {isEditing
                      ? "This product now has its permanent TweakMart ID. Images, variants, and inventory can be managed from this page."
                      : "After creating the product, you will continue to its management page to upload images and configure variants and inventory."}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="/admin/tweakmart/products"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <ArrowLeft size={15} />
            Back to Products
          </a>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />

                {isEditing ? "Saving Changes..." : "Creating Product..."}
              </>
            ) : (
              <>
                <Save size={16} />

                {isEditing ? "Save Changes" : "Create Product"}
              </>
            )}
          </button>
        </div>
      </form>
      <ConfirmModal
        open={confirmUpdateOpen}
        title="Save Product Changes?"
        message={`You are about to update "${form.name}". The saved changes may affect how this product appears on TweakMart.`}
        confirmText="Save Changes"
        cancelText="Cancel"
        variant="primary"
        loading={saving}
        onConfirm={() => void saveProduct()}
        onCancel={() => {
          if (!saving) {
            setConfirmUpdateOpen(false);
          }
        }}
      />
    </>
  );
}
