import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import type {
  TweakMartAdminOrder,
  TweakMartInventoryStatus,
  TweakMartOrderPaymentStatus,
  TweakMartOrderStatus,
} from "../../../../lib/tweakmart/order";

import {
  InventoryStatusBadge,
  ManualReviewBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "./TweakmartOrderBadges";

interface TweakMartOrdersTableProps {
  orders: TweakMartAdminOrder[];
}

type PaymentFilter = "all" | TweakMartOrderPaymentStatus;
type OrderFilter = "all" | TweakMartOrderStatus;
type InventoryFilter = "all" | TweakMartInventoryStatus;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/* Formats order monetary values using the order's stored currency. */
function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

/* Formats an order timestamp for the CloudTweak administration interface. */
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/* Builds the compact pagination range displayed between navigation buttons. */
function getPaginationRange(currentPage: number, totalPages: number) {
  const pages: Array<number | "ellipsis-left" | "ellipsis-right"> = [];

  if (totalPages <= 7) {
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push(page);
    }

    return pages;
  }

  pages.push(1);

  if (currentPage > 4) {
    pages.push("ellipsis-left");
  }

  const startPage = Math.max(2, currentPage - 1);
  const endPage = Math.min(totalPages - 1, currentPage + 1);

  for (let page = startPage; page <= endPage; page += 1) {
    pages.push(page);
  }

  if (currentPage < totalPages - 3) {
    pages.push("ellipsis-right");
  }

  pages.push(totalPages);

  return pages;
}

/* Renders the searchable, filterable and paginated TweakMart orders table. */
export default function TweakMartOrdersTable({
  orders,
}: TweakMartOrdersTableProps) {
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [inventoryFilter, setInventoryFilter] =
    useState<InventoryFilter>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  /*
   * Applies the current search and status filters before pagination
   * so page counts always represent the visible result collection.
   */
  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const searchableValues = [
        order.order_number,
        order.customer_first_name,
        order.customer_last_name,
        order.customer_email,
        order.customer_phone,
        order.delivery_city,
        order.delivery_state,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchableValues.includes(normalizedSearch);

      const matchesPayment =
        paymentFilter === "all" || order.payment_status === paymentFilter;

      const matchesOrder =
        orderFilter === "all" || order.order_status === orderFilter;

      const matchesInventory =
        inventoryFilter === "all" || order.inventory_status === inventoryFilter;

      return (
        matchesSearch && matchesPayment && matchesOrder && matchesInventory
      );
    });
  }, [orders, search, paymentFilter, orderFilter, inventoryFilter]);

  /*
   * Calculates the total number of pages required for the currently
   * filtered order collection.
   */
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

  /*
   * Extracts only the orders belonging to the current page after
   * filtering has been completed.
   */
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage, pageSize]);

  /*
   * Generates the compact page-number controls shown in the
   * pagination footer.
   */
  const paginationRange = useMemo(
    () => getPaginationRange(currentPage, totalPages),
    [currentPage, totalPages]
  );

  /*
   * Determines whether any search or status filters are currently
   * active so the interface can expose a single reset action.
   */
  const hasActiveFilters =
    search.trim().length > 0 ||
    paymentFilter !== "all" ||
    orderFilter !== "all" ||
    inventoryFilter !== "all";

  /*
   * Calculates the first and last visible result positions for the
   * pagination summary.
   */
  const firstVisibleItem =
    filteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const lastVisibleItem = Math.min(
    currentPage * pageSize,
    filteredOrders.length
  );

  /*
   * Returns pagination to the first page whenever filters or page
   * size change so the user cannot remain on an invalid page.
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [search, paymentFilter, orderFilter, inventoryFilter, pageSize]);

  /*
   * Protects against the current page becoming invalid if the order
   * collection itself changes while the component is mounted.
   */
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  /* Restores all table filters to their default unfiltered state. */
  function clearFilters() {
    setSearch("");
    setPaymentFilter("all");
    setOrderFilter("all");
    setInventoryFilter("all");
    setCurrentPage(1);
  }

  /* Navigates to a valid page within the current pagination range. */
  function goToPage(page: number) {
    const nextPage = Math.min(Math.max(page, 1), totalPages);

    setCurrentPage(nextPage);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-primary" />

              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Marketplace Orders
              </h2>
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {filteredOrders.length.toLocaleString()} of{" "}
              {orders.length.toLocaleString()} orders
            </p>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 lg:w-64">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search orders..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="relative">
              <select
                value={paymentFilter}
                onChange={(event) =>
                  setPaymentFilter(event.target.value as PaymentFilter)
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="all">All payments</option>
                <option value="pending">Pending</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="partially_refunded">Partially Refunded</option>
              </select>

              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="relative">
              <select
                value={orderFilter}
                onChange={(event) =>
                  setOrderFilter(event.target.value as OrderFilter)
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="ready_for_delivery">Ready for Delivery</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="relative">
              <select
                value={inventoryFilter}
                onChange={(event) =>
                  setInventoryFilter(event.target.value as InventoryFilter)
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="all">All inventory</option>
                <option value="not_reserved">Not Reserved</option>
                <option value="reserved">Reserved</option>
                <option value="released">Released</option>
                <option value="consumed">Consumed</option>
              </select>

              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredOrders.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Order
                  </th>

                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Customer
                  </th>

                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Amount
                  </th>

                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Payment
                  </th>

                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Inventory
                  </th>

                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Created
                  </th>

                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`transition ${
                      order.requires_manual_review
                        ? "bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-500/[0.06] dark:hover:bg-amber-500/[0.09]"
                        : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-4 align-top">
                      <div className="flex flex-col items-start gap-2">
                        <a
                          href={`/admin/tweakmart/orders/${order.order_number}`}
                          className="text-xs font-bold text-slate-950 transition hover:text-primary dark:text-white"
                        >
                          {order.order_number}
                        </a>

                        <ManualReviewBadge
                          requiresManualReview={order.requires_manual_review}
                        />
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="whitespace-nowrap text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {order.customer_first_name} {order.customer_last_name}
                      </p>

                      <p className="mt-1 max-w-52 truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {order.customer_email}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 align-top">
                      <p className="text-xs font-bold text-slate-950 dark:text-white">
                        {formatCurrency(order.total, order.currency)}
                      </p>

                      <p className="mt-1 text-[11px] uppercase text-slate-400">
                        {order.payment_method.replaceAll("_", " ")}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 align-top">
                      <PaymentStatusBadge status={order.payment_status} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 align-top">
                      <OrderStatusBadge status={order.order_status} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 align-top">
                      <InventoryStatusBadge status={order.inventory_status} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 align-top">
                      <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        {formatDate(order.created_at)}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right align-top">
                      <a
                        href={`/admin/tweakmart/orders/${order.order_number}`}
                        title={`View ${order.order_number}`}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                      >
                        View
                        <ArrowRight size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {firstVisibleItem.toLocaleString()}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {lastVisibleItem.toLocaleString()}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {filteredOrders.length.toLocaleString()}
                  </span>{" "}
                  orders
                </p>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="tweakmart-orders-page-size"
                    className="text-xs text-slate-500 dark:text-slate-400"
                  >
                    Rows
                  </label>

                  <div className="relative">
                    <select
                      id="tweakmart-orders-page-size"
                      value={pageSize}
                      onChange={(event) =>
                        setPageSize(Number(event.target.value))
                      }
                      className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-7 text-xs font-semibold text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={12}
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  title="First page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:bg-slate-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  <ChevronsLeft size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  title="Previous page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:bg-slate-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  <ChevronLeft size={14} />
                </button>

                <div className="mx-1 flex items-center gap-1">
                  {paginationRange.map((item) => {
                    if (item === "ellipsis-left" || item === "ellipsis-right") {
                      return (
                        <span
                          key={item}
                          className="flex h-8 min-w-8 items-center justify-center px-1 text-xs text-slate-400"
                        >
                          …
                        </span>
                      );
                    }

                    const active = item === currentPage;

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => goToPage(item)}
                        aria-current={active ? "page" : undefined}
                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${
                          active
                            ? "bg-primary text-white"
                            : "border border-slate-200 text-slate-600 hover:border-primary/40 hover:bg-slate-50 hover:text-primary dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  title="Next page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:bg-slate-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  <ChevronRight size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  title="Last page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:bg-slate-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="px-6 py-14 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            {hasActiveFilters ? (
              <SlidersHorizontal size={19} />
            ) : (
              <ClipboardList size={19} />
            )}
          </div>

          <h3 className="mt-4 text-sm font-bold text-slate-950 dark:text-white">
            {hasActiveFilters
              ? "No matching orders"
              : "No TweakMart orders yet"}
          </h3>

          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
            {hasActiveFilters
              ? "Try adjusting your search or order filters."
              : "Customer orders will appear here after checkout."}
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-xs font-bold text-primary hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </section>
  );
}
