import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  BriefcaseBusiness,
  CalendarDays,
  ExternalLink,
  FilePenLine,
  LoaderCircle,
  MapPin,
  Plus,
  Rocket,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  closeCareerOpening,
  deleteCareerOpening,
  getCareerOpenings,
  publishCareerOpening,
} from "../../../lib/careers";
import type { CareerOpening, CareerStatus } from "../../../types/careers";
import CareerStatusBadge from "./CareerStatusBadge";
import DeleteCareerDialog from "./DeleteCareerDialog";
import StatCard from "../Statcard";

type StatusFilter = "all" | CareerStatus;

interface ActionState {
  id: string;
  action: "publish" | "close" | null;
}

// Convert an underscore-separated value into a readable label.
function formatEnumLabel(value: string) {
  return value
    .split("_")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

// Format an ISO date into a readable dashboard date.
function formatDate(value: string | null) {
  // Display a fallback when the job has no deadline.
  if (!value) {
    return "No deadline";
  }

  // Convert the database value into a readable local date.
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

// Determine whether a job opening has passed its application deadline.
function hasExpired(applicationDeadline: string | null) {
  // Jobs without deadlines do not expire automatically.
  if (!applicationDeadline) {
    return false;
  }

  return new Date(applicationDeadline).getTime() < Date.now();
}

// Build the public URL for a job opening.
function getPublicCareerUrl(slug: string) {
  return `/careers/${slug}`;
}

// Display and manage all job openings in the admin dashboard.
export default function CareerTable() {
  // Store every career opening returned by Supabase.
  const [careerOpenings, setCareerOpenings] = useState<CareerOpening[]>([]);

  // Track the initial table request.
  const [loading, setLoading] = useState(true);

  // Store a user-facing error when the job list cannot be retrieved.
  const [errorMessage, setErrorMessage] = useState("");

  // Store the current search value.
  const [searchQuery, setSearchQuery] = useState("");

  // Store the selected publishing-status filter.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Track the job currently undergoing a publish or close action.
  const [actionState, setActionState] = useState<ActionState>({
    id: "",
    action: null,
  });

  // Store the job selected for deletion.
  const [careerToDelete, setCareerToDelete] = useState<CareerOpening | null>(
    null
  );

  // Track whether a delete request is running.
  const [deleting, setDeleting] = useState(false);

  // Load every job opening for the admin dashboard.
  const loadCareerOpenings = useCallback(async () => {
    // Start the loading state and clear the previous request error.
    setLoading(true);
    setErrorMessage("");

    try {
      // Retrieve all career records from Supabase.
      const records = await getCareerOpenings();

      // Store the returned records in local state.
      setCareerOpenings(records);
    } catch (error) {
      // Log the complete request error for debugging.
      console.error("Failed to load career openings:", error);

      // Display a safe message inside the admin interface.
      setErrorMessage("Career openings could not be loaded.");
    } finally {
      // End the loading state after the request completes.
      setLoading(false);
    }
  }, []);

  // Load the career openings after the React island hydrates.
  useEffect(() => {
    void loadCareerOpenings();
  }, [loadCareerOpenings]);

  // Filter career openings using the selected status and search query.
  const filteredCareerOpenings = useMemo(() => {
    // Normalize the search query for case-insensitive matching.
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    return careerOpenings.filter((careerOpening) => {
      // Check whether the opening matches the selected status.
      const matchesStatus =
        statusFilter === "all" || careerOpening.status === statusFilter;

      // Match all records when the search field is empty.
      if (!normalizedSearchQuery) {
        return matchesStatus;
      }

      // Build one searchable value from the most useful job fields.
      const searchableContent = [
        careerOpening.title,
        careerOpening.department,
        careerOpening.location,
        careerOpening.employment_type,
        careerOpening.workplace_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && searchableContent.includes(normalizedSearchQuery);
    });
  }, [careerOpenings, searchQuery, statusFilter]);

  // Count jobs for each publishing status.
  const statusCounts = useMemo(() => {
    return careerOpenings.reduce(
      (counts, careerOpening) => {
        counts.all += 1;
        counts[careerOpening.status] += 1;

        return counts;
      },
      {
        all: 0,
        draft: 0,
        published: 0,
        closed: 0,
      }
    );
  }, [careerOpenings]);

  // Publish a selected job opening.
  const handlePublish = useCallback(
    async (careerOpening: CareerOpening) => {
      // Avoid starting another action while this job is already being updated.
      if (actionState.id) {
        return;
      }

      // Start the publish action state.
      setActionState({
        id: careerOpening.id,
        action: "publish",
      });

      try {
        // Update the selected job in Supabase.
        const updatedCareerOpening = await publishCareerOpening(
          careerOpening.id
        );

        // Replace the old local record with the published record.
        setCareerOpenings((currentCareerOpenings) =>
          currentCareerOpenings.map((currentCareerOpening) =>
            currentCareerOpening.id === updatedCareerOpening.id
              ? updatedCareerOpening
              : currentCareerOpening
          )
        );

        // Confirm the successful publishing action.
        toast.success(`${updatedCareerOpening.title} has been published.`);
      } catch (error) {
        // Log the complete publish error for debugging.
        console.error("Failed to publish career opening:", error);

        // Display a safe error notification.
        toast.error("The job opening could not be published.");
      } finally {
        // Clear the current row action.
        setActionState({
          id: "",
          action: null,
        });
      }
    },
    [actionState.id]
  );

  // Close a selected job opening.
  const handleClose = useCallback(
    async (careerOpening: CareerOpening) => {
      // Avoid starting another action while this job is already being updated.
      if (actionState.id) {
        return;
      }

      // Start the close action state.
      setActionState({
        id: careerOpening.id,
        action: "close",
      });

      try {
        // Update the selected job in Supabase.
        const updatedCareerOpening = await closeCareerOpening(careerOpening.id);

        // Replace the old local record with the closed record.
        setCareerOpenings((currentCareerOpenings) =>
          currentCareerOpenings.map((currentCareerOpening) =>
            currentCareerOpening.id === updatedCareerOpening.id
              ? updatedCareerOpening
              : currentCareerOpening
          )
        );

        // Confirm the successful closing action.
        toast.success(`${updatedCareerOpening.title} has been closed.`);
      } catch (error) {
        // Log the complete close error for debugging.
        console.error("Failed to close career opening:", error);

        // Display a safe error notification.
        toast.error("The job opening could not be closed.");
      } finally {
        // Clear the current row action.
        setActionState({
          id: "",
          action: null,
        });
      }
    },
    [actionState.id]
  );

  // Permanently delete the selected career opening.
  const handleDelete = useCallback(async () => {
    // Stop when no career opening has been selected.
    if (!careerToDelete || deleting) {
      return;
    }

    // Start the delete request state.
    setDeleting(true);

    try {
      // Remove the selected career opening from Supabase.
      await deleteCareerOpening(careerToDelete.id);

      // Remove the deleted record from local state.
      setCareerOpenings((currentCareerOpenings) =>
        currentCareerOpenings.filter(
          (careerOpening) => careerOpening.id !== careerToDelete.id
        )
      );

      // Confirm the successful deletion.
      toast.success(`${careerToDelete.title} has been deleted.`);

      // Close the delete confirmation dialog.
      setCareerToDelete(null);
    } catch (error) {
      // Log the complete delete error for debugging.
      console.error("Failed to delete career opening:", error);

      // Display a safe error notification.
      toast.error("The job opening could not be deleted.");
    } finally {
      // End the delete request state.
      setDeleting(false);
    }
  }, [careerToDelete, deleting]);

  // Render the initial loading interface.
  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-box-border bg-white/70 dark:bg-box-bg/70">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-primary" />

          <p className="mt-3 text-sm text-heading-3">
            Loading career openings...
          </p>
        </div>
      </div>
    );
  }

  // Render the request error interface.
  if (errorMessage) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-500/30 dark:bg-red-500/10">
        <p className="font-medium text-red-700 dark:text-red-300">
          {errorMessage}
        </p>

        <button
          type="button"
          onClick={() => void loadCareerOpenings()}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
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
          <StatCard
            title="All openings"
            value={statusCounts.all}
            icon="openings"
            color="bg-pink-500"
          />

          <StatCard
            title="Published"
            value={statusCounts.published}
            icon="published"
            color="bg-green-400"
          />

          <StatCard
            title="Drafts"
            value={statusCounts.draft}
            icon="drafts"
            color="bg-blue-400"
          />

          <StatCard
            title="Closed"
            value={statusCounts.closed}
            icon="closed"
            color="bg-red-400"
          />
        </div>

        <div className="rounded-3xl border border-box-border bg-white/70 shadow-sm backdrop-blur-xl dark:bg-box-bg/70">
          <div className="flex flex-col gap-4 border-b border-box-border p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-heading-3" />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search openings..."
                className="min-h-12 w-full rounded-2xl border border-box-border bg-transparent py-3 pl-11 pr-4 text-sm text-heading-1 outline-none transition placeholder:text-heading-3 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="min-h-12 rounded-2xl border border-box-border bg-white px-4 text-sm text-heading-1 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-box-bg"
              >
                <option value="all">All statuses ({statusCounts.all})</option>

                <option value="published">
                  Published ({statusCounts.published})
                </option>

                <option value="draft">Drafts ({statusCounts.draft})</option>

                <option value="closed">Closed ({statusCounts.closed})</option>
              </select>

              <a
                href="/admin/careers/new"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-medium text-white transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Add opening
              </a>
            </div>
          </div>

          {filteredCareerOpenings.length === 0 ? (
            <CareerEmptyState
              hasCareerOpenings={careerOpenings.length > 0}
              onClearFilters={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-box-border text-left">
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-heading-3">
                        Job opening
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-heading-3">
                        Work arrangement
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-heading-3">
                        Status
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-heading-3">
                        Deadline
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-heading-3">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCareerOpenings.map((careerOpening) => (
                      <CareerTableRow
                        key={careerOpening.id}
                        careerOpening={careerOpening}
                        actionState={actionState}
                        onPublish={handlePublish}
                        onClose={handleClose}
                        onDelete={setCareerToDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-box-border lg:hidden">
                {filteredCareerOpenings.map((careerOpening) => (
                  <CareerMobileCard
                    key={careerOpening.id}
                    careerOpening={careerOpening}
                    actionState={actionState}
                    onPublish={handlePublish}
                    onClose={handleClose}
                    onDelete={setCareerToDelete}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <DeleteCareerDialog
        careerOpening={careerToDelete}
        deleting={deleting}
        onCancel={() => {
          if (!deleting) {
            setCareerToDelete(null);
          }
        }}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

interface CareerActionProps {
  careerOpening: CareerOpening;
  actionState: ActionState;
  onPublish: (careerOpening: CareerOpening) => Promise<void>;
  onClose: (careerOpening: CareerOpening) => Promise<void>;
  onDelete: (careerOpening: CareerOpening) => void;
}

// Display one career opening in the desktop table.
function CareerTableRow({
  careerOpening,
  actionState,
  onPublish,
  onClose,
  onDelete,
}: CareerActionProps) {
  // Determine whether this row currently has a running action.
  const rowIsProcessing = actionState.id === careerOpening.id;

  return (
    <tr className="border-b border-box-border last:border-b-0 hover:bg-gray-50/70 dark:hover:bg-gray-900/30">
      <td className="px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-heading-1">
                {careerOpening.title}
                {careerOpening.featured ? (
                  <span
                    title="Featured opening"
                    className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                  >
                    <Star className="h-3 w-3 fill-current" />
                  </span>
                ) : null}
              </p>
            </div>

            <p className="mt-1 text-sm text-heading-3">
              {careerOpening.department || "No department"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-5">
        <div className="space-y-1.5 text-sm">
          <p className="flex items-center gap-2 text-heading-1">
            <MapPin className="h-4 w-4 text-heading-3" />
            {careerOpening.location || "Location not specified"}
          </p>

          <p className="text-heading-3">
            {formatEnumLabel(careerOpening.workplace_type)} ·{" "}
            {formatEnumLabel(careerOpening.employment_type)}
          </p>
        </div>
      </td>

      <td className="px-5 py-5">
        <CareerStatusBadge status={careerOpening.status} />

        {hasExpired(careerOpening.application_deadline) ? (
          <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
            Deadline expired
          </p>
        ) : null}
      </td>

      <td className="px-5 py-5">
        <p className="flex items-center gap-2 text-sm text-heading-1">
          {formatDate(careerOpening.application_deadline)}
        </p>
      </td>

      <td className="px-5 py-5">
        <div className="flex items-center justify-end">
          {careerOpening.status !== "published" ? (
            <button
              type="button"
              onClick={() => void onPublish(careerOpening)}
              disabled={Boolean(actionState.id)}
              title="Publish opening"
              className="rounded-xl p-2.5 text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
            >
              {rowIsProcessing && actionState.action === "publish" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void onClose(careerOpening)}
              disabled={Boolean(actionState.id)}
              title="Close opening"
              className="rounded-xl p-2.5 text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-amber-400 dark:hover:bg-amber-500/10"
            >
              {rowIsProcessing && actionState.action === "close" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
            </button>
          )}

          {careerOpening.status === "published" ? (
            <a
              href={getPublicCareerUrl(careerOpening.slug)}
              target="_blank"
              rel="noreferrer"
              title="View public page"
              className="rounded-xl p-2.5 text-heading-3 transition hover:bg-gray-100 hover:text-heading-1 dark:hover:bg-gray-800"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}

          <a
            href={`/admin/careers/${careerOpening.id}`}
            title="Edit opening"
            className="rounded-xl p-2.5 text-primary transition hover:bg-primary/10"
          >
            <FilePenLine className="h-4 w-4" />
          </a>

          <button
            type="button"
            onClick={() => onDelete(careerOpening)}
            disabled={Boolean(actionState.id)}
            title="Delete opening"
            className="rounded-xl p-2.5 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Display one career opening on smaller screens.
function CareerMobileCard({
  careerOpening,
  actionState,
  onPublish,
  onClose,
  onDelete,
}: CareerActionProps) {
  // Determine whether this card currently has a running action.
  const rowIsProcessing = actionState.id === careerOpening.id;

  return (
    <article className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="font-medium text-heading-1">
              {careerOpening.title}
            </h2>

            <p className="mt-1 text-sm text-heading-3">
              {careerOpening.department || "No department"}
            </p>
          </div>
        </div>

        {careerOpening.featured ? (
          <Star className="h-4 w-4 shrink-0 fill-current text-amber-500" />
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CareerStatusBadge status={careerOpening.status} />

        <span className="rounded-full border border-box-border px-2.5 py-1 text-xs text-heading-3">
          {formatEnumLabel(careerOpening.employment_type)}
        </span>

        <span className="rounded-full border border-box-border px-2.5 py-1 text-xs text-heading-3">
          {formatEnumLabel(careerOpening.workplace_type)}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-heading-3">
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {careerOpening.location || "Location not specified"}
        </p>

        <p className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          {formatDate(careerOpening.application_deadline)}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {careerOpening.status !== "published" ? (
          <button
            type="button"
            onClick={() => void onPublish(careerOpening)}
            disabled={Boolean(actionState.id)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            {rowIsProcessing && actionState.action === "publish" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            Publish
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void onClose(careerOpening)}
            disabled={Boolean(actionState.id)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-amber-500/10 dark:text-amber-300"
          >
            {rowIsProcessing && actionState.action === "close" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Close
          </button>
        )}

        <a
          href={`/admin/careers/${careerOpening.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-box-border px-3 py-2 text-sm font-medium text-heading-1 transition hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <FilePenLine className="h-4 w-4" />
          Edit
        </a>

        <button
          type="button"
          onClick={() => onDelete(careerOpening)}
          disabled={Boolean(actionState.id)}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </article>
  );
}

interface CareerEmptyStateProps {
  hasCareerOpenings: boolean;
  onClearFilters: () => void;
}

// Display an empty state for missing jobs or unmatched filters.
function CareerEmptyState({
  hasCareerOpenings,
  onClearFilters,
}: CareerEmptyStateProps) {
  return (
    <div className="flex min-h-[350px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <BriefcaseBusiness className="h-7 w-7" />
      </div>

      <h2 className="mt-5 text-xl font-semibold text-heading-1">
        {hasCareerOpenings ? "No matching openings" : "No job openings yet"}
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-heading-3">
        {hasCareerOpenings
          ? "Try changing your search phrase or status filter."
          : "Create your first job opening and publish it when it is ready for the public careers page."}
      </p>

      {hasCareerOpenings ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-5 rounded-xl border border-box-border px-4 py-2.5 text-sm font-medium text-heading-1 transition hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Clear filters
        </button>
      ) : (
        <a
          href="/admin/careers/new"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add first opening
        </a>
      )}
    </div>
  );
}
