import { supabase } from "./superbase";
import type { InvoicePaymentAttempt } from "../types/invoice-payment";

/**
 * Retrieve all payment attempts belonging to one Invoice.
 */
export async function getInvoicePaymentAttempts(
  invoiceId: string
): Promise<InvoicePaymentAttempt[]> {
  const { data, error } = await supabase
    .from("invoice_payment_attempts")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as InvoicePaymentAttempt[];
}
