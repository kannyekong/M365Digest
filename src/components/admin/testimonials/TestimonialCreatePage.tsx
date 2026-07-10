import { useState } from "react";
import toast from "react-hot-toast";

import TestimonialForm from "./TestimonialForm";

import { createTestimonial, type Testimonial } from "../../../lib/testimonials";

export default function TestimonialCreatePage() {
  const [saving, setSaving] = useState(false);

  async function save(values: Partial<Testimonial>) {
    setSaving(true);

    const { error } = await createTestimonial(values);

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Testimonial created successfully.");

    window.location.href = "/admin/testimonials";
  }

  return (
    <TestimonialForm
      loading={saving}
      onSubmit={save}
      onCancel={() => {
        window.location.href = "/admin/testimonials";
      }}
    />
  );
}
