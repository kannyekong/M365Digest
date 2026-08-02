import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../types/supabase";
import { initializePaystackPayment } from "../../../../lib/paystack-server";

export const prerender = false;

interface InitializeInvoicePaymentBody {
  invoiceId?: string;
  amount?: number;
}

/**
 * Generate one unique Paystack reference for an Invoice payment.
 */
function generateInvoicePaymentReference(invoiceNumber: string) {
  const normalizedInvoiceNumber = invoiceNumber
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();

  const randomValue = crypto.randomUUID().split("-")[0].toUpperCase();

  return `INV-PAY-${normalizedInvoiceNumber}-${randomValue}`;
}

/**
 * Initialize or resume one Paystack Invoice payment.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const authorizationHeader = request.headers.get("authorization");

    if (!authorizationHeader?.startsWith("Bearer ")) {
      return Response.json(
        {
          success: false,
          message: "Authentication is required.",
        },
        {
          status: 401,
        }
      );
    }

    const body = (await request.json()) as InitializeInvoicePaymentBody;

    if (!body.invoiceId) {
      return Response.json(
        {
          success: false,
          message: "Invoice ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const supabaseUrl = import.meta.env.SUPABASE_URL;

    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error("Invoice payment environment variables are incomplete.");
    }

    // Use the requesting user's access token to enforce Invoice RLS.
    const userSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: authorizationHeader,
        },
      },
    });

    // Use the service role only for server-controlled payment attempts.
    const adminSupabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: invoice, error: invoiceError } = await userSupabase
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        customer_email,
        currency,
        amount_due,
        status,
        archived_at
        `
      )
      .eq("id", body.invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw invoiceError ?? new Error("Invoice not found.");
    }

    if (invoice.archived_at) {
      throw new Error("Restore the Invoice before creating a payment.");
    }

    if (
      invoice.status === "draft" ||
      invoice.status === "cancelled" ||
      invoice.status === "refunded" ||
      invoice.status === "paid"
    ) {
      throw new Error("This Invoice cannot receive a payment.");
    }

    const requestedAmount = Number(body.amount ?? invoice.amount_due);

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    if (requestedAmount > Number(invoice.amount_due)) {
      throw new Error("Payment amount cannot exceed the outstanding balance.");
    }

    // Reuse a recent pending attempt for the same Invoice and amount.
    const reusableThreshold = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: reusableAttempt, error: reusableError } = await adminSupabase
      .from("invoice_payment_attempts")
      .select("*")
      .eq("invoice_id", invoice.id)
      .eq("amount", requestedAmount)
      .eq("currency", invoice.currency)
      .in("status", ["initialized", "pending"])
      .gte("created_at", reusableThreshold)
      .not("authorization_url", "is", null)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (reusableError) {
      throw reusableError;
    }

    if (reusableAttempt?.authorization_url) {
      return Response.json({
        success: true,
        resumed: true,
        payment: {
          attemptId: reusableAttempt.id,
          reference: reusableAttempt.reference,
          authorizationUrl: reusableAttempt.authorization_url,
        },
      });
    }

    const reference = generateInvoicePaymentReference(invoice.invoice_number);

    const { data: paymentAttempt, error: paymentAttemptError } =
      await adminSupabase
        .from("invoice_payment_attempts")
        .insert({
          invoice_id: invoice.id,
          reference,
          amount: requestedAmount,
          currency: invoice.currency,
          customer_email: invoice.customer_email,
          status: "initialized",
          metadata: {
            payment_type: "invoice",
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
          },
        })
        .select()
        .single();

    if (paymentAttemptError || !paymentAttempt) {
      throw (
        paymentAttemptError ??
        new Error("The Invoice payment attempt could not be created.")
      );
    }

    const siteUrl =
      import.meta.env.PUBLIC_SITE_URL ?? new URL(request.url).origin;

    const paystackResult = await initializePaystackPayment({
      email: invoice.customer_email,
      amount: requestedAmount,
      currency: invoice.currency,
      reference,
      callbackUrl:
        `${siteUrl}/payments/invoice/callback` +
        `?reference=${encodeURIComponent(reference)}`,
      metadata: {
        payment_type: "invoice",
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        payment_attempt_id: paymentAttempt.id,
      },
    });

    const authorizationUrl = paystackResult.data?.authorization_url;

    const accessCode = paystackResult.data?.access_code;

    if (!authorizationUrl || !accessCode) {
      throw new Error("Paystack did not return a checkout URL.");
    }

    const { error: updateError } = await adminSupabase
      .from("invoice_payment_attempts")
      .update({
        status: "pending",
        authorization_url: authorizationUrl,
        access_code: accessCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentAttempt.id);

    if (updateError) {
      throw updateError;
    }

    return Response.json({
      success: true,
      resumed: false,
      payment: {
        attemptId: paymentAttempt.id,
        reference,
        authorizationUrl,
      },
    });
  } catch (error) {
    console.error("Failed to initialize Invoice payment:", error);

    return Response.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "The Invoice payment could not be initialized.",
      },
      {
        status: 400,
      }
    );
  }
};
