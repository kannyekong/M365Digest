import { useEffect, useRef, useState } from "react";

import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleDollarSign,
  Edit3,
  Eye,
  ImageIcon,
  LoaderCircle,
  MoreHorizontal,
  Package,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";

import type {
  TweakMartProductListItem,
  TweakMartProductPagination,
} from "../../../../lib/tweakmart/products";

interface ProductTableProps {
  initialProducts: TweakMartProductListItem[];
  initialPagination: TweakMartProductPagination;
}

interface ProductsApiResponse {
  success: boolean;
  products?: TweakMartProductListItem[];
  pagination?: TweakMartProductPagination;
  message?: string;
}

/* Formats a product price using its configured currency. */
function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

/* Converts product status values into administrator-friendly labels. */
function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/* Converts product-type values into administrator-friendly labels. */
function formatProductType(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/* Returns the appropriate theme-aware classes for a product status. */
function getStatusClasses(status: string) {
  switch (status.toLowerCase()) {
    case "active":
    case "published":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";

    case "draft":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";

    case "inactive":
      return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

    case "archived":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
  }
}

/* Returns a human-readable inventory label for a product. */
function getInventoryLabel(product: TweakMartProductListItem) {
  if (!product.inventory.track_inventory) {
    return "Not tracked";
  }

  if (product.inventory.quantity_available <= 0) {
    return "Out of stock";
  }

  return `${product.inventory.quantity_available.toLocaleString()} available`;
}

/* Returns inventory styling according to the current available quantity. */
function getInventoryClasses(product: TweakMartProductListItem) {
  if (!product.inventory.track_inventory) {
    return "text-slate-500 dark:text-slate-400";
  }

  if (product.inventory.quantity_available <= 0) {
    return "text-red-600 dark:text-red-400";
  }

  if (product.inventory.quantity_available <= 5) {
    return "text-amber-600 dark:text-amber-400";
  }

  return "text-emerald-600 dark:text-emerald-400";
}

type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

/* Builds a compact numbered pagination range without rendering every page in a large catalogue. */
function getPaginationItems(
  currentPage: number,
  totalPages: number
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis-left",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis-left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-right",
    totalPages,
  ];
}

/* Renders the database-paginated administrator catalogue table for TweakMart products. */
export default function ProductTable({
  initialProducts,
  initialPagination,
}: ProductTableProps) {
  const [products, setProducts] = useState(initialProducts);

  const [pagination, setPagination] = useState(initialPagination);

  const [search, setSearch] = useState("");

  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [typeFilter, setTypeFilter] = useState("all");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const initialRequestRef = useRef(true);

  /* Loads one filtered and paginated product page from the server-side TweakMart administration API. */
  async function loadProducts(
    requestedPage: number,
    requestedPageSize = pagination.pageSize
  ) {
    try {
      setLoading(true);
      setError("");
      setOpenMenuId(null);

      const parameters = new URLSearchParams();

      parameters.set("page", String(requestedPage));

      parameters.set("pageSize", String(requestedPageSize));

      if (debouncedSearch) {
        parameters.set("search", debouncedSearch);
      }

      if (statusFilter !== "all") {
        parameters.set("status", statusFilter);
      }

      if (typeFilter !== "all") {
        parameters.set("productType", typeFilter);
      }

      const response = await fetch(
        `/api/admin/tweakmart/products?${parameters.toString()}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const responseText = await response.text();

      let result: ProductsApiResponse;

      try {
        result = JSON.parse(responseText) as ProductsApiResponse;
      } catch {
        console.error("Unexpected products API response:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          contentType: response.headers.get("content-type"),
          body: responseText.slice(0, 500),
        });

        throw new Error(
          `Products endpoint returned an unexpected response (${response.status}).`
        );
      }

      if (
        !response.ok ||
        !result.success ||
        !result.products ||
        !result.pagination
      ) {
        throw new Error(result.message ?? "Unable to load TweakMart products.");
      }

      setProducts(result.products);
      setPagination(result.pagination);

      /* Keeps the browser URL synchronized with the current table page without causing a full page reload. */
      const browserUrl = new URL(window.location.href);

      if (requestedPage > 1) {
        browserUrl.searchParams.set("page", String(requestedPage));
      } else {
        browserUrl.searchParams.delete("page");
      }

      window.history.replaceState(
        {},
        "",
        `${browserUrl.pathname}${browserUrl.search}`
      );
    } catch (loadError) {
      console.error("Failed to load TweakMart products:", loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load TweakMart products."
      );
    } finally {
      setLoading(false);
    }
  }

  /* Changes the number of products displayed per page and returns to the first page. */
  async function changePageSize(event: React.ChangeEvent<HTMLSelectElement>) {
    const requestedPageSize = Number(event.target.value);

    if (!Number.isInteger(requestedPageSize) || requestedPageSize < 1) {
      return;
    }

    await loadProducts(1, requestedPageSize);
  }

  /* Reloads the first product page whenever a catalogue-wide search or filter changes. */
  useEffect(() => {
    if (initialRequestRef.current) {
      initialRequestRef.current = false;
      return;
    }

    void loadProducts(1);
  }, [debouncedSearch, statusFilter, typeFilter]);

  /* Debounces administrator search input so typing does not create a request for every keystroke. */
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [search]);

  /* Closes the active product action popover when clicking outside it or pressing Escape. */
  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    /* Closes the popover when the pointer is pressed outside the active action area. */
    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (actionMenuRef.current && !actionMenuRef.current.contains(target)) {
        setOpenMenuId(null);
      }
    }

    /* Allows the administrator to dismiss the action popover with the Escape key. */
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);

      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuId]);

  /* Resets all catalogue-wide filters and returns the table to the first page. */
  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  }

  const hasFilters =
    Boolean(search.trim()) || statusFilter !== "all" || typeFilter !== "all";

  const startItem =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;

  const endItem = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total
  );

  /* Creates the compact set of numbered page controls displayed in the table footer. */
  const paginationItems = getPaginationItems(
    pagination.page,
    pagination.totalPages
  );

  return (
    <div className="mt-6">
      <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search all products..."
                className="min-h-11 w-3/4 rounded-xl border border-slate-200 bg-white py-2.5 pl-5 pr-10 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />

              {loading ? (
                <LoaderCircle
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-primary"
                />
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <div className="flex items-center gap-2">
                <SlidersHorizontal
                  size={14}
                  className="shrink-0 text-slate-400"
                />

                <select
                  value={statusFilter}
                  disabled={loading}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="min-h-11 text-xs font-semibold disabled:opacity-50 sm:w-auto"
                >
                  <option value="all">All statuses</option>

                  <option value="active">Active</option>

                  <option value="draft">Draft</option>

                  <option value="inactive">Inactive</option>

                  <option value="archived">Archived</option>
                </select>
              </div>

              <select
                value={typeFilter}
                disabled={loading}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="min-h-11 w-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:w-auto"
              >
                <option value="all">All product types</option>

                <option value="physical">Physical</option>

                <option value="digital">Digital</option>

                <option value="service">Service</option>
              </select>

              {hasFilters ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={clearFilters}
                  className="min-h-11 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Package size={14} />
              {pagination.total.toLocaleString()} matching products
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Boxes size={14} />
              {products.length} on this page
            </span>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          ) : null}
        </div>

        <div className="relative overflow-x-auto">
          {loading ? (
            <div className="absolute inset-0 z-20 flex min-h-[240px] items-center justify-center bg-white/70 backdrop-blur-[1px] dark:bg-slate-950/70">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <LoaderCircle size={16} className="animate-spin text-primary" />
                Loading products...
              </div>
            </div>
          ) : null}

          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Product
                </th>

                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Category
                </th>

                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Price
                </th>

                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Inventory
                </th>

                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </th>

                <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/50"
                >
                  <td className="px-5 py-4">
                    <div className="flex min-w-[270px] items-center gap-3">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
                        {product.primary_image ? (
                          <img
                            src={product.primary_image.image_url}
                            alt={product.primary_image.alt_text ?? product.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <ImageIcon size={20} className="text-slate-400" />
                        )}

                        {product.featured ? (
                          <div
                            title="Featured product"
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-white shadow"
                          >
                            <Star size={11} fill="currentColor" />
                          </div>
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <a
                          href={`/admin/tweakmart/products/${product.id}`}
                          className="block max-w-[260px] truncate text-sm font-bold text-slate-900 transition hover:text-primary dark:text-white"
                        >
                          {product.name}
                        </a>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          {product.brand ? (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {product.brand.name}
                            </span>
                          ) : null}

                          {product.brand ? (
                            <span className="text-slate-300 dark:text-slate-700">
                              •
                            </span>
                          ) : null}

                          <span className="max-w-[170px] truncate text-[11px] text-slate-400">
                            {product.slug}
                          </span>
                        </div>
                        <div className="flex flex-row gap-2">
                          <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                            {formatProductType(product.product_type)}
                          </span>

                          <p className="mt-1.5 text-[11px] capitalize text-slate-400">
                            {product.condition}
                          </p>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {product.category?.name ?? "Uncategorized"}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                      {product.vendor?.name ?? "Unknown vendor"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {formatCurrency(product.base_price, product.currency)}
                      </span>
                    </div>

                    {product.compare_at_price &&
                    product.compare_at_price > product.base_price ? (
                      <p className="mt-1 text-[11px] text-slate-400 line-through">
                        {formatCurrency(
                          product.compare_at_price,
                          product.currency
                        )}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-5 py-4">
                    <p
                      className={`text-xs font-bold ${getInventoryClasses(
                        product
                      )}`}
                    >
                      {getInventoryLabel(product)}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                      {product.variants_count}{" "}
                      {product.variants_count === 1 ? "variant" : "variants"}
                    </p>

                    {product.inventory.quantity_reserved > 0 ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {product.inventory.quantity_reserved} reserved
                      </p>
                    ) : null}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusClasses(
                        product.status
                      )}`}
                    >
                      {formatStatus(product.status)}
                    </span>

                    {product.featured ? (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <Star size={11} fill="currentColor" />
                        Featured
                      </p>
                    ) : null}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div
                      ref={
                        openMenuId === product.id ? actionMenuRef : undefined
                      }
                      className="relative inline-block text-left"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId((current) =>
                            current === product.id ? null : product.id
                          )
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        aria-label={`Actions for ${product.name}`}
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {openMenuId === product.id ? (
                        <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl dark:border-slate-700 dark:bg-slate-950">
                          <a
                            href={`/admin/tweakmart/products/${product.id}`}
                            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                          >
                            <Edit3 size={14} />
                            Edit Product
                          </a>

                          <a
                            href={`https://tweakmart.cloudtweak.net/products/${product.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                          >
                            <Eye size={14} />
                            View Storefront
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900">
                      <Package size={21} />
                    </div>

                    <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
                      No products found
                    </h3>

                    <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {hasFilters
                        ? "No TweakMart products match the current search or filters."
                        : "There are no products available in the TweakMart catalogue yet."}
                    </p>

                    {hasFilters ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-4 text-xs font-bold text-primary transition hover:opacity-80"
                      >
                        Clear filters
                      </button>
                    ) : (
                      <a
                        href="/admin/tweakmart/products/new"
                        className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
                      >
                        Add First Product
                      </a>
                    )}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {startItem}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {endItem}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {pagination.total.toLocaleString()}
                </span>{" "}
                products
              </p>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="products-page-size"
                  className="text-xs text-slate-500 dark:text-slate-400"
                >
                  Rows
                </label>

                <select
                  id="products-page-size"
                  value={pagination.pageSize}
                  disabled={loading}
                  onChange={(event) => void changePageSize(event)}
                  className="min-h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 sm:hidden">
                Page {pagination.page} of {pagination.totalPages}
              </p>

              <div className="flex items-center justify-center gap-1">
                <button
                  type="button"
                  title="First page"
                  aria-label="Go to first page"
                  disabled={loading || pagination.page <= 1}
                  onClick={() => void loadProducts(1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  <ChevronsLeft size={15} />
                </button>

                <button
                  type="button"
                  title="Previous page"
                  aria-label="Go to previous page"
                  disabled={loading || pagination.page <= 1}
                  onClick={() => void loadProducts(pagination.page - 1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  <ChevronLeft size={15} />
                </button>

                <div className="hidden items-center gap-1 sm:flex">
                  {paginationItems.map((item) => {
                    if (item === "ellipsis-left" || item === "ellipsis-right") {
                      return (
                        <span
                          key={item}
                          className="inline-flex h-9 min-w-9 items-center justify-center px-1 text-xs font-semibold text-slate-400"
                        >
                          …
                        </span>
                      );
                    }

                    const isCurrentPage = item === pagination.page;

                    return (
                      <button
                        key={item}
                        type="button"
                        disabled={loading || isCurrentPage}
                        aria-label={`Go to page ${item}`}
                        aria-current={isCurrentPage ? "page" : undefined}
                        onClick={() => void loadProducts(item)}
                        className={
                          isCurrentPage
                            ? "inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary px-2 text-xs font-bold text-white shadow-sm"
                            : "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                        }
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  title="Next page"
                  aria-label="Go to next page"
                  disabled={loading || pagination.page >= pagination.totalPages}
                  onClick={() => void loadProducts(pagination.page + 1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  <ChevronRight size={15} />
                </button>

                <button
                  type="button"
                  title="Last page"
                  aria-label="Go to last page"
                  disabled={loading || pagination.page >= pagination.totalPages}
                  onClick={() => void loadProducts(pagination.totalPages)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  <ChevronsRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
