const PAYSTACK_BASE_URL = "https://api.paystack.co";

interface InitializePaystackPaymentInput {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}

interface InitializePaystackPaymentResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

/**
 * Return the server-only Paystack secret key.
 */
function getPaystackSecretKey() {
  const secretKey = import.meta.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  }

  return secretKey;
}

/**
 * Initialize one Paystack transaction from the server.
 */
export async function initializePaystackPayment(
  input: InitializePaystackPaymentInput
) {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: String(Math.round(input.amount * 100)),
      currency: input.currency.toUpperCase(),
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });

  const result = (await response.json()) as InitializePaystackPaymentResponse;

  if (!response.ok || !result.status || !result.data) {
    throw new Error(
      result.message || "Paystack payment initialization failed."
    );
  }

  return result;
}
