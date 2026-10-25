import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCardCheck,
  Download,
  ExternalLink,
  FileText,
  LoaderCircle,
  RefreshCw,
  Rss,
  WalletCards,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { getSession } from "../../lib/auth";
import SummaryCard from "../../components/student/SummaryCard";

type Payment = {
  id: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  reconciliation_status: string | null;
  provider: string | null;
  payment_method: string | null;
  provider_reference: string | null;
  receipt_number: string | null;
  paid_at: string | null;
  transaction_date: string | null;
  created_at: string;
  program_slug?: string | null;
};

/**
 * Formats a monetary amount using the student's payment currency.
 */
function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency || "NGN",
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats an ISO date into a readable Academy date.
 */
function formatDate(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Creates a printable receipt window from one verified payment.
 */
function downloadReceipt(payment: Payment) {
  const receiptNumber =
    payment.receipt_number || payment.provider_reference || payment.id;
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>CloudTweak Academy Receipt - ${receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #0f172a; }
          .receipt { max-width: 720px; margin: auto; border: 1px solid #e2e8f0; border-radius: 18px; padding: 32px; }
          .brand { font-size: 24px; font-weight: 800; }
          .muted { color: #64748b; }
          .row { display: flex; justify-content: space-between; gap: 24px; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
          .amount { font-size: 26px; font-weight: 800; }
          .status { display: inline-block; margin-top: 20px; padding: 6px 10px; border-radius: 999px; background: #dcfce7; color: #166534; font-weight: 700; }
          @media print { body { padding: 0; } .receipt { border: 0; } }
        </style>
      </head>
      <body>
        <main class="receipt">
          <div class="brand">CloudTweak Academy</div>
          <p class="muted">Official payment receipt</p>
          <div class="row"><span>Receipt</span><strong>${receiptNumber}</strong></div>
          <div class="row"><span>Description</span><strong>${payment.description || "Academy payment"}</strong></div>
          <div class="row"><span>Provider</span><strong>${payment.provider || "Paystack"}</strong></div>
          <div class="row"><span>Reference</span><strong>${payment.provider_reference || "Not available"}</strong></div>
          <div class="row"><span>Paid</span><strong>${formatDate(payment.paid_at)}</strong></div>
          <p class="amount">${formatCurrency(payment.amount, payment.currency)}</p>
          <span class="status">Payment verified</span>
        </main>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `;

  const receiptWindow = window.open("", "_blank", "width=850,height=900");

  if (!receiptWindow) {
    toast.error("Please allow pop-ups to download your receipt.");
    return;
  }

  receiptWindow.document.write(html);
  receiptWindow.document.close();
}

/**
 * Loads and renders the authenticated student's Academy payment history.
 */
export default function StudentPaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const paymentsPerPage = 5;

  const totalPages = Math.ceil(payments.length / paymentsPerPage);
  const paginatedPayments = payments.slice(
    (currentPage - 1) * paymentsPerPage,
    currentPage * paymentsPerPage
  );
  /**
   * Fetches payment records from the authenticated student API.
   */
  async function loadPayments() {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await getSession();

      if (!session) {
        window.location.replace("/student/login");
        return;
      }

      const response = await fetch("/api/student/payments", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Payment history could not be loaded."
        );
      }

      setPayments(result.payments ?? []);
      setCurrentPage(1);
    } catch (error) {
      console.error("Failed to load student payments:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Payment history could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPayments();
  }, []);

  return (
    <>
      <section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Payments"
            value={payments.length}
            valueColor="text-blue-600"
            icon={WalletCards}
            watermarkIcon={WalletCards}
            accentColor="text-blue-600"
            iconBackgroundColor="bg-blue-50 dark:bg-blue-950/40"
            iconColor="text-blue-600 dark:text-blue-400"
          />

          <SummaryCard
            title="Verified Payments"
            value={
              payments.filter((payment) => payment.status === "paid").length
            }
            valueColor="text-green-600"
            icon={CheckCircle2}
            watermarkIcon={CheckCircle2}
            accentColor="text-green-600"
            iconBackgroundColor="bg-green-50 dark:bg-green-950/40"
            iconColor="text-green-600 dark:text-green-400"
          />
          <SummaryCard
            title="Failed Payments"
            value={
              payments.filter((payment) => payment.status === "failed").length
            }
            valueColor="text-red-600"
            icon={AlertTriangle}
            watermarkIcon={AlertTriangle}
            accentColor="text-red-600"
            iconBackgroundColor="bg-red-50 dark:bg-red-950/40"
            iconColor="text-red-600 dark:text-red-400"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="font-semibold text-slate-950 dark:text-white">
                Recent payments
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Verified Academy payments associated with your account.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadPayments()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <LoaderCircle className="animate-spin text-primary" size={28} />
            </div>
          ) : payments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FileText className="mx-auto text-slate-400" size={34} />
              <p className="mt-4 font-semibold text-slate-950 dark:text-white">
                No payments yet
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Your verified Academy payments will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 dark:divide-slate-900">
                {paginatedPayments.map((payment) => (
                  <article
                    key={payment.id}
                    className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-950 dark:text-white">
                        {payment.description || "Academy payment"}
                      </p>

                      <div className="mt-2 flex flex-col gap-x-4 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1 font-extralight">
                          <CalendarDays size={13} className="text-orange-500" />
                          {formatDate(payment.paid_at)}
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <CreditCardCheck
                            size={13}
                            className="text-green-500"
                          />
                          {payment.provider_reference || "—"}
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Rss size={13} className="text-blue-500" />
                          {payment.payment_method ||
                            payment.provider ||
                            "Payment"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-5 lg:justify-end">
                      <div className="text-right">
                        <p className="font-bold text-slate-950 dark:text-white">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>

                        <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {payment.status}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => downloadReceipt(payment)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        <Download size={15} />
                        Receipt
                      </button>

                      <a
                        href={
                          payment.program_slug
                            ? `/student/courses/${payment.program_slug}`
                            : undefined
                        }
                        aria-disabled={!payment.program_slug}
                        onClick={(event) => {
                          if (!payment.program_slug) {
                            event.preventDefault();
                            toast.error(
                              "The course linked to this payment could not be found."
                            );
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                      >
                        <ExternalLink size={15} />
                        Go to Course
                      </a>
                    </div>
                  </article>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {(currentPage - 1) * paymentsPerPage + 1}–
                  {Math.min(currentPage * paymentsPerPage, payments.length)} of{" "}
                  {payments.length} payments
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={currentPage === 1}
                    className="rounded-full border border-slate-200 p-3 text-sm font-medium text-blue-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <span className="whitespace-nowrap px-2 text-sm text-slate-700 dark:text-slate-200">
                    Page {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-full border border-slate-200 p-3 text-sm font-medium text-blue-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </section>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="colored"
      />
    </>
  );
}
