import ViewSubmissionModal from "../../../islands/ViewSubmissionModal";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Download,
} from "lucide-react";
import { useMemo, useState } from "react";

interface Props {
  registrations: any[];
  reload: () => void;
}

type SortDirection = "asc" | "desc";

export default function RegistrationTable({ registrations, reload }: Props) {
  // Store the current search value.
  const [search, setSearch] = useState("");

  // Store the currently selected sorting column.
  const [sortColumn, setSortColumn] = useState("first_name");

  // Store the current sorting direction.
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Store the current pagination page.
  const [currentPage, setCurrentPage] = useState(1);

  // Store the number of rows displayed per page.
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  // Export the registration data to a CSV file.
  function handleExportCSV() {
    // Define the CSV column headers.
    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Company",
      "Country",
      "Availability",
      "Payment",
      "Date",
    ];

    // Convert every registration into a CSV row.
    const rows = registrations.map((student) => [
      student.first_name,
      student.last_name,
      student.email,
      student.company,
      student.country,
      student.availability,
      "Pending",
      new Date(student.created_at).toLocaleDateString(),
    ]);

    // Combine the headers and registration rows into CSV content.
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
    link.download = "registrations.csv";

    // Trigger the file download.
    link.click();

    // Release the temporary browser URL.
    URL.revokeObjectURL(url);
  }

  // Filter and sort the registration records.
  const processedRegistrations = useMemo(() => {
    // Normalize the search value.
    const searchValue = search.toLowerCase().trim();

    // Filter registrations based on the search value.
    const filtered = registrations.filter((student) => {
      // Build a searchable string from the registration details.
      const searchableText = [
        student.first_name,
        student.last_name,
        student.email,
        student.company,
        student.country,
        student.availability,
      ]
        .join(" ")
        .toLowerCase();

      // Return registrations matching the search value.
      return searchableText.includes(searchValue);
    });

    // Sort the filtered registrations.
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
  }, [registrations, search, sortColumn, sortDirection]);

  // Calculate the total number of available pages.
  const totalPages = Math.ceil(processedRegistrations.length / rowsPerPage);

  // Calculate the starting index of the current page.
  const startIndex = (currentPage - 1) * rowsPerPage;

  // Calculate the ending index of the current page.
  const endIndex = startIndex + rowsPerPage;

  // Retrieve only the registrations for the current page.
  const paginatedRegistrations = processedRegistrations.slice(
    startIndex,
    endIndex
  );

  // Display the empty state when no registrations exist.
  if (!registrations.length) {
    return (
      <div className="p-12">
        <h1 className="text-xl font-bold">Registration Table</h1>

        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-800">
            No registrations yet
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Bootcamp registrations will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-12">
      <h1 className="text-xl font-bold">Registration Table</h1>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <input
          type="search"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search registrations..."
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
        <h2 className="p-6 text-lg font-semibold">Bootcamp Registrations</h2>

        <table className="min-w-full">
          <thead className="border-b bg-slate-50">
            <tr className="text-left text-sm font-semibold text-slate-700">
              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("first_name")}
              >
                <div className="flex items-center gap-1">
                  Student
                  {getSortIcon("first_name")}
                </div>
              </th>

              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("company")}
              >
                <div className="flex items-center gap-1">
                  Company
                  {getSortIcon("company")}
                </div>
              </th>

              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("country")}
              >
                <div className="flex items-center gap-1">
                  Country
                  {getSortIcon("country")}
                </div>
              </th>

              <th className="px-6 py-4">Availability</th>

              <th className="px-6 py-4">Payment</th>

              <th className="px-6 py-4">Action</th>

              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("created_at")}
              >
                <div className="flex items-center gap-1">
                  Date Paid
                  {getSortIcon("created_at")}
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {paginatedRegistrations.map((student) => (
              <tr key={student.id} className="transition hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {student.first_name} {student.last_name}
                    </p>

                    <p className="text-sm text-slate-500">{student.email}</p>
                  </div>
                </td>

                <td className="px-6 py-4">{student.company}</td>

                <td className="px-6 py-4">{student.country}</td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      student.availability?.toLowerCase().includes("yes")
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {student.availability}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      student.payment_status?.toLowerCase() === "paid"
                        ? "bg-green-100 text-green-700"
                        : student.payment_status?.toLowerCase() === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {student.payment_status}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <ViewSubmissionModal
                    title="Registration Details"
                    data={student}
                  />
                </td>

                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(student.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}

            {!paginatedRegistrations.length && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No registrations match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-3">
          <span>
            Showing {processedRegistrations.length ? startIndex + 1 : 0} to{" "}
            {Math.min(endIndex, processedRegistrations.length)} of{" "}
            {processedRegistrations.length}
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
