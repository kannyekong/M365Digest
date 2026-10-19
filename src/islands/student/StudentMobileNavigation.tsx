import { useEffect, useState } from "react";
import StudentNotificationBell from "./StudentNotificationBell";

type Props = {
  currentPath?: string;
};

const navigationItems = [
  { label: "Dashboard Overview", href: "/student/dashboard", icon: "grid" },
  { label: "Explore Courses", href: "/student/courses", icon: "sparkles" },
  {
    label: "My Courses",
    href: "/student/courses/allcourses",
    icon: "graduation",
  },
  { label: "Resources", href: "/student/resources", icon: "library" },
  { label: "Live Sessions", href: "/student/live-sessions", icon: "screen" },
  { label: "My Progress", href: "/student/progress", icon: "book" },
  { label: "Certificates", href: "/student/certificates", icon: "award" },
  {
    label: "Payment History",
    href: "/student/payment-history",
    icon: "receipt",
  },
  { label: "Report a problem", href: "/student/report-problem", icon: "help" },
  { label: "Account Settings", href: "/student/settings", icon: "user" },
] as const;

// Renders a consistent line icon without adding an icon-library dependency.
function NavigationIcon({
  name,
}: {
  name: (typeof navigationItems)[number]["icon"];
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-5 w-5 shrink-0",
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
  };

  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
          <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
          <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
          <rect x="14.5" y="14.5" width="6" height="6" rx="1" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...common}>
          <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
          <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
          <path d="m5 3 .6 1.4L7 5l-1.4.6L5 7l-.6-1.4L3 5l1.4-.6L5 3Z" />
        </svg>
      );
    case "graduation":
      return (
        <svg {...common}>
          <path d="m2.5 9 9.5-5 9.5 5-9.5 5-9.5-5Z" />
          <path d="M6 11v5c3.7 3 8.3 3 12 0v-5" />
          <path d="M21.5 9v6" />
        </svg>
      );
    case "library":
      return (
        <svg {...common}>
          <path d="M4 4.5 8 3v17l-4 1.5v-17Z" />
          <path d="m11 3 4 1v17l-4-1V3Z" />
          <path d="m18 4 3 1v16l-3-1V4Z" />
        </svg>
      );
    case "screen":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="12" rx="1.5" />
          <path d="m8 21 4-5 4 5M12 16v5" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H20v17H5.5A2.5 2.5 0 0 1 3 17.5v-12Z" />
          <path d="M3 17.5A2.5 2.5 0 0 1 5.5 15H20M8 7h7" />
        </svg>
      );
    case "award":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="5" />
          <path d="m8.5 12-1 9 4.5-2.5 4.5 2.5-1-9" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...common}>
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      );
    case "help":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.6 2.6 0 1 1 4.6 1.7c-1.1 1.1-2.1 1.3-2.1 3M12 17.5h.01" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
  }
}

// Provides the mobile-only logo, hamburger button, and accessible slide-in navigation drawer.
export default function StudentMobileNavigation({ currentPath }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const path =
    currentPath ||
    (typeof window !== "undefined" ? window.location.pathname : "");

  // Closes the drawer with Escape and prevents background scrolling while it is open.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  // Marks the exact page or a nested page as active without matching unrelated prefixes.
  const isActive = (href: string) =>
    path === href ||
    (href !== "/student/dashboard" && path.startsWith(`${href}/`));

  return (
    <>
      <div className="flex items-center justify-between gap-4 py-3 md:hidden">
        <a
          href="/student/dashboard"
          aria-label="CloudTweak Academy dashboard"
          className="inline-flex min-w-0 items-center"
        >
          <img
            src="/logos/cloudtweaklogo.png"
            alt="CloudTweak Academy"
            className="h-auto w-[150px] max-w-full"
          />
        </a>

        <div className="flex flex-row p-2 gap-3">
          <StudentNotificationBell />
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open student navigation"
            aria-controls="student-mobile-navigation"
            aria-expanded={isOpen}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] md:hidden" role="presentation">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-slate-950/50 backdrop-blur-[1px]"
          />
          <nav
            id="student-mobile-navigation"
            className="absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            role="dialog"
            aria-modal="true"
            aria-label="Student navigation menu"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <a
                href="/student/dashboard"
                onClick={() => setIsOpen(false)}
                aria-label="CloudTweak Academy dashboard"
              >
                <img
                  src="/logos/cloudtweaklogo.png"
                  alt="CloudTweak Academy"
                  className="h-auto w-[145px]"
                />
              </a>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="px-3 py-4">
              <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Learner navigation
              </p>
              <ul className="space-y-1">
                {navigationItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${active ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"}`}
                      >
                        <NavigationIcon name={item.icon} />
                        <span>{item.label}</span>
                        {active && (
                          <span className="ml-auto h-2 w-2 rounded-full bg-orange-500" />
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="mt-auto border-t border-slate-200 px-5 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              CloudTweak Academy · Learn. Build. Get Certified.
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
