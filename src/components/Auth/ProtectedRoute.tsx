import { useEffect } from "react";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      window.location.href = "/admin/login";
    }
  }, [loading, session]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!session) return null;

  return <>{children}</>;
}
