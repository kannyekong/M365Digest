import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type AdminTheme = "light" | "dark";

const ADMIN_THEME_STORAGE_KEY = "admin-theme";
const ADMIN_THEME_SELECTOR = ".admin-theme";

/**
 * Applies the selected theme to every admin theme wrapper on the page.
 */
function applyAdminTheme(theme: AdminTheme) {
  // Check whether the selected theme is dark.
  const isDark = theme === "dark";

  // Apply or remove the dark class from every admin theme wrapper.
  document
    .querySelectorAll<HTMLElement>(ADMIN_THEME_SELECTOR)
    .forEach((element) => {
      element.classList.toggle("dark", isDark);
    });
}

/**
 * Retrieves the previously saved admin theme.
 */
function getSavedAdminTheme(): AdminTheme | null {
  // Read the saved theme value from local storage.
  const savedTheme = localStorage.getItem(ADMIN_THEME_STORAGE_KEY);

  // Return the saved theme only when it is a supported value.
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return null;
}

/**
 * Determines the preferred initial admin theme.
 */
function getInitialAdminTheme(): AdminTheme {
  // Use the previously selected theme when one exists.
  const savedTheme = getSavedAdminTheme();

  if (savedTheme) {
    return savedTheme;
  }

  // Fall back to the user's operating system theme preference.
  const prefersDarkMode = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;

  return prefersDarkMode ? "dark" : "light";
}

/**
 * Saves the selected admin theme in local storage.
 */
function saveAdminTheme(theme: AdminTheme) {
  // Persist the selected theme between page visits.
  localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
}

/**
 * Displays a button for switching the admin dashboard theme.
 */
export default function AdminThemeToggle() {
  // Store the currently active admin theme.
  const [theme, setTheme] = useState<AdminTheme>("light");

  // Track whether the component has loaded in the browser.
  const [mounted, setMounted] = useState(false);

  // Load and apply the saved or preferred theme after hydration.
  useEffect(() => {
    // Determine which theme should be active initially.
    const initialTheme = getInitialAdminTheme();

    // Apply the initial theme to every admin theme wrapper.
    applyAdminTheme(initialTheme);

    // Store the active theme in the component state.
    setTheme(initialTheme);

    // Mark the component as mounted.
    setMounted(true);
  }, []);

  /**
   * Switches between the light and dark admin themes.
   */
  function handleThemeToggle() {
    // Determine the next theme based on the current theme.
    const nextTheme: AdminTheme = theme === "dark" ? "light" : "dark";

    // Apply the next theme to every matching admin wrapper.
    applyAdminTheme(nextTheme);

    // Save the next theme for future visits.
    saveAdminTheme(nextTheme);

    // Update the component state.
    setTheme(nextTheme);
  }

  // Avoid displaying the wrong icon before the saved theme is loaded.
  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        aria-label="Loading theme preference"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 opacity-70"
      >
        <Moon size={18} />
      </button>
    );
  }

  // Determine whether dark mode is currently active.
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={handleThemeToggle}
      aria-label={
        isDark
          ? "Switch admin dashboard to light theme"
          : "Switch admin dashboard to dark theme"
      }
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="
        flex
        h-10
        w-10
        items-center
        justify-center
        rounded-xl
        border
        border-slate-200
        bg-white
        text-slate-700
        transition
        duration-200
        hover:bg-slate-100
        focus:outline-none
        focus:ring-2
        focus:ring-primary/30
        dark:border-slate-700
        dark:bg-slate-900
        dark:text-slate-200
        dark:hover:bg-slate-800
      "
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
