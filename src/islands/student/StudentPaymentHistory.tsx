import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { getSession } from "../../lib/auth";

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
  const receiptNumber = payment.receipt_number || payment.provider_reference || payment.id;
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

  /**
   * Fetches payment records from the authenticated student API.
   */
  async function loadPayments() {
    setLoading(true);

    try {
      const { data: { session } } = await getSession();

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
        throw new Error(result.message || "Payment history could not be loaded.");
      }

      setPayments(result.payments ?? []);
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
          <article className="rounded-2xl bg-blue-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <WalletCards className="text-primary" size={21} />
            <p className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">{payments.length}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Payments</p>
          </article>

          <article className="rounded-2xl bg-green-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CheckCircle2 className="text-emerald-500" size={21} />
            <p className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">
              {payments.filter((payment) => payment.status === "paid").length}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Verified</p>
          </article>

          <article className="rounded-2xl bg-red-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <AlertTriangle className="text-red-500" size={21} />
            <p className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">
              {payments.filter((payment) => Boolean(payment.receipt_number)).length}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Failed</p>
          </article>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="font-semibold text-slate-950 dark:text-white">Recent payments</h2>
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
              <p className="mt-4 font-semibold text-slate-950 dark:text-white">No payments yet</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Your verified Academy payments will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-900">
              {payments.map((payment) => (
                <article key={payment.id} className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950 dark:text-white">
                      {payment.description || "Academy payment"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {formatDate(payment.paid_at)}</span>
                      <span>Reference: {payment.provider_reference || "—"}</span>
                      <span>{payment.payment_method || payment.provider || "Payment"}</span>
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
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <ToastContainer position="top-right" autoClose={5000} newestOnTop closeOnClick pauseOnHover theme="colored" />
    </>
  );
}
