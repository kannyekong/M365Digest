import { useEffect, useState } from "react";

interface SitePreloaderProps {
  logoSrc?: string;
  minimumDuration?: number;
}

/* Displays the site loader until the page finishes loading. */
export default function SitePreloader({
  logoSrc = "/logos/cloudtweaklogo.png",
  minimumDuration = 500,
}: SitePreloaderProps) {
  // Track whether the preloader should remain visible.
  const [isVisible, setIsVisible] = useState(true);

  // Hide the loader after the page has loaded and the minimum delay has passed.
  useEffect(() => {
    let timeoutId: number | undefined;

    const hidePreloader = () => {
      timeoutId = window.setTimeout(() => {
        setIsVisible(false);
      }, minimumDuration);
    };

    if (document.readyState === "complete") {
      hidePreloader();
    } else {
      window.addEventListener("load", hidePreloader, {
        once: true,
      });
    }

    return () => {
      window.removeEventListener("load", hidePreloader);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [minimumDuration]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="site-preloader fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-all duration-500 dark:bg-[#020617]"
      aria-label="Loading website"
      aria-live="polite"
      role="status"
    >
      <div className="flex w-full max-w-md flex-col items-center px-8">
        <div className="logo-wrapper">
          <img
            src={logoSrc}
            alt="CloudTweak"
            className="preloader-logo h-auto w-full max-w-[320px]"
          />
        </div>

        <div className="mt-10 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="progress-bar h-full rounded-full" />
        </div>

        <p className="mt-4 text-sm tracking-[0.25em] text-slate-500 dark:text-slate-400">
          LOADING
        </p>
      </div>

      <style>{`
        .logo-wrapper {
          animation: logo-float 2s ease-in-out infinite;
        }

        .preloader-logo {
          animation: logo-pulse 1.8s ease-in-out infinite;
        }

        .progress-bar {
          width: 40%;
          background: linear-gradient(
            90deg,
            #2563eb 0%,
            #3b82f6 50%,
            #ec4899 100%
          );
          animation: loading-progress 1.2s ease-in-out infinite;
        }

        @keyframes logo-float {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes logo-pulse {
          0%,
          100% {
            opacity: 0.88;
            filter: drop-shadow(0 0 8px rgb(37 99 235 / 20%));
            transform: scale(0.98);
          }

          50% {
            opacity: 1;
            filter:
              drop-shadow(0 0 14px rgb(37 99 235 / 35%))
              drop-shadow(0 0 20px rgb(236 72 153 / 18%));
            transform: scale(1);
          }
        }

        @keyframes loading-progress {
          0% {
            transform: translateX(-120%);
          }

          100% {
            transform: translateX(350%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .logo-wrapper,
          .preloader-logo,
          .progress-bar {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
