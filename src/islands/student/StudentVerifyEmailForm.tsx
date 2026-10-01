import { useEffect, useRef, useState } from "react";

import { resendStudentVerification, verifyStudentEmail } from "../../lib/auth";

const CODE_LENGTH = 8;
const RESEND_COOLDOWN = 60;

export default function StudentVerifyEmailForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    // Retrieves the email carried over from the registration flow.
    const params = new URLSearchParams(window.location.search);
    const queryEmail = params.get("email");
    const storedEmail = sessionStorage.getItem(
      "cloudtweak_student_verification_email"
    );

    const verificationEmail = queryEmail || storedEmail || "";

    if (!verificationEmail) {
      window.location.replace("/student/register");
      return;
    }

    setEmail(verificationEmail);
  }, []);

  useEffect(() => {
    // Controls the cooldown timer to prevent repeated verification-email requests.
    if (resendCountdown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  // Updates one OTP digit and moves focus to the next input.
  function handleCodeChange(index: number, value: string) {
    const numericValue = value.replace(/\D/g, "").slice(-1);

    setCode((current) => {
      const updated = [...current];
      updated[index] = numericValue;
      return updated;
    });

    if (numericValue && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  // Handles keyboard navigation between OTP inputs.
  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  // Handles pasting an entire verification code into the OTP inputs.
  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();

    const pastedCode = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);

    if (!pastedCode) return;

    const updated = Array(CODE_LENGTH).fill("");

    pastedCode.split("").forEach((digit, index) => {
      updated[index] = digit;
    });

    setCode(updated);

    const nextIndex = Math.min(pastedCode.length, CODE_LENGTH - 1);

    inputRefs.current[nextIndex]?.focus();
  }

  // Verifies the complete OTP and continues to profile completion.
  async function handleVerify() {
    const token = code.join("");

    setError("");
    setSuccess("");

    if (token.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit verification code.`);
      return;
    }

    setVerifying(true);

    const { error: verificationError } = await verifyStudentEmail(email, token);

    if (verificationError) {
      setError(
        verificationError.message ||
          "The verification code is invalid or has expired."
      );
      setVerifying(false);
      return;
    }

    sessionStorage.removeItem("cloudtweak_student_verification_email");

    window.location.replace("/student/complete-profile");
  }

  // Requests a new verification OTP from Supabase Auth.
  async function handleResend() {
    if (resendCountdown > 0 || resending || !email) return;

    setError("");
    setSuccess("");
    setResending(true);

    const { error: resendError } = await resendStudentVerification(email);

    if (resendError) {
      setError(resendError.message);
      setResending(false);
      return;
    }

    setCode(Array(CODE_LENGTH).fill(""));
    setResendCountdown(RESEND_COOLDOWN);
    setSuccess("A new verification code has been sent.");

    inputRefs.current[0]?.focus();

    setResending(false);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          {success}
        </div>
      )}

      <div className="text-center">
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          We sent an 8-digit verification code to
        </p>

        <p className="mt-1 break-all font-semibold text-slate-900 dark:text-white">
          {email}
        </p>
      </div>

      <div className="flex justify-center gap-2 sm:gap-3">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            onChange={(event) => handleCodeChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            aria-label={`Verification digit ${index + 1}`}
            className="h-12 w-10 rounded-xl border border-slate-300 bg-white text-center text-lg font-bold text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:h-14 sm:w-12 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleVerify}
        disabled={verifying}
        className="w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {verifying ? "Verifying email..." : "Verify email"}
      </button>

      <div className="text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Didn't receive the code?
        </p>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCountdown > 0}
          className="mt-2 text-sm font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resending
            ? "Sending..."
            : resendCountdown > 0
              ? `Resend code in ${resendCountdown}s`
              : "Resend verification code"}
        </button>
      </div>

      <div className="text-center">
        <a
          href="/student/register"
          className="text-sm font-medium text-slate-500 hover:text-primary dark:text-slate-400"
        >
          Use a different email
        </a>
      </div>
    </div>
  );
}
