import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import TestimonialTable from "./TestimonialTable";

import {
  listTestimonials,
  deleteTestimonial,
  type Testimonial,
} from "../../../lib/testimonials";

export default function TestimonialListPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTestimonials();
  }, []);

  async function loadTestimonials() {
    const { data, error } = await listTestimonials();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setTestimonials(data ?? []);
    setLoading(false);
  }

  async function handleDelete(testimonial: Testimonial) {
    const confirmed = window.confirm(`Delete "${testimonial.full_name}"?`);

    if (!confirmed) return;

    const { error } = await deleteTestimonial(testimonial.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Testimonial deleted.");

    loadTestimonials();
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-10 text-center shadow">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Testimonials</h1>

          <p className="mt-2 text-slate-500">Manage client testimonials.</p>
        </div>

        <a
          href="/admin/testimonials/new"
          className="inline-flex rounded-xl bg-primary px-5 py-3 text-white"
        >
          + Add Testimonial
        </a>
      </div>

      <TestimonialTable
        testimonials={testimonials}
        onEdit={(id) => {
          window.location.href = `/admin/testimonials/${id}`;
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
