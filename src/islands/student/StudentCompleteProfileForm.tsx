import { useEffect, useState } from "react";
import { getSession } from "../../lib/auth";
import { supabase } from "../../lib/superbase";

export default function StudentCompleteProfileForm() {
  const [profileId, setProfileId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [nameConfirmed, setNameConfirmed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Loads the authenticated student's existing profile information.
    async function loadProfile() {
      const {
        data: { session },
      } = await getSession();

      if (!session) {
        window.location.replace("/student/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("student_profiles")
        .select(
          "id, first_name, last_name, phone, country, bio, name_confirmed, profile_completed"
        )
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Failed to load student profile:", profileError);
        setError("We could not load your profile. Please try again.");
        setLoading(false);
        return;
      }

      if (!profile) {
        setError(
          "Your student profile could not be found. Please contact support."
        );
        setLoading(false);
        return;
      }

      if (profile.profile_completed) {
        window.location.replace("/student/dashboard");
        return;
      }

      setProfileId(profile.id);
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
      setPhone(profile.phone ?? "");
      setCountry(profile.country ?? "");
      setBio(profile.bio ?? "");
      setNameConfirmed(profile.name_confirmed ?? false);

      setLoading(false);
    }

    loadProfile();
  }, []);

  // Saves the student's completed profile and enables LMS access.
  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setError("Please provide your first and last name.");
      return;
    }

    if (!nameConfirmed) {
      setError(
        "Please confirm that this is the name you want to use on your certificate."
      );
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase
      .from("student_profiles")
      .update({
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        display_name: `${trimmedFirstName} ${trimmedLastName}`.trim(),
        phone: phone.trim() || null,
        country: country.trim() || null,
        bio: bio.trim() || null,
        name_confirmed: true,
        profile_completed: true,
      })
      .eq("id", profileId);

    if (updateError) {
      console.error("Failed to complete student profile:", updateError);
      setError(
        updateError.message ||
          "We could not save your profile. Please try again."
      );
      setSaving(false);
      return;
    }

    window.location.replace("/student/dashboard");
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="firstName"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            First name
          </label>

          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoComplete="given-name"
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Last name
          </label>

          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            autoComplete="family-name"
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="phone"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Phone number
          <span className="ml-1 font-normal text-slate-400">(optional)</span>
        </label>

        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          autoComplete="tel"
          placeholder="+234 800 000 0000"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor="country"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Country
          <span className="ml-1 font-normal text-slate-400">(optional)</span>
        </label>

        <input
          id="country"
          type="text"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          autoComplete="country-name"
          placeholder="Nigeria"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor="bio"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          About you
          <span className="ml-1 font-normal text-slate-400">(optional)</span>
        </label>

        <textarea
          id="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={4}
          placeholder="Tell us a little about yourself and your learning goals."
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
        <input
          type="checkbox"
          checked={nameConfirmed}
          onChange={(event) => setNameConfirmed(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />

        <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          I confirm that my first and last name are correct and that I want this
          name to appear on my CloudTweak Academy certificate.
        </span>
      </label>

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving your profile..." : "Complete profile"}
      </button>
    </form>
  );
}
