import { useRef, useState } from "react";
import { uploadCoverImage } from "../lib/storage";

interface Props {
  value: string;
  onChange: (url: string) => void;
}

export default function CoverImageUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);

    const { data, error } = await uploadCoverImage(file);

    setUploading(false);

    if (error) {
      alert(error.message);
      return;
    }

    onChange(data);
  }

  return (
    <div className="space-y-4">
      {value ? (
        <img
          src={value}
          alt="Cover"
          className="h-full w-full rounded-xl object-cover border"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400">
          No Cover Image
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleUpload}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-xl bg-slate-900 px-5 py-3 text-white"
      >
        {uploading ? "Uploading..." : "Upload Cover Image"}
      </button>
    </div>
  );
}
