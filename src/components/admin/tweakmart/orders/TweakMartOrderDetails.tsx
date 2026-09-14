import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Ban,
  Box,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CreditCard,
  History,
  LoaderCircle,
  Truck,
  BadgeCheck,
  Mail,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  ReceiptText,
  Settings2,
  User,
  Warehouse,
  X,
} from "lucide-react";
import OrderLifecycle from "../../../../components/admin/tweakmart/orders/OrderLifeCycle";
import type { TweakMartAdminOrderDetails } from "../../../../lib/tweakmart/order";
import TweakMartManualReviewPanel from "./TweakMartManualReviewPanel";
import {
  InventoryStatusBadge,
  ManualReviewBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "../orders/TweakmartOrderBadges";

interface TweakMartOrderDetailsProps {
  order: TweakMartAdminOrderDetails;
}

type TweakMartOrderAction =
  | "confirm"
  | "start_processing"
  | "fulfill"
  | "dispatch"
  | "record_pod_payment"
  | "mark_delivered"
  | "cancel";

type TweakMartPodPaymentChannel = "cash" | "pos" | "transfer";

type ReturnCondition =
  "unopened" | "good" | "damaged" | "defective" | "incorrect_item" | "other";

interface ReturnItemForm {
  order_item_id: string;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  purchased_quantity: number;
  selected: boolean;
  quantity: number;
  condition: ReturnCondition;
  notes: string;
}

interface CreateReturnResponse {
  success: boolean;
  message: string;
  return?: {
    return_id: string;
    return_number: string;
    status: string;
  };
}

interface TweakMartOrderActionResponse {
  success: boolean;
  message: string;
  order?: {
    order_id: string;
    order_number: string;
    order_status: string;
    inventory_status: string;
    already_processed: boolean;
  };
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

/* Determines whether a pending order can be safely confirmed. */
function canConfirmOrder(order: TweakMartAdminOrderDetails) {
  const paymentAllowsConfirmation =
    order.payment_method === "pay_on_delivery" ||
    order.payment_status === "paid";

  return (
    order.order_status === "pending" &&
    order.inventory_status !== "released" &&
    paymentAllowsConfirmation &&
    !order.requires_manual_review
  );
}

/* Determines whether a delivered order can start a return workflow. */
function canStartReturn(order: TweakMartAdminOrderDetails) {
  return order.order_status === "delivered";
}

/* Determines whether a confirmed order can enter active processing. */
function canStartProcessingOrder(order: TweakMartAdminOrderDetails) {
  const paymentAllowsProcessing =
    order.payment_method === "pay_on_delivery" ||
    order.payment_status === "paid";

  return (
    order.order_status === "confirmed" &&
    order.inventory_status === "reserved" &&
    paymentAllowsProcessing &&
    !order.requires_manual_review
  );
}

/* Determines whether a processing order can consume its reserved inventory. */
function canFulfillOrder(order: TweakMartAdminOrderDetails) {
  const paymentAllowsFulfillment =
    order.payment_method === "pay_on_delivery" ||
    order.payment_status === "paid";

  return (
    order.order_status === "processing" &&
    order.inventory_status === "reserved" &&
    paymentAllowsFulfillment
  );
}

/* Determines whether a fulfilled order can leave for delivery. */
function canDispatchOrder(order: TweakMartAdminOrderDetails) {
  return (
    order.order_status === "ready_for_delivery" &&
    order.inventory_status === "consumed"
  );
}

/* Determines whether an out-for-delivery order can be completed. */
function canMarkOrderDelivered(order: TweakMartAdminOrderDetails) {
  return (
    order.order_status === "out_for_delivery" &&
    order.inventory_status === "consumed" &&
    order.payment_status === "paid"
  );
}

/* Detects a dispatched POD order whose payment still needs to be recorded. */
function needsPayOnDeliveryPayment(order: TweakMartAdminOrderDetails) {
  return (
    order.order_status === "out_for_delivery" &&
    order.payment_method === "pay_on_delivery" &&
    order.payment_status !== "paid"
  );
}

/* Determines whether the current order can still be cancelled. */
function canCancelOrder(order: TweakMartAdminOrderDetails) {
  return (
    order.order_status !== "cancelled" &&
    order.order_status !== "delivered" &&
    order.inventory_status !== "consumed"
  );
}

/* Renders the complete administrative view of a TweakMart order. */
export default function TweakMartOrderDetails({
  order,
}: TweakMartOrderDetailsProps) {
  const [pendingAction, setPendingAction] =
    useState<TweakMartOrderAction | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [podPaymentChannel, setPodPaymentChannel] =
    useState<TweakMartPodPaymentChannel>("cash");
  const [podPaymentReference, setPodPaymentReference] = useState("");
  const [podPaymentNotes, setPodPaymentNotes] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnCustomerNotes, setReturnCustomerNotes] = useState("");
  const [returnItems, setReturnItems] = useState<ReturnItemForm[]>([]);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnSuccess, setReturnSuccess] = useState<string | null>(null);

  /* Opens the confirmation modal for the selected order action. */
  function openOrderAction(action: TweakMartOrderAction) {
    setPendingAction(action);
    setCancelReason("");
    setPodPaymentChannel("cash");
    setPodPaymentReference("");
    setPodPaymentNotes("");
    setActionError(null);
    setActionSuccess(null);
  }

  /* Opens the return request modal using the order's purchased items. */
  function openReturnModal() {
    setReturnReason("");
    setReturnCustomerNotes("");
    setReturnError(null);
    setReturnSuccess(null);

    setReturnItems(
      order.items.map((item) => ({
        order_item_id: item.id,
        product_name: item.product_name,
        variant_name: item.variant_name,
        sku: item.sku,
        purchased_quantity: item.quantity,
        selected: false,
        quantity: 1,
        condition: "good",
        notes: "",
      }))
    );

    setReturnModalOpen(true);
  }

  /* Updates one return item without mutating the existing return-item collection. */
  function updateReturnItem(
    orderItemId: string,
    updates: Partial<ReturnItemForm>
  ) {
    setReturnItems((current) =>
      current.map((item) =>
        item.order_item_id === orderItemId
          ? {
              ...item,
              ...updates,
            }
          : item
      )
    );
  }

  /* Creates a return request for the selected delivered order items. */
  async function submitReturnRequest() {
    const selectedItems = returnItems.filter((item) => item.selected);

    if (!returnReason.trim()) {
      setReturnError("Enter a reason for this return.");
      return;
    }

    if (selectedItems.length === 0) {
      setReturnError("Select at least one item to return.");
      return;
    }

    const invalidQuantity = selectedItems.some(
      (item) =>
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > item.purchased_quantity
    );

    if (invalidQuantity) {
      setReturnError("One or more return quantities are invalid.");
      return;
    }

    setIsSubmittingReturn(true);
    setReturnError(null);
    setReturnSuccess(null);

    try {
      const response = await fetch(
        `/api/admin/tweakmart/orders/${order.id}/returns`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            reason: returnReason.trim(),

            customer_notes: returnCustomerNotes.trim() || undefined,

            items: selectedItems.map((item) => ({
              order_item_id: item.order_item_id,
              quantity: item.quantity,
              condition: item.condition,
              notes: item.notes.trim() || undefined,
            })),
          }),
        }
      );

      const result = (await response.json()) as CreateReturnResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to create return request.");
      }

      setReturnSuccess(result.message);

      window.setTimeout(() => {
        if (result.return?.return_number) {
          window.location.href = `/admin/tweakmart/returns/${result.return.return_number}`;

          return;
        }

        window.location.reload();
      }, 700);
    } catch (error) {
      setReturnError(
        error instanceof Error
          ? error.message
          : "Unable to create return request."
      );
    } finally {
      setIsSubmittingReturn(false);
    }
  }

  /* Closes the action modal when no request is currently in progress. */
  function closeOrderAction() {
    if (isSubmittingAction) {
      return;
    }

    setPendingAction(null);
    setCancelReason("");
    setPodPaymentChannel("cash");
    setPodPaymentReference("");
    setPodPaymentNotes("");
    setActionError(null);
    setActionSuccess(null);
  }

  /* Sends the selected action to the administrator API endpoint. */
  async function submitOrderAction() {
    if (!pendingAction) {
      return;
    }

    setIsSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch(
        `/api/admin/tweakmart/orders/${order.id}/actions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: pendingAction,
            reason:
              pendingAction === "cancel"
                ? cancelReason.trim() || undefined
                : undefined,
            payment_channel:
              pendingAction === "record_pod_payment"
                ? podPaymentChannel
                : undefined,
            payment_reference:
              pendingAction === "record_pod_payment"
                ? podPaymentReference.trim() || undefined
                : undefined,
            payment_notes:
              pendingAction === "record_pod_payment"
                ? podPaymentNotes.trim() || undefined
                : undefined,
          }),
        }
      );

      const result = (await response.json()) as TweakMartOrderActionResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to update this order.");
      }

      setActionSuccess(result.message);

      /* Reloads authoritative order and inventory state after success. */
      window.setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update this order."
      );
    } finally {
      setIsSubmittingAction(false);
    }
  }

  return (
    <div className="space-y-6 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <a
            href="/admin/tweakmart/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft size={14} />
            Back to orders
          </a>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              {order.order_number}
            </h1>

            <ManualReviewBadge
              requiresManualReview={order.requires_manual_review}
            />
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Created {formatDate(order.created_at)}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Order Status: {"   "}
              <OrderStatusBadge status={order.order_status} />
            </p>
            <div className="space-y-6">
              <OrderLifecycle status={order.order_status} />
            </div>
          </div>

          {(canConfirmOrder(order) ||
            canStartProcessingOrder(order) ||
            canFulfillOrder(order) ||
            canDispatchOrder(order) ||
            needsPayOnDeliveryPayment(order) ||
            canMarkOrderDelivered(order) ||
            canCancelOrder(order) ||
            canStartReturn(order)) && (
            <div className="flex flex-wrap items-center gap-2">
              {needsPayOnDeliveryPayment(order) && (
                <>
                  <div className="max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-semibold text-amber-800">
                      Record the Pay on Delivery payment before marking this
                      order as delivered.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openOrderAction("record_pod_payment")}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary/90"
                  >
                    <Banknote size={15} />
                    Record POD Payment
                  </button>
                </>
              )}
              {canConfirmOrder(order) && (
                <button
                  type="button"
                  onClick={() => openOrderAction("confirm")}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary/90"
                >
                  <ClipboardCheck size={15} />
                  Confirm Order
                </button>
              )}

              {canStartProcessingOrder(order) && (
                <button
                  type="button"
                  onClick={() => openOrderAction("start_processing")}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary/90"
                >
                  <Settings2 size={15} />
                  Start Processing
                </button>
              )}

              {canFulfillOrder(order) && (
                <button
                  type="button"
                  onClick={() => openOrderAction("fulfill")}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary/90"
                >
                  <PackageCheck size={15} />
                  Fulfill Order
                </button>
              )}

              {canDispatchOrder(order) && (
                <button
                  type="button"
                  onClick={() => openOrderAction("dispatch")}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary/90"
                >
                  <Truck size={15} />
                  Dispatch Order
                </button>
              )}

              {canCancelOrder(order) && (
                <button
                  type="button"
                  onClick={() => openOrderAction("cancel")}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
                >
                  <Ban size={15} />
                  Cancel Order
                </button>
              )}

              {canStartReturn(order) && (
                <button
                  type="button"
                  onClick={openReturnModal}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Start Return
                </button>
              )}

              {canMarkOrderDelivered(order) && (
                <button
                  type="button"
                  onClick={() => openOrderAction("mark_delivered")}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                >
                  <BadgeCheck size={15} />
                  Mark Delivered
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {order.requires_manual_review && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle size={18} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-amber-900">
                Manual review required
              </h2>

              <p className="mt-1 max-w-3xl text-xs leading-5 text-amber-700">
                Payment was successfully received, but this order could not
                complete inventory fulfillment. Inventory has already been
                released and the order remains pending.
              </p>

              <p className="mt-3 text-xs font-semibold text-amber-800">
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-primary">
              <CreditCard size={17} />
            </div>

            <PaymentStatusBadge status={order.payment_status} />
          </div>

          <p className="mt-4 text-xs text-slate-500">Payment</p>

          <p className="mt-1 text-sm font-bold text-slate-950">
            {formatLabel(order.payment_method)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {order.payment_channel
              ? formatLabel(order.payment_channel)
              : "No channel recorded"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <Banknote size={17} className="text-primary" />

          <p className="mt-3 text-xs text-slate-500">Order Total</p>

          <p className="mt-1 text-sm font-bold text-slate-950">
            {formatCurrency(order.total, order.currency)}
          </p>

          <p className="mt-1 text-xs text-slate-400">{order.currency}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <Clock3 size={17} className="text-primary" />

          <p className="mt-3 text-xs text-slate-500">Paid At</p>

          <p className="mt-1 text-xs font-semibold text-slate-950">
            {formatDate(order.paid_at)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <CheckCircle2 size={17} className="text-primary" />

          <p className="mt-3 text-xs text-slate-500">Confirmed At</p>

          <p className="mt-1 text-xs font-semibold text-slate-950">
            {formatDate(order.confirmed_at)}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-primary" />

                <h2 className="text-sm font-bold text-slate-950">
                  Order Items
                </h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
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

                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4">
                        <p className="text-xs font-bold text-slate-950">
                          {item.product_name}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          {item.variant_name && (
                            <span>{item.variant_name}</span>
                          )}
                          {item.sku && <span>SKU: {item.sku}</span>}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold text-slate-700">
                        {item.quantity}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-xs text-slate-600">
                        {formatCurrency(item.unit_price, order.currency)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-xs font-bold text-slate-950">
                        {formatCurrency(item.line_total, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 p-5">
              <div className="ml-auto max-w-xs space-y-3">
                <div className="flex justify-between gap-4 text-xs">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-semibold text-slate-700">
                    {formatCurrency(order.subtotal, order.currency)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 text-xs">
                  <span className="text-slate-500">Delivery</span>
                  <span className="font-semibold text-slate-700">
                    {formatCurrency(order.delivery_fee, order.currency)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
                  <span className="text-sm font-bold text-slate-950">
                    Total
                  </span>
                  <span className="text-sm font-bold text-slate-950">
                    {formatCurrency(order.total, order.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Warehouse size={18} className="text-primary" />
              <h2 className="text-sm font-bold text-slate-950">
                Inventory History
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {order.reservations.length > 0 ? (
                order.reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-950">
                        Reservation · {formatLabel(reservation.status)}
                      </p>

                      <span className="text-[11px] text-slate-400">
                        {formatDate(reservation.created_at)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-[11px] text-slate-500 sm:grid-cols-2">
                      <p>Quantity: {reservation.quantity}</p>
                      <p>Expires: {formatDate(reservation.expires_at)}</p>
                      <p>Committed: {formatDate(reservation.committed_at)}</p>
                      <p>Released: {formatDate(reservation.released_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">
                  No inventory reservations were recorded for this order.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <History size={18} className="text-primary" />
              <h2 className="text-sm font-bold text-slate-950">
                Inventory Movements
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {order.inventory_movements.length > 0 ? (
                order.inventory_movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-950">
                        {formatLabel(movement.movement_type)}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-500">
                        {movement.reason ?? "Inventory adjustment"}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p
                        className={`text-xs font-bold ${
                          movement.quantity < 0
                            ? "text-red-600"
                            : "text-emerald-600"
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
                <p className="text-xs text-slate-500">
                  No inventory movements were recorded for this order.
                </p>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <User size={18} className="text-primary" />
              <h2 className="text-sm font-bold text-slate-950">Customer</h2>
            </div>

            <div className="mt-5 space-y-4">
              <p className="text-xs font-bold text-slate-950">
                {order.customer_first_name} {order.customer_last_name}
              </p>

              <div className="flex items-start gap-2">
                <Mail size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <p className="break-all text-xs text-slate-600">
                  {order.customer_email}
                </p>
              </div>

              <div className="flex items-start gap-2">
                <Phone size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <p className="text-xs text-slate-600">{order.customer_phone}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <h2 className="text-sm font-bold text-slate-950">Delivery</h2>
            </div>

            <div className="mt-5 space-y-3 text-xs text-slate-600">
              <p>{order.delivery_address}</p>
              <p>
                {order.delivery_city}, {order.delivery_state}
              </p>

              {order.delivery_notes && (
                <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">
                  {order.delivery_notes}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ReceiptText size={18} className="text-primary" />
              <h2 className="text-sm font-bold text-slate-950">
                Payment History
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {order.payment_attempts.length > 0 ? (
                order.payment_attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase text-slate-700">
                        {attempt.status}
                      </p>

                      <span className="text-[10px] text-slate-400">
                        {formatDate(attempt.created_at)}
                      </span>
                    </div>

                    <p className="mt-2 break-all text-[10px] text-slate-500">
                      {attempt.reference}
                    </p>

                    <p className="mt-2 text-xs font-bold text-slate-950">
                      {formatCurrency(attempt.amount, attempt.currency)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">
                  No payment attempts were recorded.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Box size={18} className="text-primary" />
                <h2 className="text-sm font-bold text-slate-950">
                  Inventory Timeline
                </h2>
              </div>

              <InventoryStatusBadge status={order.inventory_status} />
            </div>

            <dl className="mt-5 space-y-3">
              <div className="flex justify-between gap-4 text-xs">
                <dt className="text-slate-500">Reserved</dt>
                <dd className="text-right font-semibold text-slate-700">
                  {formatDate(order.inventory_reserved_at)}
                </dd>
              </div>

              <div className="flex justify-between gap-4 text-xs">
                <dt className="text-slate-500">Released</dt>
                <dd className="text-right font-semibold text-slate-700">
                  {formatDate(order.inventory_released_at)}
                </dd>
              </div>

              <div className="flex justify-between gap-4 text-xs">
                <dt className="text-slate-500">Consumed</dt>
                <dd className="text-right font-semibold text-slate-700">
                  {formatDate(order.inventory_consumed_at)}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>

      {pendingAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeOrderAction();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tweakmart-order-action-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2
                  id="tweakmart-order-action-title"
                  className="text-sm font-bold text-slate-950"
                >
                  {pendingAction === "confirm"
                    ? "Confirm order"
                    : pendingAction === "start_processing"
                      ? "Start processing"
                      : pendingAction === "fulfill"
                        ? "Fulfill order"
                        : pendingAction === "dispatch"
                          ? "Dispatch order"
                          : pendingAction === "mark_delivered"
                            ? "Mark delivered"
                            : "Cancel order"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {order.order_number}
                </p>
              </div>

              <button
                type="button"
                onClick={closeOrderAction}
                disabled={isSubmittingAction}
                aria-label="Close order action"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              {pendingAction === "confirm" ? (
                <>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary">
                    <ClipboardCheck size={20} />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-950">
                    Confirm this order
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Confirm{" "}
                    <span className="font-semibold text-slate-950">
                      {order.order_number}
                    </span>{" "}
                    and move it into the fulfillment workflow?
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Inventory will remain reserved. Physical stock will not be
                    deducted until the order is fulfilled.
                  </p>
                </>
              ) : pendingAction === "start_processing" ? (
                <>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary">
                    <Settings2 size={20} />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-950">
                    Start processing this order
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Move{" "}
                    <span className="font-semibold text-slate-950">
                      {order.order_number}
                    </span>{" "}
                    into active processing?
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Inventory will remain reserved. No physical stock will be
                    deducted until Fulfill Order is completed.
                  </p>
                </>
              ) : pendingAction === "fulfill" ? (
                <>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <PackageCheck size={20} />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-950">
                    Confirm fulfillment
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Reserved inventory for{" "}
                    <span className="font-semibold text-slate-950">
                      {order.order_number}
                    </span>{" "}
                    will be consumed and physical available stock will be
                    reduced.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    The order will advance to{" "}
                    <span className="font-semibold text-slate-950">
                      Ready for dispatch
                    </span>
                    .
                  </p>
                </>
              ) : pendingAction === "dispatch" ? (
                <>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary">
                    <Truck size={20} />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-950">
                    Dispatch this order
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Move{" "}
                    <span className="font-semibold text-slate-950">
                      {order.order_number}
                    </span>{" "}
                    to Out for Delivery?
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Inventory has already been consumed, so this action only
                    advances the delivery lifecycle.
                  </p>
                </>
              ) : pendingAction === "record_pod_payment" ? (
                <>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary">
                    <Banknote size={20} />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-950">
                    Record Pay on Delivery payment
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Record the payment received for{" "}
                    <span className="font-semibold text-slate-950">
                      {order.order_number}
                    </span>
                    . The order total is{" "}
                    <span className="font-semibold text-slate-950">
                      {formatCurrency(order.total, order.currency)}
                    </span>
                    .
                  </p>

                  <div className="mt-5 space-y-4">
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-700">
                        Payment channel
                      </span>

                      <select
                        value={podPaymentChannel}
                        onChange={(event) =>
                          setPodPaymentChannel(
                            event.target.value as TweakMartPodPaymentChannel
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                      >
                        <option value="cash">Cash</option>
                        <option value="pos">POS</option>
                        <option value="transfer">Transfer</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold text-slate-700">
                        Payment reference
                        <span className="ml-1 font-normal text-slate-400">
                          (optional)
                        </span>
                      </span>

                      <input
                        type="text"
                        value={podPaymentReference}
                        onChange={(event) =>
                          setPodPaymentReference(event.target.value)
                        }
                        placeholder="POS or transfer reference"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold text-slate-700">
                        Notes
                        <span className="ml-1 font-normal text-slate-400">
                          (optional)
                        </span>
                      </span>

                      <textarea
                        rows={3}
                        value={podPaymentNotes}
                        onChange={(event) =>
                          setPodPaymentNotes(event.target.value)
                        }
                        placeholder="Optional payment notes"
                        className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                      />
                    </label>
                  </div>
                </>
              ) : pendingAction === "mark_delivered" ? (
                <>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <BadgeCheck size={20} />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-950">
                    Confirm delivery
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Confirm that{" "}
                    <span className="font-semibold text-slate-950">
                      {order.order_number}
                    </span>{" "}
                    has been delivered to the customer.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    This records the delivery timestamp and completes the order
                    lifecycle.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <Ban size={20} />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-950">
                    Confirm cancellation
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Cancelling{" "}
                    <span className="font-semibold text-slate-950">
                      {order.order_number}
                    </span>{" "}
                    will release its reserved inventory back into the sellable
                    quantity.
                  </p>

                  <div className="mt-4">
                    <label
                      htmlFor="tweakmart-cancellation-reason"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Cancellation reason
                    </label>

                    <textarea
                      id="tweakmart-cancellation-reason"
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      rows={3}
                      placeholder="Optional reason for cancelling the order"
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </>
              )}

              {actionError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <p className="text-xs leading-5 text-red-700">
                    {actionError}
                  </p>
                </div>
              )}

              {actionSuccess && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                  <CheckCircle2
                    size={15}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  <p className="text-xs leading-5 text-emerald-700">
                    {actionSuccess}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={closeOrderAction}
                disabled={isSubmittingAction}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Keep Order
              </button>

              <button
                type="button"
                onClick={submitOrderAction}
                disabled={isSubmittingAction}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  pendingAction === "cancel"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-primary hover:bg-primary/90"
                }`}
              >
                {isSubmittingAction && (
                  <LoaderCircle size={14} className="animate-spin" />
                )}

                {isSubmittingAction
                  ? "Processing..."
                  : pendingAction === "confirm"
                    ? "Confirm Order"
                    : pendingAction === "start_processing"
                      ? "Start Processing"
                      : pendingAction === "fulfill"
                        ? "Fulfill Order"
                        : pendingAction === "dispatch"
                          ? "Dispatch Order"
                          : pendingAction === "record_pod_payment"
                            ? "Record Payment"
                            : pendingAction === "mark_delivered"
                              ? "Mark Delivered"
                              : "Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}
      {returnModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Start return
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  {order.order_number}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Return reason
                </label>

                <select
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="">Select reason</option>
                  <option value="Defective item">Defective item</option>
                  <option value="Damaged item">Damaged item</option>
                  <option value="Incorrect item">Incorrect item</option>
                  <option value="Customer changed mind">
                    Customer changed mind
                  </option>
                  <option value="Item not as expected">
                    Item not as expected
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Notes
                </label>

                <textarea
                  rows={3}
                  value={returnCustomerNotes}
                  onChange={(event) =>
                    setReturnCustomerNotes(event.target.value)
                  }
                  placeholder="Optional notes about the return..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-950">
                    Select items
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Choose the products and quantities included in this return.
                  </p>
                </div>

                <div className="space-y-3">
                  {returnItems.map((item) => (
                    <div
                      key={item.order_item_id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(event) =>
                            updateReturnItem(item.order_item_id, {
                              selected: event.target.checked,
                            })
                          }
                          className="mt-1 size-4 rounded border-slate-300 text-blue-600"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-950">
                            {item.product_name}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                            {item.variant_name && (
                              <span>{item.variant_name}</span>
                            )}

                            {item.sku && <span>{item.sku}</span>}

                            <span>Purchased: {item.purchased_quantity}</span>
                          </div>

                          {item.selected && (
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                  Quantity
                                </label>

                                <input
                                  type="number"
                                  min={1}
                                  max={item.purchased_quantity}
                                  value={item.quantity}
                                  onChange={(event) =>
                                    updateReturnItem(item.order_item_id, {
                                      quantity: Number(event.target.value),
                                    })
                                  }
                                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                  Condition
                                </label>

                                <select
                                  value={item.condition}
                                  onChange={(event) =>
                                    updateReturnItem(item.order_item_id, {
                                      condition: event.target
                                        .value as ReturnCondition,
                                    })
                                  }
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                >
                                  <option value="unopened">Unopened</option>
                                  <option value="good">Good</option>
                                  <option value="damaged">Damaged</option>
                                  <option value="defective">Defective</option>
                                  <option value="incorrect_item">
                                    Incorrect item
                                  </option>
                                  <option value="other">Other</option>
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                  Item notes
                                </label>

                                <input
                                  type="text"
                                  value={item.notes}
                                  onChange={(event) =>
                                    updateReturnItem(item.order_item_id, {
                                      notes: event.target.value,
                                    })
                                  }
                                  placeholder="Optional"
                                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {returnError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {returnError}
                </div>
              )}

              {returnSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {returnSuccess}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  disabled={isSubmittingReturn}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void submitReturnRequest()}
                  disabled={isSubmittingReturn}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingReturn ? "Submitting..." : "Submit return"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
