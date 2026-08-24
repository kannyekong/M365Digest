import { useEffect, useState } from "react";
import { listInstructorsWithProgramCount } from "../../lib/academy_instructors";
import type { AcademyInstructorWithProgramCount } from "../../types/academy";
import { Plus } from "lucide-react";
import InstructorTable from "./InstructorTable";
import AcademyModuleNav from "./academy/AcademyModuleNav";

export default function InstructorPage() {
  const [loading, setLoading] = useState(true);

  const [instructors, setInstructors] = useState<
    AcademyInstructorWithProgramCount[]
  >([]);

  /* Loads instructors together with the number of Academy programs assigned to each instructor. */
  async function load() {
    setLoading(true);

    try {
      const data = await listInstructorsWithProgramCount();

      setInstructors(data);
    } catch (error) {
      console.error("Failed to load instructors:", error);

      setInstructors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6 p-5">
      {/* Header */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Manage Academy Instructors</h1>

          <p className="mt-1 text-slate-500 text-xs">
            Manage instructors displayed on the academy page.
          </p>
        </div>

        <a
          href="/admin/bootcamp/instructors/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-3 text-white transition hover:opacity-90"
        >
          <Plus size={18} />
          Add Instructor
        </a>
      </div>

      <AcademyModuleNav current="Instructors" />

      {/* Table */}

      <InstructorTable instructors={instructors} reload={load} />
    </div>
  );
}
