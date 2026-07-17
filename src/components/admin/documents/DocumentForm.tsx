import { useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { uploadDocument } from "../../../lib/documents";

export default function DocumentForm() {
  // Store the document information entered by the user.
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Other",
  });

  // Store the selected document file.
  const [file, setFile] = useState<File | null>(null);

  // Track whether the document is currently being uploaded.
  const [uploading, setUploading] = useState(false);

  // Update the matching document form field.
  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  // Store the selected file in component state.
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Retrieve the first selected file.
    const selectedFile = e.target.files?.[0];

    // Stop execution when no file is selected.
    if (!selectedFile) return;

    // Store the selected file.
    setFile(selectedFile);
  }

  // Upload the selected document and save its metadata.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Prevent the browser from reloading the page.
    e.preventDefault();

    // Ensure that the user has selected a document.
    if (!file) {
      toast.error("Please select a document.");
      return;
    }

    // Ensure that a document title has been provided.
    if (!form.title.trim()) {
      toast.error("Please enter a document title.");
      return;
    }

    // Enable the uploading state.
    setUploading(true);

    // Upload the document to Storage and save its metadata.
    const { error } = await uploadDocument(file, {
      title: form.title,
      description: form.description,
      category: form.category,
    });

    // Disable the uploading state after the request completes.
    setUploading(false);

    // Display the upload error when the request fails.
    if (error) {
      toast.error(error.message);
      return;
    }

    // Display a success notification after the upload.
    toast.success("Document uploaded successfully.");

    // Redirect the user to the document library.
    window.location.href = "/admin/documents";
  }

  return (
    <form onSubmit={handleSubmit} className="p-12 space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900">
            Document Details
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Upload and organize a company document.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Document title
            </label>

            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Employee Handbook 2026"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Description
            </label>

            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Briefly describe this document..."
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Category
            </label>

            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="Company">Company</option>

              <option value="HR">HR</option>

              <option value="Finance">Finance</option>

              <option value="Operations">Operations</option>

              <option value="IT & Security">IT & Security</option>

              <option value="Policies">Policies</option>

              <option value="Legal">Legal</option>

              <option value="Projects">Projects</option>

              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="document"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Document
            </label>

            <label
              htmlFor="document"
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 px-6 py-12 text-center transition hover:border-primary hover:bg-primary/5"
            >
              {file ? (
                <>
                  <FileText size={42} className="text-primary" />

                  <p className="mt-4 font-medium text-slate-900">{file.name}</p>

                  <p className="mt-1 text-sm text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <UploadCloud size={42} className="text-slate-400" />

                  <p className="mt-4 font-medium text-slate-700">
                    Click to select a document
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    PDF, Word, Excel or other supported files
                  </p>
                </>
              )}

              <input
                id="document"
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <a
          href="/admin/documents"
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </a>

        <button
          type="submit"
          disabled={uploading}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
      </div>
    </form>
  );
}
