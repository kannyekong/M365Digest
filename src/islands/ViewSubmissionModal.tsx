import { useState } from "react";
import { Eye, X } from "lucide-react";

interface Props {
  title: string;
  data: Record<string, any>;
}
const hiddenFields = ["id", "payload", "tally_submission_id"];

const preferredOrder = [
  "first_name",
  "last_name",
  "name",
  "email",
  "phone_number",
  "phone",
  "organization",
  "company",
  "job_title",
  "country",
  "timezone",
  "availability",
  "referral_source",
  "question",
  "project_details",
  "bootcamp_experience",
  "miscellaneous",
  "created_at",
  "ratings",
];

function formatLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: any) {
  if (value === null || value === undefined) return "-";

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return value;
}

function renderStars(rating: string) {
  const map: Record<string, number> = {
    Worst: 1,
    Bad: 2,
    Average: 3,
    Good: 4,
    Great: 5,
  };

  const value = map[rating] ?? 0;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={
            i < value ? "text-yellow-400 text-lg" : "text-slate-300 text-lg"
          }
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function ViewSubmissionModal({ title, data }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border p-2 hover:bg-slate-100 transition"
      >
        <Eye size={16} />
      </button>

      {open && (
        <>
          {/* Backdrop */}

          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}

          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="text-xl font-semibold">{title}</h2>

              <button onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 p-6 overflow-y-auto">
              {preferredOrder
                .filter((key) => key in data)
                .map((key) => {
                  if (key === "ratings") {
                    return (
                      <div key={key} className="border-b border-slate-100 pb-4">
                        <div className="mb-4 font-medium text-slate-700">
                          Ratings
                        </div>

                        <div className="space-y-3">
                          {Object.entries(data.ratings).map(
                            ([category, rating]) => (
                              <div
                                key={category}
                                className="flex items-center justify-between"
                              >
                                <span className="text-slate-600">
                                  {category}
                                </span>

                                <div className="flex items-center gap-3">
                                  {renderStars(rating as string)}

                                  <span className="text-sm text-slate-500">
                                    {rating as string}
                                  </span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={key}
                      className="flex border-b border-slate-100 pb-3"
                    >
                      <div className="w-48 font-medium text-slate-600">
                        {formatLabel(key)}
                      </div>

                      <div className="flex-1 break-words text-slate-900">
                        {key === "availability" ? (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              String(data[key]).toLowerCase().includes("yes")
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {formatValue(data[key])}
                          </span>
                        ) : key === "created_at" ? (
                          new Date(data[key]).toLocaleString()
                        ) : (
                          formatValue(data[key])
                        )}
                      </div>
                    </div>
                  );
                })}
              <details className="mt-8">
                <summary className="cursor-pointer text-sm font-medium text-slate-500">
                  Developer Tools
                </summary>

                <pre className="mt-4 overflow-auto rounded-lg bg-slate-100 p-4 text-xs">
                  {JSON.stringify(data.payload, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </>
      )}
    </>
  );
}
