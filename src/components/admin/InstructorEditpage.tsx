import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import InstructorForm from "./InstructorForm";
import type { BootcampInstructor } from "../../lib/bootcamp_instructors";
import { getInstructorById } from "../../lib/bootcamp_instructors";
import { updateInstructor } from "../../lib/bootcamp_instructors";

interface Props {
  instructorId: string;
}

export default function InstructorEditPage({ instructorId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [instructor, setInstructor] = useState<BootcampInstructor | null>(null);

  useEffect(() => {
    loadInstructor();
  }, []);

  async function loadInstructor() {
    const { data, error } = await getInstructorById(instructorId);

    if (error) {
      toast.error(error.message);

      setLoading(false);

      return;
    }

    setInstructor(data);

    setLoading(false);
  }

  async function save(values: Partial<BootcampInstructor>) {
    setSaving(true);

    const { error } = await updateInstructor(instructorId, values);

    setSaving(false);

    if (error) {
      toast.error(error.message);

      return;
    }

    toast.success("Instructor updated.");

    window.location.href = "/admin/bootcamp/instructors";
  }

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        Loading instructor...
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">
        Instructor not found.
      </div>
    );
  }

  return (
    <InstructorForm
      initialValues={instructor}
      loading={saving}
      onSubmit={save}
      onCancel={() => (window.location.href = "/admin/bootcamp/instructors")}
    />
  );
}
