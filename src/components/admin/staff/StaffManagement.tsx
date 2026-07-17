import { useEffect, useState } from "react";
import { listStaff } from "../../../lib/staff";
import StaffTable from "./StaffTable";

export default function StaffManagement() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const data = await listStaff();

    setStaff(data ?? []);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        Loading staff...
      </div>
    );
  }

  return <StaffTable staff={staff} setStaff={setStaff} />;
}
