import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Invoice } from "../../../../types/invoice";
import { formatInvoiceCurrency } from "../../../../utils/invoice";

interface InvoicePdfDocumentProps {
  invoice: Invoice;

  company?: {
    name?: string;

    address?: string;

    email?: string;

    phone?: string;

    website?: string;

    registrationNumber?: string;

    taxNumber?: string;
  };
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingBottom: 36,
    paddingHorizontal: 36,
    paddingTop: 36,
  },

  header: {
    alignItems: "flex-start",
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 20,
  },

  companyName: {
    color: "#0f172a",
    fontSize: 19,
    fontWeight: 700,
  },

  companyDetails: {
    color: "#64748b",
    fontSize: 8,
    lineHeight: 1.45,
    marginTop: 6,
    maxWidth: 250,
  },

  invoiceHeading: {
    color: "#2563eb",
    fontSize: 20,
    fontWeight: 700,
    textAlign: "right",
  },

  invoiceNumber: {
    color: "#0f172a",
    fontSize: 10,
    fontWeight: 700,
    marginTop: 6,
    textAlign: "right",
  },

  statusBadge: {
    alignSelf: "flex-end",
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    color: "#1d4ed8",
    fontSize: 8,
    fontWeight: 700,
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase",
  },

  detailsGrid: {
    display: "flex",
    flexDirection: "row",
    gap: 24,
    marginTop: 24,
  },

  detailsColumn: {
    flexGrow: 1,
    width: "50%",
  },

  sectionLabel: {
    color: "#64748b",
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 0.7,
    marginBottom: 6,
    textTransform: "uppercase",
  },

  customerName: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 700,
  },

  detailText: {
    color: "#475569",
    fontSize: 8,
    lineHeight: 1.5,
    marginTop: 3,
  },

  metaRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  metaLabel: {
    color: "#64748b",
    fontSize: 8,
  },

  metaValue: {
    color: "#0f172a",
    fontSize: 8,
    fontWeight: 700,
    textAlign: "right",
  },

  table: {
    borderColor: "#e2e8f0",
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 24,
    overflow: "hidden",
  },

  tableHeader: {
    backgroundColor: "#f8fafc",
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    display: "flex",
    flexDirection: "row",
    minHeight: 28,
  },

  tableRow: {
    borderBottomColor: "#f1f5f9",
    borderBottomWidth: 1,
    display: "flex",
    flexDirection: "row",
    minHeight: 34,
  },

  descriptionCell: {
    flexGrow: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    width: "38%",
  },

  quantityCell: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    textAlign: "right",
    width: "10%",
  },

  amountCell: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    textAlign: "right",
    width: "17.33%",
  },

  tableHeaderText: {
    color: "#64748b",
    fontSize: 7,
    fontWeight: 700,
    textTransform: "uppercase",
  },

  tableBodyText: {
    color: "#334155",
    fontSize: 8,
  },

  tableDescription: {
    color: "#0f172a",
    fontSize: 8,
    fontWeight: 700,
  },

  totalsWrapper: {
    alignSelf: "flex-end",
    marginTop: 18,
    width: 245,
  },

  totalRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },

  totalLabel: {
    color: "#64748b",
    fontSize: 8,
  },

  totalValue: {
    color: "#0f172a",
    fontSize: 8,
    fontWeight: 700,
  },

  grandTotalRow: {
    borderTopColor: "#cbd5e1",
    borderTopWidth: 1,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
    paddingTop: 9,
  },

  grandTotalLabel: {
    color: "#0f172a",
    fontSize: 10,
    fontWeight: 700,
  },

  grandTotalValue: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 700,
  },

  outstandingRow: {
    backgroundColor: "#fef2f2",
    borderRadius: 5,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },

  outstandingLabel: {
    color: "#991b1b",
    fontSize: 8,
    fontWeight: 700,
  },

  outstandingValue: {
    color: "#991b1b",
    fontSize: 9,
    fontWeight: 700,
  },

  notesGrid: {
    display: "flex",
    flexDirection: "row",
    gap: 18,
    marginTop: 24,
  },

  noteBox: {
    borderColor: "#e2e8f0",
    borderRadius: 5,
    borderWidth: 1,
    flexGrow: 1,
    padding: 10,
    width: "50%",
  },

  noteText: {
    color: "#475569",
    fontSize: 8,
    lineHeight: 1.5,
  },

  footer: {
    bottom: 18,
    color: "#94a3b8",
    fontSize: 7,
    left: 36,
    position: "absolute",
    right: 36,
    textAlign: "center",
  },
});

/**
 * Convert one stored date into a readable Invoice date.
 */
function formatPdfDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Convert an underscore-separated Invoice status into a readable label.
 */
function formatPdfLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Build the downloadable CloudTweak Invoice PDF document.
 */
export default function InvoicePdfDocument({
  invoice,
  company = {},
}: InvoicePdfDocumentProps) {
  const items = invoice.items ?? [];
  const companyName = company.name ?? "CloudTweak Technologies Limited";

  return (
    <Document
      title={`${invoice.invoice_number} - ${invoice.customer_name}`}
      author={companyName}
      subject={`Invoice ${invoice.invoice_number}`}
      creator="CloudTweak Finance"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{companyName}</Text>

            <Text style={styles.companyDetails}>
              {[company.address, company.email, company.phone, company.website]
                .filter(Boolean)
                .join("\n")}
            </Text>

            {(company.registrationNumber || company.taxNumber) && (
              <Text style={styles.companyDetails}>
                {[
                  company.registrationNumber
                    ? `Registration: ${company.registrationNumber}`
                    : null,
                  company.taxNumber ? `Tax ID: ${company.taxNumber}` : null,
                ]
                  .filter(Boolean)
                  .join("\n")}
              </Text>
            )}
          </View>

          <View>
            <Text style={styles.invoiceHeading}>INVOICE</Text>

            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>

            <Text style={styles.statusBadge}>
              {formatPdfLabel(invoice.status)}
            </Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailsColumn}>
            <Text style={styles.sectionLabel}>Bill to</Text>

            <Text style={styles.customerName}>{invoice.customer_name}</Text>

            {invoice.customer_company && (
              <Text style={styles.detailText}>{invoice.customer_company}</Text>
            )}

            <Text style={styles.detailText}>{invoice.customer_email}</Text>

            {invoice.customer_phone && (
              <Text style={styles.detailText}>{invoice.customer_phone}</Text>
            )}

            {invoice.billing_address && (
              <Text style={styles.detailText}>{invoice.billing_address}</Text>
            )}
          </View>

          <View style={styles.detailsColumn}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issue date</Text>

              <Text style={styles.metaValue}>
                {formatPdfDate(invoice.issue_date)}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due date</Text>

              <Text style={styles.metaValue}>
                {formatPdfDate(invoice.due_date)}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Currency</Text>

              <Text style={styles.metaValue}>{invoice.currency}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Purchase order</Text>

              <Text style={styles.metaValue}>
                {invoice.purchase_order_number ?? "Not provided"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.descriptionCell}>
              <Text style={styles.tableHeaderText}>Description</Text>
            </View>

            <View style={styles.quantityCell}>
              <Text style={styles.tableHeaderText}>Qty</Text>
            </View>

            <View style={styles.amountCell}>
              <Text style={styles.tableHeaderText}>Unit price</Text>
            </View>

            <View style={styles.amountCell}>
              <Text style={styles.tableHeaderText}>Tax</Text>
            </View>

            <View style={styles.amountCell}>
              <Text style={styles.tableHeaderText}>Total</Text>
            </View>
          </View>

          {items.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <View style={styles.descriptionCell}>
                <Text style={styles.tableDescription}>{item.description}</Text>
              </View>

              <View style={styles.quantityCell}>
                <Text style={styles.tableBodyText}>
                  {String(item.quantity)}
                </Text>
              </View>

              <View style={styles.amountCell}>
                <Text style={styles.tableBodyText}>
                  {formatInvoiceCurrency(item.unit_price, invoice.currency)}
                </Text>
              </View>

              <View style={styles.amountCell}>
                <Text style={styles.tableBodyText}>
                  {formatInvoiceCurrency(item.tax_amount, invoice.currency)}
                </Text>
              </View>

              <View style={styles.amountCell}>
                <Text style={styles.tableBodyText}>
                  {formatInvoiceCurrency(item.line_total, invoice.currency)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.totalsWrapper}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>

            <Text style={styles.totalValue}>
              {formatInvoiceCurrency(invoice.subtotal_amount, invoice.currency)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Discount</Text>

            <Text style={styles.totalValue}>
              -
              {formatInvoiceCurrency(invoice.discount_amount, invoice.currency)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>

            <Text style={styles.totalValue}>
              {formatInvoiceCurrency(invoice.tax_amount, invoice.currency)}
            </Text>
          </View>

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>

            <Text style={styles.grandTotalValue}>
              {formatInvoiceCurrency(invoice.total_amount, invoice.currency)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Amount paid</Text>

            <Text style={styles.totalValue}>
              {formatInvoiceCurrency(invoice.amount_paid, invoice.currency)}
            </Text>
          </View>

          {invoice.amount_due > 0 && (
            <View style={styles.outstandingRow}>
              <Text style={styles.outstandingLabel}>Outstanding balance</Text>

              <Text style={styles.outstandingValue}>
                {formatInvoiceCurrency(invoice.amount_due, invoice.currency)}
              </Text>
            </View>
          )}
        </View>

        {(invoice.notes || invoice.terms) && (
          <View style={styles.notesGrid}>
            {invoice.notes && (
              <View style={styles.noteBox}>
                <Text style={styles.sectionLabel}>Customer note</Text>

                <Text style={styles.noteText}>{invoice.notes}</Text>
              </View>
            )}

            {invoice.terms && (
              <View style={styles.noteBox}>
                <Text style={styles.sectionLabel}>Payment terms</Text>

                <Text style={styles.noteText}>{invoice.terms}</Text>
              </View>
            )}
          </View>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${companyName} - ${invoice.invoice_number} - Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
