import {
  CheckCircle2,
  Clock3,
  FileEdit,
  Send,
  TriangleAlert,
} from "lucide-react";

interface SocialSummary {
  total: number;
  draft: number;
  ready: number;
  scheduled: number;
  published: number;
  failed: number;
}

interface SocialOverviewProps {
  summary: SocialSummary;
}

const cards = [
  {
    key: "draft",
    label: "Drafts",
    description: "Posts still being prepared",
    icon: FileEdit,
    iconClass: "text-yellow-500 bg-yellow-50",
  },
  {
    key: "ready",
    label: "Ready",
    description: "Ready for distribution",
    icon: Send,
    iconClass: "text-orange-500 bg-orange-50",
  },
  {
    key: "scheduled",
    label: "Scheduled",
    description: "Waiting in the publishing queue",
    icon: Clock3,
    iconClass: "text-blue-500 bg-blue-50",
  },
  {
    key: "published",
    label: "Published",
    description: "Successfully distributed",
    icon: CheckCircle2,
    iconClass: "text-green-500 bg-green-50",
  },
  {
    key: "failed",
    label: "Failed",
    description: "Posts requiring attention",
    icon: TriangleAlert,
    iconClass: "text-red-500 bg-red-50",
  },
] as const;

/* Displays database-wide social publishing statistics. */
export default function SocialOverview({ summary }: SocialOverviewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.key}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>

                <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">
                  {summary[card.key]}
                </p>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconClass} dark:bg-gray-900 dark:text-gray-300`}
              >
                <Icon size={19} />
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-400">
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
