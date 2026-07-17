import { useEffect, useState } from "react";
import { listDocuments } from "../../../lib/documents";
import DocumentTable from "./DocumentTable";

interface DocumentItem {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: string;
  file_size: number;
  category: string;
  created_at: string;
}

export default function DocumentManagement() {
  // Store the documents returned from Supabase.
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  // Track whether documents are currently loading.
  const [loading, setLoading] = useState(true);

  // Load all documents from the document library.
  async function loadDocuments() {
    // Enable the loading state before making the request.
    setLoading(true);

    // Retrieve documents from Supabase.
    const { data, error } = await listDocuments();

    // Log any document loading error.
    if (error) {
      console.error(error);
    }

    // Store the returned documents in component state.
    setDocuments(data ?? []);

    // Disable the loading state.
    setLoading(false);
  }

  // Load the documents when the component first mounts.
  useEffect(() => {
    loadDocuments();
  }, []);

  // Display a loading state while the documents are loading.
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        Loading documents...
      </div>
    );
  }

  // Render the document table after loading is complete.
  return <DocumentTable documents={documents} reload={loadDocuments} />;
}
