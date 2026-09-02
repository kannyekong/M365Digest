import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  GalleryHorizontalEnd,
  Package,
  Plus,
  Tags,
  Warehouse,
} from "lucide-react";

import type { TweakMartOverviewStats } from "../../../lib/tweakmart/dashboard";

interface TweakMartOverviewDashboardProps {
  stats: TweakMartOverviewStats;
}

interface MetricCardProps {
  label: string;
  value: number;
  description: string;
  href: string;
  icon: typeof Package;
  color: string;
  iconbg: string;
}

/* Renders one Marketplace overview metric using the CloudTweak dashboard visual language. */
function MetricCard({
  label,
  value,
  description,
  href,
  color,
  iconbg,
  icon: Icon,
}: MetricCardProps) {
  return (
    <a
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconbg} text-slate-700 dark:bg-slate-900 dark:text-slate-200`}
        >
          <Icon size={14} className={color} />
        </div>

        <ArrowUpRight
          size={17}
          className="text-slate-400 transition group-hover:text-primary"
        />
      </div>

      <div className="mt-3">
        <p className="text-xl font-bold text-slate-950 dark:text-white">
          {value.toLocaleString()}
        </p>

        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </a>
  );
}

/* Renders the TweakMart administrative overview and common Marketplace actions. */
export default function TweakMartOverviewDashboard({
  stats,
}: TweakMartOverviewDashboardProps) {
  return (
    <div className="mt-6 space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6 2xl:grid-cols-6">
        <MetricCard
          label="Products"
          value={stats.products}
          description="Marketplace catalogue products."
          href="/admin/tweakmart/products"
          icon={Package}
          iconbg="bg-purple-50"
          color="text-purple-500"
        />

        <MetricCard
          label="Variants"
          value={stats.variants}
          description="Purchasable product SKUs."
          href="/admin/tweakmart/products"
          icon={Boxes}
          iconbg="bg-pink-50"
          color="text-pink-500"
        />

        <MetricCard
          label="Categories"
          value={stats.categories}
          description="Active catalogue groupings."
          href="/admin/tweakmart/categories"
          icon={Boxes}
          iconbg="bg-green-50"
          color="text-green-500"
        />

        <MetricCard
          label="Brands"
          value={stats.brands}
          description="Marketplace product brands."
          href="/admin/tweakmart/brands"
          icon={Tags}
          iconbg="bg-cyan-50"
          color="text-cyan-600"
        />

        <MetricCard
          label="Active Banners"
          value={stats.activeBanners}
          description="Homepage marketing banners."
          href="/admin/tweakmart/banners"
          icon={GalleryHorizontalEnd}
          iconbg="bg-orange-50"
          color="text-orange-500"
        />

        <MetricCard
          label="Low Stock"
          value={stats.lowStockItems}
          description="Inventory requiring attention."
          href="/admin/tweakmart/inventory"
          icon={Warehouse}
          iconbg="bg-blue-50"
          color="text-blue-500"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Marketplace Operations
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                TweakMart control centre
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Manage catalogue products, inventory, brands, categories and
                storefront merchandising from the CloudTweak administrative
                workspace.
              </p>
            </div>

            <a
              href="/admin/tweakmart/products/new"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
            >
              <Plus size={16} />
              Add Product
            </a>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="/admin/tweakmart/products/new"
              className="rounded-xl border border-slate-200 p-4 transition hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <Package size={20} className="text-primary" />

              <p className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
                Add a product
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Create a new TweakMart catalogue item.
              </p>
            </a>

            <a
              href="/admin/tweakmart/banners/new"
              className="rounded-xl border border-slate-200 p-4 transition hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <GalleryHorizontalEnd size={20} className="text-primary" />

              <p className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
                Add featured banner
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Publish homepage campaigns and promotions.
              </p>
            </a>

            <a
              href="/admin/tweakmart/inventory"
              className="rounded-xl border border-slate-200 p-4 transition hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <Warehouse size={20} className="text-primary" />

              <p className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
                Manage inventory
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Review stock levels and product availability.
              </p>
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertTriangle size={18} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Inventory Health
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Products requiring attention
              </p>
            </div>
          </div>

          <div className="mt-7">
            {stats.lowStockItems > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                  {stats.lowStockItems}
                </p>

                <p className="mt-1 text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Low-stock SKU
                  {stats.lowStockItems === 1 ? "" : "s"}
                </p>

                <a
                  href="/admin/tweakmart/inventory"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline dark:text-amber-300"
                >
                  Review inventory
                  <ArrowUpRight size={13} />
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  Inventory looks healthy
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  No tracked SKUs are currently at or below their configured
                  reorder level.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
