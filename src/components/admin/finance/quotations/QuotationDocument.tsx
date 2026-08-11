import { ArrowLeft, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { getQuotationById } from "../../../../lib/quotations";
import type { Quotation } from "../../../../types/quotation";
import { formatQuotationCurrency } from "../../../../utils/quotation";
import "../../../../styles/global.css";


interface QuotationDocumentProps {
  quotationId: string;
}

/* Formats one quotation date for the client-facing document. */
function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

/* Converts one internal value into a readable label. */
function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/* Returns print-friendly styling for the quotation status. */
function getStatusClasses(status: Quotation["status"]) {
  switch (status) {
    case "accepted":
      return "bg-emerald-100 text-emerald-700";

    case "sent":
      return "bg-blue-100 text-blue-700";

    case "rejected":
      return "bg-red-100 text-red-700";

    case "expired":
      return "bg-amber-100 text-amber-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

/* Displays a printable client-facing CloudTweak quotation. */
export default function QuotationDocument({
  quotationId,
}: QuotationDocumentProps) {
  const [quotation, setQuotation] = useState<Quotation | null>(null);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  /* Loads the complete quotation including its line items. */
  useEffect(() => {
    async function loadQuotation() {
      setLoading(true);
      setErrorMessage("");

      try {
        const result = await getQuotationById(quotationId);

        setQuotation(result);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The quotation could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadQuotation();
  }, [quotationId]);

  /* Opens the browser print dialog so the quotation can be printed or saved as PDF. */
  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading quotation...
      </div>
    );
  }

  if (errorMessage || !quotation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-600 shadow-sm">
          {errorMessage || "The quotation could not be loaded."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-6 print:bg-white print:p-0 sm:px-6">
      <div className="mx-auto mb-4 flex max-w-[900px] items-center justify-between gap-3 print:hidden">
        <a
          href="/admin/finance/quotations"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Back to Quotations
        </a>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Printer size={16} />
          Print / Save PDF
        </button>
      </div>

      <main className="mx-auto w-full max-w-[900px] overflow-hidden bg-white shadow-xl print:max-w-none print:shadow-none">
        <div className="p-6 sm:p-10 print:p-8">
          <header className="flex flex-col gap-8 border-b border-slate-200 pb-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-2xl font-bold tracking-tight text-slate-950">
                CloudTweak
              </p>

              <p className="mt-1 text-sm font-medium text-blue-600">
                Technologies Limited
              </p>

              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
                Intelligent Cloud, Automation and AI Solutions.
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Quotation
              </p>

              <h1 className="mt-2 text-2xl font-bold text-slate-950">
                {quotation.quotation_number}
              </h1>

              <span
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                  quotation.status
                )}`}
              >
                {formatLabel(quotation.status)}
              </span>
            </div>
          </header>

          <section className="mt-8 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Prepared For
              </p>

              <p className="mt-3 text-lg font-bold text-slate-950">
                {quotation.customer_name}
              </p>

              {quotation.customer_company && (
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {quotation.customer_company}
                </p>
              )}

              {quotation.customer_email && (
                <p className="mt-2 text-sm text-slate-500">
                  {quotation.customer_email}
                </p>
              )}

              {quotation.customer_phone && (
                <p className="mt-1 text-sm text-slate-500">
                  {quotation.customer_phone}
                </p>
              )}

              {quotation.billing_address && (
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-500">
                  {quotation.billing_address}
                </p>
              )}
            </div>

            <div className="sm:text-right">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Issue Date
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {formatDate(quotation.issue_date)}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Valid Until
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {formatDate(quotation.valid_until)}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Currency
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {quotation.currency}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-2xl bg-slate-50 p-5 print:border print:border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Subject
            </p>

            <h2 className="mt-2 text-lg font-bold text-slate-950">
              {quotation.subject}
            </h2>
          </section>

          <section className="mt-8">
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                      Description
                    </th>

                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                      Qty
                    </th>

                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                      Unit Price
                    </th>

                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                      VAT
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {quotation.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 align-top text-sm font-medium text-slate-900">
                        {item.description}

                        {Number(item.discount_amount) > 0 && (
                          <p className="mt-1 text-xs text-slate-500">
                            Discount:{" "}
                            {formatQuotationCurrency(
                              Number(item.discount_amount),
                              quotation.currency
                            )}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-4 text-right align-top text-sm text-slate-600">
                        {item.quantity}
                      </td>

                      <td className="px-3 py-4 text-right align-top text-sm text-slate-600">
                        {formatQuotationCurrency(
                          Number(item.unit_price),
                          quotation.currency
                        )}
                      </td>

                      <td className="px-3 py-4 text-right align-top text-sm text-slate-600">
                        {item.tax_rate}%
                      </td>

                      <td className="px-4 py-4 text-right align-top text-sm font-semibold text-slate-950">
                        {formatQuotationCurrency(
                          Number(item.line_total),
                          quotation.currency
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 flex justify-end">
            <div className="w-full max-w-sm">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-5">
                  <span className="text-slate-500">Subtotal</span>

                  <span className="font-semibold text-slate-900">
                    {formatQuotationCurrency(
                      Number(quotation.subtotal_amount),
                      quotation.currency
                    )}
                  </span>
                </div>

                {Number(quotation.discount_amount) > 0 && (
                  <div className="flex items-center justify-between gap-5">
                    <span className="text-slate-500">Discount</span>

                    <span className="font-semibold text-slate-900">
                      -
                      {formatQuotationCurrency(
                        Number(quotation.discount_amount),
                        quotation.currency
                      )}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-5">
                  <span className="text-slate-500">VAT / Tax</span>

                  <span className="font-semibold text-slate-900">
                    {formatQuotationCurrency(
                      Number(quotation.tax_amount),
                      quotation.currency
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-4 border-t-2 border-slate-950 pt-4">
                <div className="flex items-end justify-between gap-5">
                  <span className="font-bold text-slate-950">Total</span>

                  <span className="text-xl font-bold text-slate-950">
                    {formatQuotationCurrency(
                      Number(quotation.total_amount),
                      quotation.currency
                    )}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {(quotation.notes || quotation.terms) && (
            <section className="mt-10 grid gap-6 sm:grid-cols-2">
              {quotation.notes && (
                <article>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-950">
                    Notes
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {quotation.notes}
                  </p>
                </article>
              )}

              {quotation.terms && (
                <article>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-950">
                    Terms & Conditions
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {quotation.terms}
                  </p>
                </article>
              )}
            </section>
          )}

          <footer className="mt-12 border-t border-slate-200 pt-6">
            <div className="flex flex-col gap-4 text-xs leading-5 text-slate-500 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-semibold text-slate-700">
                  CloudTweak Technologies Limited
                </p>

                <p className="mt-1">
                  Intelligent Cloud, Automation and AI Solutions.
                </p>
              </div>

              <p className="sm:text-right">
                Thank you for the opportunity to provide this quotation.
              </p>
            </div>
          </footer>
        </div>
      </main>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          html,
          body {
            background: white !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
