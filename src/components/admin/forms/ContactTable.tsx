import ViewSubmissionModal from "../../../islands/ViewSubmissionModal";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Download,
  Trash2,
} from "lucide-react";
import { deleteContact } from "../../../lib/contact";
import toast from "react-hot-toast";
import ContextualTip from "../ContextualTip";
import { useMemo, useState } from "react";
import { exportToCSV, paginateData, sortData } from "../../../lib/table";

interface Props {
  contacts: any[];
  setContacts: React.Dispatch<React.SetStateAction<any[]>>;
}

type SortDirection = "asc" | "desc";

export default function ContactTable({ contacts, setContacts }: Props) {
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

  // Delete a contact after confirming the user's action.
  async function handleDelete(contact: any) {
    // Ask the user to confirm the contact deletion.
    const confirmed = window.confirm("Delete this contact permanently?");

    // Stop the function when the user cancels the deletion.
    if (!confirmed) return;

    // Delete the selected contact from Supabase.
    const { error } = await deleteContact(contact.id);

    // Display the error returned by Supabase.
    if (error) {
      toast.error(error.message);
      return;
    }

    // Inform the user that the contact was deleted successfully.
    toast.success("Contact deleted.");

    // Remove the deleted contact immediately from local state.
    setContacts((prev) => prev.filter((c) => c.id !== contact.id));
  }

  // Sort the contact table by a selected column.
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

  // Export all contacts as a CSV file.
  function handleExportCSV() {
    // Convert contacts into CSV-friendly objects.
    const exportData = contacts.map((contact) => ({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone_number: contact.phone_number,
      message: contact.message,
      created_at: contact.created_at,
    }));

    // Export the contact data as a CSV file.
    exportToCSV(exportData, "contacts.csv");
  }

  // Filter and sort the contact data.
  const processedContacts = useMemo(() => {
    // Normalize the search value for case-insensitive searching.
    const searchValue = search.toLowerCase().trim();

    // Filter contacts based on the search value.
    const filtered = contacts.filter((contact) => {
      // Build a searchable string from contact properties.
      const searchableText = [
        contact.first_name,
        contact.last_name,
        contact.email,
        contact.phone_number,
      ]
        .join(" ")
        .toLowerCase();

      // Return contacts matching the search value.
      return !searchValue || searchableText.includes(searchValue);
    });

    // Sort the filtered contacts using the reusable table utility.
    return sortData(filtered, sortColumn as keyof any, sortDirection);
  }, [contacts, search, sortColumn, sortDirection]);

  // Calculate the total number of pagination pages.
  const totalPages = Math.ceil(processedContacts.length / rowsPerPage);

  // Calculate the first visible contact index.
  const startIndex = (currentPage - 1) * rowsPerPage;

  // Calculate the last visible contact index.
  const endIndex = startIndex + rowsPerPage;

  // Retrieve the contacts for the current page.
  const paginatedContacts = paginateData(
    processedContacts,
    currentPage,
    rowsPerPage
  );

  // Display an empty state when there are no contacts.
  if (!contacts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h3 className="text-lg font-semibold text-slate-800">
          No contact submissions yet
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Contact form submissions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">People who contacted us</h1>

          <p className="mt-2 text-xs">
            These are submissions from our public contact forms
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Download size={17} />
          Export CSV
        </button>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search contacts..."
          className="w-64 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="border-b bg-slate-50">
            <tr className="text-left text-xs font-semibold text-slate-700">
              <th
                className="cursor-pointer px-6 py-4"
                onClick={() => handleSort("first_name")}
              >
                <div className="flex items-center gap-1">
                  Name
                  {getSortIcon("first_name")}
                </div>
              </th>

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
                onClick={() => handleSort("phone_number")}
              >
                <div className="flex items-center gap-1">
                  Phone
                  {getSortIcon("phone_number")}
                </div>
              </th>

              <th className="px-6 py-4">
                <ContextualTip
                  id="contact-view-submission"
                  title="View full submission"
                  description="Click the view icon in this column to see all the details submitted by the customer."
                  position="bottom"
                >
                  <span className="cursor-help">View</span>
                </ContextualTip>
              </th>

              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {paginatedContacts.map((contact) => (
              <tr key={contact.id} className="transition hover:bg-slate-50">
                <td className="px-3 py-2">
                  <p className="text-xs font-medium text-slate-900">
                    {contact.first_name} {contact.last_name}
                  </p>
                </td>

                <td className="px-6 py-4 text-xs">{contact.email}</td>

                <td className="px-6 py-4 text-xs">{contact.phone_number}</td>

                <td className="px-6 py-4">
                  <ViewSubmissionModal
                    title="Contact Submission"
                    data={contact}
                  />
                </td>

                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(contact)}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={18} className="text-red-500" />
                  </button>
                </td>
              </tr>
            ))}

            {!paginatedContacts.length && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No contacts match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-3">
          <span>
            Showing {processedContacts.length ? startIndex + 1 : 0} to{" "}
            {Math.min(endIndex, processedContacts.length)} of{" "}
            {processedContacts.length}
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
