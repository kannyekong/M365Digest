import { X } from "lucide-react";
import TiptapViewer from "../editor/TiptapViewer";

interface PreviewModalProps {
  open: boolean;

  onClose: () => void;

  article: {
    title: string;
    excerpt: string;
    cover_image: string;
    category: string;
    content: any;
    slug: string;
  };
}

export default function PreviewModal({
  open,
  onClose,
  article,
}: PreviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-white">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white/90 px-8 py-4 backdrop-blur">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Preview Mode</h2>

          <p className="text-xs text-slate-500">
            This article hasn't been published yet. To publish it, dismiss this modal and click the publish button
          </p>
        </div>

        <button
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-red-500 text-white p-2 transition hover:bg-red-700"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}

      <div className="mx-auto max-w-5xl px-8 py-12">
        <article className="mx-auto max-w-4xl">
          {article.cover_image && (
            <img
              src={article.cover_image}
              alt={article.title}
              className="mb-10 h-[420px] w-full rounded-3xl object-cover shadow-lg"
            />
          )}

          <div className="mb-4">
            <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
              {article.category}
            </span>
          </div>

          <h1 className="text-5xl font-extrabold leading-tight text-slate-900">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="mt-6 text-xl leading-relaxed text-slate-500">
              {article.excerpt}
            </p>
          )}

          <div className="my-10 border-t" />

          <TiptapViewer content={article.content} />
        </article>
      </div>
    </div>
  );
}
