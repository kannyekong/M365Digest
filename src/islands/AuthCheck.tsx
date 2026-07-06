import { useEffect, useState } from "react";
import { getSession } from "../lib/auth";

///
export default function AuthCheck() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await getSession();

      if (!session) {
        window.location.replace("/admin/login");
        return;
      }

      setChecking(false);
    }

    check();
  }, []);

  if (!checking) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="text-center">
        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-slate-500">Authenticating...</p>
      </div>
    </div>
  );
}
