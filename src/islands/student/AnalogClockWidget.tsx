import { useEffect, useState } from "react";

// Defines the clock data displayed by the widget.
interface ClockTime {
  hours: number;
  minutes: number;
  seconds: number;
  digitalTime: string;
  date: string;
}

// Defines the widget's configurable timezone.
interface StudentClockWidgetProps {
  timeZone?: string;
  location?: string;
}

// Creates a live analog and digital clock for the student dashboard.
export default function AnalogClockWidget({
  timeZone = "Africa/Lagos",
  location = "Lagos, Nigeria",
}: StudentClockWidgetProps) {
  // Creates the initial clock state using the configured timezone.
  const getClockTime = (): ClockTime => {
    const now = new Date();

    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);

    const getPart = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);

    return {
      hours: getPart("hour"),
      minutes: getPart("minute"),
      seconds: getPart("second"),
      digitalTime: new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).format(now),
      date: new Intl.DateTimeFormat("en-GB", {
        timeZone,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(now),
    };
  };

  // Uses a stable initial state so server and client render the same clock.
  const [clock, setClock] = useState<ClockTime | null>(null);

  // Starts the live clock after the component mounts in the browser.
  useEffect(() => {
    const updateClock = () => setClock(getClockTime());

    updateClock();

    const intervalId = window.setInterval(updateClock, 1000);

    return () => window.clearInterval(intervalId);
  }, [timeZone]);

  if (!clock) {
    return (
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto aspect-square w-full max-w-[140px]" />
      </section>
    );
  }

  // Calculates the rotation angle for each analog clock hand.
  const secondAngle = clock.seconds * 6;
  const minuteAngle = clock.minutes * 6 + clock.seconds * 0.1;
  const hourAngle = (clock.hours % 12) * 30 + clock.minutes * 0.5;

  return (
    <section className="w-full rounded-2xl bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="relative aspect-square w-full max-w-[120px]">
          <svg
            viewBox="0 0 200 200"
            role="img"
            aria-label={`Analog clock showing ${clock.digitalTime} in ${location}`}
            className="h-full w-full"
          >
            <circle
              cx="100"
              cy="100"
              r="94"
              className="fill-slate-50 stroke-slate-200 dark:fill-slate-800 dark:stroke-slate-700"
              strokeWidth="2"
            />

            {Array.from({ length: 60 }, (_, index) => {
              const angle = index * 6;
              const isHourMark = index % 5 === 0;

              return (
                <line
                  key={index}
                  x1="100"
                  y1={isHourMark ? 17 : 13}
                  x2="100"
                  y2={isHourMark ? 28 : 19}
                  transform={`rotate(${angle} 100 100)`}
                  stroke="currentColor"
                  className={
                    isHourMark
                      ? "text-black dark:text-slate-300"
                      : "text-slate-300 dark:text-slate-600"
                  }
                  strokeWidth={isHourMark ? 2.5 : 1}
                  strokeLinecap="round"
                />
              );
            })}

            {Array.from({ length: 12 }, (_, index) => {
              const number = index === 0 ? 12 : index;
              // Rounds SVG coordinates so server and client produce stable values.
              const angle = (index * 30 - 90) * (Math.PI / 180);
              const radius = 69;
              const x = Number((100 + radius * Math.cos(angle)).toFixed(4));
              const y = Number((100 + radius * Math.sin(angle)).toFixed(4));

              return (
                <text
                  key={number}
                  x={x}
                  y={y}
                  dominantBaseline="middle"
                  textAnchor="middle"
                  className="fill-slate-700 text-[12px] font-semibold dark:fill-slate-200"
                >
                  {number}
                </text>
              );
            })}

            <line
              x1="100"
              y1="100"
              x2="100"
              y2="62"
              transform={`rotate(${hourAngle} 100 100)`}
              stroke="currentColor"
              className="text-orange-500 dark:text-white"
              strokeWidth="5"
              strokeLinecap="round"
            />

            <line
              x1="100"
              y1="108"
              x2="100"
              y2="39"
              transform={`rotate(${minuteAngle} 100 100)`}
              stroke="currentColor"
              className="text-orange-500 dark:text-white"
              strokeWidth="3"
              strokeLinecap="round"
            />

            <line
              x1="100"
              y1="112"
              x2="100"
              y2="31"
              transform={`rotate(${secondAngle} 100 100)`}
              stroke="currentColor"
              className="text-orange-500 dark:text-white"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            <circle cx="100" cy="100" r="5" fill="currentColor" className="text-orange-500 dark:text-white" />
          </svg>
        </div>

        <div className="text-center">
          <p
            className="text-2xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-white"
            aria-live="off"
          >
            {clock.digitalTime}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {location} · WAT · UTC+1
          </p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            {clock.date}
          </p>
        </div>
      </div>
    </section>
  );
}
