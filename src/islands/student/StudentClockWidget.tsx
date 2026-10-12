import { useEffect, useState } from "react";

interface StudentClockWidgetProps {
  location?: string;
  timezone?: string;
}

const clockNumbers = Array.from({ length: 12 }, (_, index) => index + 1);

/**
 * Reads the clock's hour, minute, and second in the configured timezone.
 */
function getClockParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    hours: Number(values.hour) % 12,
    minutes: Number(values.minute),
    seconds: Number(values.second),
  };
}

/**
 * Renders a live analog clock and matching digital time for the student dashboard.
 */
export default function StudentClockWidget({
  location = "Lagos, Nigeria",
  timezone = "Africa/Lagos",
}: StudentClockWidgetProps) {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  /**
   * Refreshes the clock once per second and clears the interval on unmount.
   */
  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const { hours, minutes, seconds } = getClockParts(currentTime, timezone);
  const hourRotation = hours * 30 + minutes * 0.5;
  const minuteRotation = minutes * 6 + seconds * 0.1;
  const secondRotation = seconds * 6;

  const formattedTime = new Intl.DateTimeFormat("en-NG", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(currentTime);

  const formattedDate = new Intl.DateTimeFormat("en-NG", {
    timeZone: timezone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(currentTime);

  return (
    <section
      aria-label={`Current time in ${location}`}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Local time
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            {location}
          </p>
        </div>
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
      </div>

      <div className="mx-auto aspect-square w-full max-w-[172px]">
        <svg
          viewBox="0 0 200 200"
          role="img"
          aria-label={`Analog clock showing ${formattedTime}`}
          className="h-full w-full overflow-visible"
        >
          <circle cx="100" cy="100" r="94" className="fill-slate-50 stroke-slate-200 dark:fill-slate-950 dark:stroke-slate-700" strokeWidth="2" />
          <circle cx="100" cy="100" r="84" className="fill-white stroke-slate-100 dark:fill-slate-900 dark:stroke-slate-800" strokeWidth="1" />

          {Array.from({ length: 60 }, (_, index) => {
            const angle = (index * 6 * Math.PI) / 180;
            const major = index % 5 === 0;
            const innerRadius = major ? 73 : 78;
            const outerRadius = 84;
            const x1 = 100 + Math.sin(angle) * innerRadius;
            const y1 = 100 - Math.cos(angle) * innerRadius;
            const x2 = 100 + Math.sin(angle) * outerRadius;
            const y2 = 100 - Math.cos(angle) * outerRadius;

            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                className={major ? "text-slate-500 dark:text-slate-300" : "text-slate-300 dark:text-slate-700"}
                strokeWidth={major ? 2.5 : 1}
                strokeLinecap="round"
              />
            );
          })}

          {clockNumbers.map((number) => {
            const angle = (number * 30 * Math.PI) / 180;
            const x = 100 + Math.sin(angle) * 61;
            const y = 100 - Math.cos(angle) * 61;

            return (
              <text
                key={number}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-slate-700 text-[11px] font-semibold dark:fill-slate-200"
              >
                {number}
              </text>
            );
          })}

          <g transform={`rotate(${hourRotation} 100 100)`}>
            <line x1="100" y1="108" x2="100" y2="61" stroke="currentColor" className="text-slate-900 dark:text-white" strokeWidth="6" strokeLinecap="round" />
          </g>
          <g transform={`rotate(${minuteRotation} 100 100)`}>
            <line x1="100" y1="113" x2="100" y2="42" stroke="currentColor" className="text-slate-700 dark:text-slate-200" strokeWidth="4" strokeLinecap="round" />
          </g>
          <g transform={`rotate(${secondRotation} 100 100)`}>
            <line x1="100" y1="118" x2="100" y2="34" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="100" cy="127" r="3" fill="#f97316" />
          </g>
          <circle cx="100" cy="100" r="5" fill="#f97316" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>

      <p className="mt-3 text-center text-lg font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
        {formattedTime}
      </p>
      <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
        {formattedDate}
      </p>
    </section>
  );
}
