import { useState } from "react";
import { togglePublished } from "../lib/blog";

interface Props {
  id: string;
  published: boolean;
  onToggle?: (id: string, published: boolean) => void;
}

export default function PublishToggle({ id, published, onToggle }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);

    const { data, error } = await togglePublished(id, published);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    onToggle?.(id, data.published);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-full px-3 py-1 text-sm transition ${
        published
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-amber-100 text-amber-700 hover:bg-amber-200"
      }`}
    >
      {loading ? "Updating..." : published ? "Published" : "Draft"}
    </button>
  );
}
