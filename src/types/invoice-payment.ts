export type InvoicePaymentAttemptStatus =
  | "initialized"
  | "pending"
  | "successful"
  | "failed"
  | "cancelled"
  | "expired";

export interface InvoicePaymentAttempt {
  id: string;
  invoice_id: string;
  reference: string;
  amount: number;
  currency: string;
  customer_email: string;
  status: InvoicePaymentAttemptStatus;
  authorization_url: string | null;
  access_code: string | null;
  paystack_transaction_id: number | null;
  channel: string | null;
  gateway_response: string | null;
  paid_at: string | null;
  metadata: unknown;
  raw_response: unknown;
  created_at: string;
  updated_at: string;
}
