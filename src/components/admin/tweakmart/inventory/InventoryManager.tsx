import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CircleOff,
  Clock3,
  History,
  LoaderCircle,
  Minus,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

interface ProductDetails {
  id: string;
  name: string;
  slug: string;
  product_type: string;
  status: string;
  base_price: number;
  currency: string;
  category_id: string | null;
  brand_id: string | null;
}

interface ProductVariantDetails {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number | null;
  attributes: Record<string, unknown>;
  weight_kg: number | null;
  is_default: boolean;
  is_active: boolean;
  products: ProductDetails;
}

interface InventoryRecord {
  id: string;
  variant_id: string;
  quantity_available: number;
  quantity_reserved: number;
  reorder_level: number;
  track_inventory: boolean;
  allow_backorder: boolean;
  updated_at: string;
  product_variants: ProductVariantDetails;
}

interface InventoryMovement {
  id: string;
  inventory_id: string;
  variant_id: string;
  movement_type: string;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  reason: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface InventoryResponse {
  inventory?: InventoryRecord[];
  error?: string;
}

interface InventoryMutationResponse {
  inventory?: InventoryRecord;
  result?: {
    success?: boolean;
    quantity_before?: number;
    quantity_after?: number;
  };
  error?: string;
}

interface MovementsResponse {
  movements?: InventoryMovement[];
  error?: string;
}

type StockFilter =
  "all" | "in_stock" | "low_stock" | "out_of_stock" | "untracked";

type TrackingFilter = "all" | "tracked" | "untracked";

type MovementType =
  | "stock_received"
  | "return"
  | "damaged"
  | "lost"
  | "correction"
  | "manual_adjustment";

interface AdjustmentForm {
  movement_type: MovementType;
  quantity: string;
  reason: string;
  notes: string;
  reference_number: string;
}

interface SettingsForm {
  reorder_level: string;
  track_inventory: boolean;
  allow_backorder: boolean;
}

const emptyAdjustmentForm: AdjustmentForm = {
  movement_type: "stock_received",
  quantity: "",
  reason: "",
  notes: "",
  reference_number: "",
};

/* Parses an administrative API response and surfaces its server error message. */
async function parseApiResponse<T extends { error?: string }>(
  response: Response,
  fallbackMessage: string
) {
  const result = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(result.error || fallbackMessage);
  }

  return result;
}

/* Calculates the quantity that can currently be sold to customers. */
function getSellableQuantity(record: InventoryRecord) {
  if (!record.track_inventory) {
    return null;
  }

  return Math.max(record.quantity_available - record.quantity_reserved, 0);
}

/* Determines the storefront stock state for one inventory record. */
function getStockStatus(record: InventoryRecord): StockFilter {
  if (!record.track_inventory) {
    return "untracked";
  }

  const sellable = getSellableQuantity(record) ?? 0;

  if (sellable <= 0) {
    return "out_of_stock";
  }

  if (sellable <= record.reorder_level) {
    return "low_stock";
  }

  return "in_stock";
}

/* Returns human-readable text for each inventory stock state. */
function getStockStatusLabel(status: StockFilter) {
  switch (status) {
    case "in_stock":
      return "In stock";
    case "low_stock":
      return "Low stock";
    case "out_of_stock":
      return "Out of stock";
    case "untracked":
      return "Not tracked";
    default:
      return "All stock";
  }
}

/* Returns the badge classes used for each inventory stock state. */
function getStockStatusClass(status: StockFilter) {
  switch (status) {
    case "in_stock":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "low_stock":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "out_of_stock":
      return "border-red-200 bg-red-50 text-red-700";
    case "untracked":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

/* Formats an inventory movement identifier into readable text. */
function formatMovementType(type: string) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/* Formats an ISO timestamp for the administrative inventory interface. */
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/* Returns the display variant name while avoiding unnecessary "Default" labels. */
function getVariantDisplayName(record: InventoryRecord) {
  const variant = record.product_variants;

  if (variant.is_default && variant.name.toLowerCase() === "default") {
    return null;
  }

  return variant.name;
}

/* Returns the signed quantity label displayed in movement history. */
function formatMovementQuantity(quantity: number) {
  return quantity > 0 ? `+${quantity}` : String(quantity);
}

/* Returns whether the selected movement normally adds stock. */
function isPositiveMovement(type: MovementType) {
  return type === "stock_received" || type === "return";
}

/* Returns whether the selected movement normally removes stock. */
function isNegativeMovement(type: MovementType) {
  return type === "damaged" || type === "lost";
}

export default function InventoryManager() {
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [trackingFilter, setTrackingFilter] = useState<TrackingFilter>("all");

  const [selectedRecord, setSelectedRecord] = useState<InventoryRecord | null>(
    null
  );

  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] =
    useState<AdjustmentForm>(emptyAdjustmentForm);
  const [adjusting, setAdjusting] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    reorder_level: "0",
    track_inventory: true,
    allow_backorder: false,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  /* Loads the latest TweakMart inventory records from the administrative API. */
  async function loadInventory(showRefreshState = false) {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/admin/tweakmart/inventory");
      const result = await parseApiResponse<InventoryResponse>(
        response,
        "Inventory could not be loaded."
      );

      setInventory(result.inventory ?? []);

      /*
       * Refresh the selected record too so an open detail panel does
       * not continue displaying stale quantities after an adjustment.
       */
      if (selectedRecord) {
        const refreshedSelectedRecord = (result.inventory ?? []).find(
          (record) => record.variant_id === selectedRecord.variant_id
        );

        if (refreshedSelectedRecord) {
          setSelectedRecord(refreshedSelectedRecord);
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Inventory could not be loaded."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /* Loads movement history for the currently selected product variant. */
  async function loadMovements(record: InventoryRecord) {
    try {
      setLoadingMovements(true);

      const response = await fetch(
        `/api/admin/tweakmart/inventory/${record.variant_id}/movements?limit=50`
      );

      const result = await parseApiResponse<MovementsResponse>(
        response,
        "Inventory movement history could not be loaded."
      );

      setMovements(result.movements ?? []);
    } catch (error) {
      setMovements([]);

      toast.error(
        error instanceof Error
          ? error.message
          : "Inventory movement history could not be loaded."
      );
    } finally {
      setLoadingMovements(false);
    }
  }

  /* Opens the stock adjustment modal with a clean adjustment form. */
  function openAdjustment(record: InventoryRecord) {
    setSelectedRecord(record);
    setAdjustmentForm(emptyAdjustmentForm);
    setAdjustmentOpen(true);
  }

  /* Opens inventory configuration for the selected product variant. */
  function openSettings(record: InventoryRecord) {
    setSelectedRecord(record);
    setSettingsForm({
      reorder_level: String(record.reorder_level),
      track_inventory: record.track_inventory,
      allow_backorder: record.allow_backorder,
    });
    setSettingsOpen(true);
  }

  /* Opens and loads the audited movement history for one product variant. */
  function openHistory(record: InventoryRecord) {
    setSelectedRecord(record);
    setHistoryOpen(true);
    void loadMovements(record);
  }

  /* Updates one stock adjustment form field without mutating the existing state. */
  function updateAdjustmentField<K extends keyof AdjustmentForm>(
    field: K,
    value: AdjustmentForm[K]
  ) {
    setAdjustmentForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /* Converts the entered quantity into the signed value expected by the inventory RPC. */
  function getSignedAdjustmentQuantity() {
    const enteredQuantity = Math.abs(Number(adjustmentForm.quantity));

    if (!Number.isInteger(enteredQuantity) || enteredQuantity <= 0) {
      return null;
    }

    if (isNegativeMovement(adjustmentForm.movement_type)) {
      return -enteredQuantity;
    }

    return enteredQuantity;
  }

  /* Submits a stock adjustment through the audited server-side inventory endpoint. */
  async function handleAdjustmentSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedRecord) {
      return;
    }

    const quantity = getSignedAdjustmentQuantity();

    if (quantity === null) {
      toast.error("Enter a valid whole-number quantity.");
      return;
    }

    if (!adjustmentForm.reason.trim()) {
      toast.error("Enter a reason for this stock adjustment.");
      return;
    }

    try {
      setAdjusting(true);

      const response = await fetch(
        `/api/admin/tweakmart/inventory/${selectedRecord.variant_id}/adjust`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quantity,
            movement_type: adjustmentForm.movement_type,
            reason: adjustmentForm.reason.trim(),
            notes: adjustmentForm.notes.trim() || null,
            reference_number: adjustmentForm.reference_number.trim() || null,
          }),
        }
      );

      await parseApiResponse<InventoryMutationResponse>(
        response,
        "Inventory could not be adjusted."
      );

      toast.success("Inventory adjusted successfully.");

      setAdjustmentOpen(false);
      setAdjustmentForm(emptyAdjustmentForm);

      await loadInventory(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Inventory could not be adjusted."
      );
    } finally {
      setAdjusting(false);
    }
  }

  /* Saves reorder, tracking, and backorder configuration for one variant. */
  async function handleSettingsSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedRecord) {
      return;
    }

    const reorderLevel = Number(settingsForm.reorder_level);

    if (!Number.isInteger(reorderLevel) || reorderLevel < 0) {
      toast.error("Reorder level must be a non-negative whole number.");
      return;
    }

    try {
      setSavingSettings(true);

      const response = await fetch(
        `/api/admin/tweakmart/inventory/${selectedRecord.variant_id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reorder_level: reorderLevel,
            track_inventory: settingsForm.track_inventory,
            allow_backorder: settingsForm.allow_backorder,
          }),
        }
      );

      await parseApiResponse<InventoryMutationResponse>(
        response,
        "Inventory settings could not be saved."
      );

      toast.success("Inventory settings updated.");

      setSettingsOpen(false);

      await loadInventory(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Inventory settings could not be saved."
      );
    } finally {
      setSavingSettings(false);
    }
  }

  /* Loads inventory when the administrative component first mounts. */
  useEffect(() => {
    void loadInventory();
  }, []);

  /*
   * Calculates dashboard totals from the same inventory collection used
   * by the table so summary cards always reflect the loaded data.
   */
  const summary = useMemo(() => {
    const trackedRecords = inventory.filter((record) => record.track_inventory);

    const unitsOnHand = trackedRecords.reduce(
      (total, record) => total + record.quantity_available,
      0
    );

    const unitsReserved = trackedRecords.reduce(
      (total, record) => total + record.quantity_reserved,
      0
    );

    const lowStock = trackedRecords.filter(
      (record) => getStockStatus(record) === "low_stock"
    ).length;

    const outOfStock = trackedRecords.filter(
      (record) => getStockStatus(record) === "out_of_stock"
    ).length;

    return {
      variants: inventory.length,
      unitsOnHand,
      unitsReserved,
      lowStock,
      outOfStock,
    };
  }, [inventory]);

  /* Filters inventory by product, variant, SKU, tracking state, and stock state. */
  const filteredInventory = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return inventory.filter((record) => {
      const product = record.product_variants.products;
      const variant = record.product_variants;

      const matchesSearch =
        !searchTerm ||
        product.name.toLowerCase().includes(searchTerm) ||
        variant.name.toLowerCase().includes(searchTerm) ||
        variant.sku.toLowerCase().includes(searchTerm) ||
        (variant.barcode ?? "").toLowerCase().includes(searchTerm);

      const status = getStockStatus(record);

      const matchesStock = stockFilter === "all" || status === stockFilter;

      const matchesTracking =
        trackingFilter === "all" ||
        (trackingFilter === "tracked" && record.track_inventory) ||
        (trackingFilter === "untracked" && !record.track_inventory);

      return matchesSearch && matchesStock && matchesTracking;
    });
  }, [inventory, search, stockFilter, trackingFilter]);

  return (
    <div className="space-y-5 mt-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Inventory
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Monitor stock levels, reservations and product availability across
            the TweakMart catalogue.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadInventory(true)}
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh inventory
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Inventory variants"
          value={summary.variants}
          helper="Tracked and untracked"
          icon={Boxes}
          color="text-purple-500"
          bgcolor="bg-purple-50"
        />

        <SummaryCard
          label="Units on hand"
          value={summary.unitsOnHand}
          helper={`${summary.unitsReserved} currently reserved`}
          icon={Package}
          color="text-blue-500"
          bgcolor="bg-blue-50"
        />

        <SummaryCard
          label="Reserved units"
          value={summary.unitsReserved}
          helper="Held for active checkouts"
          icon={Clock3}
          color="text-green-500"
          bgcolor="bg-green-50"
        />

        <SummaryCard
          label="Low stock"
          value={summary.lowStock}
          helper="At or below reorder level"
          icon={TriangleAlert}
          color="text-yellow-500"
          bgcolor="bg-yellow-50"
        />

        <SummaryCard
          label="Out of stock"
          value={summary.outOfStock}
          helper="No sellable units"
          icon={CircleOff}
          color="text-red-500"
          bgcolor="bg-red-50"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products, variants, SKU or barcode..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={stockFilter}
                onChange={(event) =>
                  setStockFilter(event.target.value as StockFilter)
                }
                className="h-11 min-w-40 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="all">All stock</option>
                <option value="in_stock">In stock</option>
                <option value="low_stock">Low stock</option>
                <option value="out_of_stock">Out of stock</option>
                <option value="untracked">Not tracked</option>
              </select>

              <select
                value={trackingFilter}
                onChange={(event) =>
                  setTrackingFilter(event.target.value as TrackingFilter)
                }
                className="h-11 min-w-40 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="all">All products</option>
                <option value="tracked">Tracked only</option>
                <option value="untracked">Untracked only</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
              <LoaderCircle className="size-5 animate-spin" />
              Loading inventory...
            </div>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
              <Package className="size-5 text-slate-500" />
            </div>

            <h2 className="mt-4 font-semibold text-slate-950">
              No inventory records found
            </h2>

            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Try changing your search or inventory filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Product
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    On hand
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reserved
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Available
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reorder
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((record) => {
                  const product = record.product_variants.products;
                  const variant = record.product_variants;
                  const sellable = getSellableQuantity(record);
                  const status = getStockStatus(record);
                  const variantName = getVariantDisplayName(record);

                  return (
                    <tr
                      key={record.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                            {record.track_inventory ? (
                              <Package className="size-5 text-slate-500" />
                            ) : (
                              <PackageCheck className="size-5 text-blue-600" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {product.name}
                              </p>

                              {variantName && (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                  {variantName}
                                </span>
                              )}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span>{variant.sku}</span>

                              <span className="capitalize">
                                {product.product_type}
                              </span>

                              {record.allow_backorder && (
                                <span className="font-medium text-blue-600">
                                  Backorders allowed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <QuantityValue
                          value={
                            record.track_inventory
                              ? record.quantity_available
                              : null
                          }
                        />
                      </td>

                      <td className="px-4 py-4">
                        <QuantityValue
                          value={
                            record.track_inventory
                              ? record.quantity_reserved
                              : null
                          }
                          muted={record.quantity_reserved === 0}
                        />
                      </td>

                      <td className="px-4 py-4">
                        <QuantityValue value={sellable} emphasized />
                      </td>

                      <td className="px-4 py-4">
                        <QuantityValue
                          value={
                            record.track_inventory ? record.reorder_level : null
                          }
                          muted
                        />
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStockStatusClass(
                            status
                          )}`}
                        >
                          {getStockStatusLabel(status)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {record.track_inventory && (
                            <button
                              type="button"
                              onClick={() => openAdjustment(record)}
                              title="Adjust stock"
                              className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Plus className="size-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openHistory(record)}
                            title="Movement history"
                            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                          >
                            <History className="size-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openSettings(record)}
                            title="Inventory settings"
                            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                          >
                            <Settings2 className="size-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openHistory(record)}
                            title="View inventory details"
                            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
                          >
                            <ChevronRight className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredInventory.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredInventory.length} of {inventory.length} inventory
              records
            </span>

            <span>
              Sellable quantities exclude stock reserved by active checkouts.
            </span>
          </div>
        )}
      </section>

      {adjustmentOpen && selectedRecord && (
        <ModalShell
          title="Adjust stock"
          description={`${selectedRecord.product_variants.products.name} · ${selectedRecord.product_variants.sku}`}
          onClose={() => setAdjustmentOpen(false)}
        >
          <form onSubmit={handleAdjustmentSubmit} className="space-y-5">
            <InventorySnapshot record={selectedRecord} />

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Adjustment type
              </label>

              <select
                value={adjustmentForm.movement_type}
                onChange={(event) =>
                  updateAdjustmentField(
                    "movement_type",
                    event.target.value as MovementType
                  )
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="stock_received">Stock received</option>
                <option value="return">Customer return</option>
                <option value="damaged">Damaged stock</option>
                <option value="lost">Lost stock</option>
                <option value="correction">Stock correction</option>
                <option value="manual_adjustment">Manual adjustment</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Quantity
              </label>

              <div className="relative">
                {isNegativeMovement(adjustmentForm.movement_type) ? (
                  <Minus className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-red-500" />
                ) : (
                  <Plus className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-emerald-600" />
                )}

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={adjustmentForm.quantity}
                  onChange={(event) =>
                    updateAdjustmentField("quantity", event.target.value)
                  }
                  placeholder="Enter quantity"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-500">
                {isPositiveMovement(adjustmentForm.movement_type)
                  ? "This adjustment will increase physical stock."
                  : isNegativeMovement(adjustmentForm.movement_type)
                    ? "This adjustment will reduce physical stock."
                    : "The entered quantity will be applied as a positive adjustment. Use damaged or lost stock when removing inventory."}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Reason
              </label>

              <input
                type="text"
                value={adjustmentForm.reason}
                onChange={(event) =>
                  updateAdjustmentField("reason", event.target.value)
                }
                placeholder="e.g. Supplier delivery received"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Reference number
                <span className="ml-1 font-normal text-slate-400">
                  optional
                </span>
              </label>

              <input
                type="text"
                value={adjustmentForm.reference_number}
                onChange={(event) =>
                  updateAdjustmentField("reference_number", event.target.value)
                }
                placeholder="e.g. PO-2026-0042"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Notes
                <span className="ml-1 font-normal text-slate-400">
                  optional
                </span>
              </label>

              <textarea
                rows={3}
                value={adjustmentForm.notes}
                onChange={(event) =>
                  updateAdjustmentField("notes", event.target.value)
                }
                placeholder="Additional information about this adjustment..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setAdjustmentOpen(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={adjusting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {adjusting ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}

                {adjusting ? "Saving..." : "Save adjustment"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {settingsOpen && selectedRecord && (
        <ModalShell
          title="Inventory settings"
          description={`${selectedRecord.product_variants.products.name} · ${selectedRecord.product_variants.sku}`}
          onClose={() => setSettingsOpen(false)}
        >
          <form onSubmit={handleSettingsSubmit} className="space-y-5">
            <InventorySnapshot record={selectedRecord} />

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Reorder level
              </label>

              <input
                type="number"
                min="0"
                step="1"
                value={settingsForm.reorder_level}
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    reorder_level: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />

              <p className="mt-1.5 text-xs text-slate-500">
                TweakMart marks this variant as low stock when sellable
                inventory reaches this quantity.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={settingsForm.track_inventory}
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    track_inventory: event.target.checked,
                  }))
                }
                className="mt-0.5 size-4 rounded border-slate-300 text-blue-600"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Track inventory
                </span>

                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  Maintain physical stock and reservation quantities for this
                  variant.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={settingsForm.allow_backorder}
                disabled={!settingsForm.track_inventory}
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    allow_backorder: event.target.checked,
                  }))
                }
                className="mt-0.5 size-4 rounded border-slate-300 text-blue-600 disabled:opacity-50"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Allow backorders
                </span>

                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  Permit checkout even when sellable inventory is insufficient.
                </span>
              </span>
            </label>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSettings ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}

                {savingSettings ? "Saving..." : "Save settings"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {historyOpen && selectedRecord && (
        <ModalShell
          title="Inventory history"
          description={`${selectedRecord.product_variants.products.name} · ${selectedRecord.product_variants.sku}`}
          onClose={() => setHistoryOpen(false)}
          wide
        >
          <div className="space-y-5">
            <InventorySnapshot record={selectedRecord} />

            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    Movement history
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Audited changes to physical inventory.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadMovements(selectedRecord)}
                  disabled={loadingMovements}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
                  title="Refresh history"
                >
                  <RefreshCw
                    className={`size-4 ${
                      loadingMovements ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>

              {loadingMovements ? (
                <div className="flex min-h-48 items-center justify-center rounded-xl border border-slate-200">
                  <LoaderCircle className="size-5 animate-spin text-slate-400" />
                </div>
              ) : movements.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
                  <History className="size-5 text-slate-400" />

                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    No movements yet
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Stock adjustments and committed sales will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="divide-y divide-slate-100">
                    {movements.map((movement) => (
                      <div
                        key={movement.id}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="flex min-w-0 gap-3">
                          <MovementIcon quantity={movement.quantity} />

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-950">
                                {formatMovementType(movement.movement_type)}
                              </p>

                              <span
                                className={`text-sm font-bold ${
                                  movement.quantity > 0
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                              >
                                {formatMovementQuantity(movement.quantity)}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {movement.quantity_before} →{" "}
                              {movement.quantity_after} units
                            </p>

                            {movement.reason && (
                              <p className="mt-2 text-sm text-slate-700">
                                {movement.reason}
                              </p>
                            )}

                            {movement.notes && (
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {movement.notes}
                              </p>
                            )}

                            {movement.reference_number && (
                              <p className="mt-2 text-xs font-medium text-blue-600">
                                Reference: {movement.reference_number}
                              </p>
                            )}
                          </div>
                        </div>

                        <time className="shrink-0 text-xs text-slate-400">
                          {formatDateTime(movement.created_at)}
                        </time>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  bgcolor: string;
  color: string;
}

/* Renders one compact inventory summary metric. */
function SummaryCard({
  label,
  value,
  bgcolor,
  color,
  helper,
  icon: Icon,
}: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {value.toLocaleString("en-NG")}
          </p>
        </div>

        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${bgcolor}`}
        >
          <Icon className={`size-4 ${color}}`} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">{helper}</p>
    </article>
  );
}

interface QuantityValueProps {
  value: number | null;
  muted?: boolean;
  emphasized?: boolean;
}

/* Renders a stock quantity while supporting untracked inventory records. */
function QuantityValue({
  value,
  muted = false,
  emphasized = false,
}: QuantityValueProps) {
  if (value === null) {
    return <span className="text-sm font-medium text-slate-400">—</span>;
  }

  return (
    <span
      className={`text-sm ${
        emphasized
          ? "font-bold text-slate-950"
          : muted
            ? "font-medium text-slate-500"
            : "font-semibold text-slate-700"
      }`}
    >
      {value.toLocaleString("en-NG")}
    </span>
  );
}

interface InventorySnapshotProps {
  record: InventoryRecord;
}

/* Displays the current stock position before an administrative action is made. */
function InventorySnapshot({ record }: InventorySnapshotProps) {
  const sellable = getSellableQuantity(record);

  return (
    <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          On hand
        </p>

        <p className="mt-1 text-lg font-bold text-slate-950">
          {record.track_inventory
            ? record.quantity_available.toLocaleString("en-NG")
            : "—"}
        </p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Reserved
        </p>

        <p className="mt-1 text-lg font-bold text-slate-950">
          {record.track_inventory
            ? record.quantity_reserved.toLocaleString("en-NG")
            : "—"}
        </p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Available
        </p>

        <p className="mt-1 text-lg font-bold text-blue-600">
          {sellable === null ? "—" : sellable.toLocaleString("en-NG")}
        </p>
      </div>
    </div>
  );
}

interface MovementIconProps {
  quantity: number;
}

/* Displays whether a movement added or removed physical inventory. */
function MovementIcon({ quantity }: MovementIconProps) {
  if (quantity > 0) {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
        <ArrowUpRight className="size-4 text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50">
      <ArrowDownRight className="size-4 text-red-600" />
    </div>
  );
}

interface ModalShellProps {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}

/* Provides the shared modal container used by inventory administrative actions. */
function ModalShell({
  title,
  description,
  onClose,
  children,
  wide = false,
}: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl ${
          wide ? "max-w-3xl" : "max-w-xl"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>

            <p className="mt-0.5 truncate text-sm text-slate-500">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
