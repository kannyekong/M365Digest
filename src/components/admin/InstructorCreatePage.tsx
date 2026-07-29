import { useState } from "react";
import toast from "react-hot-toast";
import type { BootcampInstructor } from "../../lib/academy_instructors";
import InstructorForm from "./InstructorForm";
import { createInstructor } from "../../lib/academy_instructors";

export default function InstructorCreatePage() {
  const [saving, setSaving] = useState(false);

  async function save(values: Partial<BootcampInstructor>) {
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
