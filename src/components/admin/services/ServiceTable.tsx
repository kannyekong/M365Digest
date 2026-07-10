import { Pencil, Star, Trash2 } from "lucide-react";
import type { Service } from "../../../lib/services";

interface Props {
  services: Service[];

  onEdit: (id: string) => void;

  onDelete: (service: Service) => void;
}

export default function ServiceTable({ services, onEdit, onDelete }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full">
        <thead className="border-b bg-slate-50">
          <tr className="text-left text-sm font-semibold text-slate-600">
            <th className="px-6 py-4">Order</th>

            <th className="px-6 py-4">Title</th>

            <th className="px-6 py-4">Badge</th>

            <th className="px-6 py-4">Featured</th>

            <th className="px-6 py-4">Status</th>

            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          {services.map((service) => (
            <tr
              key={service.id}
              className="border-b last:border-none hover:bg-slate-50"
            >
              <td className="px-6 py-4">{service.display_order}</td>

              <td className="px-6 py-4">
                <div className="font-semibold">{service.title}</div>

                <div className="mt-1 text-sm text-slate-500 line-clamp-2">
                  {service.description}
                </div>
              </td>

              <td className="px-6 py-4">{service.badge || "-"}</td>

              <td className="px-6 py-4">
                {service.highlight ? (
                  <span className="text-xs font-medium text-yellow-500 p-4">
                    <Star />
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    —
                  </span>
                )}
              </td>

              <td className="px-6 py-4">
                {service.is_active ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    Inactive
                  </span>
                )}
              </td>

              <td className="px-6 py-4">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => onEdit(service.id)}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil />
                  </button>

                  <button
                    onClick={() => onDelete(service)}
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
