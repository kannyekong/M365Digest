import {
  ArrowUpRight,
  ClipboardList,
  FileText,
  MessageSquareText,
  Star,
  type LucideIcon,
} from "lucide-react";

type CardType = "contacts" | "registrations" | "reviews" | "quotes";

interface DashboardCountCardProps {
  title: string;
  count: number;
  href: string;
  type: CardType;
  description?: string;
}

/* Stores the icon and static Tailwind styles for each dashboard module. */
const cardConfig: Record<
  CardType,
  {
    icon: LucideIcon;
    iconClassName: string;
    surfaceClassName: string;
  }
> = {
  contacts: {
    icon: MessageSquareText,
    iconClassName: "bg-blue-500 text-white shadow-blue-500/20",
    surfaceClassName: "hover:border-blue-500/30",
  },
  registrations: {
    icon: ClipboardList,
    iconClassName: "bg-purple-500 text-white shadow-purple-500/20",
    surfaceClassName: "hover:border-purple-500/30",
  },
  reviews: {
    icon: Star,
    iconClassName: "bg-amber-500 text-white shadow-amber-500/20",
    surfaceClassName: "hover:border-amber-500/30",
  },
  quotes: {
    icon: FileText,
    iconClassName: "bg-emerald-500 text-white shadow-emerald-500/20",
    surfaceClassName: "hover:border-emerald-500/30",
  },
};

/* Displays a reusable count card linking to an admin module. */
export default function DashboardCountCard({
  title,
  count,
  href,
  type,
  description,
}: DashboardCountCardProps) {
  const config = cardConfig[type];
  const Icon = config.icon;

  return (
    <a
      href={href}
      className={`group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${config.surfaceClassName}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <h2 className="mt-3 text-2xl font-bold text-slate-900">
            {count.toLocaleString()}
          </h2>

          {description && (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          )}
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-lg ${config.iconClassName}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs font-medium text-slate-500">
          View all records
        </span>

        <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </a>
  );
}
