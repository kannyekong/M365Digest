import { Pencil, Trash2, User, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { deleteCoverImage } from "../../lib/storage";
import type {
  AcademyInstructor,
  AcademyProgramInstructor,
  AcademyInstructorWithProgramCount,
} from "../../types/academy";
import { useState } from "react";

import {
  deleteInstructor,
  listInstructorsWithProgramCount,
} from "../../lib/academy_instructors";

import { getAcademyInstructorProgramAssignments } from "../../lib/academy_program_instructors";

async function handleDelete(instructor: AcademyInstructor) {
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

  listInstructorsWithProgramCount();
}

interface Props {
  instructors: AcademyInstructorWithProgramCount[];
  reload: () => void;
}

/* Stores the instructor currently being viewed in the details modal. */

export default function InstructorTable({ instructors }: Props) {
  const [selectedInstructor, setSelectedInstructor] =
    useState<AcademyInstructorWithProgramCount | null>(null);
  const [instructorPrograms, setInstructorPrograms] = useState<
    AcademyProgramInstructor[]
  >([]);

  const [loadingInstructorPrograms, setLoadingInstructorPrograms] =
    useState(false);

  /* Opens the instructor details modal and loads the instructor's assigned programs. */
  async function handleViewInstructor(
    instructor: AcademyInstructorWithProgramCount
  ) {
    setSelectedInstructor(instructor);
    setLoadingInstructorPrograms(true);

    try {
      const assignments = await getAcademyInstructorProgramAssignments(
        instructor.id
      );

      setInstructorPrograms(assignments);
    } catch (error) {
      console.error("Failed to load instructor programs:", error);

      setInstructorPrograms([]);
    } finally {
      setLoadingInstructorPrograms(false);
    }
  }

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
        <thead className="bg-slate-50">
          <tr className="text-left text-sm font-semibold text-slate-700">
            <th className="px-6 py-4">Instructor</th>
            <th className="px-6 py-4">Title</th>
            <th className="px-6 py-4">Skills</th>
            <th className="px-6 py-4">Assigned Programs</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {instructors.map((instructor) => (
            <tr
              key={instructor.id}
              className="border-b border-slate-100 last:border-none transition hover:bg-slate-50"
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

              <td className="px-6 py-4">
                <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {instructor.assigned_program_count}
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
                  <button
                    type="button"
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-green-50 hover:text-green-600"
                    onClick={() => {
                      void handleViewInstructor(instructor);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
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
      {selectedInstructor ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="instructor-details-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  Instructor Details
                </p>

                <h2
                  id="instructor-details-title"
                  className="mt-2 text-2xl font-bold text-slate-950"
                >
                  {selectedInstructor.full_name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedInstructor.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedInstructor(null);
                  setInstructorPrograms([]);
                }}
                className="rounded-xl px-3 py-1 text-slate-500 transition hover:bg-red-400 hover:text-white"
                aria-label="Close instructor details"
              >
                ×
              </button>
            </header>

            <div className="space-y-6 p-6">
              <div className="flex flex-col gap-5 sm:flex-row">
                {selectedInstructor.image_url ? (
                  <img
                    src={selectedInstructor.image_url}
                    alt={selectedInstructor.full_name}
                    className="h-28 w-28 shrink-0 rounded-3xl object-cover"
                  />
                ) : null}

                <div>
                  <h3 className="font-semibold text-slate-950">Profile</h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {selectedInstructor.bio ||
                      "No biography has been provided."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedInstructor.skills?.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 rounded-2xl border border-slate-200 p-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Email
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedInstructor.email || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Phone
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedInstructor.phone || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedInstructor.is_active ? "Active" : "Inactive"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Assigned Programs
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedInstructor.assigned_program_count}
                  </p>
                </div>
              </div>

              <section>
                <h3 className="font-semibold text-slate-950">
                  Academy Programs
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Programs currently assigned to this instructor.
                </p>

                {loadingInstructorPrograms ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 p-5 text-sm text-slate-500">
                    Loading assigned programs...
                  </div>
                ) : instructorPrograms.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {instructorPrograms.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {assignment.program?.title ?? "Unknown program"}
                          </p>

                          <p className="mt-1 text-xs capitalize text-slate-500">
                            {assignment.program?.status ?? "Unknown status"}
                          </p>
                        </div>

                        {assignment.is_lead ? (
                          <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            Lead Instructor
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            Instructor
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    This instructor is not currently assigned to an Academy
                    program.
                  </div>
                )}
              </section>
            </div>

            <footer className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <a
                href={`/admin/bootcamp/instructors/${selectedInstructor.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Edit Instructor
              </a>

              <button
                type="button"
                onClick={() => {
                  setSelectedInstructor(null);
                  setInstructorPrograms([]);
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
