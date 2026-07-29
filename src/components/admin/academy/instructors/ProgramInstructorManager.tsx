import {
  ArrowLeft,
  Crown,
  GraduationCap,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getAcademyProgramById } from "../../../../lib/academy";
import {
  assignAcademyProgramInstructor,
  getAcademyProgramInstructors,
  getAvailableAcademyInstructors,
  removeAcademyProgramInstructor,
  setLeadAcademyProgramInstructor,
  updateAcademyProgramInstructor,
} from "../../../../lib/academy_program_instructors";

import type {
  AcademyInstructor,
  AcademyProgram,
  AcademyProgramInstructor,
} from "../../../../types/academy";

interface ProgramInstructorManagerProps {
  programId: string;
}

/**
 * Display and manage the instructors assigned to one Academy program.
 */
export default function ProgramInstructorManager({
  programId,
}: ProgramInstructorManagerProps) {
  // Store the Academy program being managed.
  const [program, setProgram] = useState<AcademyProgram | null>(null);

  // Store every active instructor available for assignment.
  const [availableInstructors, setAvailableInstructors] = useState<
    AcademyInstructor[]
  >([]);

  // Store instructors currently assigned to this program.
  const [assignments, setAssignments] = useState<AcademyProgramInstructor[]>(
    []
  );

  // Store the instructor selected in the assignment form.
  const [selectedInstructorId, setSelectedInstructorId] = useState("");

  // Store whether the new assignment should become the lead.
  const [assignAsLead, setAssignAsLead] = useState(false);

  // Store the display order for the new assignment.
  const [displayOrder, setDisplayOrder] = useState(0);

  // Store the current instructor search phrase.
  const [searchQuery, setSearchQuery] = useState("");

  // Track whether the initial data is loading.
  const [loading, setLoading] = useState(true);

  // Store a safe loading error for the interface.
  const [errorMessage, setErrorMessage] = useState("");

  // Track whether an instructor assignment is being created.
  const [assigning, setAssigning] = useState(false);

  // Store the assignment currently being marked as lead.
  const [settingLeadId, setSettingLeadId] = useState<string | null>(null);

  // Store the assignment whose order is being updated.
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

  // Store the assignment currently being removed.
  const [removingId, setRemovingId] = useState<string | null>(null);

  /**
   * Sort program instructor assignments.
   */
  function sortAssignments(records: AcademyProgramInstructor[]) {
    return [...records].sort((firstAssignment, secondAssignment) => {
      // Keep the lead instructor at the top.
      if (firstAssignment.is_lead !== secondAssignment.is_lead) {
        return firstAssignment.is_lead ? -1 : 1;
      }

      // Use display order for the remaining instructors.
      if (firstAssignment.display_order !== secondAssignment.display_order) {
        return firstAssignment.display_order - secondAssignment.display_order;
      }

      // Use the instructor name as a stable final sort.
      return (firstAssignment.instructor?.full_name ?? "").localeCompare(
        secondAssignment.instructor?.full_name ?? ""
      );
    });
  }

  /**
   * Load the program and instructor assignment data.
   */
  const loadInstructorData = useCallback(async () => {
    // Start loading and clear any previous error.
    setLoading(true);
    setErrorMessage("");

    try {
      // Load all required instructor data in parallel.
      const [programRecord, instructorRecords, assignmentRecords] =
        await Promise.all([
          getAcademyProgramById(programId),
          getAvailableAcademyInstructors(),
          getAcademyProgramInstructors(programId),
        ]);

      // Store the loaded records.
      setProgram(programRecord);
      setAvailableInstructors(instructorRecords);
      setAssignments(sortAssignments(assignmentRecords));
    } catch (error) {
      // Log the complete error for debugging.
      console.error("Failed to load program instructors:", error);

      // Display a safe loading error.
      setErrorMessage("The program instructors could not be loaded.");
    } finally {
      // End the loading state.
      setLoading(false);
    }
  }, [programId]);

  // Load instructor data after the component hydrates.
  useEffect(() => {
    void loadInstructorData();
  }, [loadInstructorData]);

  // Store the IDs of instructors already assigned.
  const assignedInstructorIds = useMemo(() => {
    return new Set(assignments.map((assignment) => assignment.instructor_id));
  }, [assignments]);

  // Remove already-assigned instructors from the selector.
  const unassignedInstructors = useMemo(() => {
    return availableInstructors.filter(
      (instructor) => !assignedInstructorIds.has(instructor.id)
    );
  }, [availableInstructors, assignedInstructorIds]);

  // Filter assigned instructors using the current search phrase.
  const filteredAssignments = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    if (!normalizedSearch) {
      return assignments;
    }

    return assignments.filter((assignment) => {
      const instructor = assignment.instructor;

      const searchableContent = [
        instructor?.full_name,
        instructor?.title,
        instructor?.email,
        instructor?.skills?.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableContent.includes(normalizedSearch);
    });
  }, [assignments, searchQuery]);

  /**
   * Reset the new instructor assignment form.
   */
  function resetAssignmentForm() {
    setSelectedInstructorId("");
    setAssignAsLead(false);
    setDisplayOrder(assignments.length);
  }

  /**
   * Assign the selected instructor to the program.
   */
  async function handleAssignInstructor() {
    // Prevent invalid or duplicate submissions.
    if (!selectedInstructorId || assigning) {
      return;
    }

    setAssigning(true);

    try {
      // Create the program-instructor relationship.
      const createdAssignment = await assignAcademyProgramInstructor({
        program_id: programId,
        instructor_id: selectedInstructorId,
        is_lead: assignAsLead,
        display_order: Math.max(0, displayOrder),
      });

      let updatedAssignments = [...assignments, createdAssignment];

      // Ensure only one instructor remains the lead.
      if (assignAsLead) {
        updatedAssignments = updatedAssignments.map((assignment) => ({
          ...assignment,
          is_lead: assignment.id === createdAssignment.id,
        }));
      }

      setAssignments(sortAssignments(updatedAssignments));

      toast.success(
        `${
          createdAssignment.instructor?.full_name ?? "Instructor"
        } has been assigned.`
      );

      resetAssignmentForm();
    } catch (error) {
      // Log the complete assignment error.
      console.error("Failed to assign program instructor:", error);

      toast.error(
        "The instructor could not be assigned. They may already be assigned to this program."
      );
    } finally {
      setAssigning(false);
    }
  }

  /**
   * Set one assigned instructor as the program lead.
   */
  async function handleSetLead(assignment: AcademyProgramInstructor) {
    // Stop when this instructor is already the lead.
    if (assignment.is_lead || settingLeadId) {
      return;
    }

    setSettingLeadId(assignment.id);

    try {
      // Update the lead assignment in Supabase.
      await setLeadAcademyProgramInstructor(programId, assignment.id);

      // Update every local assignment so only one is lead.
      setAssignments((currentAssignments) =>
        sortAssignments(
          currentAssignments.map((currentAssignment) => ({
            ...currentAssignment,
            is_lead: currentAssignment.id === assignment.id,
          }))
        )
      );

      toast.success(
        `${
          assignment.instructor?.full_name ?? "Instructor"
        } is now the lead instructor.`
      );
    } catch (error) {
      console.error("Failed to set lead instructor:", error);

      toast.error("The lead instructor could not be updated.");
    } finally {
      setSettingLeadId(null);
    }
  }

  /**
   * Update an instructor's display order.
   */
  async function handleDisplayOrderChange(
    assignment: AcademyProgramInstructor,
    newOrder: number
  ) {
    // Prevent overlapping update requests.
    if (savingOrderId) {
      return;
    }

    const safeOrder = Math.max(0, newOrder);

    // Skip the request when the value has not changed.
    if (safeOrder === assignment.display_order) {
      return;
    }

    setSavingOrderId(assignment.id);

    try {
      // Save the new display order.
      const updatedAssignment = await updateAcademyProgramInstructor(
        assignment.id,
        {
          display_order: safeOrder,
        }
      );

      // Replace and re-sort the local assignment.
      setAssignments((currentAssignments) =>
        sortAssignments(
          currentAssignments.map((currentAssignment) =>
            currentAssignment.id === updatedAssignment.id
              ? updatedAssignment
              : currentAssignment
          )
        )
      );

      toast.success("Instructor order updated.");
    } catch (error) {
      console.error("Failed to update instructor order:", error);

      toast.error("The instructor display order could not be updated.");
    } finally {
      setSavingOrderId(null);
    }
  }

  /**
   * Remove an instructor from the program.
   */
  async function handleRemoveInstructor(assignment: AcademyProgramInstructor) {
    // Prevent overlapping removal requests.
    if (removingId) {
      return;
    }

    const instructorName =
      assignment.instructor?.full_name ?? "this instructor";

    const confirmed = window.confirm(
      `Remove ${instructorName} from this program? The instructor profile will not be deleted.`
    );

    if (!confirmed) {
      return;
    }

    setRemovingId(assignment.id);

    try {
      // Delete only the program assignment.
      await removeAcademyProgramInstructor(assignment.id);

      // Remove the assignment from local state.
      setAssignments((currentAssignments) =>
        currentAssignments.filter(
          (currentAssignment) => currentAssignment.id !== assignment.id
        )
      );

      toast.success(`${instructorName} has been removed from the program.`);
    } catch (error) {
      console.error("Failed to remove program instructor:", error);

      toast.error("The instructor could not be removed from this program.");
    } finally {
      setRemovingId(null);
    }
  }

  // Display the initial loading state.
  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-primary" />

          <p className="mt-3 text-sm text-slate-500">
            Loading program instructors...
          </p>
        </div>
      </div>
    );
  }

  // Display the loading error state.
  if (errorMessage || !program) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
        <p className="font-semibold text-red-700">
          {errorMessage || "The selected Academy program could not be found."}
        </p>

        <button
          type="button"
          onClick={() => {
            void loadInstructorData();
          }}
          className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <a
            href="/admin/academy/programs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to programs
          </a>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Program Instructors
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            {program.title}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Assign existing Academy instructors, select the lead instructor, and
            control their display order.
          </p>
        </div>

        <a
          href="/admin/academy/instructors"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <GraduationCap className="h-4 w-4" />
          Manage instructors
        </a>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            Assign an instructor
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Select an existing active instructor and assign them to this
            program.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="program-instructor"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Instructor
            </label>

            <select
              id="program-instructor"
              value={selectedInstructorId}
              onChange={(event) => {
                setSelectedInstructorId(event.target.value);
              }}
              disabled={assigning || unassignedInstructors.length === 0}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                {unassignedInstructors.length > 0
                  ? "Select an instructor"
                  : "All active instructors are assigned"}
              </option>

              {unassignedInstructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.full_name} — {instructor.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="instructor-display-order"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Display order
            </label>

            <input
              id="instructor-display-order"
              type="number"
              min="0"
              value={displayOrder}
              onChange={(event) => {
                setDisplayOrder(Number(event.target.value) || 0);
              }}
              disabled={assigning}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={assignAsLead}
              onChange={(event) => {
                setAssignAsLead(event.target.checked);
              }}
              disabled={assigning}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />

            <span>
              <span className="block text-sm font-semibold text-slate-800">
                Lead instructor
              </span>

              <span className="mt-1 block text-xs leading-5 text-slate-500">
                This will replace the current lead instructor.
              </span>
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            void handleAssignInstructor();
          }}
          disabled={assigning || !selectedInstructorId}
          className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {assigning ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}

          {assigning ? "Assigning instructor..." : "Assign instructor"}
        </button>
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Assigned instructors
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {assignments.length}{" "}
              {assignments.length === 1 ? "instructor" : "instructors"}
            </p>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
              }}
              placeholder="Search assigned instructors..."
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </div>

        {filteredAssignments.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {filteredAssignments.map((assignment) => {
              const instructor = assignment.instructor;

              return (
                <article
                  key={assignment.id}
                  className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    {instructor?.image_url ? (
                      <img
                        src={instructor.image_url}
                        alt={instructor.full_name}
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <UserRound className="h-7 w-7" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-950">
                          {instructor?.full_name ?? "Unknown instructor"}
                        </h3>

                        {assignment.is_lead ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            <Crown className="h-3 w-3" />
                            Lead instructor
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {instructor?.title || "No instructor title"}
                      </p>

                      {instructor?.skills?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {instructor.skills.slice(0, 4).map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label
                        htmlFor={`order-${assignment.id}`}
                        className="mb-1 block text-xs font-semibold text-slate-500"
                      >
                        Order
                      </label>

                      <input
                        id={`order-${assignment.id}`}
                        type="number"
                        min="0"
                        defaultValue={assignment.display_order}
                        onBlur={(event) => {
                          void handleDisplayOrderChange(
                            assignment,
                            Number(event.target.value) || 0
                          );
                        }}
                        disabled={savingOrderId === assignment.id}
                        className="h-10 w-20 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                      />
                    </div>

                    {!assignment.is_lead ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleSetLead(assignment);
                        }}
                        disabled={Boolean(settingLeadId)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 px-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {settingLeadId === assignment.id ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Crown className="h-4 w-4" />
                        )}
                        Make lead
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        void handleRemoveInstructor(assignment);
                      }}
                      disabled={Boolean(removingId)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {removingId === assignment.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <GraduationCap className="h-7 w-7" />
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-950">
              {assignments.length > 0
                ? "No matching instructors"
                : "No instructors assigned"}
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {assignments.length > 0
                ? "Try using a different search phrase."
                : "Select an existing Academy instructor above to assign them to this program."}
            </p>

            {assignments.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                }}
                className="mt-5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear search
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
