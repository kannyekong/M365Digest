import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleHelp,
  Clock3,
  LoaderCircle,
  MessageSquareText,
  Send,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { getSession } from "../../lib/auth";

type SupportRequest = {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
};

const categories = [
  "Course access",
  "Payment",
  "Technical issue",
  "Certificate",
  "Account",
  "Other",
];

/**
 * Formats a support request date for the student portal.
 */
function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Recently"
    : new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

/**
 * Creates and displays a student support request.
 */
export default function StudentReportProblem() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Loads the authenticated student's previous support requests.
   */
  async function loadRequests() {
    try {
      const {
        data: { session },
      } = await getSession();

      if (!session) {
        window.location.replace("/student/login");
        return;
      }

      const response = await fetch("/api/student/support", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Support requests could not be loaded."
        );
      }

      setRequests(result.requests ?? []);
    } catch (error) {
      console.error("Failed to load support requests:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Support requests could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * Submits a new support request for the authenticated student.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!subject.trim() || !description.trim()) {
      toast.error("Please provide a subject and describe the problem.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await getSession();

      if (!session) {
        window.location.replace("/student/login");
        return;
      }

      const response = await fetch("/api/student/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          description: description.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Your support request could not be submitted."
        );
      }

      toast.success("Your support request has been submitted.");
      setSubject("");
      setDescription("");
      await loadRequests();
    } catch (error) {
      console.error("Failed to submit support request:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Your support request could not be submitted."
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <MessageSquareText size={21} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-950 dark:text-white">
                Tell us what happened
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Include enough detail for the Academy team to reproduce or
                understand the issue.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="support-category"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Category
              </label>
              <select
                id="support-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="support-subject"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Subject
              </label>
              <input
                id="support-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g. I cannot open Week 2 lessons"
                maxLength={160}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="support-description"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                What is the problem?
              </label>
              <textarea
                id="support-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={7}
                maxLength={5000}
                placeholder="Describe what you were doing, what you expected to happen, and what happened instead."
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <Send size={17} />
              )}
              {submitting ? "Submitting..." : "Submit request"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <CircleHelp className="text-primary" size={21} />
            <div>
              <h2 className="font-semibold text-slate-950 dark:text-white">
                Your support requests
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Track issues you have reported.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <LoaderCircle className="animate-spin text-primary" size={24} />
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
                <CheckCircle2 className="mx-auto text-slate-400" size={28} />
                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  No requests yet
                </p>
              </div>
            ) : (
              requests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950 dark:text-white">
                        {request.subject}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {request.category} · {formatDate(request.created_at)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        request.status === "open"
                          ? "bg-yellow-500 text-white"
                          : request.status === "resolved"
                            ? "bg-green-500 text-white"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      <Clock3 size={12} />
                      {request.status}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="colored"
      />
    </>
  );
}
