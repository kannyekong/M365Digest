import {
  FileText,
  CheckCircle,
  FileClock,
  Eye,
  Archive,
  FilePenLine,
  BriefcaseBusiness,
  Rocket,
} from "lucide-react";

interface Props {
  title: string;
  value: number | string;
  icon:
    | "articles"
    | "published"
    | "drafts"
    | "views"
    | "openings"
    | "published"
    | "drafts"
    | "closed";
  color?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  color = "bg-blue-500",
}: Props) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg border border-slate-200 hover:-translate-y-1 transition duration-300">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-500 text-sm">{title}</p>

          <h2 className="mt-3 text-4xl font-bold">{value}</h2>
        </div>

        <div
          className={`${color} w-8 h-8 rounded-xl flex items-center justify-center text-white`}
        >
          {icon === "articles" && <FileText className="w-4 h-4" />}

          {icon === "published" && <CheckCircle className="w-4 h-4" />}

          {icon === "drafts" && <FileClock className="w-4 h-4" />}

          {icon === "views" && <Eye className="w-4 h-4" />}

          {icon === "openings" && <BriefcaseBusiness className="w-4 h-4" />}

          {icon === "closed" && <Archive className="w-4 h-4" />}
        </div>
      </div>
    </div>
  );
}
