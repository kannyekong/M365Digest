import { useMemo, useState } from "react";
import {
  BadgePercent,
  CalendarClock,
  CircleDollarSign,
  Package,
  X,
} from "lucide-react";

import type {
  CreateTweakMartDealInput,
  TweakMartDealProductOption,
} from "../../../../lib/tweakmart/deals";

interface TweakMartDealFormProps {
  open: boolean;
  products: TweakMartDealProductOption[];
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTweakMartDealInput) => void;
}

interface DealFormState {
  product_id: string;
  title: string;
  offer_price: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

/* Creates the initial empty deal form state. */
function createInitialFormState(): DealFormState {
  return {
    product_id: "",
    title: "",
    offer_price: "",
    starts_at: "",
    ends_at: "",
    is_active: true,
  };
}

/* Formats monetary values using the selected product currency. */
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

/* Converts a local datetime input value into an ISO timestamp for the server. */
function toIsoDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

/* Renders the administrator form used to create a TweakMart promotional offer. */
export default function TweakMartDealForm({
  open,
  products,
  submitting = false,
  onClose,
  onSubmit,
}: TweakMartDealFormProps) {
  const [form, setForm] = useState<DealFormState>(createInitialFormState);

  const [validationError, setValidationError] = useState("");

  /* Resolves the currently selected product so its pricing can be displayed and validated. */
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.product_id) ?? null,
    [products, form.product_id]
  );

  const numericOfferPrice = Number(form.offer_price);

  const discountPercentage =
    selectedProduct &&
    Number.isFinite(numericOfferPrice) &&
    numericOfferPrice > 0 &&
    numericOfferPrice < selectedProduct.base_price
      ? Math.round(
          ((selectedProduct.base_price - numericOfferPrice) /
            selectedProduct.base_price) *
            100
        )
      : null;

  /* Updates one deal form field while clearing stale validation feedback. */
  function updateField<K extends keyof DealFormState>(
    field: K,
    value: DealFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setValidationError("");
  }

  /* Resets the form and closes the modal when no submission is running. */
  function handleClose() {
    if (submitting) {
      return;
    }

    setForm(createInitialFormState());
    setValidationError("");
    onClose();
  }

  /* Validates the client-side form before handing the confirmed payload to the parent manager. */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.product_id) {
      setValidationError("Select a product for this deal.");
      return;
    }

    if (!selectedProduct) {
      setValidationError("The selected product is no longer available.");
      return;
    }

    if (!form.title.trim()) {
      setValidationError("Enter a deal title.");
      return;
    }

    if (!Number.isFinite(numericOfferPrice) || numericOfferPrice < 0) {
      setValidationError("Enter a valid offer price.");
      return;
    }

    if (numericOfferPrice >= selectedProduct.base_price) {
      setValidationError(
        "Offer price must be lower than the regular product price."
      );
      return;
    }

    if (!form.starts_at || !form.ends_at) {
      setValidationError("Select both the deal start and end date.");
      return;
    }

    const startsAt = toIsoDateTime(form.starts_at);
    const endsAt = toIsoDateTime(form.ends_at);

    if (!startsAt || !endsAt) {
      setValidationError("Enter a valid deal period.");
      return;
    }

    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setValidationError("Deal end date must be later than its start date.");
      return;
    }

    onSubmit({
      product_id: form.product_id,
      title: form.title.trim(),
      offer_price: numericOfferPrice,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: form.is_active,
    });
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close create deal form"
        onClick={handleClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />

      <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-5 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
          <div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BadgePercent size={18} />
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">
              Create Deal
            </h2>

            <p className="mt-1 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
              Schedule promotional pricing for an active TweakMart product.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 p-5 sm:p-6">
            <section>
              <div className="flex items-center gap-2">
                <Package size={16} className="text-primary" />

                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Product
                </h3>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select product
                </span>

                <select
                  value={form.product_id}
                  disabled={submitting}
                  onChange={(event) =>
                    updateField("product_id", event.target.value)
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Select a TweakMart product</option>

                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                      {product.brand ? ` — ${product.brand.name}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {selectedProduct ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Regular price
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                      {formatCurrency(
                        selectedProduct.base_price,
                        selectedProduct.currency
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Product status
                    </p>

                    <p className="mt-1 text-sm font-bold capitalize text-emerald-600 dark:text-emerald-400">
                      {selectedProduct.status}
                    </p>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CircleDollarSign size={16} className="text-primary" />

                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Offer
                </h3>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Deal title
                  </span>

                  <input
                    type="text"
                    value={form.title}
                    disabled={submitting}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                    placeholder="e.g. September Laptop Deal"
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Offer price
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.offer_price}
                    disabled={submitting}
                    onChange={(event) =>
                      updateField("offer_price", event.target.value)
                    }
                    placeholder="0.00"
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Customer saving
                  </span>

                  <div className="mt-2 flex min-h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-800 dark:bg-slate-900">
                    {discountPercentage !== null ? (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {discountPercentage}% off
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">
                        Calculated automatically
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarClock size={16} className="text-primary" />

                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Schedule
                </h3>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Starts
                  </span>

                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    disabled={submitting}
                    onChange={(event) =>
                      updateField("starts_at", event.target.value)
                    }
                    className="mt-2 block min-h-12 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="block min-w-0">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ends
                  </span>

                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    disabled={submitting}
                    onChange={(event) =>
                      updateField("ends_at", event.target.value)
                    }
                    className="mt-2 block min-h-12 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  disabled={submitting}
                  onChange={(event) =>
                    updateField("is_active", event.target.checked)
                  }
                  className="mt-0.5 size-4 rounded border-slate-300 text-primary focus:ring-primary"
                />

                <span>
                  <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Enable this deal
                  </span>

                  <span className="mt-1 block text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    The offer becomes visible automatically when its start time
                    is reached and stops when it expires.
                  </span>
                </span>
              </label>
            </section>

            {validationError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {validationError}
              </div>
            ) : null}
          </div>

          <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              disabled={submitting}
              onClick={handleClose}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <BadgePercent size={15} />
              Review Deal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
