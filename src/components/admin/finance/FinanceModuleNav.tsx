import {
  FileBarChart,
  FileText,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from "lucide-react";

interface FinanceModuleNavProps {
  current:
    | "overview"
    | "revenue"
    | "expenses"
    | "invoices"
    | "receipts"
    | "reports";
}

const items = [
  {
    key: "overview",
    label: "Overview",
    href: "/admin/finance",
    icon: WalletCards,
  },
  {
    key: "revenue",
    label: "Revenue",
    href: "/admin/finance/revenue",
    icon: TrendingUp,
  },
  {
    key: "expenses",
    label: "Expenses",
    href: "/admin/finance/expenses",
    icon: WalletCards,
  },
  {
    key: "invoices",
    label: "Invoices",
    href: "/admin/finance/invoices",
    icon: FileText,
  },
  {
    key: "receipts",
    label: "Receipts",
    href: "/admin/finance/receipts",
    icon: ReceiptText,
  },
  {
    key: "reports",
    label: "Reports",
    href: "/admin/finance/reports",
    icon: FileBarChart,
  },
] as const;

/**
 * Render consistent navigation across Finance pages.
 */
export default function FinanceModuleNav({
  current,
}: FinanceModuleNavProps) {
  return (
    <nav
      aria-label="Finance navigation"
      className="overflow-x-auto"
    >
      <div className="inline-flex min-w-full gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {items.map((item) => {
          const Icon = item.icon;

          const active =
            item.key === current;

          return (
            <a
              key={item.key}
              href={item.href}
              aria-current={
                active ? "page" : undefined
              }
              className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-primary text-white dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
