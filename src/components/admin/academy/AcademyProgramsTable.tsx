import {
  Archive,
  ArrowLeft,
  ArrowRight,
  FilePenLine,
  GraduationCap,
  LoaderCircle,
  Plus,
  Rocket,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  archiveAcademyProgram,
  deleteAcademyProgram,
  draftAcademyProgram,
  getAcademyPrograms,
  publishAcademyProgram,
  updateAcademyProgramFeaturedStatus,
  updateAcademyRegistrationAvailability,
} from "../../../lib/academy";
import type {
  AcademyProgram,
  AcademyProgramStatus,
} from "../../../types/academy";
import DeleteProgramDialog from "./DeleteProgramDialog";
import EmptyProgramsState from "./EmptyProgramState";
import ProgramCard from "./ProgramCard";
import type { ProgramActionState } from "./ProgramCard";
import ProgramSummaryCard from "./ProgramSummaryCard";

type ProgramStatusFilter = "all" | AcademyProgramStatus;

const PROGRAMS_PER_PAGE = 8;

/**
 * Display and manage all Academy programs.
 */
export default function AcademyProgramsTable() {
  // Store all Academy programs returned by Supabase.
  const [programs, setPrograms] = useState<AcademyProgram[]>([]);

  // Track whether the initial program request is running.
  const [loading, setLoading] = useState(true);

  // Store a user-facing error when programs cannot be loaded.
  const [errorMessage, setErrorMessage] = useState("");

  // Store the current program search phrase.
  const [searchQuery, setSearchQuery] = useState("");

  // Store the selected program status filter.
  const [statusFilter, setStatusFilter] = useState<ProgramStatusFilter>("all");

  // Store the current pagination page.
  const [currentPage, setCurrentPage] = useState(1);

  // Track the program currently being updated.
  const [actionState, setActionState] = useState<ProgramActionState>({
    id: "",
    action: null,
  });

  // Store the program selected for permanent deletion.
  const [programToDelete, setProgramToDelete] = useState<AcademyProgram | null>(
    null
  );

  // Track whether the delete request is running.
  const [deleting, setDeleting] = useState(false);

  /**
   * Retrieve every Academy program from Supabase.
   */
  const loadPrograms = useCallback(async () => {
    // Start loading and clear the previous request error.
    setLoading(true);
    setErrorMessage("");

    try {
      // Retrieve all programs for the admin dashboard.
      const records = await getAcademyPrograms();

      // Store the returned records in local state.
      setPrograms(records);
    } catch (error) {
      // Log the full request error for debugging.
      console.error("Failed to load Academy programs:", error);

      // Display a safe error message in the interface.
      setErrorMessage("Academy programs could not be loaded.");
    } finally {
      // End the loading state after the request completes.
      setLoading(false);
    }
  }, []);

  // Load programs after the React island hydrates.
  useEffect(() => {
    void loadPrograms();
  }, [loadPrograms]);

  // Return to the first page whenever search or filtering changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Filter programs using the search phrase and selected status.
  const filteredPrograms = useMemo(() => {
    // Normalize the search phrase for case-insensitive matching.
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return programs.filter((program) => {
      // Check whether the program matches the selected status.
      const matchesStatus =
        statusFilter === "all" || program.status === statusFilter;

      // Return only the status result when no search phrase exists.
      if (!normalizedSearch) {
        return matchesStatus;
      }

      // Combine useful program fields into one searchable value.
      const searchableContent = [
        program.title,
        program.code,
        program.category?.name,
        program.delivery_mode,
        program.location,
        program.short_description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && searchableContent.includes(normalizedSearch);
    });
  }, [programs, searchQuery, statusFilter]);

  // Count programs belonging to each publishing status.
  const statusCounts = useMemo(() => {
    return programs.reduce(
      (counts, program) => {
        counts.all += 1;
        counts[program.status] += 1;

        return counts;
      },
      {
        all: 0,
        draft: 0,
        published: 0,
        archived: 0,
      }
    );
  }, [programs]);

  // Calculate the total number of pagination pages.
  const totalPages = Math.max(
    1,
    Math.ceil(filteredPrograms.length / PROGRAMS_PER_PAGE)
  );

  // Keep the current page valid when programs are removed or filtered.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Retrieve only the programs belonging to the current page.
  const paginatedPrograms = useMemo(() => {
    // Calculate the first program index.
    const startIndex = (currentPage - 1) * PROGRAMS_PER_PAGE;

    // Calculate the final program index.
    const endIndex = startIndex + PROGRAMS_PER_PAGE;

    return filteredPrograms.slice(startIndex, endIndex);
  }, [currentPage, filteredPrograms]);

  /**
   * Replace an existing program in local state after an update.
   */
  function replaceProgram(updatedProgram: AcademyProgram) {
    setPrograms((currentPrograms) =>
      currentPrograms.map((program) =>
        program.id === updatedProgram.id
          ? {
              ...program,
              ...updatedProgram,
            }
          : program
      )
    );
  }

  /**
   * Clear the current program action state.
   */
  function clearActionState() {
    setActionState({
      id: "",
      action: null,
    });
  }

  /**
   * Publish a selected Academy program.
   */
  async function handlePublish(program: AcademyProgram) {
    // Prevent overlapping program actions.
    if (actionState.id) {
      return;
    }

    setActionState({
      id: program.id,
      action: "publish",
    });

    try {
      // Publish the selected program.
      const updatedProgram = await publishAcademyProgram(program.id);

      // Replace the local program with the updated record.
      replaceProgram(updatedProgram);

      // Confirm the successful action.
      toast.success(`${program.title} has been published.`);
    } catch (error) {
      // Log the complete request error for debugging.
      console.error("Failed to publish Academy program:", error);

      // Display a safe error notification.
      toast.error("The program could not be published.");
    } finally {
      // Clear the current program action.
      clearActionState();
    }
  }

  /**
   * Return a selected Academy program to draft status.
   */
  async function handleDraft(program: AcademyProgram) {
    // Prevent overlapping program actions.
    if (actionState.id) {
      return;
    }

    setActionState({
      id: program.id,
      action: "draft",
    });

    try {
      // Return the selected program to draft status.
      const updatedProgram = await draftAcademyProgram(program.id);

      // Replace the local program with the updated record.
      replaceProgram(updatedProgram);

      // Confirm the successful action.
      toast.success(`${program.title} is now a draft.`);
    } catch (error) {
      // Log the complete request error for debugging.
      console.error("Failed to return Academy program to draft:", error);

      // Display a safe error notification.
      toast.error("The program could not be returned to draft.");
    } finally {
      // Clear the current program action.
      clearActionState();
    }
  }

  /**
   * Archive a selected Academy program.
   */
  async function handleArchive(program: AcademyProgram) {
    // Prevent overlapping program actions.
    if (actionState.id) {
      return;
    }

    setActionState({
      id: program.id,
      action: "archive",
    });

    try {
      // Archive the selected program.
      const updatedProgram = await archiveAcademyProgram(program.id);

      // Replace the local program with the updated record.
      replaceProgram(updatedProgram);

      // Confirm the successful action.
      toast.success(`${program.title} has been archived.`);
    } catch (error) {
      // Log the complete request error for debugging.
      console.error("Failed to archive Academy program:", error);

      // Display a safe error notification.
      toast.error("The program could not be archived.");
    } finally {
      // Clear the current program action.
      clearActionState();
    }
  }

  /**
   * Toggle whether a selected program is featured.
   */
  async function handleFeaturedToggle(program: AcademyProgram) {
    // Prevent overlapping program actions.
    if (actionState.id) {
      return;
    }

    setActionState({
      id: program.id,
      action: "featured",
    });

    try {
      // Reverse the selected program's featured status.
      const updatedProgram = await updateAcademyProgramFeaturedStatus(
        program.id,
        !program.featured
      );

      // Replace the local program with the updated record.
      replaceProgram(updatedProgram);

      // Confirm the updated featured state.
      toast.success(
        updatedProgram.featured
          ? `${program.title} is now featured.`
          : `${program.title} is no longer featured.`
      );
    } catch (error) {
      // Log the complete request error for debugging.
      console.error("Failed to update featured status:", error);

      // Display a safe error notification.
      toast.error("The featured status could not be updated.");
    } finally {
      // Clear the current program action.
      clearActionState();
    }
  }

  /**
   * Toggle whether registration is open for a selected program.
   */
  async function handleRegistrationToggle(program: AcademyProgram) {
    // Prevent overlapping program actions.
    if (actionState.id) {
      return;
    }

    setActionState({
      id: program.id,
      action: "registration",
    });

    try {
      // Reverse the selected program's registration availability.
      const updatedProgram = await updateAcademyRegistrationAvailability(
        program.id,
        !program.registration_open
      );

      // Replace the local program with the updated record.
      replaceProgram(updatedProgram);

      // Confirm the updated registration state.
      toast.success(
        updatedProgram.registration_open
          ? `Registration is now open for ${program.title}.`
          : `Registration is now closed for ${program.title}.`
      );
    } catch (error) {
      // Log the complete request error for debugging.
      console.error("Failed to update registration availability:", error);

      // Display a safe error notification.
      toast.error("Registration availability could not be updated.");
    } finally {
      // Clear the current program action.
      clearActionState();
    }
  }

  /**
   * Permanently delete the currently selected Academy program.
   */
  async function handleDelete() {
    // Stop when no program is selected or deletion is already running.
    if (!programToDelete || deleting) {
      return;
    }

    // Store the selected program before asynchronous state changes.
    const selectedProgram = programToDelete;

    // Start the deleting state.
    setDeleting(true);

    try {
      // Delete the selected program from Supabase.
      await deleteAcademyProgram(selectedProgram.id);

      // Remove the deleted program from local state.
      setPrograms((currentPrograms) =>
        currentPrograms.filter((program) => program.id !== selectedProgram.id)
      );

      // Confirm the successful deletion.
      toast.success(`${selectedProgram.title} has been deleted.`);

      // Close the delete confirmation dialog.
      setProgramToDelete(null);
    } catch (error) {
      // Log the complete request error for debugging.
      console.error("Failed to delete Academy program:", error);

      // Display a safe error notification.
      toast.error(
        "The program could not be deleted. Archive it if registrations or certificates already exist."
      );
    } finally {
      // End the deleting state.
      setDeleting(false);
    }
  }

  // Display the initial loading state.
  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="text-center">
          <LoaderCircle
            size={30}
            className="mx-auto animate-spin text-primary"
          />

          <p className="mt-3 text-sm text-slate-500">
            Loading Academy programs...
          </p>
        </div>
      </div>
    );
  }

  // Display the loading error state.
  if (errorMessage) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
        <p className="font-semibold text-red-700">{errorMessage}</p>

        <button
          type="button"
          onClick={() => {
            void loadPrograms();
          }}
          className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ProgramSummaryCard
            label="All programs"
            value={statusCounts.all}
            icon={<GraduationCap size={21} />}
            color="blue-100"
          />

          <ProgramSummaryCard
            label="Published"
            value={statusCounts.published}
            icon={<Rocket size={21} />}
            color="green-100"
          />

          <ProgramSummaryCard
            label="Drafts"
            value={statusCounts.draft}
            icon={<FilePenLine size={21} />}
            color="pink-100"
          />

          <ProgramSummaryCard
            label="Archived"
            value={statusCounts.archived}
            icon={<Archive size={21} />}
            color="yellow-100"
          />
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                }}
                placeholder="Search Academy programs..."
                className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as ProgramStatusFilter);
                }}
                className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="all">All statuses ({statusCounts.all})</option>

                <option value="published">
                  Published ({statusCounts.published})
                </option>

                <option value="draft">Drafts ({statusCounts.draft})</option>

                <option value="archived">
                  Archived ({statusCounts.archived})
                </option>
              </select>

              <a
                href="/admin/academy/programs/new"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Plus size={17} />
                New program
              </a>
            </div>
          </div>

          {paginatedPrograms.length > 0 ? (
            <div className="grid gap-3 p-3 xl:grid-cols-2">
              {paginatedPrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  actionState={actionState}
                  onPublish={handlePublish}
                  onDraft={handleDraft}
                  onArchive={handleArchive}
                  onFeaturedToggle={handleFeaturedToggle}
                  onRegistrationToggle={handleRegistrationToggle}
                  onDelete={setProgramToDelete}
                />
              ))}
            </div>
          ) : (
            <EmptyProgramsState
              hasPrograms={programs.length > 0}
              onClearFilters={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            />
          )}

          {filteredPrograms.length > PROGRAMS_PER_PAGE ? (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing {(currentPage - 1) * PROGRAMS_PER_PAGE + 1} to{" "}
                {Math.min(
                  currentPage * PROGRAMS_PER_PAGE,
                  filteredPrograms.length
                )}{" "}
                of {filteredPrograms.length} programs
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage((page) => Math.max(1, page - 1));
                  }}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft size={16} />
                  Previous
                </button>

                <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage((page) => Math.min(totalPages, page + 1));
                  }}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <DeleteProgramDialog
        program={programToDelete}
        deleting={deleting}
        onCancel={() => {
          // Keep the dialog open while deletion is running.
          if (deleting) {
            return;
          }

          // Clear the selected program and close the dialog.
          setProgramToDelete(null);
        }}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </>
  );
}
