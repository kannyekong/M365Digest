import {
  Archive,
  BadgeDollarSign,
  CheckCircle2,
  LoaderCircle,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type { MouseEvent } from "react";
import type { RevenueTransaction } from "../../../../types/revenue";
import type { RevenueFormState } from "../../../../types/revenuetable";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatLabel,
  getRevenueStatusClasses,
} from "../../../../utils/revenueTable";
import RevenueForm from "./RevenueForm";
import { RevenueDetailRow } from "./RevenueTableParts";

interface RevenueDetailsModalProps {
  transaction: RevenueTransaction | null;
  form: RevenueFormState;
  updatingTransactionId: string | null;
  archivingTransactionId: string | null;
  restoringTransactionId: string | null;
  deletingTransactionId: string | null;
  onClose: () => void;
  onChange: <Key extends keyof RevenueFormState>(
    field: Key,
    value: RevenueFormState[Key]
  ) => void;
  onUpdate: () => void;
  onArchive: (transaction: RevenueTransaction) => void;
  onRestore: (transaction: RevenueTransaction) => void;
  onDeleteDraft: (transaction: RevenueTransaction) => void;
}

/**
 * Display Revenue transaction details and the editable Revenue form.
 */
export default function RevenueDetailsModal({
  transaction,
  form,
  updatingTransactionId,
  archivingTransactionId,
  restoringTransactionId,
  deletingTransactionId,
  onClose,
  onChange,
  onUpdate,
  onArchive,
  onRestore,
  onDeleteDraft,
}: RevenueDetailsModalProps) {
  if (!transaction) {
    return null;
  }

  const updating = updatingTransactionId === transaction.id;
  const archiving = archivingTransactionId === transaction.id;
  const restoring = restoringTransactionId === transaction.id;
  const deleting = deletingTransactionId === transaction.id;

  /**
   * Close the modal only when a transaction update is not running.
   */
  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !updating) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
    >
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                Revenue details
              </h2>

              {transaction.archived_at && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Archived
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {transaction.internal_reference}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={updating}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-60 dark:hover:bg-slate-800"
            aria-label="Close Revenue details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                <BadgeDollarSign size={20} />
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Transaction amount
                </p>

                <p className="text-xl font-bold text-slate-950 dark:text-white">
                  {formatCurrency(transaction.amount, transaction.currency)}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <RevenueDetailRow
                label="Status"
                value={
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs ${getRevenueStatusClasses(
                      transaction.status
                    )}`}
                  >
                    {formatLabel(transaction.status)}
                  </span>
                }
              />

              <RevenueDetailRow
                label="Reconciliation"
                value={formatLabel(transaction.reconciliation_status)}
              />
              <RevenueDetailRow
                label="Provider"
                value={formatLabel(transaction.provider)}
              />
              <RevenueDetailRow
                label="Category"
                value={formatLabel(transaction.transaction_category)}
              />
              <RevenueDetailRow
                label="Transaction date"
                value={formatDate(transaction.transaction_date)}
              />
              <RevenueDetailRow
                label="Paid at"
                value={formatDateTime(transaction.paid_at)}
              />
              <RevenueDetailRow
                label="Created at"
                value={formatDateTime(transaction.created_at)}
              />
              <RevenueDetailRow
                label="Provider reference"
                value={transaction.provider_reference}
              />
              <RevenueDetailRow
                label="Invoice number"
                value={transaction.invoice_number}
              />
              <RevenueDetailRow
                label="Receipt number"
                value={transaction.receipt_number}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-bold text-slate-950 dark:text-white">
              Edit transaction
            </h3>

            <RevenueForm form={form} onChange={onChange} />
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap gap-2">
            {transaction.archived_at ? (
              <button
                type="button"
                onClick={() => onRestore(transaction)}
                disabled={restoring}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
              >
                {restoring ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <RotateCcw size={16} />
                )}
                Restore
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onArchive(transaction)}
                disabled={archiving}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
              >
                {archiving ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Archive size={16} />
                )}
                Archive
              </button>
            )}

            {transaction.status === "draft" && (
              <button
                type="button"
                onClick={() => onDeleteDraft(transaction)}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-60 dark:border-red-900 dark:text-red-400"
              >
                {deleting ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                Delete draft
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={updating}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
            >
              Close
            </button>

            <button
              type="button"
              onClick={onUpdate}
              disabled={updating || Boolean(transaction.archived_at)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {updating ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
