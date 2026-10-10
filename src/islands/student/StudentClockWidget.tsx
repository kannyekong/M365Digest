import { useEffect, useState } from "react";

interface StudentClockWidgetProps {
  location?: string;
  timezone?: string;
}

/**
 * Displays the current local time and date for the configured student location.
 */
export default function StudentClockWidget({
  location = "Lagos, Nigeria",
  timezone = "Africa/Lagos",
}: StudentClockWidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  /**
   * Updates the displayed clock every second.
   */
  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  /**
   * Formats the current time using the configured timezone.
   */
  const formattedTime = new Intl.DateTimeFormat("en-NG", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(currentTime);

  /**
   * Formats the current calendar date using the configured timezone.
   */
  const formattedDate = new Intl.DateTimeFormat("en-NG", {
    timeZone: timezone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(currentTime);

  return (
    <div>
      <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
        {formattedTime}
      </p>
      <div className="flex items-center text-sm text-slate-400 dark:text-slate-400">
        <span>
          {formattedDate} • {location}
        </span>
      </div>
    </div>
  );
}
