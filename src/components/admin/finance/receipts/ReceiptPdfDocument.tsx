import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { Receipt } from "../../../types/receipt";

interface ReceiptPdfDocumentProps {
  receipt: Receipt;

  company: {
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
}

/**
 * Format one Receipt currency value using its ISO code.
 */
function formatReceiptCurrency(
  amount: number,
  currency = "NGN"
) {
  return `${currency.toUpperCase()} ${new Intl.NumberFormat(
    "en-NG",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(amount)}`;
}

/**
 * Format one Receipt date for PDF display.
 */
function formatReceiptDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * Convert underscore-separated values into readable labels.
 */
function formatReceiptLabel(value: string) {
  return value
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingRight: 40,
    paddingBottom: 44,
    paddingLeft: 40,
    fontSize: 10,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },

  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },

  companyName: {
    fontSize: 18,
    fontWeight: 700,
  },

  mutedText: {
    marginTop: 4,
    color: "#64748b",
    lineHeight: 1.5,
  },

  receiptHeading: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: "right",
  },

  receiptNumber: {
    marginTop: 5,
    color: "#2563eb",
    fontWeight: 700,
    textAlign: "right",
  },

  statusBadge: {
    marginTop: 8,
    alignSelf: "flex-end",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
    backgroundColor: "#dcfce7",
    color: "#166534",
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
  },

  successPanel: {
    marginTop: 22,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: "#eff6ff",
    textAlign: "center",
  },

  successLabel: {
    color: "#475569",
    fontSize: 10,
  },

  successAmount: {
    marginTop: 7,
    color: "#0f172a",
    fontSize: 26,
    fontWeight: 700,
  },

  successCaption: {
    marginTop: 6,
    color: "#16a34a",
    fontWeight: 700,
  },

  twoColumn: {
    marginTop: 22,
    display: "flex",
    flexDirection: "row",
    gap: 18,
  },

  column: {
    flex: 1,
  },

  sectionTitle: {
    marginBottom: 9,
    color: "#475569",
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
  },

  primaryText: {
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.5,
  },

  detailTable: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    overflow: "hidden",
  },

  detailRow: {
    display: "flex",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  detailRowLast: {
    display: "flex",
    flexDirection: "row",
  },

  detailLabel: {
    width: "38%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f8fafc",
    color: "#64748b",
  },

  detailValue: {
    width: "62%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontWeight: 700,
  },

  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#64748b",
    fontSize: 8,
  },
});

/**
 * Render one printable CloudTweak Receipt PDF.
 */
export default function ReceiptPdfDocument({
  receipt,
  company,
}: ReceiptPdfDocumentProps) {
  const companyContact = [
    company.email,
    company.phone,
    company.website,
  ]
    .filter(Boolean)
    .join(" • ");

  const detailRows = [
    [
      "Invoice number",
      receipt.invoice_number,
    ],
    [
      "Payment reference",
      receipt.payment_reference,
    ],
    [
      "Payment provider",
      formatReceiptLabel(
        receipt.payment_provider
      ),
    ],
    [
      "Payment method",
      receipt.payment_method
        ? formatReceiptLabel(
            receipt.payment_method
          )
        : "Not available",
    ],
    [
      "Provider transaction ID",
      receipt.provider_transaction_id
        ? String(
            receipt.provider_transaction_id
          )
        : "Not available",
    ],
    [
      "Paid at",
      formatReceiptDate(
        receipt.paid_at
      ),
    ],
    [
      "Issued at",
      formatReceiptDate(
        receipt.issued_at
      ),
    ],
  ];

  return (
    <Document
      title={`Receipt ${receipt.receipt_number}`}
      author={company.name}
      subject={`Payment Receipt for ${receipt.invoice_number}`}
      creator={company.name}
    >
      <Page
        size="A4"
        style={styles.page}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>
              {company.name}
            </Text>

            {company.address && (
              <Text style={styles.mutedText}>
                {company.address}
              </Text>
            )}

            {companyContact && (
              <Text style={styles.mutedText}>
                {companyContact}
              </Text>
            )}
          </View>

          <View>
            <Text style={styles.receiptHeading}>
              PAYMENT RECEIPT
            </Text>

            <Text style={styles.receiptNumber}>
              {receipt.receipt_number}
            </Text>

            <Text style={styles.statusBadge}>
              {formatReceiptLabel(
                receipt.status
              )}
            </Text>
          </View>
        </View>

        <View style={styles.successPanel}>
          <Text style={styles.successLabel}>
            Amount received
          </Text>

          <Text style={styles.successAmount}>
            {formatReceiptCurrency(
              receipt.amount,
              receipt.currency
            )}
          </Text>

          <Text style={styles.successCaption}>
            Payment confirmed
          </Text>
        </View>

        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>
              Received from
            </Text>

            <Text style={styles.primaryText}>
              {receipt.customer_name}
            </Text>

            <Text style={styles.mutedText}>
              {receipt.customer_email}
            </Text>

            {receipt.customer_phone && (
              <Text style={styles.mutedText}>
                {receipt.customer_phone}
              </Text>
            )}
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionTitle}>
              Payment for
            </Text>

            <Text style={styles.primaryText}>
              Invoice {receipt.invoice_number}
            </Text>

            <Text style={styles.mutedText}>
              This Receipt confirms that the
              payment listed below was received
              successfully.
            </Text>
          </View>
        </View>

        <View style={styles.detailTable}>
          {detailRows.map(
            ([label, value], index) => (
              <View
                key={label}
                style={
                  index ===
                  detailRows.length - 1
                    ? styles.detailRowLast
                    : styles.detailRow
                }
              >
                <Text style={styles.detailLabel}>
                  {label}
                </Text>

                <Text style={styles.detailValue}>
                  {value}
                </Text>
              </View>
            )
          )}
        </View>

        {receipt.notes && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>
              Notes
            </Text>

            <Text style={styles.mutedText}>
              {receipt.notes}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>
            Generated by {company.name}
          </Text>

          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
