import { LogOut } from "lucide-react";
import { studentSupabase, supabase } from "../lib/superbase";

type LogoutButtonProps = {
  userType: "admin" | "student";
};

export default function LogoutButton({ userType }: LogoutButtonProps) {
  // Signs out only the account type that owns this sidebar, then returns to its login page.
  async function handleLogout() {
    const client = userType === "student" ? studentSupabase : supabase;
    const { error } = await client.auth.signOut();

    if (error) {
      console.error(`Failed to sign out ${userType}:`, error);
      return;
    }

    Object.keys(localStorage)
      .filter((key) => key.startsWith("tip-"))
      .forEach((key) => localStorage.removeItem(key));

    window.location.href =
      userType === "student" ? "/student/login" : "/admin/login";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="ml-4 flex w-3/4 items-center justify-center gap-2 rounded-xl bg-orange-50 px-4 py-2 text-orange-500 transition hover:bg-orange-600 hover:text-white"
    >
      <LogOut size={20} />
      Logout
    </button>
  );
}
