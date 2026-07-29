import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getBootcampSettings, updateBootcampSettings } from "../lib/bootcamp";
import { Typewriter } from "react-simple-typewriter";
import ImageUploader from "../blog/ImageUploader";

export default function BootcampSettings() {
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await getBootcampSettings();

      if (error) {
        toast.error(error.message);
        return;
      }

      setSettings(data);

      setLoading(false);
    }

    load();
  }, []);

  async function save() {
    setSaving(true);

    const { error } = await updateBootcampSettings(settings.id, settings);

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Bootcamp settings updated.");
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Bootcamp Settings
          </h1>

          <p className="mt-1 text-slate-500 text-xs">
            Manage your bootcamp landing page without editing code.
          </p>
        </div>

        <button
          onClick={save}
          className="rounded-xl bg-gradient-to-r from-red-500 via-pink-500 to-orange-400 px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.02]"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
      <div className="grid grid-cols-12 gap-6 w-full">
        <div className=" col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-bold">Hero Section</h2>

          <div className="grid gap-6">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Hero Prefix
              </label>

              <input
                value={settings.hero_prefix ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    hero_prefix: e.target.value,
                  })
                }
                placeholder="M365 Bootcamp:"
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Hero Suffix
              </label>

              <input
                value={settings.hero_suffix ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    hero_suffix: e.target.value,
                  })
                }
                placeholder="6 Weeks Admin Mastery of"
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold">
                Rotating Words{" "}
                <span className="font-light">
                  (One word or phrase per line.)
                </span>
              </label>

              <textarea
                rows={4}
                value={(settings.hero_rotating_words ?? []).join("\n")}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    hero_rotating_words: e.target.value
                      .split("\n")
                      .map((word) => word.trim())
                      .filter(Boolean),
                  })
                }
                className="w-full rounded-xl border border-slate-300 p-3 font-mono"
              />
            </div>

            {/* HERO PREVIEW */}
            <div className="rounded-2xl bg-slate-50 p-6 border border-slate-200">
              <p className="mb-5 text-sm font-semibold text-slate-500">
                Live Preview
              </p>

              <h2 className="text-3xl font-bold leading-tight">
                {settings.hero_prefix}

                <br />

                {settings.hero_suffix}

                <br />

                <span className="text-red-600">
                  <Typewriter
                    words={
                      Array.isArray(settings?.hero_rotating_words)
                        ? settings.hero_rotating_words
                        : [
                            "Exchange",
                            "SharePoint",
                            "Entra ID",
                            "OneDrive",
                            "Security",
                            "Teams",
                          ]
                    }
                    loop={0} // Infinite
                    cursor
                    cursorStyle="|"
                    typeSpeed={70}
                    deleteSpeed={50}
                    delaySpeed={2000}
                  />
                </span>
              </h2>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold">
                Hero Description{" "}
                <span className="font-light">
                  (This appears below the hero heading on the public page.)
                </span>
              </label>

              <textarea
                rows={4}
                value={settings.hero_subtitle ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    hero_subtitle: e.target.value,
                  })
                }
                placeholder="Describe the bootcamp..."
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </div>
          </div>
        </div>

        <div className="col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-bold">Registration</h2>

          <div className="grid gap-3 md:grid-cols-1">
            {/* Next Cohort */}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Next Cohort
              </label>

              <input
                value={settings.next_cohort ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    next_cohort: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </div>

            {/* Registration Deadline */}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Registration Deadline
              </label>

              <input
                type="date"
                value={settings.registration_deadline ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    registration_deadline: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </div>

            {/* Seats */}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Seats Remaining
              </label>

              <input
                type="number"
                value={settings.seats_remaining ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    seats_remaining: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </div>

            {/* Registration */}

            <div className="flex items-center justify-between rounded-xl px-2 border border-slate-200 p-4">
              <div>
                <h3 className="font-semibold">Registration Status</h3>
              </div>

              <input
                type="checkbox"
                checked={settings.registration_open}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    registration_open: e.target.checked,
                  })
                }
                className="h-5 w-5 accent-red-600"
              />
            </div>

            {/* IMAGE UPLOADER CARD */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 mt-15 shadow-sm">
              <h2 className="text-xl font-bold">Hero Image</h2>
              <span className="font-light text-xs">
                (This appears by the hero heading on the public page.)
              </span>
              <ImageUploader
                bucket="bootcamp_images"
                value={settings.hero_image ?? ""}
                onChange={(url) =>
                  setSettings({
                    ...settings,
                    hero_image: url,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-bold">Pricing & Delivery</h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Original Price */}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Original Price (₦)
              </label>

              <input
                type="number"
                value={settings.price ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    price: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </div>

            {/* Discount Price */}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Discount Price (₦)
              </label>

              <input
                type="number"
                value={settings.discount_price ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    discount_price: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </div>

            {/* Duration */}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Duration
              </label>

              <input
                value={settings.duration ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    duration: e.target.value,
                  })
                }
                placeholder="6 Weeks"
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </div>

            {/* Delivery */}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Delivery Mode
              </label>

              <select
                value={settings.delivery_mode ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    delivery_mode: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 p-3"
              >
                <option value="">Select</option>
                <option>Online</option>
                <option>Physical</option>
                <option>Hybrid</option>
              </select>
            </div>

            {/* Schedule */}

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">
                Class Schedule
              </label>

              <input
                value={settings.class_schedule ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    class_schedule: e.target.value,
                  })
                }
                placeholder="Weekends • 10AM - 1PM (WAT)"
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </div>
          </div>
        </div>

        {/* SEO CARD */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-bold">SEO</h2>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                SEO Title
              </label>

              <input
                value={settings.seo_title ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    seo_title: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                SEO Description
              </label>

              <textarea
                rows={4}
                value={settings.seo_description ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    seo_description: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Canonical URL
              </label>

              <input
                value={settings.canonical_url ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    canonical_url: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
