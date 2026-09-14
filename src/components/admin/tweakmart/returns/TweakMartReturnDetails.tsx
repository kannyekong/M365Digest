import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RotateCcw,
  XCircle,
} from "lucide-react";

interface ReturnItem {
  id: string;
  quantity: number;
  condition: string | null;
  restock: boolean;
  notes: string | null;

  order_item: {
    id: string;
    product_name: string;
    variant_name: string | null;
    sku: string | null;
    quantity: number;
    unit_price: number;
  } | null;
}

type ReturnCondition =
  "unopened" | "good" | "damaged" | "defective" | "incorrect_item" | "other";

interface InspectionItem {
  return_item_id: string;
  product_name: string;
  quantity: number;
  condition: ReturnCondition;
  restock: boolean;
}

interface ReturnEvent {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  created_at: string;
}

interface ReturnOrder {
  id: string;
  order_number: string;
  order_status: string;
  payment_method: string;
  payment_status: string;
  customer_name: string | null;
  customer_email: string | null;
}

interface ReturnRequest {
  id: string;
  return_number: string;
  status: string;
  reason: string;
  customer_notes: string | null;
  admin_notes: string | null;
  refund_amount: number;
  requested_at: string;
  order: ReturnOrder | null;
  items: ReturnItem[];
  events: ReturnEvent[];
}

interface TweakMartReturnDetailsProps {
  returnRequest: ReturnRequest;
}

type ReturnAction = "approve" | "reject" | "receive" | "inspect" | "refund";

type RefundMethod = "paystack" | "cash" | "transfer" | "pos" | "other";

/* Formats return lifecycle timestamps for the administrator. */
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/* Converts database status values into readable labels. */
function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/* Returns the next administrator actions available for a return status. */
function getAvailableActions(status: string): ReturnAction[] {
  switch (status) {
    case "requested":
      return ["approve", "reject"];

    case "approved":
      return ["receive"];

    case "item_received":
      return ["inspect"];

    case "inspected":
      return ["refund"];

    default:
      return [];
  }
}

/* Returns a readable button label for one return action. */
function getActionLabel(action: ReturnAction, paymentMethod?: string) {
  switch (action) {
    case "approve":
      return "Approve Return";

    case "reject":
      return "Reject Return";

    case "receive":
      return "Mark Item Received";

    case "inspect":
      return "Complete Inspection";

    case "refund":
      return paymentMethod === "paystack"
        ? "Submit Paystack Refund"
        : "Record Refund";
  }
}

export default function TweakMartReturnDetails({
  returnRequest,
}: TweakMartReturnDetailsProps) {
  const [pendingAction, setPendingAction] = useState<ReturnAction | null>(null);

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);

  const [refundAmount, setRefundAmount] = useState("");

  const [refundMethod, setRefundMethod] = useState<RefundMethod>(
    returnRequest.order?.payment_method === "paystack" ? "paystack" : "transfer"
  );

  const [refundReference, setRefundReference] = useState("");

  const availableActions = getAvailableActions(returnRequest.status);

  /* Calculates the maximum refundable value represented by this return. */
  function getMaximumRefundAmount() {
    return returnRequest.items.reduce(
      (total, item) =>
        total + item.quantity * (item.order_item?.unit_price ?? 0),
      0
    );
  }

  /* Opens the selected return action and prepares any action-specific state. */
  function openReturnAction(action: ReturnAction) {
    setPendingAction(action);
    setNotes("");
    setError(null);

    if (action === "inspect") {
      setInspectionItems(
        returnRequest.items.map((item) => ({
          return_item_id: item.id,
          product_name: item.order_item?.product_name ?? "Product",
          quantity: item.quantity,
          condition: (item.condition as ReturnCondition | null) ?? "good",
          restock: false,
        }))
      );
    }

    if (action === "refund") {
      setRefundAmount(String(getMaximumRefundAmount()));

      setRefundMethod(
        returnRequest.order?.payment_method === "paystack"
          ? "paystack"
          : "transfer"
      );

      setRefundReference("");
    }
  }

  /* Sends a return lifecycle action to the administrator API. */
  async function submitReturnAction() {
    if (!pendingAction) {
      return;
    }

    if (
      pendingAction === "refund" &&
      (!Number.isFinite(Number(refundAmount)) || Number(refundAmount) <= 0)
    ) {
      setError("Enter a valid refund amount greater than zero.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/tweakmart/returns/${returnRequest.id}/return-actions`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            action: pendingAction,

            notes: notes.trim() || undefined,

            items:
              pendingAction === "inspect"
                ? inspectionItems.map((item) => ({
                    return_item_id: item.return_item_id,
                    condition: item.condition,
                    restock: item.restock,
                  }))
                : undefined,

            refund_amount:
              pendingAction === "refund" ? Number(refundAmount) : undefined,

            refund_method:
              pendingAction === "refund" ? refundMethod : undefined,

            refund_reference:
              pendingAction === "refund"
                ? refundReference.trim() || undefined
                : undefined,
          }),
        }
      );

      const contentType = response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        const responseText = await response.text();

        console.error(
          "Unexpected return action response:",
          response.status,
          responseText
        );

        throw new Error(
          `Return action endpoint returned ${response.status} instead of JSON.`
        );
      }

      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to update this return.");
      }

      window.location.reload();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to update this return."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <a
        href="/admin/tweakmart/returns"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft className="size-4" />
        Back to returns
      </a>

      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="size-5 text-blue-600" />

            <h1 className="text-xl font-bold text-slate-950">
              {returnRequest.return_number}
            </h1>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Order {returnRequest.order?.order_number ?? "—"}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Requested {formatDate(returnRequest.requested_at)}
          </p>
        </div>

        <span className="inline-flex self-start rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {formatStatus(returnRequest.status)}
        </span>
      </header>

      {availableActions.length > 0 && (
        <section className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {availableActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => openReturnAction(action)}
              className={[
                "inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold transition",

                action === "reject"
                  ? "border border-red-200 bg-white text-red-600 hover:bg-red-50"
                  : "bg-blue-600 text-white hover:bg-blue-700",
              ].join(" ")}
            >
              {getActionLabel(action, returnRequest.order?.payment_method)}
            </button>
          ))}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">
              Return items
            </h2>

            <div className="mt-4 divide-y divide-slate-100">
              {returnRequest.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.order_item?.product_name ?? "Product"}
                    </p>

                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      {item.order_item?.variant_name && (
                        <span>{item.order_item.variant_name}</span>
                      )}

                      {item.order_item?.sku && (
                        <span>{item.order_item.sku}</span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="mt-2 text-xs text-slate-500">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold text-slate-950">
                      Qty {item.quantity}
                    </p>

                    {item.condition && (
                      <p className="mt-1 text-xs capitalize text-slate-500">
                        {formatStatus(item.condition)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">
              Return reason
            </h2>

            <p className="mt-3 text-sm text-slate-700">
              {returnRequest.reason}
            </p>

            {returnRequest.customer_notes && (
              <p className="mt-2 text-sm text-slate-500">
                {returnRequest.customer_notes}
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">Customer</h2>

            <p className="mt-3 text-sm font-medium text-slate-800">
              {returnRequest.order?.customer_name ?? "—"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {returnRequest.order?.customer_email ?? "—"}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">
              Return history
            </h2>

            <div className="mt-4 space-y-4">
              {returnRequest.events.map((event, index) => (
                <div key={event.id} className="flex gap-3">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    {event.to_status === "rejected" ? (
                      <XCircle className="size-3.5 text-red-500" />
                    ) : index === returnRequest.events.length - 1 ? (
                      <CheckCircle2 className="size-3.5 text-blue-600" />
                    ) : (
                      <Clock3 className="size-3.5 text-slate-500" />
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      {event.to_status
                        ? formatStatus(event.to_status)
                        : formatStatus(event.event_type)}
                    </p>

                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {formatDate(event.created_at)}
                    </p>

                    {event.notes && (
                      <p className="mt-1 text-xs text-slate-500">
                        {event.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-950">
              {getActionLabel(
                pendingAction,
                returnRequest.order?.payment_method
              )}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {returnRequest.return_number}
            </p>

            {pendingAction === "inspect" && (
              <div className="mt-5 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Inspect returned items
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Confirm each item's condition and whether it can return to
                    sellable inventory.
                  </p>
                </div>

                {inspectionItems.map((item) => (
                  <div
                    key={item.return_item_id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.product_name}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Qty {item.quantity}
                      </p>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Condition
                        </label>

                        <select
                          value={item.condition}
                          onChange={(event) => {
                            const condition = event.target
                              .value as ReturnCondition;

                            setInspectionItems((current) =>
                              current.map((currentItem) =>
                                currentItem.return_item_id ===
                                item.return_item_id
                                  ? {
                                      ...currentItem,
                                      condition,
                                    }
                                  : currentItem
                              )
                            );
                          }}
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                        >
                          <option value="unopened">Unopened</option>
                          <option value="good">Good</option>
                          <option value="damaged">Damaged</option>
                          <option value="defective">Defective</option>
                          <option value="incorrect_item">Incorrect item</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <label className="flex cursor-pointer items-center gap-3 self-end rounded-lg border border-slate-200 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={item.restock}
                          onChange={(event) => {
                            const restock = event.target.checked;

                            setInspectionItems((current) =>
                              current.map((currentItem) =>
                                currentItem.return_item_id ===
                                item.return_item_id
                                  ? {
                                      ...currentItem,
                                      restock,
                                    }
                                  : currentItem
                              )
                            );
                          }}
                          className="size-4 rounded border-slate-300 text-blue-600"
                        />

                        <span className="text-xs font-semibold text-slate-700">
                          Return to inventory
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingAction === "refund" && (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Refund amount
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={refundAmount}
                    onChange={(event) => setRefundAmount(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Maximum refundable value:{" "}
                    {new Intl.NumberFormat("en-NG", {
                      style: "currency",
                      currency: "NGN",
                    }).format(getMaximumRefundAmount())}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Refund method
                  </label>

                  <select
                    value={refundMethod}
                    disabled={
                      returnRequest.order?.payment_method === "paystack"
                    }
                    onChange={(event) =>
                      setRefundMethod(event.target.value as RefundMethod)
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    {returnRequest.order?.payment_method === "paystack" ? (
                      <option value="paystack">Paystack</option>
                    ) : (
                      <>
                        <option value="transfer">Bank transfer</option>
                        <option value="cash">Cash</option>
                        <option value="pos">POS</option>
                        <option value="other">Other</option>
                      </>
                    )}
                  </select>
                </div>

                {refundMethod !== "paystack" && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Refund reference
                    </label>

                    <input
                      type="text"
                      value={refundReference}
                      onChange={(event) =>
                        setRefundReference(event.target.value)
                      }
                      placeholder="Optional transaction reference"
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Notes
              </label>

              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional administrative notes..."
                className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={submitting}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void submitReturnAction()}
                disabled={submitting}
                className={[
                  "h-10 rounded-xl px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50",

                  pendingAction === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700",
                ].join(" ")}
              >
                {submitting
                  ? "Updating..."
                  : getActionLabel(
                      pendingAction,
                      returnRequest.order?.payment_method
                    )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
