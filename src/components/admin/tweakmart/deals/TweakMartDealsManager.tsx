import { useMemo, useState } from "react";
import {
  BadgePercent,
  CalendarClock,
  CircleDollarSign,
  ImageIcon,
  MoreHorizontal,
  Plus,
  Search,
  Tag,
} from "lucide-react";
import { toast } from "react-toastify";
import ConfirmModal from "../../../../islands/ConfirmModal";
import TweakMartDealForm from "./TweakMartDealForm";

import type {
  TweakMartDeal,
  CreateTweakMartDealInput,
  TweakMartDealProductOption,
} from "../../../../lib/tweakmart/deals";

interface TweakMartDealsManagerProps {
  initialDeals: TweakMartDeal[];
  products: TweakMartDealProductOption[];
}

type DealStatus = "active" | "scheduled" | "expired" | "disabled";

/* Formats monetary values using the product's configured currency. */
function formatCurrency(value: number, currency = "NGN") {
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

/* Formats deal dates into concise administrator-friendly values. */
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/* Determines the effective lifecycle state of a deal. */
function getDealStatus(deal: TweakMartDeal): DealStatus {
  if (!deal.is_active) {
    return "disabled";
  }

  const now = Date.now();
  const startsAt = new Date(deal.starts_at).getTime();
  const endsAt = new Date(deal.ends_at).getTime();

  if (now < startsAt) {
    return "scheduled";
  }

  if (now >= endsAt) {
    return "expired";
  }

  return "active";
}

/* Converts deal lifecycle values into administrator-friendly labels. */
function formatDealStatus(status: DealStatus) {
  switch (status) {
    case "active":
      return "Active";

    case "scheduled":
      return "Scheduled";

    case "expired":
      return "Expired";

    case "disabled":
      return "Disabled";
  }
}

/* Returns theme-aware badge styles for each deal lifecycle state. */
function getDealStatusClasses(status: DealStatus) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";

    case "scheduled":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300";

    case "expired":
      return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

    case "disabled":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }
}

/* Calculates the percentage saved against the product's normal base price. */
function getDiscountPercentage(deal: TweakMartDeal) {
  const basePrice = deal.product?.base_price ?? 0;

  if (basePrice <= 0 || deal.offer_price >= basePrice) {
    return 0;
  }

  return Math.round(((basePrice - deal.offer_price) / basePrice) * 100);
}

/* Renders the main TweakMart promotional pricing management interface. */
export default function TweakMartDealsManager({
  initialDeals,
  products,
}: TweakMartDealsManagerProps) {
  const [deals, setDeals] = useState(initialDeals);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [pendingDeal, setPendingDeal] =
    useState<CreateTweakMartDealInput | null>(null);
  const [creatingDeal, setCreatingDeal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  /* Filters the initially loaded deals according to administrator search and lifecycle selection. */
  const filteredDeals = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return deals.filter((deal) => {
      const status = getDealStatus(deal);

      const matchesStatus = statusFilter === "all" || status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [deal.title, deal.product?.name, deal.product?.brand?.name].some(
        (value) => value?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [deals, search, statusFilter]);

  /* Opens the create-deal form and clears any stale pending confirmation payload. */
  function openCreateDealForm() {
    setPendingDeal(null);
    setCreateFormOpen(true);
  }

  /* Stores the validated form payload so the administrator can confirm the critical create operation. */
  function reviewCreateDeal(input: CreateTweakMartDealInput) {
    setPendingDeal(input);
  }

  /* Cancels the pending create operation without losing the form itself. */
  function cancelCreateConfirmation() {
    if (creatingDeal) {
      return;
    }

    setPendingDeal(null);
  }

  /* Creates the confirmed deal through the server-side TweakMart administration API. */
  async function confirmCreateDeal() {
    if (!pendingDeal || creatingDeal) {
      return;
    }

    try {
      setCreatingDeal(true);

      const response = await fetch("/api/admin/tweakmart/deals", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pendingDeal),
      });

      const responseText = await response.text();

      let result: {
        success: boolean;
        message?: string;
        deal?: TweakMartDeal;
      };

      try {
        result = JSON.parse(responseText) as {
          success: boolean;
          message?: string;
          deal?: TweakMartDeal;
        };
      } catch {
        console.error("Unexpected deals API response:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          contentType: response.headers.get("content-type"),
          body: responseText.slice(0, 500),
        });

        throw new Error(
          `Deals endpoint returned an unexpected response (${response.status}).`
        );
      }

      if (!response.ok || !result.success || !result.deal) {
        throw new Error(result.message ?? "Unable to create TweakMart deal.");
      }

      setDeals((current) => [result.deal as TweakMartDeal, ...current]);

      setPendingDeal(null);
      setCreateFormOpen(false);

      toast.success(result.message ?? "TweakMart deal created successfully.");
    } catch (error) {
      console.error("Failed to create TweakMart deal:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create TweakMart deal."
      );
    } finally {
      setCreatingDeal(false);
    }
  }

  /* Calculates dashboard totals from the currently loaded deal collection. */
  const statistics = useMemo(() => {
    let active = 0;
    let scheduled = 0;
    let expired = 0;
    let disabled = 0;

    for (const deal of deals) {
      switch (getDealStatus(deal)) {
        case "active":
          active += 1;
          break;

        case "scheduled":
          scheduled += 1;
          break;

        case "expired":
          expired += 1;
          break;

        case "disabled":
          disabled += 1;
          break;
      }
    }

    return {
      total: deals.length,
      active,
      scheduled,
      expired,
      disabled,
    };
  }, [deals]);

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BadgePercent size={18} />
            </div>

            <span className="text-xs font-semibold text-slate-400">Total</span>
          </div>

          <p className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">
            {statistics.total.toLocaleString()}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Promotional offers
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Tag size={18} />
            </div>

            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Live
            </span>
          </div>

          <p className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">
            {statistics.active.toLocaleString()}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Active deals
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <CalendarClock size={18} />
            </div>

            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Upcoming
            </span>
          </div>

          <p className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">
            {statistics.scheduled.toLocaleString()}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Scheduled deals
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <CircleDollarSign size={18} />
            </div>

            <span className="text-xs font-semibold text-slate-400">
              Inactive
            </span>
          </div>

          <p className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">
            {(statistics.expired + statistics.disabled).toLocaleString()}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Expired or disabled
          </p>
        </div>
      </div>

      <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search deals or products..."
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="all">All deals</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="expired">Expired</option>
                <option value="disabled">Disabled</option>
              </select>

              <button
                type="button"
                onClick={openCreateDealForm}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-white transition hover:opacity-90"
              >
                <Plus size={15} />
                Create Deal
              </button>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            {filteredDeals.length.toLocaleString()}{" "}
            {filteredDeals.length === 1 ? "deal" : "deals"} shown
            {" • "}
            {products.length.toLocaleString()} eligible products
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Product
                </th>

                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Deal
                </th>

                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Offer
                </th>

                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Saving
                </th>

                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Period
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
              {filteredDeals.map((deal) => {
                const status = getDealStatus(deal);
                const discountPercentage = getDiscountPercentage(deal);

                return (
                  <tr
                    key={deal.id}
                    className="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex min-w-[240px] items-center gap-3">
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
                          {deal.product?.primary_image ? (
                            <img
                              src={deal.product.primary_image.image_url}
                              alt={
                                deal.product.primary_image.alt_text ??
                                deal.product.name
                              }
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <ImageIcon size={18} className="text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate text-xs font-bold text-slate-900 dark:text-white">
                            {deal.product?.name ?? "Product unavailable"}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {deal.product?.brand?.name ?? "No brand"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[180px] truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                        {deal.title}
                      </p>
                    </td>

                    <td className="grid grid-row px-5 py-4">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-through">
                        {formatCurrency(
                          deal.product?.base_price ?? 0,
                          deal.product?.currency ?? "NGN"
                        )}
                      </span>
                      <span className="text-xs font-bold text-primary">
                        {formatCurrency(
                          deal.offer_price,
                          deal.product?.currency ?? "NGN"
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        {discountPercentage}% off
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="min-w-[170px]">
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {formatDateTime(deal.starts_at)}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          to {formatDateTime(deal.ends_at)}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${getDealStatusClasses(
                          status
                        )}`}
                      >
                        {formatDealStatus(status)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId((current) =>
                            current === deal.id ? null : deal.id
                          )
                        }
                        className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        aria-label={`Actions for ${deal.title}`}
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {openMenuId === deal.id ? (
                        <div className="mt-2 text-xs text-slate-400">
                          Actions coming next
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}

              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900">
                      <BadgePercent size={20} />
                    </div>

                    <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
                      No deals found
                    </h3>

                    <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Create a promotional offer for an eligible TweakMart
                      product to get started.
                    </p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <TweakMartDealForm
        open={createFormOpen}
        products={products}
        submitting={creatingDeal}
        onClose={() => {
          if (!creatingDeal) {
            setCreateFormOpen(false);
            setPendingDeal(null);
          }
        }}
        onSubmit={reviewCreateDeal}
      />

      <ConfirmModal
        open={pendingDeal !== null}
        title="Create TweakMart deal?"
        message={
          pendingDeal
            ? `This will create "${pendingDeal.title}" and make its promotional price eligible to appear on TweakMart during the configured deal period.`
            : ""
        }
        confirmText="Create Deal"
        cancelText="Go Back"
        variant="primary"
        loading={creatingDeal}
        onConfirm={() => void confirmCreateDeal()}
        onCancel={cancelCreateConfirmation}
      />
    </div>
  );
}
