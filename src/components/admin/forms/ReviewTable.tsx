import ViewSubmissionModal from "../../../islands/ViewSubmissionModal";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Download,
  Trash2,
} from "lucide-react";
import { deleteReview } from "../../../lib/review";
import toast from "react-hot-toast";
import ContextualTip from "../ContextualTip";
import { useMemo, useState } from "react";

interface Props {
  reviews: any[];
  setReviews: React.Dispatch<React.SetStateAction<any[]>>;
}

type SortDirection = "asc" | "desc";

export default function ReviewTable({ reviews, setReviews }: Props) {
  // Store the current search value.
  const [search, setSearch] = useState("");

  // Store the currently selected sorting column.
  const [sortColumn, setSortColumn] = useState("email");

  // Store the current sorting direction.
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Store the current pagination page.
  const [currentPage, setCurrentPage] = useState(1);

  // Store the number of rows displayed per page.
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Delete a selected review.
  async function handleDelete(review: any) {
    // Ask the user to confirm the review deletion.
    const confirmed = window.confirm("Delete this review permanently?");

    // Stop the function when the user cancels the deletion.
    if (!confirmed) return;

    // Delete the selected review from Supabase.
    const { error } = await deleteReview(review.id);

    // Display the error returned by Supabase.
    if (error) {
      toast.error(error.message);
      return;
    }

    // Inform the user that the review was deleted successfully.
    toast.success("Review deleted.");

    // Remove the deleted review from the current table state.
    setReviews((prev) => prev.filter((r) => r.id !== review.id));
  }

  // Handle sorting when a table header is clicked.
  function handleSort(column: string) {
    // Reverse the sorting direction when the same column is clicked again.
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));

      return;
    }

    // Set the newly selected sorting column.
    setSortColumn(column);

    // Start the new sorting column in ascending order.
    setSortDirection("asc");

    // Return to the first page after changing the sort column.
    setCurrentPage(1);
  }

  // Return the correct sort icon for the active sorting column.
  function getSortIcon(column: string) {
    // Return no icon when the column is not currently sorted.
    if (sortColumn !== column) return null;

    // Display the ascending sort icon.
    if (sortDirection === "asc") {
      return <ArrowUp size={14} />;
    }

    // Display the descending sort icon.
    return <ArrowDown size={14} />;
  }

  // Handle changes to the search input.
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Update the search value.
    setSearch(e.target.value);

    // Return to the first page after searching.
    setCurrentPage(1);
  }

  // Handle changes to the number of rows displayed per page.
  function handleRowsPerPageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    // Update the selected rows-per-page value.
    setRowsPerPage(Number(e.target.value));

    // Return to the first page after changing the page size.
    setCurrentPage(1);
  }

  // Export the review data to a CSV file.
  function handleExportCSV() {
    // Define the CSV column headers.
    const headers = [
      "Email",
      "Referral Source",
      "Bootcamp Experience",
      "Date Received",
    ];

    // Convert every review into a CSV row.
    const rows = reviews.map((review) => [
      review.email,
      review.referral_source,
      review.bootcamp_experience,
      new Date(review.created_at).toLocaleDateString(),
    ]);

    // Combine the headers and review rows into CSV content.
    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    // Create a downloadable CSV file.
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    // Create a temporary browser URL for the CSV file.
    const url = URL.createObjectURL(blob);

    // Create a temporary download link.
    const link = document.createElement("a");

    // Attach the CSV URL to the download link.
    link.href = url;

    // Set the downloaded file name.
    link.download = "reviews.csv";

    // Trigger the file download.
    link.click();

    // Release the temporary browser URL.
    URL.revokeObjectURL(url);
  }

  // Filter and sort the review records.
  const processedReviews = useMemo(() => {
    // Normalize the search value.
    const searchValue = search.toLowerCase().trim();

    // Filter reviews based on the search value.
    const filtered = reviews.filter((review) => {
      // Build a searchable string from the review details.
      const searchableText = [
        review.email,
        review.referral_source,
        review.bootcamp_experience,
      ]
        .join(" ")
        .toLowerCase();

      // Return reviews matching the search value.
      return searchableText.includes(searchValue);
    });

    // Sort the filtered reviews.
    return [...filtered].sort((a, b) => {
      // Get the values being compared.
      const firstValue = a[sortColumn];
      const secondValue = b[sortColumn];

      // Convert both values into lowercase strings.
      const firstString = String(firstValue ?? "").toLowerCase();
      const secondString = String(secondValue ?? "").toLowerCase();

      // Compare both values alphabetically.
      const comparison = firstString.localeCompare(secondString);

      // Return the comparison based on the selected direction.
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [reviews, search, sortColumn, sortDirection]);

  // Calculate the total number of available pages.
  const totalPages = Math.ceil(processedReviews.length / rowsPerPage);

  // Calculate the starting index of the current page.
  const startIndex = (currentPage - 1) * rowsPerPage;

  // Calculate the ending index of the current page.
  const endIndex = startIndex + rowsPerPage;

  // Retrieve only the reviews for the current page.
  const paginatedReviews = processedReviews.slice(startIndex, endIndex);

  // Display the empty state when no reviews exist.
  if (!reviews.length) {
    return (
      <div className="p-5">
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
    <div className="p-5">
      <ContextualTip
        id="contact-view-submission"
        title="View full submission"
        description="Click the view icon on the table column to see all submitted details"
        position="bottom"
      >
        <span className="cursor-help">
          <h1 className="text-xl font-bold">Bootcamp Reviews Table</h1>
        </span>
      </ContextualTip>

      <p className="text-xs">This is a feedback on our bootcamp services</p>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <input
          type="search"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search reviews..."
          className="w-72 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
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
                onClick={() => handleSort("email")}
              >
                <div className="flex items-center gap-1">
                  Email
                  {getSortIcon("email")}
                </div>
              </th>

              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("referral_source")}
              >
                <div className="flex items-center gap-1">
                  Referral
                  {getSortIcon("referral_source")}
                </div>
              </th>

              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("bootcamp_experience")}
              >
                <div className="flex items-center gap-1">
                  Experience
                  {getSortIcon("bootcamp_experience")}
                </div>
              </th>

              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("created_at")}
              >
                <div className="flex items-center gap-1">
                  Date Received
                  {getSortIcon("created_at")}
                </div>
              </th>

              <th className="px-6 py-4">View Details</th>

              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-xs">
            {paginatedReviews.map((review) => (
              <tr key={review.id} className="transition hover:bg-slate-50">
                <td className="px-6 py-4">{review.email}</td>

                <td className="px-6 py-4">{review.referral_source}</td>

                <td className="max-w-sm truncate px-6 py-4">
                  {review.bootcamp_experience}
                </td>

                <td className="px-6 py-4">
                  {new Date(review.created_at).toLocaleDateString()}
                </td>

                <td className="px-6 py-4">
                  <ViewSubmissionModal title="Review Details" data={review} />
                </td>

                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(review)}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                    title="Delete review"
                  >
                    <Trash2 size={18} className="text-red-500" />
                  </button>
                </td>
              </tr>
            ))}

            {!paginatedReviews.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No reviews match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-3">
          <span>
            Showing {processedReviews.length ? startIndex + 1 : 0} to{" "}
            {Math.min(endIndex, processedReviews.length)} of{" "}
            {processedReviews.length}
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
            className="rounded-lg border border-slate-300 px-2 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
            className="rounded-lg border border-slate-300 px-2 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}
