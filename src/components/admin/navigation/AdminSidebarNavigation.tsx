import { useEffect, useRef, useState } from "react";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  ChevronRight,
  Construction,
  ContactRound,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  MessageSquareQuote,
  Newspaper,
  Settings,
  Sparkles,
  Handshake,
  Store,
  UserPen,
  Users,
  Workflow,
} from "lucide-react";

export type AdminNavigationIcon =
  | "dashboard"
  | "store"
  | "users"
  | "workflow"
  | "construction"
  | "newspaper"
  | "briefcase"
  | "testimonial"
  | "staff"
  | "academy"
  | "insights"
  | "careers"
  | "library"
  | "procurement"
  | "finance"
  | "settings";

export interface AdminNavigationItem {
  title: string;
  href?: string;
  badge?: string;
  activeMatch?: boolean;
  icon?: AdminNavigationIcon;
  links?: AdminNavigationItem[];
}

interface AdminSidebarNavigationProps {
  sections: AdminNavigationItem[];
  currentPath: string;
}

interface NavigationLevelProps {
  items: AdminNavigationItem[];
  currentPath: string;
  openGroups: Set<string>;
  onToggleGroup: (groupKey: string, siblingGroupKeys: string[]) => void;
  parentKey: string;
  depth: number;
}

/* Normalizes routes so trailing slashes, query strings, and hashes do not affect route comparisons. */
function normalizePath(path?: string) {
  if (!path) {
    return "";
  }

  const cleanPath = path.split("?")[0].split("#")[0];

  if (cleanPath === "/") {
    return "/";
  }

  return cleanPath.replace(/\/+$/, "");
}

/* Determines whether a navigation link is the canonical active route. */
function isActiveLink(item: AdminNavigationItem, currentPath: string) {
  if (!item.href || item.activeMatch === false) {
    return false;
  }

  return normalizePath(currentPath) === normalizePath(item.href);
}

/* Determines whether an item or any of its descendants contains the active route. */
function containsActiveRoute(
  item: AdminNavigationItem,
  currentPath: string
): boolean {
  if (isActiveLink(item, currentPath)) {
    return true;
  }

  return (
    item.links?.some((child) => containsActiveRoute(child, currentPath)) ??
    false
  );
}

/* Builds a stable key for each navigation item from its position in the navigation tree. */
function createItemKey(
  parentKey: string,
  item: AdminNavigationItem,
  index: number
) {
  return `${parentKey}/${index}-${item.title}`;
}

/* Maps serializable navigation icon names to their React icon components. */
function getNavigationIcon(icon?: AdminNavigationIcon) {
  switch (icon) {
    case "dashboard":
      return LayoutDashboard;

    case "store":
      return Store;

    case "users":
      return Users;

    case "workflow":
      return Workflow;

    case "construction":
      return Construction;

    case "newspaper":
      return Newspaper;

    case "briefcase":
      return BriefcaseBusiness;

    case "testimonial":
      return MessageSquareQuote;

    case "staff":
      return UserPen;

    case "procurement":
      return Handshake;

    case "academy":
      return GraduationCap;

    case "insights":
      return Sparkles;

    case "careers":
      return ContactRound;

    case "library":
      return LibraryBig;

    case "finance":
      return BadgeDollarSign;

    case "settings":
      return Settings;

    default:
      return null;
  }
}

/* Finds the navigation groups that need to be open initially to reveal the active route. */
function getInitialOpenGroups(
  sections: AdminNavigationItem[],
  currentPath: string
) {
  const openGroups = new Set<string>();

  /* Walks recursively through the navigation tree and records ancestors of the active route. */
  function walk(items: AdminNavigationItem[], parentKey: string): boolean {
    let branchContainsActiveRoute = false;

    items.forEach((item, index) => {
      const itemKey = createItemKey(parentKey, item, index);

      const itemIsActive = isActiveLink(item, currentPath);

      const childIsActive = item.links?.length
        ? walk(item.links, itemKey)
        : false;

      if (childIsActive && item.links && item.links.length > 0) {
        openGroups.add(itemKey);
      }

      if (itemIsActive || childIsActive) {
        branchContainsActiveRoute = true;
      }
    });

    return branchContainsActiveRoute;
  }

  walk(sections, "root");

  return openGroups;
}

/* Returns appropriate horizontal padding for nested navigation levels. */
function getNestedPadding(depth: number) {
  if (depth <= 1) {
    return "px-4";
  }

  if (depth === 2) {
    return "pl-6 pr-4";
  }

  return "pl-8 pr-4";
}

/* Renders the interactive CloudTweak admin sidebar navigation. */
export default function AdminSidebarNavigation({
  sections,
  currentPath,
}: AdminSidebarNavigationProps) {
  const navigationRef = useRef<HTMLDivElement>(null);

  const [openGroups, setOpenGroups] = useState<Set<string>>(() =>
    getInitialOpenGroups(sections, currentPath)
  );

  /*
   * Reopens the appropriate hierarchy whenever Astro loads a different
   * route into this navigation island.
   */
  useEffect(() => {
    setOpenGroups(getInitialOpenGroups(sections, currentPath));
  }, [currentPath, sections]);

  /*
   * Closes all open navigation dropdowns when the user clicks somewhere
   * outside the sidebar navigation.
   */
  useEffect(() => {
    function handleDocumentPointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (navigationRef.current && !navigationRef.current.contains(target)) {
        setOpenGroups(new Set());
      }
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, []);

  /*
   * Opens or closes one navigation group while closing its sibling groups
   * and any nested groups belonging to those siblings.
   */
  function toggleGroup(groupKey: string, siblingGroupKeys: string[]) {
    setOpenGroups((current) => {
      const next = new Set(current);
      const shouldOpen = !next.has(groupKey);

      siblingGroupKeys.forEach((siblingKey) => {
        next.delete(siblingKey);

        Array.from(next).forEach((openKey) => {
          if (openKey.startsWith(`${siblingKey}/`)) {
            next.delete(openKey);
          }
        });
      });

      if (shouldOpen) {
        next.add(groupKey);
      } else {
        next.delete(groupKey);

        Array.from(next).forEach((openKey) => {
          if (openKey.startsWith(`${groupKey}/`)) {
            next.delete(openKey);
          }
        });
      }

      return next;
    });
  }

  return (
    <div ref={navigationRef}>
      <NavigationLevel
        items={sections}
        currentPath={currentPath}
        openGroups={openGroups}
        onToggleGroup={toggleGroup}
        parentKey="root"
        depth={0}
      />
    </div>
  );
}

/* Recursively renders one level of navigation links and collapsible groups. */
function NavigationLevel({
  items,
  currentPath,
  openGroups,
  onToggleGroup,
  parentKey,
  depth,
}: NavigationLevelProps) {
  /*
   * Collects the collapsible groups at the current level so opening one
   * group can close its siblings.
   */
  const siblingGroupKeys = items
    .map((item, index) => ({
      item,
      key: createItemKey(parentKey, item, index),
    }))
    .filter(({ item }) => Boolean(item.links?.length))
    .map(({ key }) => key);

  return (
    <div className={depth === 0 ? "space-y-0.5" : ""}>
      {items.map((item, index) => {
        const itemKey = createItemKey(parentKey, item, index);

        const hasChildren = Array.isArray(item.links) && item.links.length > 0;

        const branchIsActive = containsActiveRoute(item, currentPath);

        /*
         * Navigation items containing children are rendered as expandable
         * groups instead of links.
         */
        if (hasChildren) {
          const isOpen = openGroups.has(itemKey);

          const Icon = getNavigationIcon(item.icon);

          return (
            <div key={itemKey}>
              <button
                type="button"
                onClick={() =>
                  onToggleGroup(
                    itemKey,
                    siblingGroupKeys.filter((key) => key !== itemKey)
                  )
                }
                aria-expanded={isOpen}
                className={[
                  "flex w-full cursor-pointer items-center justify-between rounded-xl py-2 text-left transition",
                  depth === 0 ? "px-3" : getNestedPadding(depth),
                  branchIsActive
                    ? "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                    : depth === 0
                      ? "text-slate-800 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                      : "text-black hover:bg-slate-50 hover:text-orange-500 dark:text-slate-200 dark:hover:bg-slate-900",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex min-w-0 items-center",
                    depth === 0 ? "gap-4" : "gap-2",
                  ].join(" ")}
                >
                  {Icon && <Icon size={18} className="shrink-0" />}

                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-xs">{item.title}</span>

                    {item.badge && (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-pink-500 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight
                  className={[
                    "h-4 w-4 shrink-0 transition-transform duration-200",
                    isOpen ? "rotate-90" : "",
                  ].join(" ")}
                />
              </button>

              {isOpen && item.links && (
                <div
                  className={
                    depth === 0
                      ? "ml-10 mt-2 overflow-hidden rounded-md border border-slate-200 dark:border-slate-800"
                      : "ml-4 border-l border-slate-200 dark:border-slate-800"
                  }
                >
                  <NavigationLevel
                    items={item.links}
                    currentPath={currentPath}
                    openGroups={openGroups}
                    onToggleGroup={onToggleGroup}
                    parentKey={itemKey}
                    depth={depth + 1}
                  />
                </div>
              )}
            </div>
          );
        }

        /*
         * A navigation node without children must have an href before it
         * can be rendered as a link.
         */
        if (!item.href) {
          return null;
        }

        const active = isActiveLink(item, currentPath);

        const Icon = getNavigationIcon(item.icon);

        return (
          <a
            key={itemKey}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex items-center gap-4 py-2.5 text-xs transition",
              depth === 0 ? "mt-2.5 rounded-xl px-3" : getNestedPadding(depth),
              active
                ? "bg-sky-100 font-semibold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                : depth === 0
                  ? "text-slate-800 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                  : "text-black hover:bg-slate-50 hover:text-orange-500 dark:text-slate-200 dark:hover:bg-slate-900",
            ].join(" ")}
          >
            {Icon && <Icon size={18} className="shrink-0" />}

            <span className="min-w-0 flex-1 truncate">{item.title}</span>
          </a>
        );
      })}
    </div>
  );
}
