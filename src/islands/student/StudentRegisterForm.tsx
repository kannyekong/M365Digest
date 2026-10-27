import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { registerStudent } from "../../lib/auth";

export default function StudentRegisterForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handles student registration and redirects the student to email verification.
  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { data, error: registrationError } = await registerStudent(
      email.trim(),
      password,
      firstName.trim(),
      lastName.trim()
    );

    if (registrationError) {
      setError(registrationError.message);
      setLoading(false);
      return;
    }

    // Check whether Supabase indicates that this email is already registered.
    if (data.user && data.user.identities?.length === 0) {
      setError(
        "This email address is already registered. Please sign in instead."
      );
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("We could not create your account. Please try again.");
      setLoading(false);
      return;
    }

    // Preserve the intended course destination across email verification.
    const params = new URLSearchParams(window.location.search);
    const requestedReturnTo = params.get("returnTo");

    // Only accept a checkout destination for a course with a simple slug.
    const returnTo =
      requestedReturnTo &&
      /^\/student\/courses\/[a-zA-Z0-9-]+\/checkout$/.test(requestedReturnTo)
        ? requestedReturnTo
        : null;

    // Keep the verification email available to the verification page.
    sessionStorage.setItem(
      "cloudtweak_student_verification_email",
      email.trim()
    );

    // Preserve the destination in session storage as a fallback during onboarding.
    if (returnTo) {
      sessionStorage.setItem("cloudtweak_student_return_to", returnTo);
    } else {
      sessionStorage.removeItem("cloudtweak_student_return_to");
    }

    // Carry the destination into email verification.
    const verificationParams = new URLSearchParams({
      email: email.trim(),
    });

    if (returnTo) {
      verificationParams.set("returnTo", returnTo);
    }

    window.location.replace(
      `/student/verify-email?${verificationParams.toString()}`
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <input
            id="firstName"
            name="firstName"
            placeholder="First name"
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoComplete="given-name"
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div>
          <input
            id="lastName"
            name="lastName"
            placeholder="Last name"
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            autoComplete="family-name"
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      <div className="relative">
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <button
          type="button"
          onClick={() => setShowPassword((visible) => !visible)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>

      <div className="relative">
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword((visible) => !visible)}
          aria-label={
            showConfirmPassword
              ? "Hide confirmation password"
              : "Show confirmation password"
          }
          className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating account..." : "Create student account"}
      </button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <a
          href="/student/login"
          className="font-semibold text-primary hover:underline"
        >
          Sign in
        </a>
      </p>
    </form>
  );
}
