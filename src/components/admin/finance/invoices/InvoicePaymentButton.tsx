import { CreditCard, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import type { Invoice } from "../../../../types/invoice";
import { supabase } from "../../../../lib/superbase";
import { formatInvoiceCurrency } from "../../../../utils/invoice";

interface InvoicePaymentButtonProps {
  invoice: Invoice;

  onInitialized?: () => void;
}

/**
 * Initialize or resume one Paystack Invoice payment.
 */
export default function InvoicePaymentButton({
  invoice,
  onInitialized,
}: InvoicePaymentButtonProps) {
  const [initializing, setInitializing] = useState(false);

  /**
   * Request a Paystack authorization URL and redirect to checkout.
   */
  async function handlePayment() {
    setInitializing(true);

    try {
      // Retrieve the active Supabase session for the authenticated request.
      const { data: sessionResult, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = sessionResult.session?.access_token;

      if (!accessToken) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      // Initialize or resume the outstanding Invoice payment.
      const response = await fetch("/api/paystack/invoices/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.amount_due,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;

        resumed?: boolean;

        message?: string;

        payment?: {
          reference: string;

          authorizationUrl: string;
        };
      };

      if (
        !response.ok ||
        !result.success ||
        !result.payment?.authorizationUrl
      ) {
        throw new Error(
          result.message ?? "The Invoice payment could not be initialized."
        );
      }

      toast.success(
        result.resumed
          ? "Existing Paystack payment resumed."
          : "Paystack payment initialized."
      );

      onInitialized?.();

      // Redirect the customer to the hosted Paystack checkout.
      window.location.assign(result.payment.authorizationUrl);
    } catch (error) {
      console.error("Failed to initialize Invoice payment:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The Invoice payment could not be initialized."
      );
    } finally {
      setInitializing(false);
    }
  }

  // Hide the payment action when the Invoice cannot receive a payment.
  if (
    invoice.amount_due <= 0 ||
    invoice.status === "draft" ||
    invoice.status === "paid" ||
    invoice.status === "cancelled" ||
    invoice.status === "refunded" ||
    invoice.archived_at
  ) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void handlePayment()}
      disabled={initializing}
      title="Pay Invoice with Paystack"
      aria-label="Pay Invoice with Paystack"
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
    >
      {initializing ? (
        <LoaderCircle size={16} className="animate-spin" />
      ) : (
        <CreditCard size={16} />
      )}

      {initializing
        ? "Preparing Paystack..."
        : `Pay ${formatInvoiceCurrency(invoice.amount_due, invoice.currency)}`}
    </button>
  );
}
