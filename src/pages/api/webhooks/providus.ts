import type { APIRoute } from "astro";

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

/* Receives real-time Providus account transaction notifications. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const payload =
      (await request.json()) as Partial<ProvidusAccountNotification>;

    /*
     * Validate the minimum fields required to uniquely identify and
     * understand a Providus transaction notification.
     */
    if (
      !payload.accountNumber ||
      !payload.reference ||
      !payload.dateTime ||
      typeof payload.amount !== "number" ||
      !payload.transactionType
    ) {
      console.error("Invalid Providus account notification payload.", {
        reference: payload.reference ?? null,
      });

      return new Response(
        JSON.stringify({
          status: "Failed",
          message: "Invalid transaction notification.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Providus currently documents credit and debit transaction types.
     * Reject unexpected values rather than interpreting them financially.
     */
    const transactionType = payload.transactionType.toLowerCase();

    if (transactionType !== "cr" && transactionType !== "dr") {
      return new Response(
        JSON.stringify({
          status: "Failed",
          message: "Invalid transaction type.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * For this first connectivity endpoint we only acknowledge a valid
     * notification. Persistence and reconciliation will be added before
     * Providus notifications are allowed to mutate financial records.
     */
    console.info("Providus account notification received.", {
      reference: payload.reference,
      accountNumber: payload.accountNumber,
      transactionType,
      amount: payload.amount,
    });

    return successfulResponse();
  } catch (error) {
    console.error("Unable to process Providus account notification:", error);

    return new Response(
      JSON.stringify({
        status: "Failed",
        message: "Unable to process transaction notification.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
