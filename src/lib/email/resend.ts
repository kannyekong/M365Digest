import { Resend } from "resend";

/* Creates the shared server-side Resend client. */
export function getResendClient() {
  const resendApiKey = import.meta.env.RESEND_API_KEY;

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return new Resend(resendApiKey);
}
