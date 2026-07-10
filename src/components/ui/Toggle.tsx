interface Props {
  checked: boolean;
  label: string;
  description?: string;
  onChange: (checked: boolean) => void;
}

export default function Toggle({
  checked,
  label,
  description,
  onChange,
}: Props) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
      <div>
        <p className="font-medium text-slate-800">{label}</p>

        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-all duration-300 ${
          checked ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
