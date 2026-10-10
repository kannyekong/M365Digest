import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { getSession } from "../../lib/auth";
import { supabase } from "../../lib/superbase";
import StudentProfileImage from "./StudentProfileImage";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
  country: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_completed: boolean;
  name_confirmed: boolean;
  created_at: string;
};

/**
 * Formats the account creation date.
 */
function formatDate(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
}

/**
 * Manages the student's profile, password and account security settings.
 */
export default function StudentAccountSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeConfirmation, setCloseConfirmation] = useState("");
  const [closingAccount, setClosingAccount] = useState(false);

  /**
   * Loads the authenticated student's account and profile data.
   */
  async function loadAccount() {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await getSession();

      if (!session) {
        window.location.replace("/student/login");
        return;
      }

      setEmail(session.user.email ?? "");

      const { data, error } = await supabase
        .from("student_profiles")
        .select(
          "id, first_name, last_name, display_name, phone, country, avatar_url, bio, profile_completed, name_confirmed, created_at"
        )
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        window.location.replace("/student/complete-profile");
        return;
      }

      setProfile(data as Profile);
    } catch (error) {
      console.error("Failed to load student account:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Your account settings could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * Saves the editable student profile fields.
   */
  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) return;

    setSavingProfile(true);

    try {
      const { error } = await supabase
        .from("student_profiles")
        .update({
          display_name: profile.display_name?.trim() || null,
          phone: profile.phone?.trim() || null,
          country: profile.country?.trim() || null,
          avatar_url: profile.avatar_url?.trim() || null,
          bio: profile.bio?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Your profile has been updated.");
    } catch (error) {
      console.error("Failed to update student profile:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Your profile could not be updated."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  /**
   * Updates the student's Supabase authentication password.
   */
  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Failed to update student password:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Your password could not be updated."
      );
    } finally {
      setChangingPassword(false);
    }
  }

  /**
   * Permanently closes the authenticated student's account after explicit confirmation.
   */
  async function handleCloseAccount() {
    if (closeConfirmation !== "CLOSE") {
      toast.error('Type "CLOSE" to confirm account deletion.');
      return;
    }

    setClosingAccount(true);

    try {
      const {
        data: { session },
      } = await getSession();

      if (!session) {
        window.location.replace("/student/login");
        return;
      }

      const response = await fetch("/api/student/account/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Your account could not be closed.");
      }

      await supabase.auth.signOut();
      window.location.replace("/");
    } catch (error) {
      console.error("Failed to close student account:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Your account could not be closed."
      );
      setClosingAccount(false);
    }
  }

  useEffect(() => {
    void loadAccount();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <LoaderCircle className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
            <div className="flex items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <StudentProfileImage
                size="lg"
                className="ring-4 ring-primary/10"
              />
            </div>
            <div>
              <h2 className="font-semibold text-slate-950 dark:text-white">
                Personal information
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Keep your Academy profile information up to date.
              </p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="mt-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  First name
                </label>
                <input
                  value={profile.first_name ?? ""}
                  readOnly
                  className="mt-2 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Last name
                </label>
                <input
                  value={profile.last_name ?? ""}
                  readOnly
                  className="mt-2 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
              <BadgeCheck size={16} className="mt-0.5 shrink-0" />
              <span>
                This name is used on your CloudTweak Academy certificate.
              </span>
            </div>

            <div>
              <label
                htmlFor="display-name"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Display name
              </label>
              <input
                id="display-name"
                value={profile.display_name ?? ""}
                onChange={(event) =>
                  setProfile({ ...profile, display_name: event.target.value })
                }
                placeholder="How your name should appear in the portal"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Email address
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <Mail size={17} className="text-slate-400" />
                <span className="truncate text-sm text-slate-600 dark:text-slate-300">
                  {email}
                </span>
                <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <ShieldCheck size={12} /> Verified
                </span>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="phone"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  Phone
                </label>
                <input
                  id="phone"
                  value={profile.phone ?? ""}
                  onChange={(event) =>
                    setProfile({ ...profile, phone: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="country"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  Country
                </label>
                <input
                  id="country"
                  value={profile.country ?? ""}
                  onChange={(event) =>
                    setProfile({ ...profile, country: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="avatar-url"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Profile image URL <span className="italic font-normal">(Paste image link from your desired CDN)</span>
              </label>
              <input
                id="avatar-url"
                value={profile.avatar_url ?? ""}
                onChange={(event) =>
                  setProfile({ ...profile, avatar_url: event.target.value })
                }
                placeholder="https://drive.google.com/file/d/1UC8..."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="bio"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Bio
              </label>
              <textarea
                id="bio"
                rows={5}
                maxLength={500}
                value={profile.bio ?? ""}
                onChange={(event) =>
                  setProfile({ ...profile, bio: event.target.value })
                }
                placeholder="Tell us a little about yourself."
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {savingProfile ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <CheckCircle2 size={17} />
              )}
              {savingProfile ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <KeyRound size={21} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  Password
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Use a strong password you do not reuse elsewhere.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                minLength={8}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                minLength={8}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {changingPassword ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <KeyRound size={17} />
                )}
                Update password
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-500" size={21} />
              <h2 className="font-semibold text-slate-950 dark:text-white">
                Account information
              </h2>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Profile status</span>
                <span className="font-semibold">
                  {profile.profile_completed ? "Complete" : "Incomplete"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">
                  Certificate name confirmed
                </span>
                <span className="font-semibold">
                  {profile.name_confirmed ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Member since</span>
                <span className="font-semibold">
                  {formatDate(profile.created_at)}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-red-200 bg-red-50/60 p-6 dark:border-red-900/50 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                size={21}
              />
              <div>
                <h2 className="font-semibold text-red-800 dark:text-red-300">
                  Close account
                </h2>
                <p className="mt-1 text-sm leading-6 text-red-700/80 dark:text-red-300/80">
                  Permanently delete your Academy account and associated student
                  profile. This action cannot be undone.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCloseModal(true)}
                  className="mt-5 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-950/50"
                >
                  Close account
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showCloseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-account-title"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <AlertTriangle size={23} />
            </div>

            <h2
              id="close-account-title"
              className="mt-5 text-xl font-bold text-slate-950 dark:text-white"
            >
              Close your Academy account?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              This permanently removes your student profile and access to the
              Academy portal. Your payment and financial records may need to be
              retained by CloudTweak for accounting and legal purposes.
            </p>

            <p className="mt-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Type <span className="font-mono">CLOSE</span> to confirm.
            </p>

            <input
              value={closeConfirmation}
              onChange={(event) => setCloseConfirmation(event.target.value)}
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm uppercase outline-none focus:border-red-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCloseModal(false);
                  setCloseConfirmation("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={closingAccount || closeConfirmation !== "CLOSE"}
                onClick={() => void handleCloseAccount()}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {closingAccount && (
                  <LoaderCircle className="animate-spin" size={16} />
                )}
                {closingAccount ? "Closing..." : "Close account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={5000}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="colored"
      />
    </>
  );
}
