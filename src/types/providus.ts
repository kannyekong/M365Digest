/* Represents the processing state of an inbound Providus notification. */
export type ProvidusProcessingStatus =
  "received" | "processing" | "processed" | "failed" | "ignored";

/* Represents the reconciliation state of a Providus transaction. */
export type ProvidusReconciliationStatus =
  "unreconciled" | "matched" | "reconciled" | "manual_review";

/* Represents a persisted Providus transaction displayed in Finance. */
export interface ProvidusTransaction {
  id: string;
  reference: string;
  account_number: string;
  narration: string | null;
  transaction_datetime: string;
  amount: number;
  transaction_type: "cr" | "dr";
  account_balance: number | null;

  processing_status: ProvidusProcessingStatus;
  reconciliation_status: ProvidusReconciliationStatus;

  processing_notes: string | null;

  matched_client_id: string | null;
  matched_source_table: string | null;
  matched_source_id: string | null;
  matched_invoice_number: string | null;

  financial_transaction_id: string | null;

  received_at: string;
  processed_at: string | null;
  reconciled_at: string | null;
  created_at: string;
  updated_at: string;
}

/* Represents the summary counts displayed above the reconciliation table. */
export interface ProvidusTransactionSummary {
  total: number;
  unreconciled: number;
  manualReview: number;
  reconciled: number;
  credits: number;
  debits: number;
}
/* Represents a CloudTweak client available for Providus reconciliation. */
export interface ProvidusReconciliationClient {
  id: string;
  client_code: string;
  client_type: "individual" | "organisation";
  display_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
}

/* Represents an invoice available for Providus reconciliation. */
export interface ProvidusReconciliationInvoice {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_company: string | null;
  customer_email: string;
  currency: string;
  status: string;
  project_id: string | null;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  issue_date: string;
  due_date: string;
}

/* Represents the possible comparison between a bank credit and an invoice balance. */
export type ProvidusPaymentMatchType = "exact" | "partial" | "excess";
