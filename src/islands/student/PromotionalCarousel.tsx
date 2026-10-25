import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Shapes } from "lucide-react";
import { supabase } from "../../lib/superbase";

type BackgroundStyle = "ocean" | "sunset" | "forest" | "midnight";

type Promotion = {
  id: string;
  title: string;
  description: string | null;
  eyebrow: string | null;
  button_label: string;
  destination_url: string;
  background_style: BackgroundStyle;
  image_url: string | null;
  display_order: number;
};

type PromotionalCarouselProps = {
  displayName: string;
};

const SLIDE_INTERVAL = 12000;

const gradients: Record<BackgroundStyle, string> = {
  ocean: "linear-gradient(110deg, #0284c7 0%, #2563eb 52%, #0e7490 100%)",
  sunset: "linear-gradient(110deg, #f97316 0%, #ec4899 52%, #4f46e5 100%)",
  forest: "linear-gradient(110deg, #047857 0%, #15803d 52%, #115e59 100%)",
  midnight: "linear-gradient(110deg, #020617 0%, #172554 52%, #312e81 100%)",
};

export default function PromotionalCarousel({
  displayName,
}: PromotionalCarouselProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Loads published promotions that are active within their scheduled dates.
  useEffect(() => {
    let isMounted = true;

    async function loadPromotions() {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("academy_promotions")
        .select(
          "id, title, description, eyebrow, button_label, destination_url, background_style, image_url, display_order"
        )
        .eq("is_published", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Failed to load academy promotions:", error);
        return;
      }

      if (isMounted) {
        setPromotions((data ?? []) as Promotion[]);
      }
    }

    void loadPromotions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Advances automatically through the welcome slide and available promotions.
  useEffect(() => {
    const slideCount = promotions.length + 1;

    if (slideCount <= 1) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, SLIDE_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [promotions.length]);

  const isWelcomeSlide = activeIndex === 0;
  const promotion = isWelcomeSlide ? null : promotions[activeIndex - 1];

  const backgroundStyle: BackgroundStyle =
    promotion?.background_style ?? "sunset";

  const backgroundImage = promotion?.image_url;

  return (
    <section
      aria-label="Student welcome and academy promotions"
      className="relative isolate h-[160px] overflow-hidden rounded-2xl px-5 py-5 text-white shadow-sm sm:h-[160px] sm:px-6 sm:py-8 md:h-[150px] md:px-7"
      style={{ background: gradients[backgroundStyle] }}
    >
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {backgroundImage && (
        <div aria-hidden="true" className="absolute inset-0 bg-slate-950/55" />
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -right-16 -top-28 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="absolute -bottom-32 left-1/3 h-52 w-52 rounded-full bg-teal-300/20 blur-3xl" />

        <Shapes
          className="absolute -right-6 top-1/2 h-40 w-40 -translate-y-1/2 rotate-[-10deg] text-white/13 sm:right-10 sm:h-44 sm:w-44 lg:right-28 lg:h-64 lg:w-64"
          strokeWidth={1}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        >
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-300/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />

          <div className="absolute right-[18%] top-8 h-32 w-32 rounded-full border border-white/10" />

          <div className="absolute right-[24%] top-16 h-20 w-20 rotate-12 rounded-3xl border border-white/10" />

          <div className="absolute -right-8 bottom-8 h-40 w-40 rotate-45 rounded-[2rem] border border-white/10" />

          <div className="absolute bottom-12 left-[42%] h-3 w-3 rounded-full bg-orange-300/60" />
          <div className="absolute right-[35%] top-12 h-2 w-2 rounded-full bg-sky-200/70" />
        </div>
      </div>

      <div
        key={promotion?.id ?? "welcome-slide"}
        className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
        aria-live="polite"
      >
        <div className="min-w-0 flex-1">
          {isWelcomeSlide ? (
            <>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
                Welcome back, {displayName}
              </h1>

              <p className="mt-1.5 max-w-2xl text-sm leading-5 text-white/90">
                Continue your learning journey, track your progress, and access
                your Academy courses from one place.
              </p>
            </>
          ) : promotion ? (
            <>
              {promotion.eyebrow && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/80">
                  {promotion.eyebrow}
                </p>
              )}

              <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
                {promotion.title}
              </h2>

              {promotion.description && (
                <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm leading-5 text-white/90">
                  {promotion.description}
                </p>
              )}
            </>
          ) : null}
        </div>

        <div className="relative z-10 shrink-0 sm:ml-auto">
          {isWelcomeSlide ? (
            <a
              href="/student/courses"
              className="inline-flex w-fit items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/80 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Browse My Courses
              <ArrowRight size={16} />
            </a>
          ) : promotion ? (
            <a
              href={promotion.destination_url}
              className="inline-flex w-fit items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-800 transition hover:bg-slate-100"
            >
              {promotion.button_label}
              <ArrowUpRight size={16} />
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
