import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Box,
  CheckCircle2,
  Clock3,
  CreditCard,
  History,
  Mail,
  MapPin,
  Package,
  Phone,
  ReceiptText,
  User,
  Warehouse,
} from "lucide-react";
import TweakMartManualReviewPanel from "./TweakMartManualReviewPanel";
import type { TweakMartAdminOrderDetails } from "../../../../lib/tweakmart/order";

import {
  InventoryStatusBadge,
  ManualReviewBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "../orders/TweakmartOrderBadges";

interface TweakMartOrderDetailsProps {
  order: TweakMartAdminOrderDetails;
}

/* Formats monetary values using the currency stored on the order. */
function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

/* Formats database timestamps for administrative order history. */
function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/* Converts database enum values into readable administrative labels. */
function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/* Renders the complete administrative view of a TweakMart order. */
export default function TweakMartOrderDetails({
  order,
}: TweakMartOrderDetailsProps) {
  return (
    <div className="space-y-6 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <a
            href="/admin/tweakmart/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-primary dark:text-slate-400"
          >
            <ArrowLeft size={14} />
            Back to orders
          </a>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {order.order_number}
            </h1>

            <ManualReviewBadge
              requiresManualReview={order.requires_manual_review}
            />
          </div>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Created {formatDate(order.created_at)}
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Order Status
          </p>

          <OrderStatusBadge status={order.order_status} />
        </div>
      </div>

      {order.requires_manual_review && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <AlertTriangle size={18} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Manual review required
              </h2>

              <p className="mt-1 max-w-3xl text-xs leading-5 text-amber-700 dark:text-amber-300">
                Payment was successfully received, but this order could not
                complete inventory fulfillment. Inventory has already been
                released and the order remains pending.
              </p>

              <p className="mt-3 text-xs font-semibold text-amber-800 dark:text-amber-200">
                Do not manually mark this order as confirmed until inventory
                availability has been revalidated.
              </p>
            </div>
          </div>
        </section>
      )}
      {order.requires_manual_review && (
        <TweakMartManualReviewPanel order={order} />
      )}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-primary dark:bg-slate-900">
              <CreditCard size={17} />
            </div>

            <PaymentStatusBadge status={order.payment_status} />
          </div>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Payment
          </p>

          <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
            {formatLabel(order.payment_method)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {order.payment_channel
              ? formatLabel(order.payment_channel)
              : "No channel recorded"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Banknote size={17} className="text-primary" />

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Order Total
          </p>

          <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
            {formatCurrency(order.total, order.currency)}
          </p>

          <p className="mt-1 text-xs text-slate-400">{order.currency}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Clock3 size={17} className="text-primary" />

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Paid At
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-950 dark:text-white">
            {formatDate(order.paid_at)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CheckCircle2 size={17} className="text-primary" />

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Confirmed At
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-950 dark:text-white">
            {formatDate(order.confirmed_at)}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-primary" />

                <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                  Order Items
                </h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Product
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Qty
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Unit Price
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4">
                        <p className="text-xs font-bold text-slate-950 dark:text-white">
                          {item.product_name}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {item.variant_name && (
                            <span>{item.variant_name}</span>
                          )}

                          {item.sku && <span>SKU: {item.sku}</span>}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {item.quantity}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-xs text-slate-600 dark:text-slate-300">
                        {formatCurrency(item.unit_price, order.currency)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-xs font-bold text-slate-950 dark:text-white">
                        {formatCurrency(item.line_total, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 p-5 dark:border-slate-800">
              <div className="ml-auto max-w-xs space-y-3">
                <div className="flex justify-between gap-4 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Subtotal
                  </span>

                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {formatCurrency(order.subtotal, order.currency)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Delivery
                  </span>

                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {formatCurrency(order.delivery_fee, order.currency)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <span className="text-sm font-bold text-slate-950 dark:text-white">
                    Total
                  </span>

                  <span className="text-sm font-bold text-slate-950 dark:text-white">
                    {formatCurrency(order.total, order.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <Warehouse size={18} className="text-primary" />

              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Inventory History
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {order.reservations.length > 0 ? (
                order.reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-950 dark:text-white">
                        Reservation · {formatLabel(reservation.status)}
                      </p>

                      <span className="text-[11px] text-slate-400">
                        {formatDate(reservation.created_at)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-[11px] text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                      <p>Quantity: {reservation.quantity}</p>
                      <p>Expires: {formatDate(reservation.expires_at)}</p>
                      <p>Committed: {formatDate(reservation.committed_at)}</p>
                      <p>Released: {formatDate(reservation.released_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No inventory reservations were recorded for this order.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <History size={18} className="text-primary" />

              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Inventory Movements
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {order.inventory_movements.length > 0 ? (
                order.inventory_movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-950 dark:text-white">
                        {formatLabel(movement.movement_type)}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {movement.reason ?? "Inventory adjustment"}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p
                        className={`text-xs font-bold ${
                          movement.quantity < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {movement.quantity > 0 ? "+" : ""}
                        {movement.quantity}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        {movement.quantity_before} → {movement.quantity_after}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No inventory movements were recorded for this order.
                </p>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <User size={18} className="text-primary" />

              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Customer
              </h2>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-950 dark:text-white">
                  {order.customer_first_name} {order.customer_last_name}
                </p>
              </div>

              <div className="flex items-start gap-2">
                <Mail size={14} className="mt-0.5 shrink-0 text-slate-400" />

                <p className="break-all text-xs text-slate-600 dark:text-slate-300">
                  {order.customer_email}
                </p>
              </div>

              <div className="flex items-start gap-2">
                <Phone size={14} className="mt-0.5 shrink-0 text-slate-400" />

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {order.customer_phone}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-primary" />

              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Delivery
              </h2>
            </div>

            <div className="mt-5 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>{order.delivery_address}</p>

              <p>
                {order.delivery_city}, {order.delivery_state}
              </p>

              {order.delivery_notes && (
                <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  {order.delivery_notes}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <ReceiptText size={18} className="text-primary" />

              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Payment History
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {order.payment_attempts.length > 0 ? (
                order.payment_attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-200">
                        {attempt.status}
                      </p>

                      <span className="text-[10px] text-slate-400">
                        {formatDate(attempt.created_at)}
                      </span>
                    </div>

                    <p className="mt-2 break-all text-[10px] text-slate-500 dark:text-slate-400">
                      {attempt.reference}
                    </p>

                    <p className="mt-2 text-xs font-bold text-slate-950 dark:text-white">
                      {formatCurrency(attempt.amount, attempt.currency)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No payment attempts were recorded.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Box size={18} className="text-primary" />

                <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                  Inventory Timeline
                </h2>
              </div>

              <InventoryStatusBadge status={order.inventory_status} />
            </div>

            <dl className="mt-5 space-y-3">
              <div className="flex justify-between gap-4 text-xs">
                <dt className="text-slate-500 dark:text-slate-400">Reserved</dt>

                <dd className="text-right font-semibold text-slate-700 dark:text-slate-200">
                  {formatDate(order.inventory_reserved_at)}
                </dd>
              </div>

              <div className="flex justify-between gap-4 text-xs">
                <dt className="text-slate-500 dark:text-slate-400">Released</dt>

                <dd className="text-right font-semibold text-slate-700 dark:text-slate-200">
                  {formatDate(order.inventory_released_at)}
                </dd>
              </div>

              <div className="flex justify-between gap-4 text-xs">
                <dt className="text-slate-500 dark:text-slate-400">Consumed</dt>

                <dd className="text-right font-semibold text-slate-700 dark:text-slate-200">
                  {formatDate(order.inventory_consumed_at)}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>
    </div>
  );
}
