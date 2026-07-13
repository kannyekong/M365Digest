import ViewSubmissionModal from "../../../islands/ViewSubmissionModal";
import { Trash2 } from "lucide-react";
import { deleteReview } from "../../../lib/review";
import toast from "react-hot-toast";

interface Props {
  reviews: any[];
  setReviews: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function ReviewTable({ reviews, setReviews }: Props) {
  async function handleDelete(review: any) {
    const confirmed = window.confirm("Delete this review permanently?");

    if (!confirmed) return;

    const { error } = await deleteReview(review.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Review deleted.");

    setReviews((prev) => prev.filter((r) => r.id !== review.id));
  }

  if (!reviews.length) {
    return (
      <div>
        <h1 className="text-3xl font-bold">Reviews Table</h1>

        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-800">
            No reviews yet
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Customer reviews will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Reviews Table</h1>

      <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="border-b bg-slate-50">
            <tr className="text-left text-sm font-semibold text-slate-700">
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Referral</th>
              <th className="px-6 py-4">Experience</th>
              <th className="px-6 py-4">Miscellaneous</th>
              <th className="px-6 py-4">More Details</th>
              <th className="px-6 py-4">Date Received</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {reviews.map((review) => (
              <tr key={review.id} className="transition hover:bg-slate-50">
                <td className="px-6 py-4">{review.email}</td>

                <td className="px-6 py-4">{review.referral_source}</td>

                <td className="max-w-sm truncate px-6 py-4">
                  {review.bootcamp_experience}
                </td>

                <td className="max-w-sm truncate px-6 py-4">
                  {review.miscellaneous}
                </td>

                <td className="px-6 py-4">
                  <ViewSubmissionModal title="Review Details" data={review} />
                </td>

                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(review.created_at).toLocaleDateString()}
                </td>

                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(review)}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                    title="Delete review"
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
