import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import TestimonialForm from "./TestimonialForm";

import {
  getTestimonial,
  updateTestimonial,
  type Testimonial,
} from "../../../lib/testimonials";

interface Props {
  testimonialId: string;
}

export default function TestimonialEditPage({ testimonialId }: Props) {
  const [testimonial, setTestimonial] = useState<Testimonial | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTestimonial();
  }, []);

  async function loadTestimonial() {
    const { data, error } = await getTestimonial(testimonialId);

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setTestimonial(data);

    setLoading(false);
  }

  async function save(values: Partial<Testimonial>) {
    setSaving(true);

    const { error } = await updateTestimonial(testimonialId, values);

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Updated successfully.");

    window.location.href = "/admin/testimonials";
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-10 text-center shadow">
        Loading...
      </div>
    );
  }

  if (!testimonial) {
    return (
      <div className="rounded-xl bg-white p-10 text-center shadow">
        Testimonial not found.
      </div>
    );
  }

  return (
    <TestimonialForm
      initialValues={testimonial}
      loading={saving}
      onSubmit={save}
      onCancel={() => {
        window.location.href = "/admin/testimonials";
      }}
    />
  );
}
