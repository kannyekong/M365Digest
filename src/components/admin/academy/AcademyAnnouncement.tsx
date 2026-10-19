import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import { getAdminSession } from "../../../lib/auth";
import { toast } from "react-toastify";

type Audience = "organization" | "program" | "student";
type Delivery = "in-app" | "both";
type SortOrder = "desc" | "asc";

type Announcement = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  audience: Audience;
  programId: string | null;
  studentId?: string | null;
  editable?: boolean;
  publishedAt: string;
  recipients: number;
  delivery: "in-app" | "both" | "unknown";
};

type StudentOption = { id: string; name: string; email: string; label: string };
type ProgramOption = { id: string; title: string; status: string };

type ApiResult = {
  students?: StudentOption[];
  programs?: ProgramOption[];
  success?: boolean;
  message?: string;
  announcements?: Announcement[];
  sent?: number;
  failed?: number;
  inApp?: { sent?: number; failed?: number; skipped?: boolean };
  email?: { sent?: number; failed?: number; skipped?: boolean };
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/** Formats announcement dates consistently for the Nigeria-based admin interface. */
function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Returns a readable audience label for the announcement table and confirmation modal. */
function audienceLabel(audience: Audience) {
  if (audience === "organization") return "All active students";
  if (audience === "program") return "Program students";
  return "One student";
}

export default function AcademyAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showComposer, setShowComposer] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [audience, setAudience] = useState<Audience>("organization");
  const [delivery, setDelivery] = useState<Delivery>("both");
  const [programId, setProgramId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [programSearch, setProgramSearch] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupLoaded, setLookupLoaded] = useState({
    students: false,
    programs: false,
  });
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("/student/dashboard");
  const [publishing, setPublishing] = useState(false);

  /** Retrieves announcement history through the authenticated admin API. */
  const loadAnnouncements = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await getAdminSession();
      const token = data.session?.access_token;
      if (error || !token)
        throw new Error(
          "Your admin session has expired. Please sign in again."
        );

      const response = await fetch("/api/admin/academy/announcements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as ApiResult;
      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message || "Announcement history could not be loaded."
        );
      }
      setAnnouncements(payload.announcements ?? []);
    } catch (error) {
      console.error("Failed to load Academy announcement history:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Announcement history could not be loaded."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /** Loads human-readable student/program choices from the authenticated lookup API. */
  const loadTargetOptions = useCallback(
    async (type: "students" | "programs") => {
      if (lookupLoaded[type]) return;
      setLookupLoading(true);
      try {
        const { data, error } = await getAdminSession();
        const token = data.session?.access_token;
        if (error || !token)
          throw new Error(
            "Your admin session has expired. Please sign in again."
          );
        const response = await fetch(
          `/api/admin/academy/announcements/lookups?type=${type}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const payload = (await response.json()) as ApiResult;
        if (!response.ok || !payload.success)
          throw new Error(payload.message || `Could not load ${type}.`);
        if (type === "students") setStudents(payload.students ?? []);
        else setPrograms(payload.programs ?? []);
        setLookupLoaded((current) => ({ ...current, [type]: true }));
      } catch (error) {
        console.error(`Failed to load announcement ${type}:`, error);
        toast.error(
          error instanceof Error ? error.message : `Could not load ${type}.`
        );
      } finally {
        setLookupLoading(false);
      }
    },
    [lookupLoaded]
  );

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  useEffect(() => {
    if (showComposer && audience === "student")
      void loadTargetOptions("students");
    if (showComposer && audience === "program")
      void loadTargetOptions("programs");
  }, [showComposer, audience, loadTargetOptions]);

  const filteredAnnouncements = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return [...announcements]
      .filter((item) => {
        const matchesSearch =
          !normalizedSearch ||
          item.title.toLowerCase().includes(normalizedSearch) ||
          item.message.toLowerCase().includes(normalizedSearch);
        const publishedDate = new Date(item.publishedAt)
          .toISOString()
          .slice(0, 10);
        const matchesFrom = !dateFrom || publishedDate >= dateFrom;
        const matchesTo = !dateTo || publishedDate <= dateTo;
        return matchesSearch && matchesFrom && matchesTo;
      })
      .sort((a, b) => {
        const difference =
          new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
        return sortOrder === "asc" ? difference : -difference;
      });
  }, [announcements, search, dateFrom, dateTo, sortOrder]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAnnouncements.length / pageSize)
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedAnnouncements = filteredAnnouncements.slice(
    startIndex,
    startIndex + pageSize
  );

  /** Opens the publish confirmation after validating the draft. */
  function requestPublish() {
    if (!title.trim() || !message.trim()) {
      toast.error("Enter an announcement title and message.");
      return;
    }
    if (audience === "program" && !programId.trim()) {
      toast.error("Enter the program ID.");
      return;
    }
    if (audience === "student" && !studentId.trim()) {
      toast.error("Enter the student profile ID.");
      return;
    }
    setShowComposer(false);
    setShowConfirmation(true);
  }

  /** Publishes only after the administrator confirms the audience and delivery method. */
  async function confirmPublish() {
    setPublishing(true);
    try {
      const { data, error } = await getAdminSession();
      const token = data.session?.access_token;
      if (error || !token)
        throw new Error(
          "Your admin session has expired. Please sign in again."
        );

      const isEditing = Boolean(editingAnnouncement);
      const response = await fetch(
        isEditing
          ? "/api/admin/academy/announcements"
          : "/api/admin/academy/student-notifications",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...(isEditing ? { id: editingAnnouncement!.id } : {}),
            audience,
            ...(audience === "program" ? { programId: programId.trim() } : {}),
            ...(audience === "student" ? { studentId: studentId.trim() } : {}),
            title: title.trim(),
            message: message.trim(),
            link: link.trim(),
            deliveryMethod: delivery,
            ...(isEditing
              ? {}
              : { sendEmail: delivery === "both", emailOnlyTest: false }),
          }),
        }
      );

      const payload = (await response.json()) as ApiResult;
      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message || "The announcement could not be published."
        );
      }

      toast.success(
        payload.message ||
          (isEditing
            ? "Announcement updated."
            : "Announcement published successfully.")
      );
      setShowConfirmation(false);
      setTitle("");
      setMessage("");
      setProgramId("");
      setStudentId("");
      setLink("/student/dashboard");
      setAudience("organization");
      setDelivery("both");
      setEditingAnnouncement(null);
      setShowComposer(false);
      await loadAnnouncements(true);
    } catch (error) {
      console.error("Failed to publish Academy announcement:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The announcement could not be saved."
      );
    } finally {
      setPublishing(false);
    }
  }

  /** Opens the composer with a durable announcement's current values for editing. */
  function requestEdit(item: Announcement) {
    if (item.editable === false) {
      toast.info(
        "This older announcement has no editable record. New announcements can be edited here."
      );
      return;
    }
    setEditingAnnouncement(item);
    setAudience(item.audience);
    setDelivery(item.delivery === "both" ? "both" : "in-app");
    setProgramId(item.programId ?? "");
    setStudentId(item.studentId ?? "");
    setProgramSearch("");
    setStudentSearch("");
    setTitle(item.title);
    setMessage(item.message);
    setLink(item.link ?? "");
    setSelectedAnnouncement(null);
    setShowComposer(true);
  }

  /** Opens a confirmation dialog before soft-deleting the announcement record. */
  function requestDelete(item: Announcement) {
    if (item.editable === false) {
      toast.info(
        "This older announcement has no canonical record to delete safely."
      );
      return;
    }
    setDeleteTarget(item);
    setShowDeleteConfirmation(true);
  }

  /** Performs the confirmed soft-delete using the authenticated admin API. */
  async function confirmDelete() {
    if (!deleteTarget) return;
    setActionBusy(true);
    try {
      const { data, error } = await getAdminSession();
      const token = data.session?.access_token;
      if (error || !token)
        throw new Error(
          "Your admin session has expired. Please sign in again."
        );
      const response = await fetch("/api/admin/academy/announcements", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const payload = (await response.json()) as ApiResult;
      if (!response.ok || !payload.success)
        throw new Error(
          payload.message || "The announcement could not be deleted."
        );
      toast.success(payload.message || "Announcement deleted.");
      setShowDeleteConfirmation(false);
      setDeleteTarget(null);
      await loadAnnouncements(true);
    } catch (error) {
      console.error("Failed to delete Academy announcement:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The announcement could not be deleted."
      );
    } finally {
      setActionBusy(false);
    }
  }

  /** Closes the composer without publishing; the draft remains in component state if reopened. */
  function requestCloseComposer() {
    setShowComposer(false);
    setEditingAnnouncement(null);
    setTitle("");
    setMessage("");
    setProgramId("");
    setStudentId("");
    setStudentSearch("");
    setProgramSearch("");
    setAudience("organization");
    setDelivery("both");
    setLink("/student/dashboard");
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Academy Announcements
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Publish student updates and review announcement history.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadAnnouncements(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingAnnouncement(null);
              setAudience("organization");
              setDelivery("both");
              setProgramId("");
              setStudentId("");
              setStudentSearch("");
              setProgramSearch("");
              setTitle("");
              setMessage("");
              setLink("/student/dashboard");
              setShowComposer(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <Plus size={17} /> Create announcement
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 dark:border-slate-800 lg:flex-row lg:items-end lg:justify-between sm:p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Organization announcement history
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {filteredAnnouncements.length} announcement
              {filteredAnnouncements.length === 1 ? "" : "s"} found
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="relative block">
              <span className="sr-only">Search announcements</span>
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search announcements"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label>
              <span className="sr-only">Sort announcements</span>
              <select
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value as SortOrder);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>
            <label className="relative">
              <span className="sr-only">Published from</span>
              <CalendarDays
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="date"
                aria-label="Published from"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-2 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="relative">
              <span className="sr-only">Published to</span>
              <CalendarDays
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="date"
                aria-label="Published to"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-2 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Announcement</th>
                <th className="px-5 py-3 font-semibold">Audience</th>
                <th className="px-5 py-3 font-semibold">Delivery</th>
                <th className="px-5 py-3 font-semibold">Published</th>
                <th className="px-5 py-3 font-semibold">Recipients</th>
                <th className="sticky right-0 z-10 min-w-[290px] bg-slate-50 px-5 py-3 text-right font-semibold dark:bg-slate-950">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    Loading announcement history…
                  </td>
                </tr>
              ) : paginatedAnnouncements.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No announcements match these filters.
                  </td>
                </tr>
              ) : (
                paginatedAnnouncements.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <td className="max-w-sm px-5 py-4">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {item.message}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {audienceLabel(item.audience)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {item.delivery === "both" ? (
                          <Mail size={13} />
                        ) : (
                          <BellRing size={13} />
                        )}
                        {item.delivery === "both"
                          ? "In-app + email"
                          : item.delivery === "in-app"
                            ? "In-app"
                            : "Recorded"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-300">
                      {formatDate(item.publishedAt)}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {item.recipients}
                    </td>
                    <td className="sticky right-0 min-w-[290px] bg-white px-5 py-4 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.8)] dark:bg-slate-900">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAnnouncement(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => requestEdit(item)}
                          disabled={item.editable === false}
                          title={
                            item.editable === false
                              ? "Legacy history cannot be edited"
                              : "Edit announcement record"
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-sky-900 dark:text-sky-300 dark:hover:bg-sky-950/40"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(item)}
                          disabled={item.editable === false}
                          title={
                            item.editable === false
                              ? "Legacy history cannot be deleted safely"
                              : "Delete announcement record"
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing {filteredAnnouncements.length ? startIndex + 1 : 0}–
              {Math.min(startIndex + pageSize, filteredAnnouncements.length)} of{" "}
              {filteredAnnouncements.length}
            </span>
            <label className="flex items-center gap-2">
              Rows
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-20 text-center text-xs text-slate-500 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
              className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {showComposer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) requestCloseComposer();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-modal-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
          >
            <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
              <div>
                <h2
                  id="announcement-modal-title"
                  className="text-xl font-bold text-slate-900 dark:text-white"
                >
                  {editingAnnouncement
                    ? "Edit announcement"
                    : "Create announcement"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {editingAnnouncement
                    ? "Update the saved announcement record. Previously delivered notifications and emails will not change."
                    : "Compose the message, then review it before publishing."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close composer"
                onClick={requestCloseComposer}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <label
                  htmlFor="announcement-audience"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Audience
                </label>
                <select
                  id="announcement-audience"
                  value={audience}
                  onChange={(event) =>
                    setAudience(event.target.value as Audience)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="organization">All active students</option>
                  <option value="program">Students in a program</option>
                  <option value="student">One student</option>
                </select>
              </div>
              {audience === "program" && (
                <div>
                  <label
                    htmlFor="announcement-program-search"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                  >
                    Select program
                  </label>
                  <input
                    id="announcement-program-search"
                    value={programSearch}
                    onChange={(event) => setProgramSearch(event.target.value)}
                    placeholder="Search programs by name…"
                    className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <select
                    id="announcement-program"
                    value={programId}
                    onChange={(event) => {
                      setProgramId(event.target.value);
                      setProgramSearch("");
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">
                      {lookupLoading ? "Loading programs…" : "Choose a program"}
                    </option>
                    {programs
                      .filter((program) =>
                        `${program.title} ${program.status}`
                          .toLowerCase()
                          .includes(programSearch.trim().toLowerCase())
                      )
                      .map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.title}{" "}
                          {program.status && program.status !== "published"
                            ? `(${program.status})`
                            : ""}
                        </option>
                      ))}
                  </select>
                  {programId && (
                    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                      Program selected. Its ID will be submitted automatically.
                    </p>
                  )}
                </div>
              )}
              {audience === "student" && (
                <div>
                  <label
                    htmlFor="announcement-student-search"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                  >
                    Select student
                  </label>
                  <input
                    id="announcement-student-search"
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    placeholder="Search by student name or email…"
                    className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <select
                    id="announcement-student"
                    value={studentId}
                    onChange={(event) => {
                      setStudentId(event.target.value);
                      setStudentSearch("");
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">
                      {lookupLoading ? "Loading students…" : "Choose a student"}
                    </option>
                    {students
                      .filter((student) =>
                        student.label
                          .toLowerCase()
                          .includes(studentSearch.trim().toLowerCase())
                      )
                      .map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.label}
                        </option>
                      ))}
                  </select>
                  {studentId && (
                    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                      Student selected. The profile ID will be submitted
                      automatically.
                    </p>
                  )}
                </div>
              )}
              <div>
                <label
                  htmlFor="announcement-title"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Title
                </label>
                <input
                  id="announcement-title"
                  maxLength={150}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Announcement title"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {title.length}/150
                </p>
              </div>
              <div>
                <label
                  htmlFor="announcement-message"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Message
                </label>
                <textarea
                  id="announcement-message"
                  rows={5}
                  maxLength={5000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write your announcement…"
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {message.length}/5000
                </p>
              </div>
              <div>
                <label
                  htmlFor="announcement-link"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Internal link (optional)
                </label>
                <input
                  id="announcement-link"
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder="/student/dashboard"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Delivery method
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${delivery === "in-app" ? "border-sky-500 bg-sky-50 dark:bg-sky-950/30" : "border-slate-200 dark:border-slate-700"}`}
                  >
                    <input
                      type="radio"
                      name="announcement-delivery"
                      value="in-app"
                      checked={delivery === "in-app"}
                      onChange={() => setDelivery("in-app")}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                        In-app only
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Show in the student dashboard.
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${delivery === "both" ? "border-sky-500 bg-sky-50 dark:bg-sky-950/30" : "border-slate-200 dark:border-slate-700"}`}
                  >
                    <input
                      type="radio"
                      name="announcement-delivery"
                      value="both"
                      checked={delivery === "both"}
                      onChange={() => setDelivery("both")}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                        In-app + email
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Send both delivery types.
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:justify-end sm:p-6">
              <button
                type="button"
                onClick={requestCloseComposer}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={requestPublish}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
              >
                <Send size={16} />{" "}
                {editingAnnouncement ? "Review changes" : "Review announcement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="publish-confirm-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Send size={20} />
            </div>
            <h2
              id="publish-confirm-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              {editingAnnouncement
                ? "Confirm announcement changes"
                : "Confirm announcement publishing"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {editingAnnouncement ? (
                <>
                  You are updating the saved record for{" "}
                  <strong>{title.trim()}</strong>. This will not resend emails
                  or rewrite notifications already delivered.
                </>
              ) : (
                <>
                  You are about to publish <strong>{title.trim()}</strong> to{" "}
                  <strong>{audienceLabel(audience)}</strong> using{" "}
                  <strong>
                    {delivery === "both"
                      ? "in-app notification and email"
                      : "in-app notification only"}
                  </strong>
                  .
                </>
              )}
            </p>
            {!editingAnnouncement && audience === "organization" && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                This targets all students with active enrollments. Please verify
                the message and audience before continuing.
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={publishing}
                onClick={() => {
                  setShowConfirmation(false);
                  setShowComposer(true);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
              >
                Go back
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={() => void confirmPublish()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {publishing
                  ? "Saving…"
                  : editingAnnouncement
                    ? "Confirm and save changes"
                    : "Confirm and publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmation && deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-announcement-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              <Trash2 size={20} />
            </div>
            <h2
              id="delete-announcement-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              Delete announcement record?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              You are removing <strong>{deleteTarget.title}</strong> from active
              announcement history. This is a soft delete; student notifications
              and emails already delivered will remain unchanged.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setDeleteTarget(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void confirmDelete()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {actionBusy ? "Deleting…" : "Confirm delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAnnouncement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setSelectedAnnouncement(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-detail-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                  Announcement details
                </p>
                <h2
                  id="announcement-detail-title"
                  className="mt-1 text-xl font-bold text-slate-900 dark:text-white"
                >
                  {selectedAnnouncement.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                aria-label="Close announcement details"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
              {selectedAnnouncement.message}
            </p>
            <dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Audience</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">
                  {audienceLabel(selectedAnnouncement.audience)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Published</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">
                  {formatDate(selectedAnnouncement.publishedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Recipients</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">
                  {selectedAnnouncement.recipients}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Delivery</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">
                  {selectedAnnouncement.delivery === "both"
                    ? "In-app + email"
                    : selectedAnnouncement.delivery === "in-app"
                      ? "In-app"
                      : "Recorded notification"}
                </dd>
              </div>
            </dl>
            {selectedAnnouncement.link && (
              <p className="mt-4 text-sm">
                Internal link:{" "}
                <span className="font-medium text-sky-700 dark:text-sky-300">
                  {selectedAnnouncement.link}
                </span>
              </p>
            )}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
