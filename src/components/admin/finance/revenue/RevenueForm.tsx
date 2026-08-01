import type {
  RevenueCategory,
  RevenueProvider,
  RevenueReconciliationStatus,
  RevenueStatus,
} from "../../../../types/revenue";
import {
  REVENUE_PROVIDERS,
  RECONCILIATION_STATUSES,
  REVENUE_CATEGORIES,
  REVENUE_STATUSES,
} from "../../../../config/revenueTable";
import type { RevenueFormState } from "../../../../types/revenuetable";

interface RevenueFormProps {
  form: RevenueFormState;
  creating?: boolean;
  onCategoryChange?: (category: RevenueCategory) => void;
  onChange: <Key extends keyof RevenueFormState>(
    field: Key,
    value: RevenueFormState[Key]
  ) => void;
}

const INPUT_CLASSES =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

/**
 * Render reusable Revenue fields for both creation and editing.
 */
export default function RevenueForm({
  form,
  creating = false,
  onCategoryChange,
  onChange,
}: RevenueFormProps) {
  /**
   * Update the category while allowing the creation flow to regenerate its reference.
   */
  function handleCategoryChange(category: RevenueCategory) {
    if (creating && onCategoryChange) {
      onCategoryChange(category);
      return;
    }

    onChange("transactionCategory", category);
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Category
        <select
          className={INPUT_CLASSES}
          value={form.transactionCategory}
          onChange={(event) =>
            handleCategoryChange(event.target.value as RevenueCategory)
          }
        >
          {REVENUE_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Provider
        <select
          className={INPUT_CLASSES}
          value={form.provider}
          onChange={(event) =>
            onChange("provider", event.target.value as RevenueProvider)
          }
        >
          {REVENUE_PROVIDERS.map((provider) => (
            <option key={provider.value} value={provider.value}>
              {provider.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
        Description
        <input
          className={INPUT_CLASSES}
          value={form.description}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder="What generated this Revenue?"
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Amount
        <input
          className={INPUT_CLASSES}
          type="number"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={(event) => onChange("amount", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Currency
        <input
          className={INPUT_CLASSES}
          maxLength={3}
          value={form.currency}
          onChange={(event) =>
            onChange("currency", event.target.value.toUpperCase())
          }
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Fee amount
        <input
          className={INPUT_CLASSES}
          type="number"
          min="0"
          step="0.01"
          value={form.feeAmount}
          onChange={(event) => onChange("feeAmount", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Tax amount
        <input
          className={INPUT_CLASSES}
          type="number"
          min="0"
          step="0.01"
          value={form.taxAmount}
          onChange={(event) => onChange("taxAmount", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Refunded amount
        <input
          className={INPUT_CLASSES}
          type="number"
          min="0"
          step="0.01"
          value={form.refundedAmount}
          onChange={(event) => onChange("refundedAmount", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Exchange rate
        <input
          className={INPUT_CLASSES}
          type="number"
          min="0"
          step="0.000001"
          value={form.exchangeRate}
          onChange={(event) => onChange("exchangeRate", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Base currency
        <input
          className={INPUT_CLASSES}
          maxLength={3}
          value={form.baseCurrency}
          onChange={(event) =>
            onChange("baseCurrency", event.target.value.toUpperCase())
          }
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Transaction date
        <input
          className={INPUT_CLASSES}
          type="date"
          value={form.transactionDate}
          onChange={(event) => onChange("transactionDate", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Status
        <select
          className={INPUT_CLASSES}
          value={form.status}
          onChange={(event) =>
            onChange("status", event.target.value as RevenueStatus)
          }
        >
          {REVENUE_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Reconciliation
        <select
          className={INPUT_CLASSES}
          value={form.reconciliationStatus}
          onChange={(event) =>
            onChange(
              "reconciliationStatus",
              event.target.value as RevenueReconciliationStatus
            )
          }
        >
          {RECONCILIATION_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Payment method
        <input
          className={INPUT_CLASSES}
          value={form.paymentMethod}
          onChange={(event) => onChange("paymentMethod", event.target.value)}
          placeholder="Card, transfer, cash..."
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Internal reference
        <input
          className={INPUT_CLASSES}
          value={form.internalReference}
          onChange={(event) =>
            onChange("internalReference", event.target.value)
          }
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Provider reference
        <input
          className={INPUT_CLASSES}
          value={form.providerReference}
          onChange={(event) =>
            onChange("providerReference", event.target.value)
          }
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Customer name
        <input
          className={INPUT_CLASSES}
          value={form.customerName}
          onChange={(event) => onChange("customerName", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Customer email
        <input
          className={INPUT_CLASSES}
          type="email"
          value={form.customerEmail}
          onChange={(event) => onChange("customerEmail", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Customer phone
        <input
          className={INPUT_CLASSES}
          value={form.customerPhone}
          onChange={(event) => onChange("customerPhone", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Invoice number
        <input
          className={INPUT_CLASSES}
          value={form.invoiceNumber}
          onChange={(event) => onChange("invoiceNumber", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Receipt number
        <input
          className={INPUT_CLASSES}
          value={form.receiptNumber}
          onChange={(event) => onChange("receiptNumber", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Bank account
        <input
          className={INPUT_CLASSES}
          value={form.bankAccount}
          onChange={(event) => onChange("bankAccount", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Paid at
        <input
          className={INPUT_CLASSES}
          type="datetime-local"
          value={form.paidAt}
          onChange={(event) => onChange("paidAt", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Reconciled at
        <input
          className={INPUT_CLASSES}
          type="datetime-local"
          value={form.reconciledAt}
          onChange={(event) => onChange("reconciledAt", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Source table
        <input
          className={INPUT_CLASSES}
          value={form.sourceTable}
          onChange={(event) => onChange("sourceTable", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Source ID
        <input
          className={INPUT_CLASSES}
          value={form.sourceId}
          onChange={(event) => onChange("sourceId", event.target.value)}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
        Internal notes
        <textarea
          className={`${INPUT_CLASSES} min-h-24 resize-y`}
          value={form.internalNotes}
          onChange={(event) => onChange("internalNotes", event.target.value)}
        />
      </label>
    </div>
  );
}
