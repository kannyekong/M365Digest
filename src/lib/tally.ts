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

      // Convert dropdown option IDs to labels
      if (
        field.type === "DROPDOWN" &&
        Array.isArray(field.value) &&
        field.options
      ) {
        value = field.value
          .map((id: string) => {
            const option = field.options.find(
              (o: any) => o.id === id
            );

            return option?.text;
          })
          .join(", ");
      }

      return [field.label, value];
    })
  );
}