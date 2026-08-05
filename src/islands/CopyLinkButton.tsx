import { toast } from "react-toastify";

interface CopyLinkButtonProps {
  url?: string;
  message?: string;
  className?: string;
}

/**
 * Copy the supplied URL and show a Toastify notification.
 */
export default function CopyLinkButton({
  url,
  message = "Article link copied!",
  className,
}: CopyLinkButtonProps) {
  /**
   * Copy the explicit URL or fall back to the current page URL.
   */
  async function handleCopy() {
    try {
      const linkToCopy = url ?? window.location.href;

      await navigator.clipboard.writeText(linkToCopy);

      toast.success(message);
    } catch (error) {
      console.error("Failed to copy article link:", error);

      toast.error("Failed to copy article link.");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={className}
      title="Copy article link"
      aria-label="Copy article link"
    />
  );
}
