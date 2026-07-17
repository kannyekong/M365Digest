import { useEffect, useRef, useState } from "react";
import { Camera, KeyRound, LogOut, ChevronDown } from "lucide-react";
import { logout } from "../lib/auth";
import { getCurrentUser } from "../lib/profile";

interface Props {
  image?: string;
}

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [cacheKey, setCacheKey] = useState(Date.now());
  const avatar = user?.user_metadata?.avatar_url;
  const initials = user?.email?.substring(0, 2).toUpperCase() ?? "A";
  const menuRef = useRef<HTMLDivElement>(null);

  //GETS CURRENT USER FROM SUPABASE
  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const { data } = await getCurrentUser();

    setUser(data.user);
    setCacheKey(Date.now());
  }
  //

  //REDIRECTS TO LOGIN PAGE AND DESTRUCTS SESSIONS
  async function LogoutButton() {
    await logout();
    window.location.href = "/admin/login";
  }
  //

  // HANDLES CLOSING OF THE POPUP//
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);
  //END OF HANDLING CLOSE OF POPUP//

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-xl hover:bg-slate-100 px-2 py-1 transition"
      >
        {avatar ? (
          <img
            src={`${avatar}?v=${cacheKey}`}
            className="h-10 w-10 rounded-full border object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-4xl font-bold text-white">
            {initials}
          </div>
        )}

        <ChevronDown
          size={18}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`absolute right-0 mt-3 w-64 rounded-2xl border bg-white shadow-2xl transition-all duration-200 origin-top-right z-50

        ${
          open
            ? "opacity-100 scale-100 visible"
            : "opacity-0 scale-95 invisible"
        }`}
      >
        <div className="p-2">
          <a
            href="/admin/profile/profile"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-100 transition"
          >
            <Camera size={18} />
            Update Profile Photo
          </a>

          <a
            href="/admin/profile/profile"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-100 transition"
          >
            <KeyRound size={18} />
            Change Password
          </a>

          <div className="my-2 border-t" />

          <button
            onClick={LogoutButton}
            className="flex w-full items-center bg-red-100 gap-3 rounded-xl px-4 py-3 text-red-600 hover:bg-red-500 hover:text-white transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
