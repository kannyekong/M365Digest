import { useState } from "react";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { studentSupabase } from "../../lib/superbase";

export default function StudentForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Requests a password recovery email from Supabase Auth.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter the email address associated with your Academy account.");
      return;
    }

    setLoading(true);
    const redirectTo = new URL("/student/reset-password", window.location.origin).toString();
    const { error: resetError } = await studentSupabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo }
    );
    setLoading(false);

    if (resetError) {
      console.error("Student password reset request failed:", resetError);
      setError("We couldn't send the reset email. Please check the address and try again.");
      return;
    }

    setMessage("If an Academy account exists for that email, a password reset link has been sent. Check your inbox and spam folder.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div> : null}
      {message ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">{message}</div> : null}
      <div>
        <label htmlFor="reset-email" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Email address</label>
        <div className="relative">
          <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required disabled={loading} className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        </div>
      </div>
      <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
        <Send size={17} /> {loading ? "Sending reset link..." : "Send reset link"}
      </button>
      <a href="/student/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary dark:text-slate-400"><ArrowLeft size={16} /> Back to student login</a>
    </form>
  );
}
