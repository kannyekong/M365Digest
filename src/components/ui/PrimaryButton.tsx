import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export default function PrimaryButton({ children, loading, ...props }: Props) {
  return (
    <button
      {...props}
      className="
        inline-flex
        items-center
        justify-center
        rounded-xl
        bg-gradient-to-r
        from-primary
        to-blue-600
        px-6
        py-3
        font-semibold
        text-white
        shadow-lg
        transition-all
        duration-300
        hover:scale-[1.02]
        hover:shadow-xl
        disabled:cursor-not-allowed
        disabled:opacity-60
      "
    >
      {loading ? "Saving..." : children}
    </button>
  );
}
