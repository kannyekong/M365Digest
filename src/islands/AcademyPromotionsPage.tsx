import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Shapes,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "../lib/superbase";
import { ToastContainer, toast } from "react-toastify";
import ConfirmModal from "./ConfirmModal";

type BackgroundStyle = "ocean" | "sunset" | "forest" | "midnight";

type Promotion = {
  id: string;
  title: string;
  description: string;
  eyebrow: string;
  buttonLabel: string;
  destinationUrl: string;
  backgroundStyle: BackgroundStyle;
  imageUrl: string | null;
  displayOrder: number;
  isPublished: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type PromotionForm = Omit<Promotion, "id" | "createdAt" | "updatedAt">;

// Defines the background and foreground colours for each promotion theme.
const promotionThemeClasses = {
  ocean: {
    background: "bg-gradient-to-br from-sky-600 via-blue-600 to-cyan-700",
    text: "text-white",
    mutedText: "text-sky-50",
    button: "bg-white text-sky-800 hover:bg-sky-50",
  },
  sunset: {
    background: "bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600",
    text: "text-white",
    mutedText: "text-orange-50",
    button: "bg-white text-rose-700 hover:bg-rose-50",
  },
  forest: {
    background: "bg-gradient-to-br from-emerald-700 via-green-700 to-teal-800",
    text: "text-white",
    mutedText: "text-emerald-50",
    button: "bg-white text-emerald-800 hover:bg-emerald-50",
  },
  midnight: {
    background: "bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950",
    text: "text-white",
    mutedText: "text-slate-200",
    button: "bg-white text-slate-950 hover:bg-slate-100",
  },
} as const;

/* Defines explicit CSS gradients so the preview does not depend on Tailwind generating dynamic gradient utilities. */
const previewBackgrounds: Record<BackgroundStyle, string> = {
  ocean: "linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #0e7490 100%)",
  sunset: "linear-gradient(135deg, #f97316 0%, #f43f5e 50%, #db2777 100%)",
  forest: "linear-gradient(135deg, #047857 0%, #15803d 50%, #115e59 100%)",
  midnight: "linear-gradient(135deg, #020617 0%, #172554 50%, #312e81 100%)",
};

const emptyForm: PromotionForm = {
  title: "",
  description: "",
  eyebrow: "CloudTweak Academy",
  buttonLabel: "Explore now",
  destinationUrl: "/student/courses",
  backgroundStyle: "ocean",
  imageUrl: null,
  displayOrder: 0,
  isPublished: false,
  startsAt: null,
  endsAt: null,
};

const backgrounds: Record<BackgroundStyle, string> = {
  ocean: "from-sky-600 via-blue-600 to-indigo-700",
  sunset: "from-orange-500 via-rose-500 to-fuchsia-700",
  forest: "from-emerald-600 via-teal-600 to-cyan-800",
  midnight: "from-slate-900 via-indigo-950 to-violet-900",
};

const backgroundOptions: BackgroundStyle[] = [
  "ocean",
  "sunset",
  "forest",
  "midnight",
];

// Converts a database timestamp into a value suitable for datetime-local inputs.
function toLocalDateTime(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );

  return localDate.toISOString().slice(0, 16);
}

// Converts a local date-time input into an ISO timestamp for the API.
function toIsoDateTime(value: string): string | null {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function AcademyPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState<PromotionForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(
    null
  );

  // Prevents duplicate deletion requests.
  const [deleting, setDeleting] = useState(false);
  // Calls the admin API with the current authenticated Supabase access token.
  const apiRequest = useCallback(
    async (method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown) => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Your admin session has expired. Sign in again.");
      }

      const response = await fetch("/api/admin/academy/promotions", {
        method,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        promotions?: Promotion[];
        id?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "The request could not be completed."
        );
      }

      return result;
    },
    []
  );

  // Loads all promotion records, including unpublished drafts.
  const loadPromotions = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await apiRequest("GET");
      setPromotions(result.promotions ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Promotions could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    void loadPromotions();
  }, [loadPromotions, retryKey]);

  // Opens a clean editor for a new promotion.
  function createPromotion() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      displayOrder: promotions.length,
    });
    setErrorMessage("");
    setShowEditor(true);
  }

  // Copies a selected promotion into the editor without mutating the list.
  function editPromotion(promotion: Promotion) {
    setEditingId(promotion.id);
    setForm({
      title: promotion.title,
      description: promotion.description,
      eyebrow: promotion.eyebrow,
      buttonLabel: promotion.buttonLabel,
      destinationUrl: promotion.destinationUrl,
      backgroundStyle: promotion.backgroundStyle,
      imageUrl: promotion.imageUrl,
      displayOrder: promotion.displayOrder,
      isPublished: promotion.isPublished,
      startsAt: promotion.startsAt,
      endsAt: promotion.endsAt,
    });
    setErrorMessage("");
    setShowEditor(true);
  }

  // Validates and saves the promotion through the protected server endpoint.
  async function savePromotion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");

    const payload = {
      ...form,
      startsAt: form.startsAt ? toIsoDateTime(form.startsAt) : null,
      endsAt: form.endsAt ? toIsoDateTime(form.endsAt) : null,
    };

    // Displays a toast when a promotion is saved or when saving fails.
    try {
      await apiRequest(editingId ? "PATCH" : "POST", {
        ...payload,
        ...(editingId ? { id: editingId } : {}),
      });

      toast.success(
        editingId
          ? "Promotion updated successfully."
          : "Promotion created successfully."
      );

      setShowEditor(false);
      await loadPromotions();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The promotion could not be saved."
      );
    } finally {
      // Always reset the saving state, whether saving succeeds or fails.
      setSaving(false);
    }
  }

  // Changes publication status while preserving the other promotion fields.
  async function togglePublication(promotion: Promotion) {
    setErrorMessage("");

    try {
      await apiRequest("PATCH", {
        id: promotion.id,
        title: promotion.title,
        description: promotion.description,
        eyebrow: promotion.eyebrow,
        buttonLabel: promotion.buttonLabel,
        destinationUrl: promotion.destinationUrl,
        backgroundStyle: promotion.backgroundStyle,
        imageUrl: promotion.imageUrl,
        displayOrder: promotion.displayOrder,
        isPublished: !promotion.isPublished,
        startsAt: promotion.startsAt,
        endsAt: promotion.endsAt,
      });

      toast.success(
        promotion.isPublished
          ? "Promotion unpublished."
          : "Promotion published."
      );

      await loadPromotions();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Publication status could not be changed."
      );
    }
  }

  // Deletes a promotion only after explicit confirmation.
  async function deletePromotion(promotion: Promotion) {
    setPromotionToDelete(null);
    setErrorMessage("");

    try {
      await apiRequest("DELETE", { id: promotion.id });
      toast.success("Promotion deleted.");
      await loadPromotions();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Promotion could not be deleted."
      );
    }
  }

  // Sends the complete reordered ID list to the API.
  async function movePromotion(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= promotions.length) return;

    const reordered = [...promotions];
    [reordered[index], reordered[nextIndex]] = [
      reordered[nextIndex],
      reordered[index],
    ];

    setPromotions(reordered);
    setErrorMessage("");

    try {
      await apiRequest("PATCH", {
        orderedIds: reordered.map((promotion) => promotion.id),
      });

      toast.success("Promotion order updated.");
      await loadPromotions();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The order could not be saved."
      );
      await loadPromotions();
    }
  }

  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
  // Displays three promotions per page.
  const pageSize = 3;

  // Calculates how many pages are required.
  const totalPages = Math.max(1, Math.ceil(promotions.length / pageSize));

  // Keeps the current page within the available page range.
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Selects the promotions displayed on the current page.
  const paginatedPromotions = promotions.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
            Promotional banners
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Manage the promotional slides that appear after the student's
            welcome banner.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            type="button"
            onClick={createPromotion}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus size={17} />
            New promotion
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total promotions",
            value: promotions.length,
            icon: Megaphone,
            iconBg: "bg-blue-100 dark:bg-blue-950",
            iconColor: "text-blue-700 dark:text-blue-300",
          },
          {
            label: "Published",
            value: promotions.filter((item) => item.isPublished).length,
            icon: CheckCircle2,
            iconBg: "bg-emerald-100 dark:bg-emerald-950",
            iconColor: "text-emerald-700 dark:text-emerald-300",
          },
          {
            label: "Drafts",
            value: promotions.filter((item) => !item.isPublished).length,
            icon: FileText,
            iconBg: "bg-amber-100 dark:bg-amber-950",
            iconColor: "text-amber-700 dark:text-amber-300",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {stat.label}
              </p>
              <p className="mt-4 text-3xl font-bold text-slate-950 dark:text-white">
                {stat.value}
              </p>
            </div>

            <div
              className={`flex p-2 rounded-lg shrink-0 items-center justify-center rounded-[30px] ${stat.iconBg}`}
            >
              <stat.icon
                size={20}
                strokeWidth={1.8}
                className={stat.iconColor}
              />
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <RefreshCw className="mx-auto animate-spin text-primary" size={24} />
          <p className="mt-3 text-sm text-slate-500">Loading promotions…</p>
        </div>
      ) : promotions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <Megaphone className="mx-auto text-slate-400" size={34} />
          <h2 className="mt-4 font-semibold text-slate-900 dark:text-white">
            No promotions yet
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Create your first banner to promote a course, announcement, or
            Academy offer.
          </p>
          <button
            type="button"
            onClick={createPromotion}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            Create promotion
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedPromotions.map((promotion, pageIndex) => {
            const index = (safeCurrentPage - 1) * pageSize + pageIndex;

            const gradientStyles: Record<string, string> = {
              ocean:
                "linear-gradient(120deg, #075985 0%, #2563eb 55%, #0f766e 100%)",
              sunset:
                "linear-gradient(120deg, #9a3412 0%, #e11d48 55%, #7c2d12 100%)",
              forest:
                "linear-gradient(120deg, #14532d 0%, #047857 55%, #365314 100%)",
              midnight:
                "linear-gradient(120deg, #020617 0%, #312e81 55%, #164e63 100%)",
            };

            return (
              <article
                key={promotion.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div
                  className="relative overflow-hidden p-6 text-white sm:p-8"
                  style={{
                    background:
                      gradientStyles[promotion.backgroundStyle] ??
                      gradientStyles.ocean,
                  }}
                >
                  {promotion.imageUrl && (
                    <img
                      src={promotion.imageUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}

                  {promotion.imageUrl && (
                    <div className="absolute inset-0 bg-slate-950/60" />
                  )}

                  <div className="relative max-w-2xl">
                    {promotion.eyebrow && (
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
                        {promotion.eyebrow}
                      </p>
                    )}

                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      {promotion.title}
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">
                      {promotion.description ||
                        "Your promotion description will appear here."}
                    </p>

                    <span className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900">
                      {promotion.buttonLabel}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Order {index + 1}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          promotion.isPublished
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}
                      >
                        {promotion.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>

                    <p className="mt-2 truncate text-sm text-slate-500 dark:text-slate-400">
                      Destination: {promotion.destinationUrl}
                    </p>

                    {(promotion.startsAt || promotion.endsAt) && (
                      <p className="mt-1 text-xs text-slate-400">
                        Schedule:{" "}
                        {promotion.startsAt
                          ? new Date(promotion.startsAt).toLocaleString()
                          : "No start date"}
                        {" — "}
                        {promotion.endsAt
                          ? new Date(promotion.endsAt).toLocaleString()
                          : "No end date"}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void movePromotion(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${promotion.title} up`}
                      className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ArrowUp size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => void movePromotion(index, 1)}
                      disabled={index === promotions.length - 1}
                      aria-label={`Move ${promotion.title} down`}
                      className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ArrowDown size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => editPromotion(promotion)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => void togglePublication(promotion)}
                      className="rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                    >
                      {promotion.isPublished ? "Unpublish" : "Publish"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPromotionToDelete(promotion)}
                      disabled={deleting}
                      aria-label={`Delete ${promotion.title}`}
                      className="rounded-lg border border-red-200 p-2.5 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {(safeCurrentPage - 1) * pageSize + 1}–
              {Math.min(safeCurrentPage * pageSize, promotions.length)} of{" "}
              {promotions.length} promotions
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                className="rounded-full border border-slate-200 p-3 text-sm disabled:opacity-40 dark:border-slate-700"
              >
                <ChevronLeft size={20} />
              </button>

              <span className="text-sm text-slate-500 dark:text-slate-400">
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={safeCurrentPage === totalPages}
                className="border border-slate-200 p-3 rounded-full text-sm disabled:opacity-40 dark:border-slate-700"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditor && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowEditor(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="promotion-editor-title"
            className="mx-auto my-4 max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 sm:my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
              <div>
                <h2
                  id="promotion-editor-title"
                  className="text-xl font-bold text-slate-950 dark:text-white"
                >
                  {editingId ? "Edit promotion" : "Create promotion"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Configure the content and appearance of the banner.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                disabled={saving}
                aria-label="Close editor"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={savePromotion}>
              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="promotion-title"
                      className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Heading *
                    </label>
                    <input
                      id="promotion-title"
                      className={fieldClass}
                      value={form.title}
                      onChange={(event) =>
                        setForm({ ...form, title: event.target.value })
                      }
                      maxLength={120}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="promotion-description"
                      className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Description
                    </label>
                    <textarea
                      id="promotion-description"
                      className={fieldClass}
                      rows={4}
                      maxLength={500}
                      value={form.description}
                      onChange={(event) =>
                        setForm({ ...form, description: event.target.value })
                      }
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      {form.description.length}/500 characters
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="promotion-eyebrow"
                      className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Small label
                    </label>
                    <input
                      id="promotion-eyebrow"
                      className={fieldClass}
                      value={form.eyebrow}
                      maxLength={80}
                      onChange={(event) =>
                        setForm({ ...form, eyebrow: event.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="promotion-button"
                        className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                      >
                        Button label *
                      </label>
                      <input
                        id="promotion-button"
                        className={fieldClass}
                        value={form.buttonLabel}
                        onChange={(event) =>
                          setForm({ ...form, buttonLabel: event.target.value })
                        }
                        maxLength={40}
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="promotion-destination"
                        className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                      >
                        Internal destination *
                      </label>
                      <input
                        id="promotion-destination"
                        className={fieldClass}
                        value={form.destinationUrl}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            destinationUrl: event.target.value,
                          })
                        }
                        placeholder="/student/courses"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="promotion-image"
                      className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Optional HTTPS image URL
                    </label>
                    <input
                      id="promotion-image"
                      type="url"
                      className={fieldClass}
                      value={form.imageUrl ?? ""}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          imageUrl: event.target.value || null,
                        })
                      }
                      placeholder="https://..."
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Use a publicly accessible HTTPS image. Without an image,
                      the selected gradient is used.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="promotion-background"
                      className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Background style
                    </label>
                    <select
                      id="promotion-background"
                      className={fieldClass}
                      value={form.backgroundStyle}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          backgroundStyle: event.target
                            .value as BackgroundStyle,
                        })
                      }
                    >
                      {backgroundOptions.map((style) => (
                        <option key={style} value={style}>
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    style={{
                      backgroundImage: previewBackgrounds[form.backgroundStyle],
                      backgroundColor: "#172554",
                    }}
                    className="relative min-h-64 overflow-hidden rounded-2xl p-6 text-white shadow-lg sm:p-8"
                  >
                    {form.imageUrl && (
                      <img
                        src={form.imageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}

                    {form.imageUrl && (
                      <div className="absolute inset-0 bg-slate-950/60" />
                    )}

                    <div className="relative z-10 max-w-xl space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-white/90">
                        {form.eyebrow || "CloudTweak Academy"}
                      </p>

                      <h3 className="text-2xl font-bold text-white sm:text-3xl">
                        {form.title || "Your promotional heading"}
                      </h3>

                      <p className="text-sm leading-6 text-white/95">
                        {form.description ||
                          "Your promotion description will appear here."}
                      </p>

                      <span className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900">
                        {form.buttonLabel || "Explore now"}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="promotion-start"
                        className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                      >
                        Start date (optional)
                      </label>
                      <input
                        id="promotion-start"
                        type="datetime-local"
                        className={fieldClass}
                        value={toLocalDateTime(form.startsAt)}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            startsAt: event.target.value || null,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="promotion-end"
                        className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                      >
                        End date (optional)
                      </label>
                      <input
                        id="promotion-end"
                        type="datetime-local"
                        className={fieldClass}
                        value={toLocalDateTime(form.endsAt)}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            endsAt: event.target.value || null,
                          })
                        }
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          isPublished: event.target.checked,
                        })
                      }
                      className="mt-1 h-4 w-4 accent-primary"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                        Publish promotion
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Published promotions appear to students only while their
                        schedule is active.
                      </span>
                    </span>
                  </label>

                  <div>
                    <label
                      htmlFor="promotion-order"
                      className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Display order
                    </label>
                    <input
                      id="promotion-order"
                      type="number"
                      min={0}
                      max={100000}
                      step={1}
                      className={fieldClass}
                      value={form.displayOrder}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          displayOrder: Number(event.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {errorMessage && (
                <p
                  role="alert"
                  className="mx-5 mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300 sm:mx-6"
                >
                  {errorMessage}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 p-5 dark:border-slate-800 sm:p-6">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowEditor(false)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Save size={16} />
                  {saving ? "Saving…" : "Save promotion"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        closeOnClick
        pauseOnHover={false}
        pauseOnFocusLoss={false}
        newestOnTop
        limit={3}
        theme="colored"
      />

      <ConfirmModal
        open={promotionToDelete !== null}
        title="Delete promotion?"
        message={`Are you sure you want to delete "${promotionToDelete?.title ?? ""}"? This action cannot be undone.`}
        confirmText="Delete promotion"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={() => {
          if (promotionToDelete) {
            void deletePromotion(promotionToDelete);
          }
        }}
        onCancel={() => {
          if (!deleting) {
            setPromotionToDelete(null);
          }
        }}
      />
    </div>
  );
}
