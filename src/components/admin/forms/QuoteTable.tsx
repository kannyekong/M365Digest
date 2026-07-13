import ViewSubmissionModal from "../../../islands/ViewSubmissionModal";
import { Trash2 } from "lucide-react";
import { deleteQuote } from "../../../lib/quotes";
import toast from "react-hot-toast";

interface Props {
  quotes: any[];
  setQuote: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function QuoteTable({ quotes, setQuote }: Props) {
  async function handleDelete(quote: any) {
    const confirmed = window.confirm("Delete this quote permanently?");

    if (!confirmed) return;

    const { error } = await deleteQuote(quote.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Quote deleted.");

    setQuote((prev) => prev.filter((q) => q.id !== quote.id));
  }

  if (!quotes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h3 className="text-lg font-semibold text-slate-800">
          No quote requests yet
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Quote requests will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Quotes Table</h1>

      <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="border-b bg-slate-50">
            <tr className="text-left text-sm font-semibold text-slate-700">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Organization</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Project</th>
              <th className="px-6 py-4">View</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {quotes.map((quote) => (
              <tr key={quote.id} className="transition hover:bg-slate-50">
                <td className="px-6 py-4">{quote.name}</td>

                <td className="px-6 py-4">{quote.organization}</td>

                <td className="px-6 py-4">{quote.email}</td>

                <td className="px-6 py-4">{quote.phone_number}</td>

                <td className="max-w-sm truncate px-6 py-4">
                  {quote.project_details}
                </td>

                <td className="px-6 py-4">
                  <ViewSubmissionModal title="Quote Request" data={quote} />
                </td>

                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(quote.created_at).toLocaleDateString()}
                </td>

                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(quote)}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
