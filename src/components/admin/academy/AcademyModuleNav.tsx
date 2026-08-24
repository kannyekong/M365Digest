import {
  LayoutPanelTop,
  GraduationCap,
  Users,
  BadgeDollarSign,
  Award,
  Dock,
  NotepadTextDashed,
  UserStar,
} from "lucide-react";

interface AcademyModuleNavProps {
  current:
    | "Overview"
    | "Programs"
    | "Registrations"
    | "Payments"
    | "Certificates"
    | "Categories"
    | "Templates"
    | "Instructors";
}

const items = [
  {
    key: "Overview",
    label: "Overview",
    href: "/admin/academy",
    icon: LayoutPanelTop,
  },
  {
    key: "Programs",
    label: "Programs",
    href: "/admin/academy/programs",
    icon: GraduationCap,
  },
  {
    key: "Registrations",
    label: "Registrations",
    href: "/admin/academy/registrations",
    icon: Users,
  },
  {
    key: "Payments",
    label: "Payments",
    href: "/admin/academy/payments",
    icon: BadgeDollarSign,
  },
  {
    key: "Certificates",
    label: "Certificates",
    href: "/admin/academy/certificates",
    icon: Award,
  },
  {
    key: "Categories",
    label: "Categories",
    href: "/admin/academy/categories",
    icon: Dock,
  },

  {
    key: "Templates",
    label: "Templates",
    href: "/admin/academy/certificate-templates",
    icon: NotepadTextDashed,
  },

  {
    key: "Instructors",
    label: "Instructors",
    href: "/admin/bootcamp/instructors",
    icon: UserStar,
  },
  
] as const;

/**
 * Render consistent navigation across Finance pages.
 */
export default function AcademyModuleNav({ current }: AcademyModuleNavProps) {
  return (
    <nav aria-label="Academy navigation" className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {items.map((item) => {
          const Icon = item.icon;

          const active = item.key === current;

          return (
            <a
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
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
