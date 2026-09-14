import { useEffect, useRef, useState } from "react";
import {
  Boxes,
  ChevronDown,
  GalleryHorizontalEnd,
  Handshake,
  LayoutDashboard,
  Package,
  ReceiptText,
  RotateCcw,
  Tags,
  Warehouse,
} from "lucide-react";

interface TweakMartModuleNavProps {
  current:
    | "overview"
    | "products"
    | "returns"
    | "categories"
    | "brands"
    | "inventory"
    | "orders"
    | "banners"
    | "deals"
    | "notifications";
}

type TweakMartNavKey = TweakMartModuleNavProps["current"];

interface TweakMartNavChild {
  key: TweakMartNavKey;
  label: string;
  href: string;
  icon: React.ElementType;
}

interface TweakMartNavItem {
  key: string;
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: TweakMartNavChild[];
}

const items: TweakMartNavItem[] = [
  {
    key: "overview",
    label: "Overview",
    href: "/admin/tweakmart",
    icon: LayoutDashboard,
  },
  {
    key: "catalogue",
    label: "Product Catalogue",
    icon: Package,
    children: [
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
    ],
  },
  {
    key: "orders",
    label: "Orders",
    icon: ReceiptText,
    children: [
      {
        key: "orders",
        label: "All Orders",
        href: "/admin/tweakmart/orders",
        icon: ReceiptText,
      },
      {
        key: "returns",
        label: "Returns & Refunds",
        href: "/admin/tweakmart/returns",
        icon: RotateCcw,
      },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    icon: GalleryHorizontalEnd,
    children: [
      {
        key: "banners",
        label: "Banners",
        href: "/admin/tweakmart/banners",
        icon: GalleryHorizontalEnd,
      },
      {
        key: "deals",
        label: "Deals & Offers",
        href: "/admin/tweakmart/deals",
        icon: Handshake,
      },
      {
        key: "notifications",
        label: "Storefront notifications",
        href: "/admin/tweakmart/notifications",
        icon: Handshake,
      },
    ],
  },
];

/* Returns whether a parent navigation group contains the active page. */
function isParentActive(item: TweakMartNavItem, current: TweakMartNavKey) {
  return (
    item.key === current ||
    item.children?.some((child) => child.key === current) === true
  );
}

/* Renders consistent navigation across the TweakMart administration module. */
export default function TweakMartModuleNav({
  current,
}: TweakMartModuleNavProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const navRef = useRef<HTMLDivElement>(null);

  /* Closes any open dropdown when the user clicks outside the navigation. */
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  /* Opens or closes one navigation dropdown. */
  function toggleDropdown(key: string) {
    setOpenDropdown((currentOpenDropdown) =>
      currentOpenDropdown === key ? null : key
    );
  }

  return (
    <nav aria-label="TweakMart navigation" className="relative">
      <div
        ref={navRef}
        className="flex min-w-full flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isParentActive(item, current);
          const isOpen = openDropdown === item.key;

          if (!item.children?.length && item.href) {
            return (
              <a
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-primary text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon size={16} />

                {item.label}
              </a>
            );
          }

          return (
            <div key={item.key} className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown(item.key)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-primary text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon size={16} />

                {item.label}

                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-950"
                >
                  {item.children?.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = child.key === current;

                    return (
                      <a
                        key={child.key}
                        href={child.href}
                        role="menuitem"
                        aria-current={childActive ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                          childActive
                            ? "bg-primary/10 text-primary dark:bg-white/10 dark:text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            childActive
                              ? "bg-primary/10 text-primary dark:bg-white/10 dark:text-white"
                              : "bg-blue-500 text-white dark:bg-slate-900 dark:text-slate-400"
                          }`}
                        >
                          <ChildIcon size={15} />
                        </div>

                        <span>{child.label}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
