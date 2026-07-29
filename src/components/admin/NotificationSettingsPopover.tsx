import { useEffect, useRef, useState } from "react";
import { Settings2, X } from "lucide-react";
import NotificationSettings from "../notifications/NotificationSettings";

export default function NotificationSettingsPopover() {
  // Track whether the notification settings popup is visible.
  const [isOpen, setIsOpen] = useState(false);

  // Store a reference to the complete settings control and popup.
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close the popup when the user clicks outside it.
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Close the popup when the Escape key is pressed.
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        aria-label="Open notification settings"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
          isOpen
            ? "border-primary bg-primary/10 text-primary"
            : "border-box-border bg-white text-heading-2 hover:border-primary/40 hover:text-primary dark:bg-box-bg"
        }`}
      >
        <Settings2 className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notification settings"
          className="absolute right-0 top-full z-50 mt-3"
        >
          <div className="relative">
            <button
              type="button"
              aria-label="Close notification settings"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-heading-3 transition hover:bg-primary/10 hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>

            <NotificationSettings />
          </div>
        </div>
      )}
    </div>
  );
}
