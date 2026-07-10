export function getFieldValue(
  fields: any[],
  label: string
) {
  return (
    fields.find(
      (field) => field.label === label
    )?.value ?? null
  );
}

export function parseFields(fields: any[]) {
  return Object.fromEntries(
    fields.map((field) => {
      let value = field.value;

      switch (field.type) {
        case "DROPDOWN":
        case "MULTIPLE_CHOICE":
          if (Array.isArray(field.value) && field.options) {
            value = field.value
              .map((id: string) => {
                const option = field.options.find(
                  (o: any) => o.id === id
                );

                return option?.text;
              })
              .filter(Boolean)
              .join(", ");
          }
          break;

        case "MATRIX":
          value = parseMatrix(field);
          break;
      }

      return [field.label, value];
    })
  );
}

function parseMatrix(field: any) {
  const result: Record<string, string> = {};

  Object.entries(field.value).forEach(
    ([rowId, columnIds]: any) => {
      const row = field.rows.find(
        (r: any) => r.id === rowId
      );

      const column = field.columns.find(
        (c: any) => c.id === columnIds[0]
      );

      if (row && column) {
        result[row.text] = column.text;
      }
    }
  );

  return result;
}