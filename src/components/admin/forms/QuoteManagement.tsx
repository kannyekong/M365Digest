import { useEffect, useState } from "react";
import { listQuotes } from "../../../lib/quotes";
import QuoteTable from "./QuoteTable";

export default function QuoteManagement() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const data = await listQuotes();

    setQuotes(data);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        Loading quote requests...
      </div>
    );
  }

  return <QuoteTable quotes={quotes} setQuote={setQuotes} />;
}
