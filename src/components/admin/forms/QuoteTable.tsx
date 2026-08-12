import ViewSubmissionModal from "../../../islands/ViewSubmissionModal";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, Trash2 } from "lucide-react";
import { deleteQuote } from "../../../lib/quotes";
import toast from "react-hot-toast";
import ContextualTip from "../ContextualTip";
import { useMemo, useState } from "react";
import { exportToCSV, paginateData, sortData } from "../../../lib/table";

interface Props {
  quotes: any[];
  setQuote: React.Dispatch<React.SetStateAction<any[]>>;
}

type SortDirection = "asc" | "desc";

export default function QuoteTable({ quotes, setQuote }: Props) {
  // Store the current search value.
  const [search, setSearch] = useState("");

  // Store the currently selected sorting column.
  const [sortColumn, setSortColumn] = useState("name");

  // Store the current sorting direction.
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Store the current pagination page.
  const [currentPage, setCurrentPage] = useState(1);

  // Store the number of rows displayed per page.
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Delete a quote after confirming the user's action.
  async function handleDelete(quote: any) {
    // Ask the user to confirm the quote deletion.
    const confirmed = window.confirm("Delete this quote permanently?");

    // Stop the function when the user cancels the deletion.
    if (!confirmed) return;

    // Delete the selected quote from Supabase.
    const { error } = await deleteQuote(quote.id);

    // Display the error returned by Supabase.
    if (error) {
      toast.error(error.message);
      return;
    }

    // Inform the user that the quote was deleted successfully.
    toast.success("Quote deleted.");

    // Remove the deleted quote immediately from local state.
    setQuote((prev) => prev.filter((q) => q.id !== quote.id));
  }

  // Sort the quote table by a selected column.
  function handleSort(column: string) {
    // Reverse the sort direction when the same column is selected.
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));

      return;
    }

    // Set the new sorting column.
    setSortColumn(column);

    // Start new sorting columns in ascending order.
    setSortDirection("asc");

    // Return to the first page after changing the sort column.
    setCurrentPage(1);
  }

  // Return the correct sorting icon for a table column.
  function getSortIcon(column: string) {
    // Return nothing when the column is not currently sorted.
    if (sortColumn !== column) return null;

    // Display the ascending arrow.
    if (sortDirection === "asc") {
      return <ArrowUp size={14} />;
    }

    // Display the descending arrow.
    return <ArrowDown size={14} />;
  }

  // Handle changes to the search field.
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Update the search value.
    setSearch(e.target.value);

    // Return to the first page after searching.
    setCurrentPage(1);
  }

  // Handle changes to the rows-per-page selector.
  function handleRowsPerPageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    // Update the number of rows displayed per page.
    setRowsPerPage(Number(e.target.value));

    // Return to the first page after changing the page size.
    setCurrentPage(1);
  }

  // Export all quotes as a CSV file.
  function handleExportCSV() {
    // Convert quotes into CSV-friendly objects.
    const exportData = quotes.map((quote) => ({
      name: quote.name,
      organization: quote.organization,
      project_details: quote.project_details,
      created_at: quote.created_at,
    }));

    // Export the quote data as a CSV file.
    exportToCSV(exportData, "quotes.csv");
  }

  // Filter and sort the quote data.
  const processedQuotes = useMemo(() => {
    // Normalize the search value for case-insensitive searching.
    const searchValue = search.toLowerCase().trim();

    // Filter quotes based on the search value.
    const filtered = quotes.filter((quote) => {
      // Build a searchable string from quote properties.
      const searchableText = [
        quote.name,
        quote.organization,
        quote.project_details,
      ]
        .join(" ")
        .toLowerCase();

      // Return quotes matching the search value.
      return !searchValue || searchableText.includes(searchValue);
    });

    // Sort the filtered quotes using the reusable table utility.
    return sortData(filtered, sortColumn as keyof any, sortDirection);
  }, [quotes, search, sortColumn, sortDirection]);

  // Calculate the total number of pagination pages.
  const totalPages = Math.ceil(processedQuotes.length / rowsPerPage);

  // Calculate the first visible quote index.
  const startIndex = (currentPage - 1) * rowsPerPage;

  // Calculate the last visible quote index.
  const endIndex = startIndex + rowsPerPage;

  // Retrieve the quotes for the current page.
  const paginatedQuotes = paginateData(
    processedQuotes,
    currentPage,
    rowsPerPage
  );

  // Display an empty state when there are no quotes.
  if (!quotes.length) {
    return (
      <div className="p-5">
        <h1 className="text-3xl font-bold">Quotes Table</h1>

        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-800">
            No quotes yet
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Customer quotes will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      {" "}
      <ContextualTip
        id="quote-view-submission"
        title="View full submission"
        description="Click the view icon in the table column to see all the details submitted by the customer."
        position="bottom"
      >
        {" "}
        <h1 className="text-xl font-bold">Quotes Table </h1>{" "}
      </ContextualTip>
      <p className="mt-2 mb-2 text-xs">These are incoming job requests</p>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search quotes..."
          className="w-64 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Download size={17} />
          Export CSV
        </button>
      </div>
      <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="border-b bg-slate-50">
            <tr className="text-left text-sm font-semibold text-slate-700">
              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  Name
                  {getSortIcon("name")}
                </div>
              </th>

              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("organization")}
              >
                <div className="flex items-center gap-1">
                  Organization
                  {getSortIcon("organization")}
                </div>
              </th>

              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("project_details")}
              >
                <div className="flex items-center gap-1">
                  Project
                  {getSortIcon("project_details")}
                </div>
              </th>

              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("created_at")}
              >
                <div className="flex items-center gap-1">
                  Date
                  {getSortIcon("created_at")}
                </div>
              </th>

              <th className="px-6 py-4">View</th>

              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-xs">
            {paginatedQuotes.map((quote) => (
              <tr key={quote.id} className="transition hover:bg-slate-50">
                <td className="px-6 py-4">{quote.name}</td>

                <td className="px-6 py-4">{quote.organization}</td>

                <td className="max-w-sm truncate px-6 py-4">
                  {quote.project_details}
                </td>

                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(quote.created_at).toLocaleDateString()}
                </td>

                <td className="px-6 py-4">
                  <ViewSubmissionModal title="Quote Request" data={quote} />
                </td>

                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(quote)}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={18} className="text-red-500" />
                  </button>
                </td>
              </tr>
            ))}

            {!paginatedQuotes.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No quotes match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-3">
          <span>
            Showing {processedQuotes.length ? startIndex + 1 : 0} to{" "}
            {Math.min(endIndex, processedQuotes.length)} of{" "}
            {processedQuotes.length}
          </span>

          <select
            value={rowsPerPage}
            onChange={handleRowsPerPageChange}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          >
            <option value={10}>10</option>

            <option value={25}>25</option>

            <option value={50}>50</option>

            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            className="rounded-full border border-slate-300 px-2 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft />
          </button>

          <span className="px-3">
            Page {currentPage} of {Math.max(totalPages, 1)}
          </span>

          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            className="rounded-full border border-slate-300 px-2 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}
