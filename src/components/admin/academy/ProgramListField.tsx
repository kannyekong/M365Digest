import { Plus, Trash2 } from "lucide-react";

interface ProgramListFieldProps {
  label: string;
  description?: string;
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}

/**
 * Display and manage a repeatable list of Academy program values.
 */
export default function ProgramListField({
  label,
  description,
  values,
  placeholder,
  onChange,
}: ProgramListFieldProps) {
  /**
   * Update one item in the repeatable list.
   */
  function handleItemChange(index: number, value: string) {
    // Create a copy of the current values.
    const updatedValues = [...values];

    // Replace the selected item with its latest value.
    updatedValues[index] = value;

    // Send the updated list to the parent form.
    onChange(updatedValues);
  }

  /**
   * Add a new empty item to the repeatable list.
   */
  function handleAddItem() {
    // Append one empty value to the current list.
    onChange([...values, ""]);
  }

  /**
   * Remove one item from the repeatable list.
   */
  function handleRemoveItem(index: number) {
    // Remove the selected item using its index.
    const updatedValues = values.filter((_, itemIndex) => itemIndex !== index);

    // Keep at least one editable row visible.
    onChange(updatedValues.length > 0 ? updatedValues : [""]);
  }

  return (
    <div>
      <div className="mb-3">
        <label className="block text-sm font-semibold text-slate-800">
          {label}
        </label>

        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        ) : null}
      </div>

      <div className="space-y-3">
        {values.map((value, index) => (
          <div key={`${label}-${index}`} className="flex items-center gap-3">
            <input
              type="text"
              value={value}
              onChange={(event) => {
                handleItemChange(index, event.target.value);
              }}
              placeholder={placeholder}
              className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
            />

            <button
              type="button"
              onClick={() => {
                handleRemoveItem(index);
              }}
              aria-label={`Remove ${label.toLowerCase()} item ${index + 1}`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddItem}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Plus size={16} />
        Add item
      </button>
    </div>
  );
}
