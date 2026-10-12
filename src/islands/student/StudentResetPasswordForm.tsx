import { useEffect, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { studentSupabase } from "../../lib/superbase";

export default function StudentResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Waits for Supabase to exchange the recovery link for a student session.
  useEffect(() => {
    let active = true;
    async function verifyRecoverySession() {
      const { data, error: sessionError } = await studentSupabase.auth.getSession();
      if (!active) return;
      if (sessionError || !data.session) {
        setError("This password reset link is invalid or has expired. Request a new link to continue.");
      } else {
        setReady(true);
      }
      setLoading(false);
    }
    void verifyRecoverySession();
    return () => { active = false; };
  }, []);

  // Updates the password for the account authorized by the recovery link.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await studentSupabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      console.error("Student password update failed:", updateError);
      setError("We couldn't update your password. Please request a new reset link and try again.");
      return;
    }
    await studentSupabase.auth.signOut();
    window.location.replace("/student/login?passwordReset=success");
  }

  if (loading) return <div className="py-8 text-center text-sm text-slate-500">Verifying your password reset link...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div> : null}
      {!ready ? <div className="space-y-4"><a href="/student/forgot-password" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80">Request a new reset link <ArrowRight size={16} /></a><a href="/student/login" className="block text-sm text-slate-500 hover:text-primary">Return to login</a></div> : (
        <>
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">New password</label>
            <div className="relative"><LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required disabled={saving} className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Use at least 8 characters.</p>
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Confirm new password</label>
            <input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required disabled={saving} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          </div>
          <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Updating password..." : "Update password"} <ArrowRight size={17} /></button>
        </>
      )}
    </form>
  );
}
