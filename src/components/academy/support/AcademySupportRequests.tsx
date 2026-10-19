import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { getAdminSession } from "../../../lib/auth";
import { toast } from "react-toastify";

// Represents the student profile associated with a support request.
type StudentProfile = {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
  country: string | null;
  avatar_url: string | null;
};

type SupportRequest = {
  id: string;
  student_id: string;
  subject: string;
  category: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at?: string | null;
  student?: StudentProfile | null;
};

type StatusFilter = "all" | "open" | "resolved";
const PAGE_SIZE = 10;

/**
 * Tests the student-notification API using the current admin session.
 */
async function testStudentNotificationApi() {
  // Retrieve the current admin session through the existing helper.
  const { data, error } = await getAdminSession();
  const token = data.session?.access_token;

  // Stop if the admin session cannot be retrieved.
  if (error || !token) {
    console.error("Admin session unavailable:", error);
    return;
  }

  // Send a test announcement to the API.

  const response = await fetch("/api/admin/academy/student-notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      audience: "organization",
      title: "Academy announcement test",
      message: "This is a test of the student notification system.",
      link: "/student/notifications",
      sendEmail: true,
      emailOnlyTest: true,
    }),
  });

  // Print the response so we can diagnose any API errors.
  const result = await response.json();

  console.log("HTTP status:", response.status);
  console.log("API response:", result);
}

/** Sends a test announcement to the student associated with a selected support ticket. */
async function testNotificationForStudent(studentId: string) {
  const { data, error } = await getAdminSession();
  const token = data.session?.access_token;

  if (error || !token) {
    toast.error("Your admin session has expired. Please sign in again.");
    return;
  }

  try {
    const response = await fetch("/api/admin/academy/student-notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        audience: "student",
        studentId,
        title: "Your support request details",
        message:
          "This is a test of the CloudTweak Academy notification system.",
        link: "/student/notifications",
        sendEmail: true,
        emailOnlyTest: false,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error("Student notification test result:", result);
      toast.error(result.message || "The student notification test failed.");
      return;
    }

    toast.success(result.message || "Test notification sent successfully.");
  } catch (error) {
    console.error("Failed to test student notification:", error);
    toast.error("Unable to send the test notification.");
  }
}

/** Format a database timestamp for the support request table. */
function formatDate(value: string | null | undefined) {
  if (!value) return "—";
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

/** Render and manage student-created Academy support tickets. */
export default function AcademySupportRequests() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(
    null
  );

  /** Fetch support requests through the protected server-side admin API. */
  const loadRequests = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: sessionData, error: sessionError } =
        await getAdminSession();
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error(
          "Your admin session has expired. Please sign in again."
        );
      }

      const response = await fetch("/api/admin/academy/support-requests", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Support requests could not be loaded."
        );

      }
      setRequests((result.requests ?? []) as SupportRequest[]);
    } catch (error) {
      console.error("Failed to load Academy support requests:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Support requests could not be loaded."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /** Change an open ticket to resolved, or reopen a resolved ticket. */
  const updateStatus = useCallback(async (request: SupportRequest) => {
    const nextStatus = request.status === "open" ? "resolved" : "open";
    setUpdatingId(request.id);

    try {
      const { data: sessionData, error: sessionError } =
        await getAdminSession();
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error(
          "Your admin session has expired. Please sign in again."
        );

      }

      const response = await fetch("/api/admin/academy/support-requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ id: request.id, status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Ticket status could not be updated."
        );
      }
      const data = result.request as SupportRequest;

      setRequests((current) =>
        current.map((item) => (item.id === request.id ? data : item))
      );
      setSelectedRequest((current) =>
        current?.id === request.id ? data : current
      );
      toast.success(
        nextStatus === "resolved"
          ? "Support request closed."
          : "Support request reopened."
      );

    } catch (error) {
      console.error("Failed to update support request:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Ticket status could not be updated."
      );
    } finally {
      setUpdatingId(null);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === "all" || request.status === statusFilter;
      const matchesSearch =
        !term ||
        [
          request.subject,
          request.category,
          request.description,
          request.student_id,
          request.priority,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(term)
        );
      return matchesStatus && matchesSearch;
    });
  }, [requests, search, statusFilter]);

  // Reset pagination whenever the search or status filter changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // Calculate the number of pages and keep the selected page within bounds.
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / PAGE_SIZE)
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Select only the requests that belong to the current page.
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredRequests.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRequests, currentPage]);

  const openCount = requests.filter(
    (request) => request.status === "open"
  ).length;
  const resolvedCount = requests.filter(
    (request) => request.status === "resolved"
  ).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "All requests",
            value: requests.length,
            icon: MessageSquareText,
            style: "bg-blue-50 text-blue-700",
          },
          {
            label: "Open requests",
            value: openCount,
            icon: Clock3,
            style: "bg-amber-50 text-amber-700",
          },
          {
            label: "Closed requests",
            value: resolvedCount,
            icon: CheckCircle2,
            style: "bg-emerald-50 text-emerald-700",
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.style}`}
              >
                <Icon size={20} />
              </div>
              <p className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">
                {metric.value}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {metric.label}
              </p>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Student support requests
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review reported issues and update ticket status.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadRequests(true)}
            disabled={refreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
        </div>
        <div className="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 md:grid-cols-[1fr_190px]">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subject, category, description or student ID..."
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Closed</option>
          </select>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <LoaderCircle className="animate-spin text-primary" size={28} />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <MessageSquareText className="mx-auto text-slate-400" size={32} />
            <p className="mt-3 font-semibold text-slate-800 dark:text-white">
              No support requests found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-semibold">Request</th>
                  <th className="px-5 py-4 font-semibold">Student</th>
                  <th className="px-5 py-4 font-semibold">Priority</th>
                  <th className="px-5 py-4 font-semibold">Submitted</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(request)}
                        className="text-left font-semibold text-slate-900 hover:text-primary dark:text-white"
                      >
                        {request.subject}
                      </button>
                      <p className="mt-1 text-xs text-slate-500">
                        {request.category}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800 dark:text-white">
                        {request.student?.display_name ||
                          [
                            request.student?.first_name,
                            request.student?.last_name,
                          ]
                            .filter(Boolean)
                            .join(" ") ||
                          "Student"}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {request.student?.phone || "No phone provided"}
                      </div>
                    </td>
                    <td className="px-5 py-4 capitalize text-slate-600 dark:text-slate-300">
                      {request.priority || "normal"}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${request.status === "open" ? "bg-amber-100 text-amber-800" : request.status === "resolved" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}
                      >
                        {request.status === "resolved"
                          ? "Closed"
                          : request.status === "open"
                            ? "Open"
                            : request.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => void updateStatus(request)}
                        disabled={updatingId === request.id}
                        className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold disabled:opacity-50 ${request.status === "open" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"}`}
                      >
                        {updatingId === request.id ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : request.status === "open" ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <XCircle size={14} />
                        )}
                        {request.status === "open" ? "Close ticket" : "Reopen"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void testNotificationForStudent(request.student_id)
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <MessageSquareText size={16} />
                        Send test notification and email
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filteredRequests.length === 0
              ? "Showing 0 requests"
              : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                  currentPage * PAGE_SIZE,
                  filteredRequests.length
                )} of ${filteredRequests.length} requests`}
            {search.trim() || statusFilter !== "all"
              ? ` (filtered from ${requests.length} total)`
              : ""}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1 || filteredRequests.length === 0}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
              (page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  aria-current={currentPage === page ? "page" : undefined}
                  className={`min-w-9 rounded-lg px-3 py-2 text-sm font-semibold ${
                    currentPage === page
                      ? "bg-primary text-white"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {page}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={
                currentPage === totalPages || filteredRequests.length === 0
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {selectedRequest ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setSelectedRequest(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-detail-title"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {selectedRequest.category}
                </p>
                <h3
                  id="support-detail-title"
                  className="mt-1 text-xl font-bold text-slate-950 dark:text-white"
                >
                  {selectedRequest.subject}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Submitted {formatDate(selectedRequest.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </header>
            <div className="space-y-5 p-5">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Problem description
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {selectedRequest.description}
                </p>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Student profile ID</dt>
                  <dd className="mt-1 break-all text-sm font-medium text-slate-800 dark:text-white">
                    {selectedRequest.student_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Priority</dt>
                  <dd className="mt-1 text-sm font-medium capitalize text-slate-800 dark:text-white">
                    {selectedRequest.priority || "normal"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Last updated</dt>
                  <dd className="mt-1 text-sm text-slate-800 dark:text-white">
                    {formatDate(selectedRequest.updated_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Status</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800 dark:text-white">
                    {selectedRequest.status === "resolved" ? "Closed" : "Open"}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => void updateStatus(selectedRequest)}
                disabled={updatingId === selectedRequest.id}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {updatingId === selectedRequest.id ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {selectedRequest.status === "open"
                  ? "Close ticket"
                  : "Reopen ticket"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
