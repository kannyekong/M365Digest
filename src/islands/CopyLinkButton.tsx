import { toast } from "react-hot-toast";

interface CopyLinkButtonProps {
  message?: string;
  className?: string;
  children: React.ReactNode;
}

export default function CopyLinkButton({
  message = "Article link copied!",
  className,
  children,
}: CopyLinkButtonProps) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(message);
    } catch {
      toast.error("Failed to copy article link.");
    }
  }

  return (
    <button onClick={handleCopy} className={className}>
      {children}
    </button>
  );
}
