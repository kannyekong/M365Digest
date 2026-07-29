import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { login } from "../lib/auth";

export default function LoginForm() {
  // Store the user's email address.
  const [email, setEmail] = useState("");

  // Store the user's password.
  const [password, setPassword] = useState("");

  // Track whether the password should be visible.
  const [showPassword, setShowPassword] = useState(false);

  // Track whether the login request is currently running.
  const [loading, setLoading] = useState(false);

  // Store the authentication error displayed to the user.
  const [error, setError] = useState("");

  /**
   * Authenticate the user and redirect them to the admin dashboard.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Prevent the browser from submitting and refreshing the page.
    event.preventDefault();

    // Prevent duplicate login requests.
    if (loading) {
      return;
    }

    // Clear any previous authentication error.
    setError("");

    // Start the loading state.
    setLoading(true);

    try {
      // Send the user's login credentials to Supabase.
      const { error: loginError } = await login(
        email.trim().toLowerCase(),
        password
      );

      // Display the authentication error when login fails.
      if (loginError) {
        setError(loginError.message);
        return;
      }

      // Redirect the authenticated user to the admin dashboard.
      window.location.href = "/admin";
    } catch (loginError) {
      // Log unexpected authentication errors for debugging.
      console.error("Unexpected login error:", loginError);

      // Display a safe fallback error message.
      setError("Unable to sign in right now. Please try again.");
    } finally {
      // End the loading state after the request completes.
      setLoading(false);
    }
  }

  /**
   * Update the email value and remove an existing error message.
   */
  function handleEmailChange(event: React.ChangeEvent<HTMLInputElement>) {
    // Store the latest email value.
    setEmail(event.target.value);

    // Remove the existing error while the user corrects their details.
    if (error) {
      setError("");
    }
  }

  /**
   * Update the password value and remove an existing error message.
   */
  function handlePasswordChange(event: React.ChangeEvent<HTMLInputElement>) {
    // Store the latest password value.
    setPassword(event.target.value);

    // Remove the existing error while the user corrects their details.
    if (error) {
      setError("");
    }
  }

  /**
   * Switch the password field between visible and hidden states.
   */
  function handlePasswordVisibility() {
    // Reverse the current password visibility state.
    setShowPassword((currentVisibility) => !currentVisibility);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-slate-950 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20 xl:py-14">
          <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="absolute -right-32 bottom-10 h-[420px] w-[420px] rounded-full bg-purple-500/20 blur-3xl" />

          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-500/10 blur-3xl" />

          <div className="relative z-10">
            <a href="/" className="inline-flex items-center gap-3">
              <img
                src="/logos/cloudtweakwhite.png"
                alt="CloudTweak"
                className="h-15 w-auto object-contain"
              />
            </a>
          </div>

          <div className="relative z-10 max-w-xl">
            <h1 className="text-3xl font-semibold leading-[1.08] tracking-tight xl:text-5xl">
              Manage your digital operations from one powerful workspace.
            </h1>

            <p className="mt-7 max-w-lg text-lg leading-8 text-slate-300">
              Access the CloudTweak CMS to manage content, staff, tasks,
              registrations, careers, notifications, and business operations.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <CheckCircle2 size={18} className="shrink-0 text-sky-400" />
                Real-time notifications
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-200">
                <CheckCircle2 size={18} className="shrink-0 text-sky-400" />
                Staff and task management
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-200">
                <CheckCircle2 size={18} className="shrink-0 text-sky-400" />
                Careers and recruitment
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-200">
                <CheckCircle2 size={18} className="shrink-0 text-sky-400" />
                Secure cloud infrastructure
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-sm text-slate-400">
            <p>© {new Date().getFullYear()} CloudTweak Technologies Limited.</p>

            <p>Built for secure operations</p>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-blue-100/70 blur-3xl lg:hidden" />

          <div className="relative z-10 w-full max-w-md">
            <div className="mb-10 flex justify-center lg:hidden">
              <a href="/" className="inline-flex items-center">
                <img
                  src="/images/cloudtweak-logo.png"
                  alt="CloudTweak"
                  className="h-10 w-auto object-contain"
                />
              </a>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.2)] sm:p-10">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                  CloudTweak CMS
                </p>

                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  Welcome back
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Enter your administrator credentials to access the dashboard.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      autoComplete="email"
                      placeholder="admin@cloudtweak.com"
                      required
                      disabled={loading}
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Password
                    </label>

                    <a
                      href="/forgot-password"
                      className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
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
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={handlePasswordChange}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />

                    <button
                      type="button"
                      onClick={handlePasswordVisibility}
                      disabled={loading}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error ? (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                  >
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in to dashboard
                      <ArrowRight
                        size={17}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              This portal is restricted to authorised CloudTweak administrators.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
