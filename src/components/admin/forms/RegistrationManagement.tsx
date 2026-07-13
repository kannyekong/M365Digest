import { useEffect, useState } from "react";
import { listRegistrations } from "../../../lib/registrations";
import RegistrationTable from "./RegistrationTable";

export default function RegistrationManagement() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const data = await listRegistrations();

    setRegistrations(data);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        Loading registrations...
      </div>
    );
  }

  return <RegistrationTable registrations={registrations} reload={load} />;
}
