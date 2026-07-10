import { useEffect, useState } from "react";
import {
  listInstructors,
  deleteInstructor,
} from "../../lib/bootcamp_instructors";
import type { BootcampInstructor } from "../../lib/bootcamp_instructors";
import { Pencil, Trash2, Plus } from "lucide-react";
import InstructorTable from "./InstructorTable";

export default function InstructorPage() {
  const [loading, setLoading] = useState(true);

  const [instructors, setInstructors] = useState<BootcampInstructor[]>([]);

  async function load() {
    setLoading(true);

    const { data } = await listInstructors();

    setInstructors(data ?? []);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bootcamp Instructors</h1>

          <p className="mt-1 text-slate-500">
            Manage instructors displayed on the Bootcamp page.
          </p>
        </div>

        <a
          href="/admin/bootcamp/instructors/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-white transition hover:opacity-90"
        >
          <Plus size={18} />
          Add Instructor
        </a>
      </div>

      {/* Table */}

      <InstructorTable instructors={instructors} reload={load} />
    </div>
  );
}
