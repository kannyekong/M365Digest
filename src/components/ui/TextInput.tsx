import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function TextInput({ label, ...props }: Props) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <input
        {...props}
        className="
          w-full
          rounded-xl
          border
          border-slate-300
          bg-white
          px-4
          py-3
          text-sm
          outline-none
          transition
          focus:border-primary
          focus:ring-2
          focus:ring-primary/20
        "
      />
    </div>
  );
}
