import { useEffect, useState } from "react";

import { getSession } from "../../lib/auth";
import { supabase } from "../../lib/superbase";

interface StudentProfileImageProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showInitials?: boolean;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-15 w-15 text-lg",
};

/**
 * Loads and displays the authenticated student's profile image.
 * Falls back to the student's initials when no profile image exists.
 */
export default function StudentProfileImage({
  size = "md",
  className = "",
  showInitials = true,
}: StudentProfileImageProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("ST");

  useEffect(() => {
    // Loads the authenticated student's profile information.
    async function loadStudentProfile() {
      const {
        data: { session },
      } = await getSession();

      if (!session) return;

      const { data, error } = await supabase
        .from("student_profiles")
        .select("first_name, last_name, avatar_url")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load student profile image:", error);
        return;
      }

      if (!data) return;

      setAvatarUrl(data.avatar_url);

      const firstInitial = data.first_name?.trim().charAt(0) ?? "";
      const lastInitial = data.last_name?.trim().charAt(0) ?? "";

      setInitials(`${firstInitial}${lastInitial}`.toUpperCase() || "ST");
    }

    loadStudentProfile();
  }, []);

  const sizeClass = sizeClasses[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="Student profile"
        className={`rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }

  if (!showInitials) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-primary font-semibold text-white ${sizeClass} ${className}`}
        aria-label="Student profile"
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-primary font-semibold text-white ${sizeClass} ${className}`}
      aria-label={`Student profile: ${initials}`}
    >
      {initials}
    </div>
  );
}
