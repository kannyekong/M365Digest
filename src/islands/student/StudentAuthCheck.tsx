import { useEffect, useState } from "react";

import { getSession } from "../../lib/auth";
import { studentSupabase } from "../../lib/superbase";

export default function StudentAuthCheck() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Verifies the authenticated Supabase session and the student's Academy profile.
    async function checkStudentAccess() {
      console.info("[StudentAuthTrace][AuthCheck] check started", { path: window.location.pathname, timestamp: new Date().toISOString() });
      const sessionResult = await getSession();
      const session = sessionResult.data?.session ?? null;
      console.info("[StudentAuthTrace][AuthCheck] session result", { hasSession: Boolean(session), userId: session?.user?.id ?? null, sessionError: sessionResult.error?.message ?? null });

      if (!session) {
        console.warn("[StudentAuthTrace][AuthCheck] redirect to /student/login: no session");
        window.location.replace("/student/login");
        return;
      }

      console.info("[StudentAuthTrace][AuthCheck] querying profile", { userId: session.user.id });
      const { data: profile, error } = await studentSupabase
        .from("student_profiles")
        .select("id, profile_completed")
        .eq("user_id", session.user.id)
        .maybeSingle();

      console.info("[StudentAuthTrace][AuthCheck] profile result", { found: Boolean(profile), profileId: profile?.id ?? null, profileCompleted: profile?.profile_completed ?? null, profileError: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null });
      if (error) {
        console.error("[StudentAuthTrace][AuthCheck] profile query failed; signing out and redirecting to login", error);
        await studentSupabase.auth.signOut();
        window.location.replace("/student/login?error=profile-check-failed");
        return;
      }

      if (!profile) {
        console.warn("[StudentAuthTrace][AuthCheck] profile missing; signing out and redirecting to login", { userId: session.user.id });
        await studentSupabase.auth.signOut();
        window.location.replace("/student/login?error=profile-missing");
        return;
      }

      if (!profile.profile_completed) {
        console.info("[StudentAuthTrace][AuthCheck] redirect to /student/complete-profile", { userId: session.user.id, profileId: profile.id, profileCompleted: profile.profile_completed });
        window.location.replace("/student/complete-profile");
        return;
      }

      console.info("[StudentAuthTrace][AuthCheck] access granted; hiding auth check", { userId: session.user.id, profileId: profile.id });
      setChecking(false);
    }

    checkStudentAccess().catch((error) => {
      console.error("[StudentAuthTrace][AuthCheck] unhandled access-check error", error);
      window.location.replace("/student/login?error=profile-check-failed");
    });
  }, []);

  if (!checking) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="text-center">
        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-slate-500">Loading your Academy account...</p>
      </div>
    </div>
  );
}
