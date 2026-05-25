import { useState, useEffect } from "react";
import { cloudflare } from "@/api/cloudflareClient";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Flame,
  HandCoins,
  Home,
  Landmark,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  RefreshCw,
  Repeat,
  ShieldCheck,
  Trash2,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDisplayDate } from "@/utils/cycleFilters";
import { applyPaidStatusToNote, getPaidStatusFromNote, normalizeFixedSpendingItems, stripPaidStatusFromNote } from "@/utils/fixedSpendingPaid";
import { normalizeFixedSpendingCategory } from "@/utils/fixedSpendingCategories";
import MobileLayout from "../components/MobileLayout";
import FixedSpendingForm from "../components/FixedSpendingForm";

const LEGACY_PAID_STORAGE_KEY = "salary-cycle-fixed-spending-paid-v1";
const FIXED_SPENDING_CACHE_KEY = "salary-cycle-fixed-spending-last-good-v2";

const readFixedSpendingCache = (cycleId = null) => {
  try {
    const raw = window.localStorage.getItem(FIXED_SPENDING_CACHE_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw);
    if (!snapshot?.cycle || !Array.isArray(snapshot?.items)) return null;
    if (cycleId && String(snapshot.cycle.id) !== String(cycleId)) return null;
    return snapshot;
  } catch {
    return null;
  }
};

const writeFixedSpendingCache = (cycle, items = []) => {
  try {
    if (!cycle) return;
    window.localStorage.setItem(
      FIXED_SPENDING_CACHE_KEY,
      JSON.stringify({
        cycle,
        items,
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Ignore private-browser storage limitations.
  }
};

const readLegacyPaidStorage = () => {
  try {
    return JSON.parse(window.localStorage.getItem(LEGACY_PAID_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const removeLegacyPaidStorage = () => {
  try {
    window.localStorage.removeItem(LEGACY_PAID_STORAGE_KEY);
  } catch {
    // Ignore private-browser storage limitations.
  }
};

const normalizeSortOrder = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toAmount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatMoney = (value) => `⃁ ${toAmount(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getCategoryVisual = (item = {}) => {
  const category = String(item.category || "").toLowerCase();
  const name = String(item.name || "").toLowerCase();
  const text = `${category} ${name}`;

  if (text.includes("internet") || text.includes("wifi") || text.includes("wi-fi")) {
    return { Icon: Wifi, wrap: "bg-violet-50", icon: "text-violet-500" };
  }
  if (text.includes("electric") || text.includes("utility") || text.includes("utilities")) {
    return { Icon: Zap, wrap: "bg-orange-50", icon: "text-orange-500" };
  }
  if (text.includes("rent") || text.includes("rumah") || text.includes("housing") || text.includes("apartment")) {
    return { Icon: Home, wrap: "bg-blue-50", icon: "text-blue-500" };
  }
  if (text.includes("insurance") || text.includes("insurans")) {
    return { Icon: ShieldCheck, wrap: "bg-emerald-50", icon: "text-emerald-600" };
  }
  if (text.includes("phone") || text.includes("mobile") || text.includes("call") || text.includes("stc")) {
    return { Icon: Phone, wrap: "bg-rose-50", icon: "text-rose-500" };
  }
  if (text.includes("hutang") || text.includes("loan") || text.includes("asb") || text.includes("cimb") || text.includes("rhb")) {
    return { Icon: Building2, wrap: "bg-sky-50", icon: "text-sky-600" };
  }
  if (text.includes("anak") || text.includes("family") || text.includes("nafkah") || text.includes("mak") || text.includes("abah")) {
    return { Icon: HandCoins, wrap: "bg-cyan-50", icon: "text-cyan-600" };
  }
  if (text.includes("fire") || text.includes("leased") || text.includes("furnish")) {
    return { Icon: Flame, wrap: "bg-red-50", icon: "text-red-500" };
  }
  if (text.includes("saving") || text.includes("deposit")) {
    return { Icon: Landmark, wrap: "bg-yellow-50", icon: "text-yellow-600" };
  }

  return { Icon: Wallet, wrap: "bg-emerald-50", icon: "text-emerald-600" };
};

const prepareFixedSpendingItems = (fixedItems = []) => {
  const normalizedItems = normalizeFixedSpendingItems(fixedItems).map((item, index) => ({
    ...item,
    sort_order: normalizeSortOrder(item.sort_order, index),
    category: normalizeFixedSpendingCategory(item.category),
  }));

  // Legacy rows all have sort_order 0. Keep newest-first until the user manually sorts.
  // Once the user drags, sort_order becomes 0,1,2... and this page will always reload by that saved order.
  const uniqueSavedOrders = new Set(normalizedItems.map((item) => normalizeSortOrder(item.sort_order)));
  const hasSavedCustomOrder = normalizedItems.length > 1 && uniqueSavedOrders.size > 1;

  return [...normalizedItems].sort((a, b) => {
    if (hasSavedCustomOrder) {
      const orderDiff = normalizeSortOrder(a.sort_order) - normalizeSortOrder(b.sort_order);
      if (orderDiff !== 0) return orderDiff;
    }

    return new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime();
  });
};

const migrateLegacyPaidStorage = async (fixedItems = []) => {
  const paidMap = readLegacyPaidStorage();
  const paidIds = Object.keys(paidMap);

  if (paidIds.length === 0) return fixedItems;

  const migratedItems = fixedItems.map((item) => {
    if (!Object.prototype.hasOwnProperty.call(paidMap, item.id)) return item;
    const nextPaid = !!paidMap[item.id];
    return {
      ...item,
      is_paid: nextPaid,
      note: applyPaidStatusToNote(item.note, nextPaid),
    };
  });

  const updates = migratedItems
    .filter((item) => Object.prototype.hasOwnProperty.call(paidMap, item.id))
    .map((item) => cloudflare.entities.FixedSpending.update(item.id, {
      is_paid: !!item.is_paid,
      note: item.note,
    }));

  try {
    await Promise.all(updates);
    removeLegacyPaidStorage();
  } catch (error) {
    console.error("Failed to migrate saved paid ticks from browser storage to the cloud database", error);
  }

  return migratedItems;
};

const syncMissingPaidMarkers = async (fixedItems = []) => {
  const itemsMissingMarker = fixedItems.filter((item) => getPaidStatusFromNote(item.note) === null && item.is_paid === true);
  if (itemsMissingMarker.length === 0) return;

  try {
    await Promise.all(
      itemsMissingMarker.map((item) =>
        cloudflare.entities.FixedSpending.update(item.id, {
          is_paid: true,
          note: applyPaidStatusToNote(item.note, true),
        })
      )
    );
  } catch (error) {
    console.error("Failed to sync paid status marker", error);
  }
};

export default function FixedSpending() {
  const [cycle, setCycle] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadWarning, setLoadWarning] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPaidIds, setSavingPaidIds] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const selectedCycleId = params.get("cycleId");

  useEffect(() => { load(); }, []);


  useEffect(() => {
    if (params.get("add") === "1" && cycle) {
      setSheetOpen(true);
      window.history.replaceState({}, "", selectedCycleId ? `/fixed?cycleId=${selectedCycleId}` : "/fixed");
    }
  }, [cycle, selectedCycleId]);

  const loadFixedSpendingItems = async (salaryCycleId) => {
    try {
      return await cloudflare.entities.FixedSpending.filter({ salary_cycle_id: salaryCycleId }, "sort_order");
    } catch (error) {
      // Fallback for an older Cloudflare deployment while the new sort_order migration is being applied.
      console.warn("Could not load fixed spending by saved order. Falling back to created date.", error);
      return cloudflare.entities.FixedSpending.filter({ salary_cycle_id: salaryCycleId }, "-created_date");
    }
  };

  const load = async () => {
    const cachedSnapshot = readFixedSpendingCache(selectedCycleId);
    const hasCachedSnapshot = !!cachedSnapshot?.cycle;

    setLoading(!hasCachedSnapshot);
    setLoadError("");
    setLoadWarning("");

    if (hasCachedSnapshot) {
      setCycle(cachedSnapshot.cycle);
      setItems(prepareFixedSpendingItems(cachedSnapshot.items));
    }

    try {
      let selectedCycle = null;

      if (selectedCycleId) {
        selectedCycle = await cloudflare.entities.SalaryCycle.get(selectedCycleId);
      } else {
        const cycles = await cloudflare.entities.SalaryCycle.filter({ status: "active" }, "-created_date", 1);
        selectedCycle = cycles[0] || null;
      }

      if (selectedCycle) {
        setCycle(selectedCycle);
        const fixedItems = await loadFixedSpendingItems(selectedCycle.id);
        const preparedItems = prepareFixedSpendingItems(fixedItems);
        setItems(preparedItems);
        writeFixedSpendingCache(selectedCycle, fixedItems);

        // Do legacy cleanup in the background so the page does not stay stuck on the loader.
        migrateLegacyPaidStorage(fixedItems)
          .then(async (migratedFixedItems) => {
            await syncMissingPaidMarkers(migratedFixedItems);
            setItems(prepareFixedSpendingItems(migratedFixedItems));
            writeFixedSpendingCache(selectedCycle, migratedFixedItems);
          })
          .catch((error) => {
            console.error("Fixed spending background sync failed", error);
          });
      } else {
        setCycle(null);
        setItems([]);
      }
    } catch (error) {
      console.error("Failed to load fixed spending", error);
      if (hasCachedSnapshot) {
        setLoadWarning("Showing saved data. Cloudflare is slow right now, but you can tap Retry to refresh.");
      } else {
        setLoadError(error?.message || "Fixed Spending could not be loaded. Please try again.");
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    setSaving(true);
    if (editing) {
      await cloudflare.entities.FixedSpending.update(editing.id, {
        ...data,
        category: normalizeFixedSpendingCategory(data.category),
        sort_order: normalizeSortOrder(editing.sort_order),
        is_paid: !!editing.is_paid,
        note: applyPaidStatusToNote(data.note, !!editing.is_paid),
      });
    } else {
      await cloudflare.entities.FixedSpending.create({
        ...data,
        category: normalizeFixedSpendingCategory(data.category),
        salary_cycle_id: cycle.id,
        sort_order: items.length,
        is_paid: false,
        note: applyPaidStatusToNote(data.note, false),
      });
    }
    setSheetOpen(false);
    setEditing(null);
    setSaving(false);
    await load();
  };

  const handleDelete = async () => {
    await cloudflare.entities.FixedSpending.delete(deleteId);
    setDeleteId(null);
    await load();
  };

  const togglePaid = async (item) => {
    const nextPaid = !item.is_paid;

    // Save the tick to the cloud database, not localStorage, so it remains visible after refresh
    // and also when opening the same app from incognito or another browser.
    setSavingPaidIds((prev) => [...prev, item.id]);
    setItems((prev) => prev.map((fixedItem) => (fixedItem.id === item.id ? { ...fixedItem, is_paid: nextPaid } : fixedItem)));

    try {
      await cloudflare.entities.FixedSpending.update(item.id, {
        is_paid: nextPaid,
        note: applyPaidStatusToNote(item.note, nextPaid),
      });
    } catch (error) {
      console.error("Failed to save paid status", error);
      setItems((prev) => prev.map((fixedItem) => (fixedItem.id === item.id ? { ...fixedItem, is_paid: item.is_paid } : fixedItem)));
      alert("Paid tick could not be saved. Please check your connection and try again.");
    } finally {
      setSavingPaidIds((prev) => prev.filter((id) => id !== item.id));
    }
  };

  const total = items.reduce((s, i) => s + toAmount(i.amount), 0);
  const paidItems = items.filter((i) => i.is_paid);
  const dueItems = items.filter((i) => !i.is_paid);
  const paidTotal = paidItems.reduce((s, i) => s + toAmount(i.amount), 0);
  const dueTotal = total - paidTotal;
  const filteredItems = statusFilter === "paid" ? paidItems : statusFilter === "due" ? dueItems : items;

  const filters = [
    { key: "all", label: "All", count: items.length, dot: "bg-emerald-500" },
    { key: "paid", label: "Paid", count: paidItems.length, dot: "bg-emerald-500" },
    { key: "due", label: "Due", count: dueItems.length, dot: "bg-orange-500" },
  ];

  return (
    <MobileLayout>
      <div className="-mx-4 -mt-4 min-h-full bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),linear-gradient(180deg,#ffffff_0%,#f8fafc_45%,#f7f9fb_100%)] px-3 pb-4 pt-4 sm:px-4">
        <div className="space-y-3">
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <h1 className="text-xl font-semibold tracking-[0.02em] text-slate-950">Fixed Spending</h1>
              {cycle && (
                <button type="button" className="inline-flex items-center gap-1.5 rounded-full text-xs font-normal text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{formatDisplayDate(cycle.start_date)}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {cycle && (
              <Button
                size="sm"
                className="h-9 shrink-0 rounded-full bg-emerald-600 px-3 text-xs font-medium shadow-[0_10px_22px_rgba(5,150,105,0.22)] hover:bg-emerald-700"
                onClick={() => { setEditing(null); setSheetOpen(true); }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            )}
          </header>

          {cycle && (
            <section className="overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white/90 p-3 shadow-[0_14px_36px_rgba(15,23,42,0.07)] backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 shadow-inner">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-[0_10px_20px_rgba(16,185,129,0.24)]">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-slate-900">Total Fixed</p>
                    {cycle.status !== "active" && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Closed</Badge>}
                  </div>
                  <p className="mt-0.5 text-lg font-medium tracking-tight text-emerald-700">{formatMoney(total)}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                    Track commitments and mark them paid so you never miss one due.
                  </p>
                </div>

                <div className="w-[96px] shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80 text-[10px] font-medium">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-emerald-50 px-2 py-1.5 text-emerald-700">
                    <span>Paid:</span>
                    <span>{formatMoney(paidTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-orange-50 px-2 py-1.5 text-orange-600">
                    <span>Due:</span>
                    <span>{formatMoney(dueTotal)}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {!cycle && !loading && !loadError && (
            <p className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              No salary cycle selected. Create one first from the Dashboard or open one from Salary Cycles.
            </p>
          )}

          {cycle && (
            <div className="flex items-center gap-1.5">
              <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5">
                {filters.map((filter) => {
                  const active = statusFilter === filter.key;
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setStatusFilter(filter.key)}
                      aria-pressed={active}
                      className={`h-9 rounded-xl border px-1.5 text-[11px] font-medium transition-all ${
                        active
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm"
                          : "border-slate-100 bg-white/80 text-slate-500 shadow-sm hover:bg-slate-50"
                      }`}
                    >
                      <span className="inline-flex items-center justify-center gap-1.5">
                        {filter.key !== "all" && <span className={`h-2 w-2 rounded-full ${filter.dot}`} />}
                        {filter.label} ({filter.count})
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="h-9 shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 shadow-sm"
              >
                <span className="inline-flex items-center gap-1">
                  This Month <ChevronDown className="h-3 w-3" />
                </span>
              </button>
            </div>
          )}

          {loadWarning && (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-100 bg-amber-50/90 px-3 py-2 text-[11px] leading-4 text-amber-800 shadow-sm">
              <span>{loadWarning}</span>
              <button type="button" className="shrink-0 rounded-full bg-white/80 px-2 py-1 text-[10px] font-medium text-amber-700" onClick={load}>
                Retry
              </button>
            </div>
          )}


          {loading ? (
            <div className="space-y-2 py-1">
              {[1, 2, 3, 4].map((key) => (
                <div key={key} className="h-16 animate-pulse rounded-[1rem] border border-slate-100 bg-white/80 shadow-sm" />
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-[1.5rem] border border-red-100 bg-red-50 p-5 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-sm font-bold text-red-800">Fixed Spending could not load.</p>
              <p className="mt-1 break-words text-xs leading-5 text-red-600">{loadError}</p>
              <Button type="button" size="sm" variant="outline" className="mt-4 rounded-xl gap-1.5" onClick={load}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : items.length === 0 && cycle ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/70 p-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <ReceiptText className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">No fixed spending yet.</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Tap Add to record commitments like rent, loans, utilities, or family support.</p>
            </div>
          ) : filteredItems.length === 0 && cycle ? (
            <div className="rounded-[1.5rem] border border-slate-100 bg-white/80 p-6 text-center text-sm text-slate-500 shadow-sm">
              No {statusFilter} fixed spending item found.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((i) => {
                const isSavingPaid = savingPaidIds.includes(i.id);
                const { Icon, wrap, icon } = getCategoryVisual(i);
                const cleanNote = stripPaidStatusFromNote(i.note);

                return (
                  <div
                    key={i.id}
                    data-fixed-spending-id={String(i.id)}
                    className={`group relative flex items-center gap-2 rounded-[1.05rem] border bg-white/95 px-2.5 py-2 shadow-[0_8px_22px_rgba(15,23,42,0.055)] transition-[box-shadow,border-color,opacity] duration-200 ${
                      i.is_paid ? "border-emerald-100" : "border-orange-100"
                    } ${isSavingPaid ? "opacity-70" : ""}`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${wrap}`}>
                      <Icon className={`h-4 w-4 ${icon}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5 leading-tight">
                        <p className="truncate text-[13px] font-medium text-slate-900">{i.name}</p>
                        {i.repeat_every_cycle && <Repeat className="h-3 w-3 shrink-0 text-emerald-500" />}
                        <button
                          type="button"
                          onClick={() => togglePaid(i)}
                          disabled={isSavingPaid}
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium transition-colors ${
                            i.is_paid
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                          }`}
                          aria-label={i.is_paid ? `Mark ${i.name} as due` : `Mark ${i.name} as paid`}
                        >
                          {i.is_paid ? "Paid" : "Due"}
                        </button>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] font-normal leading-4 text-slate-500">
                        {i.category}{cleanNote ? ` · ${cleanNote}` : ""}
                      </p>
                    </div>

                    <div className="ml-1 flex w-[84px] shrink-0 flex-col items-end gap-0.5">
                      <p className={`text-right text-[12px] font-medium leading-tight tabular-nums ${i.is_paid ? "text-emerald-700" : "text-orange-600"}`}>
                        {formatMoney(i.amount)}
                      </p>

                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50"
                          onClick={() => { setEditing(i); setSheetOpen(true); }}
                          aria-label={`Edit ${i.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50"
                          aria-label={`More options for ${i.name}`}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-2xl">
                        <DropdownMenuItem onClick={() => togglePaid(i)} disabled={isSavingPaid} className="gap-2">
                          {i.is_paid ? <CircleAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          {i.is_paid ? "Mark as Due" : "Mark as Paid"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteId(i.id)} className="gap-2 text-red-600 focus:text-red-600">
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) setEditing(null); }}>
        <SheetContent side="bottom" className="rounded-t-[1.75rem] max-h-[90vh] overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "Edit Fixed Spending" : "Add Fixed Spending"}</SheetTitle></SheetHeader>
          <div className="mt-4 pb-6">
            <FixedSpendingForm onSubmit={handleSubmit} initial={editing} loading={saving} />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
}
