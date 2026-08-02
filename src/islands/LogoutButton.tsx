import { LogOut } from "lucide-react";
import { logout } from "../lib/auth";

export default function LogoutButton() {
  async function handleLogout() {
    await logout();
    Object.keys(localStorage)
      .filter((key) => key.startsWith("tip-"))
      .forEach((key) => localStorage.removeItem(key));
    window.location.href = "/admin/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="flex w-3/4 items-center gap-2 border border-red-500 rounded-xl px-4 ml-4 py-2 hover:bg-red-600 transition hover:text-white"
    >
      <LogOut size={20} />
      Logout
    </button>
  );
}
