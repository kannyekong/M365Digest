import { useState } from "react";
import toast from "react-hot-toast";
import type { AcademyInstructor } from "../../types/academy";
import InstructorForm from "./InstructorForm";
import { createInstructor } from "../../lib/academy_instructors";

export default function InstructorCreatePage() {
  const [saving, setSaving] = useState(false);

  async function save(values: Partial<AcademyInstructor>) {
    setSaving(true);

    const { error } = await createInstructor(values);

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Instructor created successfully.");

    window.location.href = "/admin/bootcamp/instructors";
  }

  return (
    <InstructorForm
      loading={saving}
      onSubmit={save}
      onCancel={() => {
        window.location.href = "/admin/bootcamp/instructors";
      }}
    />
  );
}
