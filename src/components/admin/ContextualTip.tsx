import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Props {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
  position?: "top" | "bottom";
}

export default function ContextualTip({
  id,
  title,
  description,
  children,
  position = "top",
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(`tip-${id}`);

    if (!dismissed) {
      setVisible(true);
    }
  }, [id]);

  function dismissTip() {
    localStorage.setItem(`tip-${id}`, "true");
    setVisible(false);
  }

  return (
    <div className="relative inline-flex">
      {children}

      {visible && (
        <div
          className={`absolute z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl ${
            position === "top"
              ? "bottom-full left-1/2 mb-4 -translate-x-1/2"
              : "left-1/2 top-full mt-4 -translate-x-1/2"
          }`}
        >
          <button
            onClick={dismissTip}
            className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Dismiss tip"
          >
            <X size={16} />
          </button>

          <div className="pr-5">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>

            <p className="mt-2 text-xs font-medium">
              {description}
            </p>
          </div>

          <button
            onClick={dismissTip}
            className="mt-4 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition hover:opacity-90"
          >
            Got it
          </button>

          <div
            className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-slate-200 bg-white ${
              position === "top"
                ? "bottom-[-7px] border-b border-r"
                : "top-[-7px] border-l border-t"
            }`}
          />
        </div>
      )}
    </div>
  );
}
