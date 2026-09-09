import type { APIRoute } from "astro";

import { createSupabaseAdminClient } from "../../../lib/supabase/server";

export const prerender = false;

interface ProvidusAccountNotification {
  accountNumber: string;
  reference: string;
  narration: string;
  dateTime: string;
  amount: number;
  transactionType: string;
  accountBalance: number;
}

interface ProvidusStoredTransaction {
  id: string;
  reference: string;
}

/* Returns the exact successful acknowledgement expected by Providus. */
function successfulResponse() {
  return new Response(
    JSON.stringify({
      status: "Successful",
      message: "Transaction created successfully.",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

/* Returns a failed Providus-compatible acknowledgement. */
function failedResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({
      status: "Failed",
      message,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

/* Confirms that the Providus webhook endpoint is deployed and reachable. */
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      success: true,
      message: "Providus webhook endpoint is active.",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};

/* Receives and persists real-time Providus account transaction notifications. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const payload =
      (await request.json()) as Partial<ProvidusAccountNotification>;

    /**
     * Validate the minimum fields required to uniquely identify and
     * understand a Providus transaction notification.
     */
    if (
      !payload.accountNumber ||
      !payload.reference ||
      !payload.dateTime ||
      typeof payload.amount !== "number" ||
      !Number.isFinite(payload.amount) ||
      payload.amount < 0 ||
      !payload.transactionType
    ) {
      console.error("Invalid Providus account notification payload.", {
        reference: payload.reference ?? null,
      });

      return failedResponse("Invalid transaction notification.", 400);
    }

    /**
     * Providus currently documents credit and debit transaction types.
     * Reject unexpected values rather than interpreting them financially.
     */
    const transactionType = payload.transactionType.toLowerCase();

    if (transactionType !== "cr" && transactionType !== "dr") {
      return failedResponse("Invalid transaction type.", 400);
    }

    const supabase = createSupabaseAdminClient();

    /**
     * Check whether this Providus reference has already been received.
     * Providus may redeliver a notification if an acknowledgement is lost.
     */
    const { data: existingTransaction, error: lookupError } = await supabase
      .from("providus_transactions")
      .select("id, reference")
      .eq("reference", payload.reference)
      .maybeSingle<ProvidusStoredTransaction>();

    if (lookupError) {
      console.error(
        "Unable to check existing Providus transaction:",
        lookupError
      );

      return failedResponse("Unable to process transaction notification.", 500);
    }

    /**
     * A previously persisted reference is treated as an idempotent replay.
     * Return success so Providus does not continue retrying the notification.
     */
    if (existingTransaction) {
      console.info("Duplicate Providus notification acknowledged.", {
        reference: payload.reference,
      });

      return successfulResponse();
    }

    /**
     * Store the original provider notification before any reconciliation.
     * This table acts as the immutable inbound banking notification inbox.
     */
    const { error: insertError } = await supabase
      .from("providus_transactions")
      .insert({
        reference: payload.reference,
        account_number: payload.accountNumber,
        narration: payload.narration ?? null,
        transaction_datetime: payload.dateTime,
        amount: payload.amount,
        transaction_type: transactionType,
        account_balance:
          typeof payload.accountBalance === "number"
            ? payload.accountBalance
            : null,
        raw_payload: payload,
        processing_status: "received",
        reconciliation_status: "unreconciled",
      });

    if (insertError) {
      /**
       * PostgreSQL error 23505 means the unique reference already exists.
       * This also protects against two identical webhook requests racing
       * between the lookup and insert operations.
       */
      if (insertError.code === "23505") {
        console.info(
          "Concurrent duplicate Providus notification acknowledged.",
          {
            reference: payload.reference,
          }
        );

        return successfulResponse();
      }

      console.error("Unable to persist Providus transaction:", insertError);

      return failedResponse("Unable to process transaction notification.", 500);
    }

    /**
     * Log only the operational fields needed to confirm webhook delivery.
     * Full banking details remain in the protected database record.
     */
    console.info("Providus account notification persisted.", {
      reference: payload.reference,
      transactionType,
      amount: payload.amount,
    });

    return successfulResponse();
  } catch (error) {
    console.error("Unable to process Providus account notification:", error);

    return failedResponse("Unable to process transaction notification.", 500);
  }
};
