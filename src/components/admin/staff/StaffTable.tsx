import {
  ArrowDown,
  ArrowUp,
  Download,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import ViewSubmissionModal from "../../../islands/ViewSubmissionModal";
import { deleteStaff } from "../../../lib/staff";
import { exportToCSV, paginateData, sortData } from "../../../lib/table";
import toast from "react-hot-toast";
import { useMemo, useState } from "react";

interface Props {
  staff: any[];
  setStaff: React.Dispatch<React.SetStateAction<any[]>>;
}

type SortDirection = "asc" | "desc";

export default function StaffTable({ staff, setStaff }: Props) {
  // Store the cache-busting value used for avatar URLs.
  const [cacheKey] = useState(Date.now());

  // Store the current search value.
  const [search, setSearch] = useState("");

  // Store the selected staff status filter.
  const [statusFilter, setStatusFilter] = useState("All");

  // Store the selected department filter.
  const [departmentFilter, setDepartmentFilter] = useState("All");

  // Store the currently selected sorting column.
  const [sortColumn, setSortColumn] = useState("created_at");

  // Store the current sorting direction.
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Store the current pagination page.
  const [currentPage, setCurrentPage] = useState(1);

  // Store the number of rows displayed per page.
  const [rowsPerPage, setRowsPerPage] = useState(10);

  async function handleDelete(employee: any) {
    // Ask the user to confirm the deletion.
    const confirmed = window.confirm(
      `Delete ${employee.first_name} ${employee.last_name}?`
    );

    // Stop execution when the user cancels the deletion.
    if (!confirmed) return;

    // Attempt to delete the staff member from Supabase.
    const result = await deleteStaff(employee.id);

    // Display the error when deletion fails.
    if (!result.success) {
      toast.error(result.error?.message || "Failed to delete staff.");
      return;
    }

    // Display a success message only after confirmed deletion.
    toast.success("Staff deleted.");

    // Remove the deleted staff member from local state.
    setStaff((prev) => prev.filter((s) => s.id !== employee.id));
  }

  // Sort the staff table by a selected column.
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

  // Filter and sort the staff data.
  const processedStaff = useMemo(() => {
    // Normalize the search value for case-insensitive searching.
    const searchValue = search.toLowerCase().trim();

    // Filter staff based on search and selected filters.
    const filtered = staff.filter((employee) => {
      // Build a searchable string from the staff properties.
      const searchableText = [
        employee.employee_id,
        employee.first_name,
        employee.last_name,
        employee.email,
        employee.department,
        employee.position,
      ]
        .join(" ")
        .toLowerCase();

      // Check whether the staff member matches the search value.
      const matchesSearch =
        !searchValue || searchableText.includes(searchValue);

      // Check whether the staff member matches the status filter.
      const matchesStatus =
        statusFilter === "All" || employee.status === statusFilter;

      // Check whether the staff member matches the department filter.
      const matchesDepartment =
        departmentFilter === "All" || employee.department === departmentFilter;

      // Return staff members matching all active filters.
      return matchesSearch && matchesStatus && matchesDepartment;
    });

    // Sort the filtered staff using the reusable utility.
    return sortData(filtered, sortColumn as keyof any, sortDirection);
  }, [
    staff,
    search,
    statusFilter,
    departmentFilter,
    sortColumn,
    sortDirection,
  ]);

  // Calculate the total number of pages.
  const totalPages = Math.ceil(processedStaff.length / rowsPerPage);

  // Calculate the first visible record index.
  const startIndex = (currentPage - 1) * rowsPerPage;

  // Calculate the last visible record index.
  const endIndex = startIndex + rowsPerPage;

  // Retrieve the staff for the current page.
  const paginatedStaff = paginateData(processedStaff, currentPage, rowsPerPage);

  // Create a unique list of staff departments.
  const departments = Array.from(
    new Set(staff.map((employee) => employee.department).filter(Boolean))
  );

  // Export all staff records as a CSV file.
  function handleExportCSV() {
    // Convert staff records into CSV-friendly objects.
    const exportData = staff.map((employee) => ({
      employee_id: employee.employee_id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      employment_type: employee.employment_type,
      status: employee.status,
      hire_date: employee.hire_date,
    }));

    // Export the staff data as a CSV file.
    exportToCSV(exportData, "staff.csv");
  }

  return (
    <div className="p-12">
      <div className="mb-10 flex items-center justify-between">
        <h1 className="text-xl font-bold">Manage Staff</h1>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={17} />
            Export CSV
          </button>

          <a
            href="/admin/staff/new"
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-white transition hover:opacity-90"
          >
            <Plus size={18} />
            Add Staff
          </a>
        </div>
      </div>

      {!staff.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-800">
            No staff added yet
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Your employees will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search staff..."
              className="w-64 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary"
            >
              <option value="All">All Status</option>

              <option value="Active">Active</option>

              <option value="Inactive">Inactive</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-primary"
            >
              <option value="All">All Departments</option>

              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full">
              <thead className="border-b bg-slate-50">
                <tr className="text-left text-xs font-semibold text-slate-700">
                  <th className="px-6 py-4">Photo</th>

                  <th
                    className="cursor-pointer px-6 py-4"
                    onClick={() => handleSort("employee_id")}
                  >
                    <div className="flex items-center gap-1">
                      Employee ID
                      {getSortIcon("employee_id")}
                    </div>
                  </th>

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
                    onClick={() => handleSort("department")}
                  >
                    <div className="flex items-center gap-1">
                      Department
                      {getSortIcon("department")}
                    </div>
                  </th>

                  <th
                    className="cursor-pointer px-6 py-4"
                    onClick={() => handleSort("position")}
                  >
                    <div className="flex items-center gap-1">
                      Position
                      {getSortIcon("position")}
                    </div>
                  </th>

                  <th
                    className="cursor-pointer px-6 py-4"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon("status")}
                    </div>
                  </th>

                  <th className="px-6 py-4">More Details</th>

                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-xs">
                {paginatedStaff.map((employee) => (
                  <tr
                    key={employee.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <img
                        src={
                          employee.avatar_url
                            ? `${employee.avatar_url}?v=${cacheKey}`
                            : "/images/user.png"
                        }
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    </td>

                    <td className="px-6 py-4">{employee.employee_id}</td>

                    <td className="px-6 py-4">
                      {employee.first_name} {employee.last_name}
                    </td>

                    <td className="px-6 py-4">{employee.department}</td>

                    <td className="px-6 py-4">{employee.position}</td>

                    <td className="px-6 py-4">
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        {employee.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <ViewSubmissionModal
                        title="Staff Details"
                        data={employee}
                        preferredOrder={[
                          "avatar_url",
                          "employee_id",
                          "first_name",
                          "last_name",
                          "email",
                          "phone",
                          "department",
                          "position",
                          "employment_type",
                          "status",
                          "hire_date",
                          "date_of_birth",
                          "emergency_contact",
                          "emergency_phone",
                          "address",
                          "notes",
                          "created_at",
                        ]}
                      />
                    </td>

                    <td className="flex flex-row gap-4 p-6">
                      <button
                        onClick={() =>
                          (window.location.href = `/admin/staff/${employee.id}/edit`)
                        }
                        className="p-2 transition hover:rounded-xl hover:bg-slate-200"
                      >
                        <Pencil size={20} />
                      </button>

                      <button
                        onClick={() => handleDelete(employee)}
                        className="p-2 text-red-600 transition hover:rounded-xl hover:bg-red-200"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))}

                {!paginatedStaff.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-sm text-slate-500"
                    >
                      No staff matches your search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                Showing {processedStaff.length ? startIndex + 1 : 0} to{" "}
                {Math.min(endIndex, processedStaff.length)} of{" "}
                {processedStaff.length}
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
                className="rounded-lg border border-slate-300 px-4 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="px-3">
                Page {currentPage} of {Math.max(totalPages, 1)}
              </span>

              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                className="rounded-lg border border-slate-300 px-4 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
