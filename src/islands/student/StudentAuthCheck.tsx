import { useEffect, useState } from "react";

import { getSession } from "../../lib/auth";
import { supabase } from "../../lib/superbase";

export default function StudentAuthCheck() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Verifies the authenticated Supabase session and the student's Academy profile.
    async function checkStudentAccess() {
      const {
        data: { session },
      } = await getSession();

      if (!session) {
        window.location.replace("/student/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("student_profiles")
        .select("id, profile_completed")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load student profile:", error);
        window.location.replace("/student/login");
        return;
      }

      if (!profile) {
        window.location.replace("/student/complete-profile");
        return;
      }

      if (!profile.profile_completed) {
        window.location.replace("/student/complete-profile");
        return;
      }

      setChecking(false);
    }

    checkStudentAccess();
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
