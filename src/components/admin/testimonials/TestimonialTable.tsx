import { Pencil, Trash2 } from "lucide-react";
import type { Testimonial } from "../../../lib/testimonials";

interface Props {
  testimonials: Testimonial[];

  onEdit: (id: string) => void;

  onDelete: (testimonial: Testimonial) => void;
}

export default function TestimonialTable({
  testimonials,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full">
        <thead className="border-b bg-slate-50">
          <tr className="text-left text-sm font-semibold">
            <th className="px-6 py-4">Order</th>

            <th className="px-6 py-4">Client</th>

            <th className="px-6 py-4">Company</th>

            <th className="px-6 py-4">Rating</th>

            <th className="px-6 py-4">Status</th>

            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          {testimonials.map((testimonial) => (
            <tr key={testimonial.id} className="border-b hover:bg-slate-50">
              <td className="px-6 py-4">{testimonial.display_order}</td>

              <td className="px-6 py-4">
                <div className="font-semibold">{testimonial.full_name}</div>

                <div className="text-sm text-slate-500">
                  {testimonial.position}
                </div>
              </td>

              <td className="px-6 py-4">{testimonial.company}</td>

              <td className="px-6 py-4">{"⭐".repeat(testimonial.rating)}</td>

              <td className="px-6 py-4">
                {testimonial.is_active ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-700">
                    Inactive
                  </span>
                )}
              </td>

              <td className="px-6 py-4">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => onEdit(testimonial.id)}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil />
                  </button>

                  <button
                    onClick={() => onDelete(testimonial)}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
