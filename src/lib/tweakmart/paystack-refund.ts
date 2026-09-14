interface PaystackRefundResponse {
  status: boolean;
  message: string;

  data?: {
    id?: number;
    amount?: number;
    currency?: string;
    status?: string;

    transaction?: {
      id?: number;
      reference?: string;
    };
  };
}

interface CreatePaystackRefundInput {
  transactionReference: string;
  amount: number;
  customerNote?: string | null;
  merchantNote?: string | null;
}

/* Initiates a full or partial refund through Paystack. */
export async function createPaystackRefund(input: CreatePaystackRefundInput) {
  const secretKey = import.meta.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  }

  /*
   * Paystack expects NGN amounts in kobo.
   */
  const amountInKobo = Math.round(input.amount * 100);

  if (!Number.isInteger(amountInKobo) || amountInKobo <= 0) {
    throw new Error("Refund amount must be greater than zero.");
  }

  const response = await fetch("https://api.paystack.co/refund", {
    method: "POST",

    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      transaction: input.transactionReference,
      amount: amountInKobo,
      currency: "NGN",

      customer_note: input.customerNote?.trim() || undefined,

      merchant_note: input.merchantNote?.trim() || undefined,
    }),
  });

  const result = (await response.json()) as PaystackRefundResponse;

  if (!response.ok || !result.status) {
    throw new Error(
      result.message || "Paystack could not initiate this refund."
    );
  }

  if (!result.data) {
    throw new Error(
      "Paystack initiated the refund without returning refund details."
    );
  }

  return result.data;
}
