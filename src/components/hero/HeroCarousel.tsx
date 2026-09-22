import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Rocket } from "lucide-react";

import { heroSlides } from "./heroSlides";

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Move to the previous slide while maintaining the carousel loop.
  function previousSlide() {
    setCurrentSlide((current) =>
      current === 0 ? heroSlides.length - 1 : current - 1
    );
  }

  // Move to the next slide while maintaining the carousel loop.
  function nextSlide() {
    setCurrentSlide((current) =>
      current === heroSlides.length - 1 ? 0 : current + 1
    );
  }

  // Automatically advance the carousel every seven seconds.
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
    <section className="relative isolate hidden overflow-hidden md:block">
      <div className="mx-auto w-full max-w-full px-6">
        <div className="grid min-h-[620px] items-center gap-10 lg:min-h-[680px] lg:grid-cols-2 lg:gap-14">
          {/* Content */}
          <div className="flex min-w-0 flex-col">
            {/* Fixed title area prevents slide changes from changing layout height */}
            <div className="flex h-[150px] items-start overflow-hidden lg:h-[190px]">
              <h1 className="bg-gradient-to-r from-blue-700 via-primary to-emerald-500 bg-clip-text text-4xl font-bold leading-[1.08] tracking-tight text-transparent sm:text-5xl lg:text-[3.5rem]">
                {slide.title}
              </h1>
            </div>

            {/* Fixed description area prevents viewport jumping */}
            <div className="mt-5 flex h-[150px] items-start overflow-hidden lg:h-[145px] dark:text-white">
              <p className="max-w-xl text-base leading-7 text-body-color sm:text-lg sm:leading-8">
                {slide.description}
              </p>
            </div>

            {/* CTA area has a fixed height as well */}
            <div className="mt-5 flex h-[58px] flex-wrap items-start gap-3">
              <a
                href="#tally-open=MeglOM&tally-layout=modal&tally-width=500&tally-emoji-animation=wave&tally-auto-close=2000&tally-form-events-forwarding=1"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <Rocket size={17} />
                <span>Request a Quote</span>
              </a>

              <a
                href="/solutions"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-box-border bg-box-bg px-5 text-sm font-semibold text-heading-1 transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <span>Explore our solutions</span>
                <ArrowRight size={16} />
              </a>
            </div>

            {/* Stable supporting information */}
            <div className="mt-7 flex min-h-[48px] flex-wrap items-center gap-x-6 gap-y-2 border-t border-box-border pt-5 text-xs font-medium text-body-color sm:text-sm dark:text-white">
              <span>Cloud Solutions</span>
              <span>AI & Automation</span>
              <span>Digital Transformation</span>
              <span>Digital Training</span>
            </div>
          </div>

          {/* Visual */}
          <div className="relative min-w-0">
            <div className="relative flex h-[320px] w-full items-center justify-center overflow-hidden sm:h-[380px] md:h-[440px] lg:h-[500px]">
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl dark:bg-gray-900">
                <img
                  key={slide.id}
                  src={slide.image}
                  alt={slide.title}
                  loading={currentSlide === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="h-full w-full object-cover transition-opacity duration-500 ease-in-out"
                />
              </div>
            </div>

            <div className="mt-5 flex h-10 items-center justify-between">
              <div
                className="flex items-center gap-2"
                aria-label="Carousel navigation"
              >
                {heroSlides.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                    aria-current={currentSlide === index ? "true" : undefined}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      currentSlide === index
                        ? "w-8 bg-primary"
                        : "w-1.5 bg-gray-300 dark:bg-gray-700"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={previousSlide}
                  aria-label="Previous slide"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-box-border bg-box-bg text-body-color transition hover:border-primary hover:text-primary"
                >
                  <ChevronLeft size={17} />
                </button>

                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Next slide"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-box-border bg-box-bg text-body-color transition hover:border-primary hover:text-primary"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
