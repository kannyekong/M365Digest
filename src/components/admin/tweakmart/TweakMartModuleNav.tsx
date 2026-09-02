import {
  Boxes,
  GalleryHorizontalEnd,
  LayoutDashboard,
  Package,
  Tags,
  Warehouse,
} from "lucide-react";

interface TweakMartModuleNavProps {
  current:
    "overview" | "products" | "categories" | "brands" | "inventory" | "banners";
}

const items = [
  {
    key: "overview",
    label: "Overview",
    href: "/admin/tweakmart",
    icon: LayoutDashboard,
  },
  {
    key: "products",
    label: "Products",
    href: "/admin/tweakmart/products",
    icon: Package,
  },
  {
    key: "categories",
    label: "Categories",
    href: "/admin/tweakmart/categories",
    icon: Boxes,
  },
  {
    key: "brands",
    label: "Brands",
    href: "/admin/tweakmart/brands",
    icon: Tags,
  },
  {
    key: "inventory",
    label: "Inventory",
    href: "/admin/tweakmart/inventory",
    icon: Warehouse,
  },
  {
    key: "banners",
    label: "Banners",
    href: "/admin/tweakmart/banners",
    icon: GalleryHorizontalEnd,
  },
] as const;

/* Renders consistent navigation across the TweakMart administration module. */
export default function TweakMartModuleNav({
  current,
}: TweakMartModuleNavProps) {
  return (
    <nav aria-label="TweakMart navigation" className="overflow-x-auto">
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
