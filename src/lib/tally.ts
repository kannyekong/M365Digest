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
    fields.map((field) => [field.label, field.value])
  ) as Record<string, any>;
}