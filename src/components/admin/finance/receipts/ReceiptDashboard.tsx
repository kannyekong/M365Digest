import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { Receipt, ReceiptStatistics } from "../../../../types/receipt";
import { getReceiptStatistics, listReceipts } from "../../../../lib/receipt";
import ReceiptActionPanel from "./ReceiptActionPanel";
import ReceiptDetailsModal from "./ReceiptDetailsModal";

const EMPTY_STATISTICS: ReceiptStatistics = {
  totalAmount: 0,
  currentMonthAmount: 0,
  issuedReceipts: 0,
  refundedReceipts: 0,
  voidedReceipts: 0,
  currency: "NGN",
};

/**
 * Format one Receipt currency value.
 */
function formatReceiptCurrency(amount: number, currency = "NGN") {
  return `${currency.toUpperCase()} ${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/**
 * Format one Receipt date-time.
 */
function formatReceiptDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * Convert underscore-separated values into readable labels.
 */
function formatReceiptLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Render the Receipt management dashboard.
 */
export default function ReceiptDashboard() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [statistics, setStatistics] =
    useState<ReceiptStatistics>(EMPTY_STATISTICS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  /**
   * Load Receipt records and statistics together.
   */
  /**
   * Load paginated Receipt records and statistics together.
   */
  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const [receiptResult, statisticsResult] = await Promise.all([
        listReceipts({
          page,
          pageSize,
          filters: {
            search,
          },
        }),
        getReceiptStatistics(),
      ]);

      setReceipts(receiptResult.receipts);
      setTotal(receiptResult.total);
      setTotalPages(receiptResult.totalPages);
      setStatistics(statisticsResult);
    } catch (error) {
      console.error("Failed to load Receipt dashboard:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Receipt dashboard could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDashboard]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
            Receipts
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            View receipts generated from verified customer payments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-green-800 dark:text-blue-400 bg-green-100`}
          >
            <ReceiptText size={20} />
          </div>
          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
            Total received
          </p>
          <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
            {formatReceiptCurrency(statistics.totalAmount, statistics.currency)}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-yellow-800 dark:text-blue-400 bg-yellow-100`}
          >
            <CalendarDays size={20} />
          </div>
          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
            This month
          </p>
          <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
            {formatReceiptCurrency(
              statistics.currentMonthAmount,
              statistics.currency
            )}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-blue-800 dark:text-blue-400 bg-blue-100`}
          >
            <CheckCircle2 size={20} />
          </div>
          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
            Issued receipts
          </p>
          <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
            {statistics.issuedReceipts}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-red-800 dark:text-blue-400 bg-red-100`}
          >
            <RotateCcw size={20} />
          </div>
          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
            Refunded / voided
          </p>
          <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
            {statistics.refundedReceipts + statistics.voidedReceipts}
          </p>
        </article>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <label className="relative block">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search receipt, invoice, customer or reference"
              className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:text-white"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <LoaderCircle
              size={28}
              className="animate-spin text-blue-600 dark:text-blue-400"
            />
          </div>
        ) : receipts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ReceiptText size={34} className="mx-auto text-slate-400" />
            <p className="mt-4 font-semibold text-slate-950 dark:text-white">
              No receipts found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/70">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-3">Receipt</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Paid</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {receipts.map((receipt) => (
                  <tr
                    key={receipt.id}
                    className="text-sm text-slate-700 dark:text-slate-200"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950 dark:text-white">
                        {receipt.receipt_number}
                      </p>

                      <p className="mt-1 max-w-56 truncate text-xs text-slate-500 dark:text-slate-400">
                        {receipt.payment_reference}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium">{receipt.customer_name}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {receipt.customer_email}
                      </p>
                    </td>

                    <td className="px-5 py-4">{receipt.invoice_number}</td>

                    <td className="px-5 py-4 font-semibold">
                      {formatReceiptCurrency(receipt.amount, receipt.currency)}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {formatReceiptLabel(receipt.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {formatReceiptDate(receipt.paid_at)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        title="View Receipt"
                        aria-label="View Receipt"
                        onClick={() => setSelectedReceipt(receipt)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && receipts.length > 0 && (
          <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, total)} of {total}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pageSize}
                onChange={(event) => {
                  setPage(1);
                  setPageSize(Number(event.target.value));
                }}
                className="rounded-lg border border-slate-200 bg-transparent px-2.5 py-2 text-sm text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>

              <button
                type="button"
                title="Previous Page"
                aria-label="Previous Page"
                disabled={page <= 1}
                onClick={() => setPage((currentPage) => currentPage - 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                title="Next Page"
                aria-label="Next Page"
                disabled={page >= totalPages}
                onClick={() => setPage((currentPage) => currentPage + 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </section>

      <ReceiptDetailsModal
        receipt={selectedReceipt}
        open={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        onViewInvoice={(invoiceId) => {
          window.location.assign(
            `/admin/finance/invoices?invoice=${encodeURIComponent(invoiceId)}`
          );
        }}
        onViewRevenue={(revenueTransactionId) => {
          window.location.assign(
            `/admin/finance/revenue?transaction=${encodeURIComponent(
              revenueTransactionId
            )}`
          );
        }}
      />
    </section>
  );
}
