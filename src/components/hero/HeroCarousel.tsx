import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { heroSlides } from "./heroSlides";

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  /**
   * Displays the previous slide.
   */
  function previousSlide() {
    setCurrentSlide((current) =>
      current === 0 ? heroSlides.length - 1 : current - 1
    );
  }

  /**
   * Displays the next slide.
   */
  function nextSlide() {
    setCurrentSlide((current) =>
      current === heroSlides.length - 1 ? 0 : current + 1
    );
  }

  /**
   * Automatically advances the carousel every 7 seconds.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  const slide = heroSlides[currentSlide];

  return (
    <section className="relative overflow-hidden">
      {/* Background Blur */}
      <div className="absolute left-24 top-20 h-40 w-40 rounded-full bg-pink-500/30 blur-3xl" />

      <div className="grid items-center gap-12 lg:grid-cols-2 md:mt-12">
        {/* Left Content */}
        <div>
          <div className="min-h-[170px]">
            <h1 className="text-4xl/tight md:text-5xl/tight xl:text-5xl/tight font-bold bg-gradient-to-r from-blue-500 dark:from-pink-600 via-blue-800 to-black dark:to-white bg-clip-text text-transparent">
              {slide.title}
            </h1>
          </div>
          <div className="min-h-[150px]">
            <p className="mt-2 text-lg leading-8 dark:text-white">
              {slide.description}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <a
              href={slide.primaryButton.href}
              className={`${slide.primaryButton.color} rounded-xl px-3 py-3 font-semibold text-white transition`}
            >
              {slide.primaryButton.text}
            </a>

            <a
              href={slide.secondaryButton.href}
              className={`${slide.secondaryButton.color} rounded-xl px-3 py-3 font-semibold text-white transition`}
            >
              {slide.secondaryButton.text}
            </a>
          </div>
        </div>

        {/* Right Image */}
        <div className="relative flex justify-center">
          <img src={slide.image} alt={slide.title} className="object-fit" />
        </div>
      </div>

      <div className="mt-10 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={previousSlide}
          aria-label="Previous slide"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-box-border bg-white/80 transition hover:bg-primary hover:text-white dark:bg-box-bg"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-box-border bg-white/80 transition hover:bg-primary hover:text-white dark:bg-box-bg"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
