import { createSupabaseAdminClient } from "../../supabase/server";

interface ProvidusTransaction {
  id: string;
  reference: string;
  account_number: string;
  narration: string | null;
  transaction_datetime: string;
  amount: number;
  transaction_type: "cr" | "dr";
  processing_status:
    "received" | "processing" | "processed" | "failed" | "ignored";
  reconciliation_status:
    "unreconciled" | "matched" | "reconciled" | "manual_review";
  financial_transaction_id: string | null;
}

interface ProcessProvidusTransactionResult {
  success: boolean;
  transactionId: string;
  action: "manual_review" | "ignored" | "already_processed" | "failed";
  message: string;
}

/* Processes one persisted Providus transaction without automatically settling a client obligation. */
export async function processProvidusTransaction(
  transactionId: string
): Promise<ProcessProvidusTransactionResult> {
  const supabase = createSupabaseAdminClient();

  const { data: transaction, error: transactionError } = await supabase
    .from("providus_transactions")
    .select(
      `
          id,
          reference,
          account_number,
          narration,
          transaction_datetime,
          amount,
          transaction_type,
          processing_status,
          reconciliation_status,
          financial_transaction_id
        `
    )
    .eq("id", transactionId)
    .maybeSingle();

  if (transactionError) {
    console.error(
      "Unable to load Providus transaction for processing:",
      transactionError
    );

    return {
      success: false,
      transactionId,
      action: "failed",
      message: "Unable to load the Providus transaction.",
    };
  }

  if (!transaction) {
    return {
      success: false,
      transactionId,
      action: "failed",
      message: "Providus transaction was not found.",
    };
  }

  const providusTransaction = transaction as ProvidusTransaction;

  /*
   * Prevents a transaction that has already crossed into Finance
   * from being processed again.
   */
  if (providusTransaction.financial_transaction_id) {
    return {
      success: true,
      transactionId,
      action: "already_processed",
      message: "Providus transaction already has a financial transaction.",
    };
  }

  /*
   * A successfully processed transaction should not be automatically
   * processed again.
   */
  if (providusTransaction.processing_status === "processed") {
    return {
      success: true,
      transactionId,
      action: "already_processed",
      message: "Providus transaction has already been processed.",
    };
  }

  /*
   * Debit notifications represent money leaving the Providus account.
   * They are not client receivable payments, so the client-payment
   * processor deliberately ignores them for now.
   */
  if (providusTransaction.transaction_type === "dr") {
    const { error: ignoredError } = await supabase
      .from("providus_transactions")
      .update({
        processing_status: "ignored",
        processing_notes:
          "Providus debit notification is outside the client receivables reconciliation workflow.",
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", providusTransaction.id);

    if (ignoredError) {
      console.error("Unable to mark Providus debit as ignored:", ignoredError);

      return {
        success: false,
        transactionId,
        action: "failed",
        message: "Unable to update the Providus transaction.",
      };
    }

    return {
      success: true,
      transactionId,
      action: "ignored",
      message:
        "Providus debit was excluded from client receivable reconciliation.",
    };
  }

  /*
   * Credits are genuine incoming bank notifications, but receipt alone
   * does not prove which client, project, contract, or invoice they belong to.
   *
   * Until we have an explicit match, the transaction is sent to manual
   * review rather than being recorded as reconciled revenue.
   */
  const { error: reviewError } = await supabase
    .from("providus_transactions")
    .update({
      processing_status: "processed",
      reconciliation_status: "manual_review",
      processing_notes:
        "Incoming Providus credit requires client/project/contract reconciliation before entering the financial ledger.",
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", providusTransaction.id);

  if (reviewError) {
    console.error(
      "Unable to route Providus credit for reconciliation:",
      reviewError
    );

    return {
      success: false,
      transactionId,
      action: "failed",
      message: "Unable to route the Providus transaction for reconciliation.",
    };
  }

  return {
    success: true,
    transactionId,
    action: "manual_review",
    message: "Providus credit is ready for client/project reconciliation.",
  };
}
