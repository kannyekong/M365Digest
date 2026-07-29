import {
  BookOpen,
  Users,
  Workflow,
  Sparkles,
  BadgeDollarSign,
  ArrowUpRight,
} from "lucide-react";

interface Props {
  title: string;
  subtitle: string;
  value1: number | string;
  value2: number | string;
  value3: number | string;
  value4: number | string;
  value5: number | string;
  subtitleTwo: string;
  subtitleThree: string;
  subtitleFour: string;
  subtitleFive: string;
  icon: "articles" | "tasks" | "drafts" | "engagements" | "revenue";
  color?: string;
}

export default function SingleStatCard({
  title,
  subtitle,
  subtitleTwo,
  subtitleThree,
  subtitleFour,
  subtitleFive,
  value1,
  value2,
  value3,
  value4,
  value5,
  icon,
  color = "bg-blue-500",
}: Props) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            {title}
          </p>

          <h2 className="mt-3 text-xl font-bold text-slate-900">
            {value1} <span className="text-sm">{subtitle}</span>
          </h2>
        </div>

        <div
          className={`bg-${color}-500 h-7 w-7 rounded-xl flex items-center justify-center shadow-lg`}
        >
          {icon === "articles" && <BookOpen className="h-4 w-4 text-white" />}
          {icon === "drafts" && <Users className="h-4 w-4 text-white" />}
          {icon === "tasks" && <Workflow className="h-4 w-4 text-white" />}
          {icon === "revenue" && (
            <BadgeDollarSign className="h-4 w-4 text-white" />
          )}
          {icon === "engagements" && (
            <Sparkles className="h-4 w-4 text-white" />
          )}
        </div>
      </div>

      <div className="my-2 border-t border-blue-100"></div>

      <div className="flex flex-row justify-between pb-1">
        <div className="flex gap-1 text-xs">
          <span className="font-semibold text-emerald-600">{value2}</span>
          <span className="text-slate-500">{subtitleTwo}</span>
        </div>

        <div className="flex gap-1 text-xs">
          <span className="font-semibold text-amber-500">{value3}</span>
          <span className="text-slate-500">{subtitleThree}</span>
        </div>
      </div>

      <div className="flex flex-row justify-between">
        <div className="flex gap-1 text-xs">
          <span className="font-semibold text-slate-900">{value4}</span>
          <span className="text-slate-500">{subtitleFour}</span>
        </div>

        <div className="flex gap-1 text-xs">
          <a
            href={subtitleFive}
            className="inline-flex items-center gap-1 rounded-full border border-blue-500 px-1 font-medium text-slate-900 transition hover:bg-blue-500 hover:text-white"
          >
            Manage
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
