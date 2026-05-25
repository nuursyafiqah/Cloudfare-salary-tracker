import { useState, useEffect, useRef } from "react";
import { cloudflare } from "@/api/cloudflareClient";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Repeat, GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatDisplayDate } from "@/utils/cycleFilters";
import { applyPaidStatusToNote, getPaidStatusFromNote, normalizeFixedSpendingItems, stripPaidStatusFromNote } from "@/utils/fixedSpendingPaid";
import { normalizeFixedSpendingCategory } from "@/utils/fixedSpendingCategories";
import MobileLayout from "../components/MobileLayout";
import FixedSpendingForm from "../components/FixedSpendingForm";

const LEGACY_PAID_STORAGE_KEY = "salary-cycle-fixed-spending-paid-v1";

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

const reorderItemById = (list, activeId, targetId) => {
  const fromIndex = list.findIndex((item) => String(item.id) === String(activeId));
  const toIndex = list.findIndex((item) => String(item.id) === String(targetId));

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return list;

  const result = Array.from(list);
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result.map((item, index) => ({ ...item, sort_order: index }));
};

const getClosestCardId = (listElement, pointerY, draggingId) => {
  if (!listElement) return null;

  const cards = Array.from(listElement.querySelectorAll("[data-fixed-spending-id]"));
  let closestId = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  cards.forEach((card) => {
    const cardId = card.getAttribute("data-fixed-spending-id");
    if (!cardId || String(cardId) === String(draggingId)) return;

    const rect = card.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const distance = Math.abs(pointerY - centerY);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestId = cardId;
    }
  });

  return closestId;
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
  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [savingPaidIds, setSavingPaidIds] = useState([]);
  const listRef = useRef(null);
  const itemsRef = useRef([]);
  const dragStateRef = useRef(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const selectedCycleId = params.get("cycleId");

  useEffect(() => { load(); }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (params.get("add") === "1" && cycle) {
      setSheetOpen(true);
      window.history.replaceState({}, "", selectedCycleId ? `/fixed?cycleId=${selectedCycleId}` : "/fixed");
    }
  }, [cycle, selectedCycleId]);

  const load = async () => {
    setLoading(true);
    let selectedCycle = null;

    if (selectedCycleId) {
      selectedCycle = await cloudflare.entities.SalaryCycle.get(selectedCycleId);
    } else {
      const cycles = await cloudflare.entities.SalaryCycle.filter({ status: "active" }, "-created_date", 1);
      selectedCycle = cycles[0] || null;
    }

    if (selectedCycle) {
      setCycle(selectedCycle);
      const f = await cloudflare.entities.FixedSpending.filter({ salary_cycle_id: selectedCycle.id }, "sort_order");
      const migratedFixedItems = await migrateLegacyPaidStorage(f);
      await syncMissingPaidMarkers(migratedFixedItems);
      setItems(prepareFixedSpendingItems(migratedFixedItems));
    } else {
      setCycle(null);
      setItems([]);
    }
    setLoading(false);
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

  const saveCustomOrder = async (nextItems, previousItems) => {
    setSavingOrder(true);

    try {
      const orderPayload = nextItems.map((item, index) => ({ id: item.id, sort_order: index }));

      if (typeof cloudflare.entities.FixedSpending.bulkUpdate === "function") {
        await cloudflare.entities.FixedSpending.bulkUpdate(orderPayload);
      } else {
        await Promise.all(
          orderPayload.map((item) =>
            cloudflare.entities.FixedSpending.update(item.id, { sort_order: item.sort_order })
          )
        );
      }
    } catch (error) {
      console.error("Failed to save fixed spending custom order", error);
      setItems(previousItems);
      itemsRef.current = previousItems;
      alert("Custom sort could not be saved. Please check your connection and try again.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDragStart = (event, itemId) => {
    if (savingOrder) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    dragStateRef.current = {
      itemId: String(itemId),
      pointerId: event.pointerId,
      startY: event.clientY,
      startItems: itemsRef.current,
      moved: false,
      active: false,
      lastTargetId: null,
    };

    setDraggingId(String(itemId));
  };

  const handleDragMove = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState || savingOrder || dragState.pointerId !== event.pointerId) return;

    const movedDistance = Math.abs(event.clientY - dragState.startY);
    if (!dragState.active && movedDistance < 8) return;

    event.preventDefault();

    if (!dragState.active) {
      dragState.active = true;
      setDragActive(true);
    }

    const targetId = getClosestCardId(listRef.current, event.clientY, dragState.itemId);
    if (!targetId || targetId === dragState.lastTargetId) return;

    dragState.lastTargetId = targetId;

    setItems((currentItems) => {
      const nextItems = reorderItemById(currentItems, dragState.itemId, targetId);
      if (nextItems === currentItems) return currentItems;

      dragState.moved = true;
      itemsRef.current = nextItems;
      return nextItems;
    });
  };

  const finishDrag = async (event) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);

    const previousItems = dragState.startItems;
    const nextItems = itemsRef.current.map((item, index) => ({ ...item, sort_order: index }));

    dragStateRef.current = null;
    setDraggingId(null);
    setDragActive(false);

    if (dragState.moved) {
      setItems(nextItems);
      itemsRef.current = nextItems;
      await saveCustomOrder(nextItems, previousItems);
    }
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

  const total = items.reduce((s, i) => s + (i.amount || 0), 0);
  const paidItems = items.filter((i) => i.is_paid);
  const paidTotal = paidItems.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <MobileLayout>
      <div className="space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Fixed Spending</h1>
            {cycle && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDisplayDate(cycle.start_date)} — {formatDisplayDate(cycle.end_date)}
              </p>
            )}
          </div>
          {cycle && (
            <Button size="sm" className="rounded-xl gap-1" onClick={() => { setEditing(null); setSheetOpen(true); }}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          )}
        </div>

        {cycle && (
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-amber-800">Total Fixed: ⃁ {total.toFixed(2)}</p>
              {cycle.status !== "active" && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Closed</Badge>}
            </div>
            <p className="text-xs text-amber-600 mt-0.5">Tick the box after payment so you can track what is already paid.</p>
            {items.length > 1 && (
              <p className="text-xs text-amber-600 mt-0.5">Hold the grip icon and drag to custom sort your fixed spending list.</p>
            )}
            {items.length > 0 && (
              <p className="text-xs text-amber-700 mt-1 font-medium">
                Paid: {paidItems.length}/{items.length} items · ⃁ {paidTotal.toFixed(2)}{savingOrder ? " · Saving order..." : ""}
              </p>
            )}
          </div>
        )}

        {!cycle && !loading && (
          <p className="text-sm text-muted-foreground text-center py-12">No salary cycle selected. Create one first from the Dashboard or open one from Salary Cycles.</p>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : items.length === 0 && cycle ? (
          <p className="text-sm text-muted-foreground text-center py-8">No fixed spending yet. Tap "Add" to record commitments like rent, loans, etc.</p>
        ) : (
          <div ref={listRef} className="space-y-1.5">
            {items.map((i) => {
              const isSavingPaid = savingPaidIds.includes(i.id);
              const isDragging = String(draggingId) === String(i.id);

              return (
                <div
                  key={i.id}
                  data-fixed-spending-id={String(i.id)}
                  className={`rounded-xl px-2.5 py-2 border flex items-center gap-1.5 shadow-sm transition-all ${
                    i.is_paid ? "bg-emerald-50 border-emerald-200" : "bg-card border-border"
                  } ${isSavingPaid || savingOrder ? "opacity-70" : ""} ${isDragging && dragActive ? "shadow-lg scale-[1.01] ring-2 ring-primary/20 z-10" : ""}`}
                >
                  <button
                    type="button"
                    onPointerDown={(event) => handleDragStart(event, i.id)}
                    onPointerMove={handleDragMove}
                    onPointerUp={finishDrag}
                    onPointerCancel={finishDrag}
                    className="h-8 w-6 shrink-0 rounded-lg text-muted-foreground hover:bg-muted active:bg-muted flex items-center justify-center cursor-grab active:cursor-grabbing"
                    style={{ touchAction: "none" }}
                    aria-label={`Hold and drag ${i.name} to reorder`}
                    disabled={savingOrder}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>

                  <Checkbox
                    checked={!!i.is_paid}
                    onCheckedChange={() => togglePaid(i)}
                    disabled={isSavingPaid || savingOrder || !!draggingId}
                    className="h-5 w-5 rounded-md shrink-0"
                    aria-label={i.is_paid ? `Mark ${i.name} as unpaid` : `Mark ${i.name} as paid`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 leading-tight">
                      <p className="text-sm font-medium truncate">{i.name}</p>
                      {i.repeat_every_cycle && <Repeat className="w-3 h-3 text-emerald-500 shrink-0" />}
                      {i.is_paid && <Badge className="h-5 px-1.5 text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Paid</Badge>}
                    </div>
                    <p className="text-[11px] leading-tight text-muted-foreground mt-0.5">{i.category}{stripPaidStatusFromNote(i.note) ? ` · ${stripPaidStatusFromNote(i.note)}` : ""}</p>
                  </div>
                  <p className={`text-sm font-semibold shrink-0 ml-1 ${i.is_paid ? "text-emerald-600" : "text-amber-600"}`}>⃁ {i.amount?.toFixed(2)}</p>
                  <div className="flex gap-0.5 shrink-0">
                    <button className="p-1.5 rounded-lg hover:bg-muted" onClick={() => { setEditing(i); setSheetOpen(true); }} disabled={savingOrder || !!draggingId}>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-muted" onClick={() => setDeleteId(i.id)} disabled={savingOrder || !!draggingId}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) setEditing(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
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
