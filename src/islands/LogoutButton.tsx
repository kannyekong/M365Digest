import { LogOut } from "lucide-react";
import { logout } from "../lib/auth";

export default function LogoutButton() {
  async function handleLogout() {
    await logout();

    window.location.href = "/admin/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-4 rounded-xl px-4 py-3 hover:bg-red-600 transition"
    >
      <LogOut size={20} />
      Logout
    </button>
  );
}
