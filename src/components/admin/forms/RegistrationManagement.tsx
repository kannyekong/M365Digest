import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/superbase";
import RegistrationTable from "./RegistrationTable";

interface Registration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  country: string | null;
  availability: string | null;
  payment_status: string | null;
  created_at: string;
}

// Manage the loading and retrieval of bootcamp registrations.
export default function RegistrationManagement() {
  // Store registration records retrieved from Supabase.
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  // Track whether registration records are currently being loaded.
  const [loading, setLoading] = useState(true);

  // Store any error returned while loading registrations.
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch bootcamp registrations from Supabase.
  const load = useCallback(async () => {
    // Display the loading state while the request is running.
    setLoading(true);

    // Clear any previous error message.
    setErrorMessage("");

    // Retrieve all bootcamp registration records.
    const { data, error } = await supabase
      .from("bootcamp_registrations")
      .select("*")
      .order("created_at", { ascending: false });

    // Handle errors returned by Supabase.
    if (error) {
      console.error("Failed to load bootcamp registrations:", error);

      // Store a user-friendly error message.
      setErrorMessage(error.message);

      // Clear any stale registration records.
      setRegistrations([]);

      // Stop the loading state.
      setLoading(false);

      return;
    }

    // Store the registration records returned by Supabase.
    setRegistrations((data ?? []) as Registration[]);

    // Stop the loading state after the request succeeds.
    setLoading(false);
  }, []);

  // Load registration records when the component first mounts.
  useEffect(() => {
    void load();
  }, [load]);

  // Display a loading state while registrations are being retrieved.
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          Loading bootcamp registrations...
        </p>
      </div>
    );
  }

  // Display an error state when the Supabase request fails.
  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
        <h2 className="font-semibold text-red-800">
          Unable to load registrations
        </h2>

        <p className="mt-2 text-sm text-red-700">{errorMessage}</p>

        <button
          type="button"
          onClick={() => void load()}
          className="mt-5 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Pass the fetched records and reload function to the registration table.
  return <RegistrationTable registrations={registrations} reload={load} />;
}
