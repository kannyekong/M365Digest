import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileText,
  Landmark,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import type {
  ProvidusPaymentMatchType,
  ProvidusReconciliationClient,
  ProvidusReconciliationInvoice,
  ProvidusTransaction,
} from "../../../types/providus";

interface ProvidusReconciliationModalProps {
  transaction: ProvidusTransaction | null;
  onClose: () => void;
  onReconciled?: () => void;
}

interface ReconcileProvidusResult {
  success: boolean;
  message?: string;
  reconciliation?: {
    success: boolean;
    providus_transaction_id: string;
    providus_reference: string;
    financial_transaction_id: string;
    client_id: string;
    client_name: string;
    invoice_id: string;
    invoice_number: string;
    payment_amount: number;
    previous_amount_paid: number;
    new_amount_paid: number;
    previous_amount_due: number;
    new_amount_due: number;
    invoice_status: string;
    payment_match: "exact" | "partial";
  };
}

interface ClientsResponse {
  success: boolean;
  clients?: ProvidusReconciliationClient[];
  message?: string;
}

interface InvoicesResponse {
  success: boolean;
  invoices?: ProvidusReconciliationInvoice[];
  message?: string;
}

/* Formats monetary values as Nigerian naira. */
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(value);
}

/* Formats ISO dates for display in the reconciliation workspace. */
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

/* Determines how the received bank amount compares with the selected invoice balance. */
function getPaymentMatchType(
  receivedAmount: number,
  amountDue: number
): ProvidusPaymentMatchType {
  if (receivedAmount === amountDue) {
    return "exact";
  }

  if (receivedAmount < amountDue) {
    return "partial";
  }

  return "excess";
}

/* Displays the real client and invoice matching workflow for a Providus transaction. */
export default function ProvidusReconciliationModal({
  transaction,
  onClose,
  onReconciled,
}: ProvidusReconciliationModalProps) {
  const [clients, setClients] = useState<ProvidusReconciliationClient[]>([]);

  const [invoices, setInvoices] = useState<ProvidusReconciliationInvoice[]>([]);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null
  );

  const [clientSearch, setClientSearch] = useState("");

  const [loadingClients, setLoadingClients] = useState(false);

  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const [reconciling, setReconciling] = useState(false);

  const [reconciliationSuccess, setReconciliationSuccess] = useState<
    string | null
  >(null);

  const [error, setError] = useState<string | null>(null);

  /* Resets reconciliation state whenever a different transaction is opened. */
  useEffect(() => {
    if (!transaction) {
      return;
    }

    setSelectedClientId(null);
    setSelectedInvoiceId(null);
    setClientSearch("");
    setInvoices([]);
    setError(null);
    setReconciliationSuccess(null);
    setReconciling(false);
  }, [transaction?.id]);

  /* Loads available CloudTweak clients when the reconciliation modal opens. */
  useEffect(() => {
    if (!transaction) {
      return;
    }

    async function loadClients() {
      try {
        setLoadingClients(true);
        setError(null);

        const response = await fetch(
          "/api/admin/finance/providus/reconciliation-options",
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        const result = (await response.json()) as ClientsResponse;

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load clients.");
        }

        setClients(result.clients ?? []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load clients."
        );
      } finally {
        setLoadingClients(false);
      }
    }

    void loadClients();
  }, [transaction?.id]);

  /* Loads outstanding invoices belonging to the selected client. */
  useEffect(() => {
    if (!selectedClientId) {
      setInvoices([]);
      setSelectedInvoiceId(null);
      return;
    }

    /*
     * Copies the narrowed React state value into a local constant so
     * TypeScript knows it cannot become null inside the async function.
     */
    const clientId = selectedClientId;

    async function loadInvoices() {
      try {
        setLoadingInvoices(true);
        setSelectedInvoiceId(null);
        setError(null);

        const response = await fetch(
          `/api/admin/finance/providus/reconciliation-options?clientId=${encodeURIComponent(
            clientId
          )}`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        const result = (await response.json()) as InvoicesResponse;

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load client invoices.");
        }

        setInvoices(result.invoices ?? []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load client invoices."
        );
      } finally {
        setLoadingInvoices(false);
      }
    }

    void loadInvoices();
  }, [selectedClientId]);

  /* Filters the client directory using the reconciliation search field. */
  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();

    if (!query) {
      return clients;
    }

    return clients.filter((client) => {
      return [
        client.display_name,
        client.company_name,
        client.client_code,
        client.email,
        client.phone,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [clients, clientSearch]);

  /* Resolves the currently selected client record. */
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  /* Resolves the currently selected invoice record. */
  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [invoices, selectedInvoiceId]
  );

  /* Calculates the reconciliation comparison for the selected invoice. */
  const comparison = useMemo(() => {
    if (!transaction || !selectedInvoice) {
      return null;
    }

    const receivedAmount = Number(transaction.amount);

    const amountDue = Number(selectedInvoice.amount_due);

    const difference = receivedAmount - amountDue;

    const matchType = getPaymentMatchType(receivedAmount, amountDue);

    const remainingAmount =
      matchType === "partial" ? amountDue - receivedAmount : 0;

    return {
      receivedAmount,
      amountDue,
      difference,
      remainingAmount,
      matchType,
    };
  }, [transaction, selectedInvoice]);

  if (!transaction) {
    return null;
  }

  /* Sends the selected Providus transaction and invoice to the atomic reconciliation API. */
  async function handleConfirmReconciliation() {
    if (!transaction || !selectedClientId || !selectedInvoice || !comparison) {
      return;
    }

    /*
     * Excess payments remain blocked because the current reconciliation RPC
     * intentionally refuses to overpay an invoice.
     */
    if (comparison.matchType === "excess") {
      setError(
        "This payment exceeds the invoice outstanding balance and cannot be reconciled automatically."
      );

      return;
    }

    try {
      setReconciling(true);
      setError(null);
      setReconciliationSuccess(null);

      const response = await fetch("/api/admin/finance/providus/reconcile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          providusTransactionId: transaction.id,
          clientId: selectedClientId,
          invoiceId: selectedInvoice.id,
        }),
      });

      const result = (await response.json()) as ReconcileProvidusResult;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to reconcile Providus payment."
        );
      }

      const reconciliation = result.reconciliation;

      if (!reconciliation) {
        throw new Error(
          "The reconciliation completed without returning a result."
        );
      }

      const successMessage =
        reconciliation.payment_match === "exact"
          ? `${reconciliation.invoice_number} has been fully paid and reconciled.`
          : `${reconciliation.invoice_number} has been partially paid and reconciled.`;

      setReconciliationSuccess(successMessage);

      /*
       * Tells the parent reconciliation manager to refresh its transaction
       * list so the payment immediately moves out of the unreconciled state.
       */
      onReconciled?.();
    } catch (reconcileError) {
      setError(
        reconcileError instanceof Error
          ? reconcileError.message
          : "Unable to reconcile Providus payment."
      );
    } finally {
      setReconciling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Providus reconciliation
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              {formatCurrency(Number(transaction.amount))}
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {transaction.reference}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Close reconciliation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-8 p-6">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="mb-4 flex items-center gap-2">
              <Landmark className="h-5 w-5 text-slate-500" />

              <h3 className="font-semibold text-slate-950 dark:text-white">
                Bank transaction
              </h3>
            </div>

            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">
                  Providus account
                </dt>

                <dd className="mt-1 font-medium text-slate-950 dark:text-white">
                  {transaction.account_number}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500 dark:text-slate-400">
                  Transaction type
                </dt>

                <dd className="mt-1 font-medium uppercase text-slate-950 dark:text-white">
                  {transaction.transaction_type}
                </dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-slate-500 dark:text-slate-400">
                  Narration
                </dt>

                <dd className="mt-1 leading-6 text-slate-950 dark:text-white">
                  {transaction.narration || "No narration supplied."}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500 dark:text-slate-400">
                  Provider transaction time
                </dt>

                <dd className="mt-1 text-slate-950 dark:text-white">
                  {transaction.transaction_datetime}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500 dark:text-slate-400">
                  Received by CloudTweak
                </dt>

                <dd className="mt-1 text-slate-950 dark:text-white">
                  {formatDate(transaction.received_at)}
                </dd>
              </div>
            </dl>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <section>
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
                1
              </div>

              <div>
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  Identify client
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Select the CloudTweak client that made this payment.
                </p>
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={clientSearch}
                onChange={(event) => setClientSearch(event.target.value)}
                placeholder="Search client, company, code, email or phone..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-600"
              />
            </div>

            {loadingClients ? (
              <div className="flex min-h-28 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No matching clients found.
              </div>
            ) : (
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {filteredClients.map((client) => {
                  const selected = selectedClientId === client.id;

                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => setSelectedClientId(client.id)}
                      className={[
                        "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition",
                        selected
                          ? "border-sky-500 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/30"
                          : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900",
                      ].join(" ")}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                        <Building2 className="h-5 w-5 text-slate-500" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-950 dark:text-white">
                          {client.display_name}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>{client.client_code}</span>

                          {client.email && <span>{client.email}</span>}
                        </div>
                      </div>

                      {selected && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {selectedClient && (
            <section>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
                  2
                </div>

                <div>
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Select invoice
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Outstanding invoices for {selectedClient.display_name}.
                  </p>
                </div>
              </div>

              {loadingInvoices ? (
                <div className="flex min-h-28 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                  <FileText className="mx-auto h-7 w-7 text-slate-400" />

                  <p className="mt-3 font-medium text-slate-950 dark:text-white">
                    No outstanding invoices
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    This client has no invoice with an outstanding balance.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.map((invoice) => {
                    const selected = selectedInvoiceId === invoice.id;

                    return (
                      <button
                        key={invoice.id}
                        type="button"
                        onClick={() => setSelectedInvoiceId(invoice.id)}
                        className={[
                          "flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition sm:flex-row sm:items-center sm:justify-between",
                          selected
                            ? "border-sky-500 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/30"
                            : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900",
                        ].join(" ")}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-500" />

                            <p className="font-semibold text-slate-950 dark:text-white">
                              {invoice.invoice_number}
                            </p>
                          </div>

                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Due {formatDate(invoice.due_date)}
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="font-semibold text-slate-950 dark:text-white">
                            {formatCurrency(Number(invoice.amount_due))}
                          </p>

                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Outstanding
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {reconciliationSuccess && toast.success("Payment reconciled")}

          {selectedInvoice && comparison && (
            <section>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
                  3
                </div>

                <div>
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Review payment
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Compare the Providus credit with the selected invoice.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-3 p-5">
                  <AmountRow
                    label="Invoice total"
                    value={Number(selectedInvoice.total_amount)}
                  />

                  <AmountRow
                    label="Previously paid"
                    value={Number(selectedInvoice.amount_paid)}
                  />

                  <AmountRow label="Outstanding" value={comparison.amountDue} />

                  <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                    <AmountRow
                      label="Providus payment"
                      value={comparison.receivedAmount}
                      emphasized
                    />
                  </div>
                </div>

                <PaymentComparison comparison={comparison} />
              </div>
            </section>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmReconciliation}
            disabled={
              reconciling ||
              !selectedInvoice ||
              !comparison ||
              comparison.matchType === "excess" ||
              Boolean(reconciliationSuccess)
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {reconciling && <Loader2 className="h-4 w-4 animate-spin" />}

            {reconciling
              ? "Reconciling..."
              : reconciliationSuccess
                ? "Reconciled"
                : "Confirm reconciliation"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AmountRowProps {
  label: string;
  value: number;
  emphasized?: boolean;
}

/* Displays one monetary value in the reconciliation comparison. */
function AmountRow({ label, value, emphasized = false }: AmountRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          emphasized
            ? "font-semibold text-slate-950 dark:text-white"
            : "text-sm text-slate-500 dark:text-slate-400"
        }
      >
        {label}
      </span>

      <span
        className={
          emphasized
            ? "font-bold text-slate-950 dark:text-white"
            : "text-sm font-semibold text-slate-950 dark:text-white"
        }
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

interface PaymentComparisonProps {
  comparison: {
    receivedAmount: number;
    amountDue: number;
    difference: number;
    remainingAmount: number;
    matchType: ProvidusPaymentMatchType;
  };
}

/* Displays whether the Providus payment is exact, partial, or greater than the invoice balance. */
function PaymentComparison({ comparison }: PaymentComparisonProps) {
  if (comparison.matchType === "exact") {
    return (
      <div className="flex items-center gap-3 border-t border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
        <CheckCircle2 className="h-5 w-5 shrink-0" />

        <div>
          <p className="font-semibold">Exact payment</p>

          <p className="mt-0.5 text-xs">
            The Providus credit exactly matches the invoice outstanding balance.
          </p>
        </div>
      </div>
    );
  }

  if (comparison.matchType === "partial") {
    return (
      <div className="border-t border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

          <div className="flex-1">
            <p className="font-semibold">Partial payment</p>

            <p className="mt-1 text-xs">
              The invoice will still have{" "}
              {formatCurrency(comparison.remainingAmount)} outstanding after
              this payment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

        <div>
          <p className="font-semibold">Excess payment</p>

          <p className="mt-1 text-xs">
            This payment exceeds the invoice outstanding balance by{" "}
            {formatCurrency(Math.abs(comparison.difference))}. Do not reconcile
            it automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
