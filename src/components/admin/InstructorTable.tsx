import type { BootcampInstructor } from "../../lib/academy_instructors";
import { Pencil, Trash2, User } from "lucide-react";
import toast from "react-hot-toast";
import { deleteCoverImage } from "../../lib/storage";

import {
  deleteInstructor,
  listInstructors,
} from "../../lib/academy_instructors";

async function handleDelete(instructor: BootcampInstructor) {
  const confirmed = window.confirm(
    `Are you sure you want to permanently delete "${instructor.full_name}"?\n\nThis action cannot be undone.`
  );

  if (!confirmed) return;

  // Delete image first (if one exists)
  if (instructor.image_url) {
    await deleteCoverImage(instructor.image_url, "bootcamp-instructors");
  }

  const { error } = await deleteInstructor(instructor.id);

  if (error) {
    toast.error(error.message);
    return;
  }

  toast.success("Instructor deleted.");

  listInstructors();
}

interface Props {
  instructors: BootcampInstructor[];
  reload: () => void;
}

export default function InstructorTable({ instructors }: Props) {
  if (!instructors.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <User className="h-8 w-8 text-slate-500" />
        </div>

        <h3 className="mt-5 text-lg font-semibold text-slate-800">
          No instructors yet
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Add your first instructor to display them on the Bootcamp page.
        </p>

        <a
          href="/admin/bootcamp/instructors/new"
          className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2 text-white transition hover:opacity-90"
        >
          Add Instructor
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full">
        <thead className="border-b bg-slate-50">
          <tr className="text-left text-sm font-semibold text-slate-700">
            <th className="px-6 py-4">Instructor</th>
            <th className="px-6 py-4">Title</th>
            <th className="px-6 py-4">Skills</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          {instructors.map((instructor) => (
            <tr
              key={instructor.id}
              className="border-b last:border-none transition hover:bg-slate-50"
            >
              {/* Instructor */}
              <td className="px-6 py-5">
                <div className="flex items-center gap-4">
                  {instructor.image_url ? (
                    <img
                      src={instructor.image_url}
                      alt={instructor.full_name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                      {instructor.full_name
                        .split(" ")
                        .map((x) => x[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                  )}

                  <div>
                    <p className="font-semibold text-slate-900">
                      {instructor.full_name}
                    </p>

                    <p className="text-sm text-slate-500">
                      {instructor.email || "No email"}
                    </p>
                  </div>
                </div>
              </td>

              {/* Title */}
              <td className="px-6 py-5">
                <span className="text-sm text-slate-700">
                  {instructor.title}
                </span>
              </td>

              {/* Skills */}
              <td className="px-6 py-5">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {instructor.skills?.length ?? 0}
                </span>
              </td>

              {/* Status */}
              <td className="px-6 py-5">
                {instructor.is_active ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    Inactive
                  </span>
                )}
              </td>

              {/* Actions */}
              <td className="px-6 py-5">
                <div className="flex justify-end gap-2">
                  <a
                    href={`/admin/bootcamp/instructors/${instructor.id}`}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </a>
                  <button
                    onClick={() => handleDelete(instructor)}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={18} />
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
