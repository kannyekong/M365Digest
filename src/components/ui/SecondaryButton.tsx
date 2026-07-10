import type { ButtonHTMLAttributes } from "react";

export default function SecondaryButton(
  props: ButtonHTMLAttributes<HTMLButtonElement>
) {
  return (
    <button
      {...props}
      className="
        rounded-xl
        border
        border-slate-300
        px-6
        py-3
        font-medium
        transition
        hover:bg-slate-100
      "
    />
  );
}
