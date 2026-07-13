import { useEffect, useState } from "react";
import { listReviews } from "../../../lib/review";
import ReviewTable from "./ReviewTable";

export default function ReviewManagement() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);

  async function load() {
    setLoading(true);

    const data = await listReviews();

    setReviews(data);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        Loading reviews...
      </div>
    );
  }

  return <ReviewTable reviews={reviews} setReviews={setReviews} />;
}
