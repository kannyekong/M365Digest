import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Rocket, Telescope } from "lucide-react";
import { heroSlides } from "./heroSlides";

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  /**
   * Displays the previous slide and loops back to the final slide
   * when the user is currently viewing the first slide.
   */
  function previousSlide() {
    setCurrentSlide((current) =>
      current === 0 ? heroSlides.length - 1 : current - 1
    );
  }

  /**
   * Displays the next slide and loops back to the first slide
   * when the user is currently viewing the final slide.
   */
  function nextSlide() {
    setCurrentSlide((current) =>
      current === heroSlides.length - 1 ? 0 : current + 1
    );
  }

  /**
   * Automatically advances the carousel every seven seconds.
   * The functional state update prevents stale slide values.
   */
  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentSlide((current) =>
        current === heroSlides.length - 1 ? 0 : current + 1
      );
    }, 7000);

    return () => window.clearInterval(interval);
  }, []);

  const slide = heroSlides[currentSlide];

  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-20 -z-10 h-40 w-40 rounded-full bg-pink-500/30 blur-3xl sm:left-24"
      />

      <div className="grid items-center gap-10 md:mt-12 lg:grid-cols-2 lg:gap-12">
        <div className="flex min-w-0 flex-col">
          <div className="flex min-h-[126px] items-start sm:min-h-[140px] md:min-h-[170px]">
            <h1 className="break-words bg-gradient-to-r from-blue-500 via-blue-800 to-black bg-clip-text text-3xl font-bold leading-tight text-transparent dark:from-pink-600 dark:to-white sm:text-4xl md:text-5xl">
              {slide.title}
            </h1>
          </div>

          <div className="min-h-[190px] sm:min-h-[165px] md:min-h-[150px]">
            <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-200 sm:text-base sm:leading-8">
              {slide.description}
            </p>
          </div>

          <div className="mt-6 flex min-h-[112px] flex-wrap content-start gap-4 sm:min-h-[52px]">
            <a
              href={slide.primaryButton.href}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-white transition ${slide.primaryButton.color}`}
            >
              <Rocket size={20} />
              <span>{slide.primaryButton.text}</span>
            </a>

            <a
              href={slide.secondaryButton.href}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-white transition ${slide.secondaryButton.color}`}
            >
              <Telescope size={20} />
              <span>{slide.secondaryButton.text}</span>
            </a>
          </div>
        </div>

        <div className="relative flex h-[280px] w-full items-center justify-center overflow-hidden sm:h-[340px] md:h-[400px] lg:h-[480px]">
          <img
            key={slide.id}
            src={slide.image}
            alt={slide.title}
            width={900}
            height={700}
            loading={currentSlide === 0 ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-contain object-center"
          />
        </div>
      </div>

      <div className="mt-8 flex min-h-10 items-center justify-center gap-4 sm:mt-10 sm:gap-6">
        <button
          type="button"
          onClick={previousSlide}
          aria-label="Previous slide"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-box-border bg-white/80 transition hover:bg-primary hover:text-white dark:bg-box-bg"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          {heroSlides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={currentSlide === index ? "true" : undefined}
              className={`h-3 rounded-full transition-all duration-300 ${
                currentSlide === index
                  ? "w-10 bg-primary"
                  : "w-3 bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next slide"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-box-border bg-white/80 transition hover:bg-primary hover:text-white dark:bg-box-bg"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
