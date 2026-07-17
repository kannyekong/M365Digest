// Sort an array of objects by a selected column and direction.
export function sortData<T>(
  data: T[],
  column: keyof T,
  direction: "asc" | "desc"
) {
  // Create a copy of the array to prevent mutation of the original data.
  return [...data].sort((a, b) => {
    // Retrieve the first value being compared.
    const firstValue = a[column];

    // Retrieve the second value being compared.
    const secondValue = b[column];

    // Convert the first value into a comparable lowercase string.
    const firstString = String(firstValue ?? "").toLowerCase();

    // Convert the second value into a comparable lowercase string.
    const secondString = String(
      secondValue ?? ""
    ).toLowerCase();

    // Compare both values using natural numeric sorting.
    const comparison = firstString.localeCompare(
      secondString,
      undefined,
      {
        numeric: true,
      }
    );

    // Return the comparison based on the selected sort direction.
    return direction === "asc"
      ? comparison
      : -comparison;
  });
}

// Return only the records that belong to the selected page.
export function paginateData<T>(
  data: T[],
  currentPage: number,
  rowsPerPage: number
) {
  // Calculate the first record index for the current page.
  const startIndex =
    (currentPage - 1) * rowsPerPage;

  // Calculate the last record index for the current page.
  const endIndex = startIndex + rowsPerPage;

  // Return only the records for the current page.
  return data.slice(startIndex, endIndex);
}

// Export an array of objects as a CSV file.
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string
) {
  // Stop the export when there is no data to export.
  if (!data.length) return;

  // Retrieve the CSV headers from the first object.
  const headers = Object.keys(data[0]);

  // Convert each object into a CSV row.
  const rows = data.map((item) =>
    headers.map((header) => item[header])
  );

  // Combine the headers and rows into CSV text.
  const csvContent = [
    headers,
    ...rows,
  ]
    .map((row) =>
      row
        .map((value) =>
          `"${String(value ?? "").replace(/"/g, '""')}"`
        )
        .join(",")
    )
    .join("\n");

  // Create a CSV blob from the generated content.
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  // Create a temporary browser URL for the CSV file.
  const url = URL.createObjectURL(blob);

  // Create a temporary download link.
  const link = document.createElement("a");

  // Assign the CSV URL to the download link.
  link.href = url;

  // Set the name of the downloaded CSV file.
  link.download = filename;

  // Trigger the browser download.
  link.click();

  // Release the temporary browser URL.
  URL.revokeObjectURL(url);
}