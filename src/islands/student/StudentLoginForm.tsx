import { useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, ArrowRight } from "lucide-react";

import { getSession, login } from "../../lib/auth";
import { studentSupabase } from "../../lib/superbase";

export default function StudentLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Redirects already-authenticated students away from the login page.
  useEffect(() => {
    // Shows a confirmation after the password has been reset successfully.
    const params = new URLSearchParams(window.location.search);
    if (params.get("passwordReset") === "success") {
      setSuccessMessage("Your password has been updated. Please sign in with your new password.");
    }
    if (params.get("error") === "profile-missing") {
      setErrorMessage("We could not find a student profile linked to this account. Please check that you signed in with your student email or contact support.");
    }
    if (params.get("error") === "profile-check-failed") {
      setErrorMessage("We could not verify your student profile. Please sign in again or contact support if the issue continues.");
    }

    async function checkExistingSession() {
      const {
        data: { session },
      } = await getSession();

      if (session) {
        const { data: profile, error } = await studentSupabase
          .from("student_profiles")
          .select("id, profile_completed")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!error && profile) {
          window.location.replace(
            profile.profile_completed
              ? "/student/dashboard"
              : "/student/complete-profile"
          );
          return;
        }

        await studentSupabase.auth.signOut();
        setErrorMessage(
          error
            ? "We could not verify your student profile. Please sign in again."
            : "We could not find a student profile linked to this account. Please check your student email or contact support."
        );
      }

      setCheckingSession(false);
    }

    checkExistingSession();
  }, []);

  // Handles student email/password authentication through Supabase Auth.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage("Please enter your email address and password.");
      return;
    }

    setLoading(true);

    const { error } = await login(normalizedEmail, password);

    if (error) {
      console.error("Student login failed:", error);

      if (
        error.message.toLowerCase().includes("email not confirmed") ||
        error.message.toLowerCase().includes("email_not_confirmed")
      ) {
        setErrorMessage(
          "Your email address has not been verified. Please verify your email before signing in."
        );
      } else {
        setErrorMessage(
          "The email address or password you entered is incorrect."
        );
      }

      setLoading(false);
      return;
    }

    // Sends the student to the correct next step instead of routing every login through the dashboard.
    const {
      data: { session },
      error: sessionError,
    } = await getSession();

    if (sessionError || !session) {
      setErrorMessage("You signed in, but we could not verify your session. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await studentSupabase
      .from("student_profiles")
      .select("id, profile_completed")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Student profile lookup after login failed:", profileError);
      await studentSupabase.auth.signOut();
      setErrorMessage(
        profileError
          ? "We could not verify your student profile. Please try again or contact support."
          : "We could not find a student profile linked to this account. Please contact support."
      );
      setLoading(false);
      return;
    }

    window.location.replace(
      profile.profile_completed
        ? "/student/dashboard"
        : "/student/complete-profile"
    );
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500 dark:border-slate-700 dark:border-t-orange-400" />

          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Checking your Academy account...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {successMessage && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          {errorMessage}
        </div>
      )}

      <div>
        <label
          htmlFor="student-email"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Email address
        </label>

        <div className="relative">
          <Mail
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            id="student-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={loading}
            className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="student-password"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Password
          </label>

          <a
            href="/student/forgot-password"
            className="text-xs font-semibold text-primary transition hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300"
          >
            Forgot password?
          </a>
        </div>

        <div className="relative">
          <LockKeyhole
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            id="student-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={loading}
            className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
          />

          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            disabled={loading}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Signing in...
          </>
        ) : (
          <>
            Sign in to Academy
            <ArrowRight
              size={17}
              className="transition-transform group-hover:translate-x-1"
            />
          </>
        )}
      </button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Don't have an Academy account?{" "}
        <a
          href="/student/register"
          className="font-semibold text-primary transition hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300"
        >
          Create one
        </a>
      </p>
    </form>
  );
}
