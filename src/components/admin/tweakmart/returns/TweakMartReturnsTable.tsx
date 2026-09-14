import { ArrowRight, RotateCcw } from "lucide-react";

interface ReturnOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
}

interface ReturnRecord {
  id: string;
  return_number: string;
  order_id: string;
  status: string;
  reason: string;
  refund_amount: number;
  created_at: string;
  order: ReturnOrder | null;
}

interface TweakMartReturnsTableProps {
  returns: ReturnRecord[];
}

/* Formats currency values for the return-management table. */
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(value);
}

/* Formats return timestamps for administrative display. */
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/* Returns the visual badge style for one return status. */
function getStatusClass(status: string) {
  switch (status) {
    case "requested":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "approved":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "item_received":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "inspected":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";

    case "refunded":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

/* Converts database return statuses into human-readable labels. */
function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function TweakMartReturnsTable({
  returns,
}: TweakMartReturnsTableProps) {
  return (
    <div className="space-y-6 mt-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Returns & Refunds
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Review product returns and customer refund requests.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total returns
          </p>

          <p className="mt-1 text-xl font-bold text-slate-950">
            {returns.length}
          </p>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {returns.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
              <RotateCcw className="size-5 text-slate-500" />
            </div>

            <h2 className="mt-4 font-semibold text-slate-950">
              No return requests yet
            </h2>

            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Delivered orders with return requests will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Return
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Order
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reason
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Refund
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {returns.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-950">
                        {item.return_number}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(item.created_at)}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-slate-700">
                        {item.order?.order_number ?? "—"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-slate-700">
                        {item.order?.customer_name ?? "—"}
                      </p>

                      {item.order?.customer_email && (
                        <p className="mt-1 text-xs text-slate-500">
                          {item.order.customer_email}
                        </p>
                      )}
                    </td>

                    <td className="max-w-xs px-4 py-4">
                      <p className="truncate text-sm text-slate-700">
                        {item.reason}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-slate-800">
                        {formatCurrency(item.refund_amount)}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {formatStatus(item.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <a
                          href={`/admin/tweakmart/returns/${item.return_number}`}
                          className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                          title="View return"
                        >
                          <ArrowRight className="size-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
